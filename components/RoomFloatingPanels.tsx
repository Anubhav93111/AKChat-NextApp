"use client";

import React, { useState } from "react";
import Messages from "@/app/message/[room-name]/comt/message-room/messages";
import VideoCall from "@/components/VideoCall";

export default function RoomFloatingPanels() {
  const [showMessages, setShowMessages] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div>
      {/* Buttons */}
      <div className="fixed left-4 bottom-6 z-40 flex flex-col gap-2">
        <button
          onClick={() => setShowMessages((s) => !s)}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg shadow-md hover:brightness-110"
        >
          {showMessages ? 'Close Messages' : 'Open Messages'}
        </button>

        <button
          onClick={() => setShowVideo((s) => !s)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700"
        >
          {showVideo ? 'Close Video' : 'Open Video'}
        </button>
      </div>

      {/* Floating panels */}
      {showMessages && (
        <div className="fixed right-6 top-6 z-50 w-[420px] h-[70vh] bg-slate-900/95 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-700 flex items-center justify-between">
            <div className="text-sm font-medium text-white">Messages</div>
            <button onClick={() => setShowMessages(false)} className="text-slate-300">✕</button>
          </div>
          <div className="h-[calc(70vh-48px)] overflow-auto">
            <Messages />
          </div>
        </div>
      )}

      {showVideo && (
        <div className="fixed right-6 bottom-6 z-50 w-[420px] h-[360px] bg-slate-900/95 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-700 flex items-center justify-between">
            <div className="text-sm font-medium text-white">Video Call</div>
            <button onClick={() => setShowVideo(false)} className="text-slate-300">✕</button>
          </div>
          <div className="p-2 h-[calc(100%-48px)] overflow-hidden">
            <VideoCall />
          </div>
        </div>
      )}
    </div>
  );
}
