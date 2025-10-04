import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { roomId } = await req.json();

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
  }

  const chats = await prisma.chat.findMany({
    where: { roomId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ chats });
}