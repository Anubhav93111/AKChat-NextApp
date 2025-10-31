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
        className="fixed top-4 right-4 z-50 bg-white/90 text-black px-3 py-2 rounded-md shadow md:px-4"
      >
        Video
      </button>

      <button
        onClick={() => setShowMessages((prev) => !prev)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 text-black px-4 py-2 rounded-md shadow md:left-4 md:translate-x-0"
      >
        Chat
      </button>

      {/* Backdrop overlay when any panel is open */}
      <AnimatePresence>
        {(showVideoCall || showMessages) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-60"
          />
        )}
      </AnimatePresence>

      {/* Animated VideoCall Sidebar */}
      <AnimatePresence>
        {showVideoCall && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-full bg-gray-900 z-70 shadow-lg overflow-auto sm:w-[90vw] md:w-[420px]"
          >
            <div className="absolute top-2 right-2 z-[71]">
              <button
                aria-label="Close video panel"
                onClick={() => setShowVideoCall(false)}
                className="h-8 w-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow hover:bg-white"
              >
                ✕
              </button>
            </div>
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
            className="fixed bottom-16 left-1/2 -translate-x-1/2 w-[92vw] h-[55vh] bg-gray-800 text-white rounded-lg shadow-lg overflow-hidden z-70 sm:w-[90vw] md:left-6 md:translate-x-0 md:w-[480px] md:h-[65vh] lg:w-[420px] lg:h-[60vh]"
          >
            <div className="h-full flex flex-col">
              <div className="absolute top-2 right-2 z-[71]">
                <button
                  aria-label="Close chat panel"
                  onClick={() => setShowMessages(false)}
                  className="h-8 w-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow hover:bg-white"
                >
                  ✕
                </button>
              </div>
              <Messages />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </RoomSocketProvider>
  );
}