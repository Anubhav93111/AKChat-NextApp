"use client";
import { useSession } from "next-auth/react";

export default function MessageRoom() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Loading...</p>;
  if (!session?.user) return <p>Unauthorized access</p>;

  return (
     <div className="w-full h-screen box-border flex flex-col justify-center items-center">
        <div className="h-10 w-25 border-2 border-gray-500 rounded-[5px] flex items-center justify-center p-2">
            Hello, {session.user.name}
        </div>
     </div>
    );
}
