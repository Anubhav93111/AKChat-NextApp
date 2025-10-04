"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="w-full bg-slate-800 text-white px-6 py-4 flex justify-between items-center shadow-md">
      {/* Left: Logo */}
      <Link href="/" className="text-xl font-bold text-blue-400 hover:text-blue-300 transition">
        AKChat
      </Link>

      {/* Right: Navigation */}
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="hover:text-blue-300 transition duration-200"
        >
          Home
        </Link>

        {status === "authenticated" && session?.user ? (
          <>
            <Link
              href={`/user/${session.user.name}`}
              className="hover:text-blue-300 transition duration-200"
            >
              Dashboard
            </Link>
            <span className="text-sm text-slate-300">Hi, {session.user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition duration-200"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}