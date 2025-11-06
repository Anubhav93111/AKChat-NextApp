// comt/message-room/messages.tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      // ensure ascending order so newest ends up at the bottom
      const sorted = Array.isArray(data.chats)
        ? [...data.chats].sort(
            (a: ChatMessage, b: ChatMessage) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        : [];
      setMessages(sorted);
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
  }, [socketRef]);

  useLayoutEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    // Scroll to bottom on new messages; do it after layout for snappy behavior
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  // Ensure when the panel opens/mounts we start at the bottom
  useLayoutEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

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
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-100 font-sans">
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 text-lg font-semibold shadow-sm">
        Chat Room – User {userId}
      </div>
  
      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-auto px-4 py-2 flex flex-col space-y-2 scrollbar-none"
      >
        {messages.map((msg, index) => {
          const isOwn = msg.userId === userId;
          return (
            <div
              key={`${msg.id}-${index}`}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative px-4 py-2 rounded-2xl max-w-[75%] text-sm shadow-md ${
                  isOwn
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-700 text-white rounded-bl-none"
                }`}
              >
                <div>{msg.message}</div>
                <div className="text-xs text-slate-300 mt-1 text-right">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
  
      {/* Input Area */}
      <div className="p-4 border-t border-slate-700 bg-slate-800 flex items-end gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none bg-slate-700 text-white px-4 py-2 rounded-2xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
        <button
          onClick={handleSendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-500 transition duration-200"
        >
          Send
        </button>
      </div>
    </div>
  );
}