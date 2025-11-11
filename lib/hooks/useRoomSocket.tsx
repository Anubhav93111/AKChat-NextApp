"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

type RoomSocketValue = {
  socketRef: React.MutableRefObject<WebSocket | null>;
  roomId: string | null;
  userId: number;
  authorized: boolean;
};

const RoomSocketContext = createContext<RoomSocketValue | null>(null);

export function RoomSocketProvider({
  roomName,
  userId,
  children,
}: {
  roomName: string;
  userId: number;
  children: React.ReactNode;
}) {
  const socketRef = useRef<WebSocket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      const res = await fetch("/api/getroomid", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ name: roomName }),
      });

      const data = await res.json();
      const id = data.roomId;
      if (!id || !mounted) return;

      setRoomId(id);
      // Use production websocket by default. Allow overriding with NEXT_PUBLIC_WS_URL.
      // The provided host is https://inksync-websocketserver.onrender.com — for WebSocket use wss://
      const wsUrl = (process.env.NEXT_PUBLIC_WS_URL as string) || `wss://inksync-websocketserver.onrender.com`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "register", roomId: id, userId }));
      };

      ws.onopen = () => {
        console.log('[RoomSocket] websocket opened');
        ws.send(JSON.stringify({ type: "register", roomId: id, userId }));
      };

      ws.onmessage = (event) => {
        try {
          const d = JSON.parse(event.data);
          console.log('[RoomSocket] message received', d);
          if (d.type === "register-success") setAuthorized(true);
          
          // Handle cross-device sign-in notification
          if (d.type === "user-signed-in" && d.userId === userId && d.url) {
            console.log('[RoomSocket] user signed in on another device, url:', d.url);
            // Show a toast or notification (you can integrate react-hot-toast or similar)
            // For now, log and optionally navigate
            if (typeof window !== 'undefined' && window.confirm(`You signed in on another device. Go to ${d.url}?`)) {
              window.location.href = d.url;
            }
          }
        } catch (err) {
          console.warn('[RoomSocket] failed to parse message', err);
        }
      };

      ws.onerror = (ev) => {
        console.error('[RoomSocket] websocket error', ev);
      };

      ws.onclose = (ev) => {
        console.warn('[RoomSocket] websocket closed', ev.code, ev.reason);
      };
    };

    connect();

    return () => {
      mounted = false;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [roomName, userId]);

  return (
    <RoomSocketContext.Provider value={{ socketRef, roomId, userId, authorized }}>
      {children}
    </RoomSocketContext.Provider>
  );
}

export function useRoomSocket() {
  const ctx = useContext(RoomSocketContext);
  if (!ctx) throw new Error("useRoomSocket must be used within RoomSocketProvider");
  return ctx;
}