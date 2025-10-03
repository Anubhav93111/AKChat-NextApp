// app/dashboard/page.tsx or pages/dashboard.tsx
"use client";

import Navbar from "@/components/NavBar";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status]);

  if (status === "loading") return <p>Loading...</p>;

  return (
    
    <div className="h-screen w-full box-border">
      <Navbar/>
      <div className=' w-full h-full flex flex-col  justify-center items-center'>
            <h1>Welcome, {session?.user.name} </h1>
        </div>
    </div>
  );
}