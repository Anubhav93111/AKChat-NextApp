// comt/message-room/messages.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomSocket } from "@/lib/hooks/useRoomSocket";

type ChatMessage = {
  id: number;
  message: string;
  userId: number;
  createdAt: string;
  roomId: string;
};

export default function Messages() {
  const { socketRef, roomId, userId, authorized } = useRoomSocket();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const fetchChatHistory = async () => {
      const res = await fetch("/api/getchats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      setMessages(data.chats);
    };

    fetchChatHistory();
  }, [roomId]);

  useEffect(() => {
    const ws = socketRef.current;
    if (!ws) return;

    const handler = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === "new-message" || data.type === "message-sent") {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data.chat.id);
          return exists ? prev : [...prev, data.chat];
        });
      }
    };

    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [socketRef.current]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "message",
        roomId,
        user_id: userId,
        text: message,
      })
    );
    setMessage("");
  };

  if (!authorized) return <p className="text-red-500">Unauthorized access</p>;

  return (
    <div className="w-full h-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
      <div className="bg-slate-800 p-4 border-b border-slate-700 text-lg font-semibold">
        Hello, User {userId}
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 flex flex-col space-y-2 scroll-smooth"
      >
        {messages.map((msg, index) => (
          <div
            key={`${msg.id}-${index}`}
            className={`inline-block px-4 py-2 rounded-xl max-w-[80%] break-words whitespace-pre-wrap ${
              msg.userId === userId
                ? "bg-blue-600 text-white self-end"
                : "bg-violet-600 text-white self-start"
            }`}
          >
            {msg.message}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800 flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type your message..."
          rows={1}
          className="flex-1 resize-none bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition duration-200"
        >
          Send
        </button>
      </div>
    </div>
  );
}