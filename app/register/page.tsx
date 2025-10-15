"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const contentType = res.headers.get("content-type");
if (!contentType?.includes("application/json")) {
  setMessage("❌ Server returned unexpected response");
  return;
}
const data = await res.json();


      if (res.ok) {
        setMessage("✅ Registration successful! Redirecting to login...");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setMessage(data.message || "❌ Registration failed");
      }
    } catch (err) {
      console.log(err);
      setMessage("❌ Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
      <form
        onSubmit={handleRegister}
        className="bg-slate-800 p-8 rounded-xl shadow-xl w-full max-w-md flex flex-col gap-6"
      >
        <h2 className="text-2xl font-bold text-center text-blue-400">Create Account</h2>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition duration-200"
        >
          Register
        </button>

        {message && <p className="text-center text-sm text-slate-300">{message}</p>}

        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <a href="/login" className="text-blue-400 hover:underline">
            Login
          </a>
        </p>
      </form>
    </div>
  );
}