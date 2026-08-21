"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";

const MODELS = [
  "gemini-3.5-flash",
  "glm-5.2:cloud",
  "qwen3.5:397b-cloud",
  "nomic-embed-text:latest",
  "llama3.1:8b",
  "gpt-oss:120b-cloud",
  "deepseek-v4-pro:cloud",
  "kimi-k2.7-code:cloud",
  "minimax-m2.5:cloud"
];

export default function Chatbot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user" as const, text: input }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // 1. Send context (last 5 messages) to chat API
      const contextMessages = newMessages.slice(-5).map(m => ({
        role: m.role === "user" ? "user" : "model",
        content: m.text
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: contextMessages, modelName: selectedModel }),
      });

      // 2. Extract facts from the message that just fell out of the context window (if any)
      if (newMessages.length === 6) {
        // First time it exceeds 5, extract the first message
        const droppedMessages = newMessages.slice(0, 1).map(m => ({ role: m.role, content: m.text }));
        fetch("/api/memory/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: droppedMessages }),
        }).catch(console.error);
      } else if (newMessages.length > 6) {
        // Extract the message that just got pushed out (index length - 6)
        const droppedMessages = newMessages.slice(newMessages.length - 6, newMessages.length - 5).map(m => ({ role: m.role, content: m.text }));
        fetch("/api/memory/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: droppedMessages }),
        }).catch(console.error);
      }

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "bot", text: `Error: ${res.statusText}` }]);
        setIsLoading(false);
        return;
      }

      setMessages((prev) => [...prev, { role: "bot", text: "" }]);
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        setIsLoading(false);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg.role === "bot") {
              lastMsg.text += chunk;
            }
            return newMessages;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "bot", text: "Something went wrong." }]);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999 }}>
      {isOpen ? (
        <div
          style={{
            width: "400px",
            height: "500px",
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            borderRadius: "10px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}
        >
          <div style={{ backgroundColor: "#0070f3", color: "white", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ padding: "4px", borderRadius: "4px", color: "black", flex: 1, fontSize: "12px", border: "none", outline: "none" }}
            >
              {MODELS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button onClick={toggleChat} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>X</button>
          </div>
          
          <div style={{ flex: 1, padding: "10px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  backgroundColor: msg.role === "user" ? "#0070f3" : "#f1f1f1",
                  color: msg.role === "user" ? "white" : "black",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  maxWidth: "85%",
                  wordWrap: "break-word"
                }}
              >
                {msg.role === "bot" ? (
                  <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {isLoading && <div style={{ alignSelf: "flex-start", color: "gray", fontSize: "12px" }}>{selectedModel} is typing...</div>}
          </div>

          <div style={{ padding: "10px", borderTop: "1px solid #eee", display: "flex", gap: "5px" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask me anything..."
              style={{ flex: 1, padding: "8px", borderRadius: "5px", border: "1px solid #ccc", color: "black", outline: "none" }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              style={{ padding: "8px 12px", backgroundColor: "#0070f3", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", opacity: isLoading ? 0.7 : 1 }}
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={toggleChat}
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
            cursor: "pointer",
            fontSize: "24px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          💬
        </button>
      )}
    </div>
  );
}

