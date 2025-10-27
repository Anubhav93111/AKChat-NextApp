// app/message/[room-name]/RoomClient.tsx
"use client";

import { useState } from "react";
import DrawApp from "./comt/canvas-draw/drawApp";
import Messages from "./comt/message-room/messages";
import VideoCall from "@/components/VideoCall";
import { RoomSocketProvider } from "@/lib/hooks/useRoomSocket";
import { motion, AnimatePresence } from "framer-motion";

export default function RoomClient({
  roomName,
  userId,
}: {
  roomName: string;
  userId: number;
}) {
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  return (
    <RoomSocketProvider roomName={roomName} userId={userId}>
      <DrawApp />

      {/* Floating Toggle Buttons */}
      <button
        onClick={() => setShowVideoCall((prev) => !prev)}
        className="fixed top-4 right-4 z-50 bg-white text-black px-4 py-2 rounded shadow"
      >
        Video Menu
      </button>

      <button
        onClick={() => setShowMessages((prev) => !prev)}
        className="fixed bottom-4 left-4 z-50 bg-white text-black px-4 py-2 rounded shadow"
      >
        Chat
      </button>

      {/* Animated VideoCall Sidebar */}
      <AnimatePresence>
        {showVideoCall && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-[300px] bg-gray-900 z-40 shadow-lg overflow-auto"
          >
            <VideoCall />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Messages Dropdown */}
      <AnimatePresence>
        {showMessages && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed bottom-16 left-4 w-[300px] max-h-[40vh] bg-gray-800 text-white rounded shadow-lg overflow-auto z-40"
          >
            <Messages />
          </motion.div>
        )}
      </AnimatePresence>
    </RoomSocketProvider>
  );
}