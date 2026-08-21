import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import 'server-only';

import { prisma } from "../../../../lib/prisma";
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { messages, userId } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key is missing" }, { status: 500 });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 1. Summarize / Extract facts using gemini-3.5-flash
    const extractionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // gemini-1.5-flash is typical for text extraction
    const prompt = `Bạn là một trợ lý phân tích hội thoại. Nhiệm vụ của bạn là đọc đoạn hội thoại sau và trích xuất ra các thông tin CỐ ĐỊNH, QUAN TRỌNG về người dùng (ví dụ: sở thích, thông tin cá nhân, công việc, thói quen, yêu cầu quan trọng). 
    Chỉ trả về các gạch đầu dòng ngắn gọn. Nếu không có thông tin gì quan trọng cần lưu, hãy trả về chữ "NO_FACTS".
    
    Đoạn hội thoại:
    ${messages.map((m: any) => `${m.role}: ${m.content}`).join("\n")}`;

    const extractResult = await extractionModel.generateContent(prompt);
    const factsText = extractResult.response.text().trim();

    if (factsText === "NO_FACTS" || factsText.length === 0) {
      return NextResponse.json({ message: "No new facts to remember." });
    }

    const facts = factsText.split('\n').map(f => f.replace(/^- /, '').trim()).filter(Boolean);

    // 2. Generate embeddings and save to Vector DB
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    let savedCount = 0;

    for (const fact of facts) {
      const result = await embeddingModel.embedContent(fact);
      const embedding = result.embedding.values;

      // Ensure we have a default user to bind to if userId is not provided.
      // Ideally the app should provide userId, but we use a hardcoded one for testing if empty
      const targetUserId = userId || "default-user-id";

      // The schema for Memory model requires userId to refer to User.id. 
      // We will check if the targetUserId exists, if not we create it or use first user.
      let dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!dbUser) {
        dbUser = await prisma.user.findFirst();
      }
      
      if (!dbUser) {
        return NextResponse.json({ error: "No user found in database to associate memories." }, { status: 400 });
      }

      await prisma.$executeRaw`
        INSERT INTO "Memory" ("id", "content", "embedding", "userId", "createdAt")
        VALUES (gen_random_uuid(), ${fact}, ${embedding}::vector, ${dbUser.id}, NOW())
      `;
      savedCount++;
    }

    return NextResponse.json({ success: true, savedCount, facts });
  } catch (error: any) {
    console.error("Memory Extraction Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
