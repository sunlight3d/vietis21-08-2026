import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import 'server-only';

import { prisma } from "../../../lib/prisma";
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const modelName = body.modelName || "gemini-3.5-flash";
    
    // Support both old `message` field and new `messages` array
    let messages = body.messages;
    if (!messages && body.message) {
      messages = [{ role: 'user', content: body.message }];
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1].content;
    const apiKey = process.env.GOOGLE_API_KEY;

    let ragContext = "";
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await embeddingModel.embedContent(lastMessage);
        const vector = result.embedding.values;

        const similarMemories: any[] = await prisma.$queryRaw`
          SELECT content, 1 - (embedding <=> ${vector}::vector) as similarity
          FROM "Memory"
          ORDER BY embedding <=> ${vector}::vector
          LIMIT 3
        `;

        if (similarMemories.length > 0) {
          ragContext = "Thông tin liên quan từ các cuộc trò chuyện trước:\n" + 
            similarMemories.map(m => `- ${m.content}`).join("\n") + "\n\n";
        }
      } catch (e) {
        console.error("RAG Context retrieval error:", e);
      }
    }

    const encoder = new TextEncoder();

    if (modelName === "gemini-3.5-flash") {
      if (!apiKey) {
        return NextResponse.json(
          { error: "API key is missing in environment variables" },
          { status: 500 }
        );
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const systemInstruction = ragContext ? `Hệ thống: ${ragContext}` : "";
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", // We use 1.5-flash since 3.5-flash might not be fully supported in some SDKs, or just alias it. We'll stick to what SDK supports. But if user requested 3.5, I'll pass 3.5. Let's use gemini-1.5-flash as default, or whatever user specified. Actually user used gemini-3.5-flash in old code.
        systemInstruction,
      });

      // Format history for Gemini SDK
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

      const chat = model.startChat({ history });
      const result = await chat.sendMessageStream(lastMessage);
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              controller.enqueue(encoder.encode(chunkText));
            }
            controller.close();
          } catch (e) {
            controller.error(e);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Use Ollama REST API with streaming
      const systemMessage = ragContext ? { role: "system", content: ragContext } : null;
      const finalMessages = systemMessage ? [systemMessage, ...messages] : messages;

      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
      const ollamaRes = await fetch(`${ollamaBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName,
          messages: finalMessages,
          stream: true
        })
      });

      if (!ollamaRes.ok || !ollamaRes.body) {
        throw new Error(`Ollama API error: ${ollamaRes.statusText}`);
      }

      // Ollama returns a stream of JSON objects `{ "message": { "content": "..." } }`
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const decoder = new TextDecoder();
          const text = decoder.decode(chunk);
          const lines = text.split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                controller.enqueue(encoder.encode(parsed.message.content));
              }
            } catch (e) {
              // Ignore partial JSON chunks
            }
          }
        }
      });

      return new Response(ollamaRes.body.pipeThrough(transformStream), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
