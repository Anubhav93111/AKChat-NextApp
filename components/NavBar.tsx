// components/Navbar.tsx
"use client";

import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="flex justify-center items-center ">
      {session ? (
        <>
          
          <button className="w-20 h-10 bg-gray-700 border-rounded border-2 border-gray-400" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign Out
          </button>
        </>
      ) : (
        <div className="p-2 border-2 border-gray-200">
          <a  href="/login">Login</a>
        </div>
        
      )}
    </nav>
  );
}