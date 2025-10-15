"use client";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: number;
  message: string;
  userId: number;
  createdAt: string;
  roomId: string;
};

export default function MessageRoom() {
  const { data: session, status } = useSession();
  
  const { "room-name": roomName } = useParams();
  console.log("🧭 roomName from useParams:", roomName);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchRoomId = async (name: string) => {
    try {
      const res = await fetch("/api/getroomid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Failed to fetch roomId: ${res.status} - ${errorText}`);
        return null;
      }

      const data = await res.json();
      return data.roomId;
    } catch (err) {
      console.error("❌ Network or parsing error:", err);
      return null;
    }
  };

  const fetchChatHistory = async (roomId: string) => {
    try {
      const res = await fetch("/api/getchats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Failed to fetch chats: ${res.status} - ${errorText}`);
        return [];
      }

      const data = await res.json();
      return data.chats as ChatMessage[];
    } catch (err) {
      console.error("❌ Chat history fetch error:", err);
      return [];
    }
  };

  useEffect(() => {
    const connectAndRegister = async () => {
      if (status === "authenticated" && session?.user) {
        const roomId = await fetchRoomId(roomName as string);
        if (!roomId) {
          console.error("❌ Cannot register: roomId not found");
          setAccessDenied(true);
          return;
        }

        roomIdRef.current = roomId;
        const history = await fetchChatHistory(roomId);
        setMessages(history);

        try {
          const ws = new WebSocket("ws://localhost:3010");
          socketRef.current = ws;

          ws.onopen = () => {
            ws.send(
              JSON.stringify({
                type: "register",
                roomId: roomIdRef.current,
                userId: session.user.id,
              })
            );
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === "new-message" || data.type === "message-sent") {
                setMessages((prev) => {
                  const exists = prev.some((m) => m.id === data.chat.id);
                  return exists ? prev : [...prev, data.chat];
                });
              }
            } catch (err) {
              console.error("❌ Failed to parse WS message:", err);
            }
          };

          ws.onerror = (err) => {
            console.error("❌ WS Error:", err);
          };

          ws.onclose = () => {
            console.log("❎ WS Disconnected");
          };
        } catch (err) {
          console.error("❌ WebSocket connection failed:", err);
        }
      }
    };

    connectAndRegister();

    return () => {
      socketRef.current?.close();
    };
  }, [status, session, roomName]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }

    const payload = {
      type: "message",
      roomId: roomIdRef.current,
      user_id: session?.user.id,
      text: message,
    };

    try {
      socketRef.current.send(JSON.stringify(payload));
      setMessage("");
    } catch (err) {
      console.error("❌ Failed to send message:", err);
    }
  };

  if (status === "loading") return <p className="text-white">Loading...</p>;
  if (!session?.user || accessDenied) return <p className="text-red-500">Unauthorized access</p>;

  return (
    <div className="w-full h-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
      <div className="bg-slate-800 p-4 border-b border-slate-700 text-lg font-semibold">
        Hello, {session.user.name}
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 flex flex-col space-y-2 scroll-smooth"
      >
        {messages.map((msg, index) => (
          <div
            key={`${msg.id}-${index}`}
            className={`inline-block px-4 py-2 rounded-xl max-w-[80%] break-words whitespace-pre-wrap ${
              msg.userId === Number(session.user.id)
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
