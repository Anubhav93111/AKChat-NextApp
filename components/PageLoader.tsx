"use client";
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  variant: "login" | "register" | "room" | "message";
  line?: string;
  duration?: number; // ms
  onFinish?: () => void;
};

export default function PageLoader({ variant, line = "", duration, onFinish }: Props) {
  // fast default durations for snappy UX
  const defaultDur = variant === "room" || variant === "message" ? 900 : 1600;
  const ms = duration ?? defaultDur;

  useEffect(() => {
    const t = setTimeout(() => onFinish?.(), ms);
    return () => clearTimeout(t);
  }, [ms, onFinish]);

  // Helper renderers for creative fast loaders
  const RoomLoader = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-950/95 via-black/90 to-slate-950/95">
      {/* Fast radial pulses + sweeping bar */}
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
        <motion.div
          aria-hidden
          initial={{ scale: 0.6, opacity: 0.9 }}
          animate={{ scale: [0.6, 1.6, 0.8], opacity: [0.9, 0.25, 0.6] }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-teal-400/20 to-violet-400/10 blur-2xl"
        />

        <motion.div
          aria-hidden
          initial={{ x: '-120%' }}
          animate={{ x: ['-120%', '120%'] }}
          transition={{ duration: 0.9, repeat: 0 }}
          className="absolute top-1/3 left-0 w-[60%] h-1.5 bg-gradient-to-r from-teal-300/80 via-violet-300/60 to-blue-300/20 rounded-full blur-sm"
        />

        <div className="relative z-10 text-center px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white/95">Connecting room</h2>
          {line && (
            <div className="mt-2 text-sm text-slate-200 max-w-lg mx-auto">
              {line}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const MessageLoader = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-tl from-black/80 via-slate-950/80 to-black/80">
      <div className="relative z-10 px-6 text-center">
        {/* Quick message-bubble cascade */}
        <div className="flex items-end gap-2 justify-center mb-4">
          <motion.div initial={{ y: 8, opacity: 0.6 }} animate={{ y: [8, 0, -6], opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.75 }} className="bg-white/10 text-white rounded-2xl px-3 py-2 text-sm">
            …
          </motion.div>
          <motion.div initial={{ y: 10, opacity: 0.5 }} animate={{ y: [10, -2, 6], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.72, delay: 0.08 }} className="bg-white/6 text-white rounded-2xl px-4 py-2 text-sm">
            •••
          </motion.div>
          <motion.div initial={{ y: 12, opacity: 0.4 }} animate={{ y: [12, -4, 8], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.7, delay: 0.14 }} className="bg-white/4 text-white rounded-2xl px-5 py-2 text-sm">
            Loading
          </motion.div>
        </div>

        <div className="text-white/90 font-semibold">Preparing chat</div>
        {line && <div className="mt-1 text-xs text-slate-300">{line}</div>}
      </div>
    </div>
  );

  const circlePosition = variant === "login" ? { left: 0, right: "auto", bottom: 0 } : { right: 0, left: "auto", bottom: 0 };

  // legacy login/register loader preserved
  if (variant === "login" || variant === "register") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black"
        >
          {/* semicircle expanding circle */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 40 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", ...circlePosition }}
          >
            <div style={{ width: "100%", height: "100%", background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.04), rgba(0,0,0,0.7))" }} />
          </motion.div>

          {/* tagline with typing (per-letter) */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.35 }} className="z-10 text-center px-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-violet-300 to-blue-300" style={{ fontFamily: 'var(--font-great-vibes)' }}>
              {variant === "login" ? "Welcome back" : "Create your spark"}
            </h1>

            <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.03 } } }} className="mt-4 text-sm sm:text-lg text-slate-200 max-w-xl mx-auto">
              {line.split("").map((ch, i) => (
                <motion.span key={i} variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.12 }}>
                  {ch === " " ? "\u00A0" : ch}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (variant === "room") return <RoomLoader />;
  if (variant === "message") return <MessageLoader />;

  return null;
}
