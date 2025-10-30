'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import useLenis from '@/lib/hooks/useLenis';
import CursorTrail from '@/components/CursorTrail';
import Loader from '@/components/Loader';

export default function Home() {
  const router = useRouter();
  const [loadingRoute, setLoadingRoute] = useState('');
  useLenis();

  const handleClick = (route: string) => {
    setLoadingRoute(route);
    setTimeout(() => {
      router.push(route);
    }, 1000);
  };

  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 300]); // slower scroll

  return (
    <>
      <CursorTrail />
      <Loader />

      {/* Parallax Background */}
      <motion.div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/backgrond.png')",
          y,
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen text-slate-100 font-sans flex flex-col overflow-x-hidden">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30 z-0" />

        {/* Navbar */}
        <header className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-full max-w-screen-xl px-6 py-3">
          <div className="backdrop-blur-sm shadow-md px-10 py-4 rounded-full border border-gray-500 bg-slate-950/80 flex items-center justify-between gap-10">
            <div className="text-4xl font-extrabold text-teal-400 whitespace-nowrap">
              Ink<span className="text-white">Sync</span>
            </div>
            <nav className="hidden md:flex gap-10 text-xl font-semibold">
              <button onClick={() => router.push('/')} className="hover:text-teal-400 transition-colors duration-200">Home</button>
              <button onClick={() => router.push('/features')} className="hover:text-violet-400 transition-colors duration-200">Features</button>
              <button onClick={() => router.push('/about')} className="hover:text-blue-400 transition-colors duration-200">About</button>
            </nav>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/login')}
                className="px-5 py-2 text-sm font-medium rounded-md border border-teal-400 text-teal-400 bg-transparent hover:bg-gradient-to-r hover:from-teal-500 hover:to-cyan-500 hover:text-white transition-all duration-300"
              >
                Login
              </button>
              <button
                onClick={() => router.push('/register')}
                className="hidden sm:inline-block px-5 py-2 text-sm font-medium rounded-md border border-violet-400 text-violet-400 bg-transparent hover:bg-gradient-to-r hover:from-violet-500 hover:to-indigo-500 hover:text-white transition-all duration-300"
              >
                Sign Up
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative z-10 h-screen flex flex-col items-center justify-center px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-6xl font-extrabold mb-6 text-teal-400"
          >
            Unleash Ideas with <span className="text-white">InkSync</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg sm:text-xl text-slate-300 max-w-3xl mb-8"
          >
            A real-time canvas for your thoughts. Draw, chat, and connect instantly with seamless collaboration tools.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-8"
          >
            {[
              { label: 'Start Drawing', route: '/login', from: 'teal-500', to: 'cyan-500', border: 'teal-400', text: 'teal-400' },
              { label: 'Create Account', route: '/register', from: 'violet-500', to: 'indigo-500', border: 'violet-400', text: 'violet-400' }
            ].map(({ label, route, from, to, border, text }) => (
              <button
                key={route}
                onClick={() => handleClick(route)}
                className={`relative w-[180px] h-[48px] rounded-lg border border-${border} text-${text} bg-transparent hover:bg-gradient-to-r hover:from-${from} hover:to-${to} hover:text-white transition-all duration-300 flex items-center justify-center`}
              >
                {loadingRoute === route ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  label
                )}
              </button>
            ))}
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="relative z-10 bg-slate-transparent py-20 px-6">
  <h2 className="text-4xl font-semibold text-center mb-16 text-white font-[var(--font-calligraphy)]">
    What Makes InkSync Unique?
  </h2>
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
    {[
      {
        title: 'Live Canvas',
        gradient: 'from-teal-500 to-cyan-500',
        border: 'border-teal-400',
        text: 'text-teal-300',
        description: 'Sketch, draw, and annotate in real-time with others. Every stroke is synced instantly.',
      },
      {
        title: 'Integrated Messaging',
        gradient: 'from-violet-500 to-indigo-500',
        border: 'border-violet-400',
        text: 'text-violet-300',
        description: 'Chat while you draw. Collaborate with context and clarity using built-in messaging.',
      },
      {
        title: 'Video Collaboration',
        gradient: 'from-blue-500 to-sky-500',
        border: 'border-blue-400',
        text: 'text-blue-300',
        description: 'Hop on a call and sketch together. Perfect for remote teams, classrooms, and creators.',
      },
    ].map(({ title, gradient, border, text, description }, i) => (
      <motion.div
        key={title}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.2, duration: 0.6 }}
        viewport={{ once: true }}
        className={`relative p-6 rounded-2xl border ${border} bg-slate-800/60 backdrop-blur-md shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
      >
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-10 pointer-events-none`} />
        <h3 className={`text-2xl font-bold mb-3 z-10 relative ${text} font-[var(--font-calligraphy)]`}>
          {title}
        </h3>
        <p className="text-slate-300 z-10 relative">{description}</p>
      </motion.div>
    ))}
  </div>
</section>
        {/* Footer */}
        <footer className="relative z-10 text-center py-6 text-slate-300 text-sm bg-gray-700/30 border-t border-gray-300">
          Built by Anubhav · © 2025 InkSync
        </footer>
      </div>
    </>
  );
}