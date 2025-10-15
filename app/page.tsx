'use client';

import Navbar from "@/components/NavBar";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-blue-400">
          Welcome to <span className="text-white">AKChat</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-8">
          Real-time messaging. Seamless room creation. Secure login. AKChat is your modern chat platform built for speed, simplicity, and connection.{" "}
          <span className="text-green-400 font-semibold">New here?</span> Create an account and start chatting in seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition duration-200"
          >
            Login & Start Chatting
          </button>
          <button
            onClick={() => router.push("/register")}
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg transition duration-200"
          >
            Create Account
          </button>
          <button
            onClick={() => router.push("/user/demo")}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition duration-200"
          >
            Explore Demo Rooms
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-800 py-12 px-6">
        <h2 className="text-2xl font-semibold text-center mb-8 text-white">Why AKChat?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-slate-700 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h3 className="text-lg font-bold text-blue-300 mb-2">Instant Messaging</h3>
            <p className="text-slate-300">Send and receive messages in real-time with smooth WebSocket integration.</p>
          </div>
          <div className="bg-slate-700 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h3 className="text-lg font-bold text-green-300 mb-2">Room Management</h3>
            <p className="text-slate-300">Create, join, and manage chat rooms with ease. Invite others and collaborate instantly.</p>
          </div>
          <div className="bg-slate-700 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h3 className="text-lg font-bold text-purple-300 mb-2">Secure Authentication</h3>
            <p className="text-slate-300">Login securely with NextAuth and protect your conversations with robust backend logic.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-500 text-sm">
        Built with ❤️ by Ashwini · © 2025 AKChat
      </footer>
    </div>
  );
}