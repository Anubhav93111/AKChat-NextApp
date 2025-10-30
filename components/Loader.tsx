'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Loader() {
  const [showLoader, setShowLoader] = useState(true);
  const [positions, setPositions] = useState<{ top: number; left: number }[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(false), 4200);
    const randomPositions = Array.from({ length: 30 }, () => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
    }));
    setPositions(randomPositions);
    return () => clearTimeout(timer);
  }, []);

  const text = 'Syncing Creativity';

  return (
    <AnimatePresence>
      {showLoader && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 3, duration: 1.2, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden"
        >
          {/* Floating particles */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            {positions.map(({ top, left }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 0.3, y: [0, -20, 0] }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
                className="absolute w-1 h-1 bg-teal-400 rounded-full"
                style={{ top: `${top}%`, left: `${left}%` }}
              />
            ))}
          </div>

          {/* Canvas + Brush SVG */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1 }}
            className="z-10 flex flex-col items-center text-teal-400"
          >
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 64 64"
              width={120}
              height={120}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              {/* Canvas */}
              <motion.rect
                x="8"
                y="12"
                width="48"
                height="36"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
              />
              {/* Brush handle */}
              <motion.line
                x1="40"
                y1="48"
                x2="56"
                y2="60"
                stroke="currentColor"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.5 }}
              />
              {/* Brush tip */}
              <motion.circle
                cx="56"
                cy="60"
                r="2"
                fill="currentColor"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
              />
            </motion.svg>

            {/* Per-letter animated gradient calligraphy text */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.08,
                  },
                },
              }}
              className="mt-4 flex flex-wrap justify-center text-3xl bg-gradient-to-r from-teal-400 via-violet-400 to-blue-400 bg-clip-text text-transparent animate-pulse"
              style={{ fontFamily: 'var(--font-great-vibes)' }}
            >
              {text.split('').map((char, i) => (
                <motion.span
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.4 }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}