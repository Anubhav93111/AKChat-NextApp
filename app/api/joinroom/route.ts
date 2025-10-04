import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { roomId, userId } = await req.json();

  if (!roomId || !userId) {
    return NextResponse.json({ error: "Missing roomId or userId" }, { status: 400 });
  }

  const room = await prisma.roomId.findUnique({
    where: { id: roomId },
    include: { users: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const alreadyJoined = room.users.some((u) => u.id === Number(userId));
  if (alreadyJoined) {
    return NextResponse.json({ error: "Already joined this room" }, { status: 409 });
  }

  await prisma.roomId.update({
    where: { id: roomId },
    data: {
      users: {
        connect: { id: Number(userId) },
      },
    },
  });

  return NextResponse.json({ id: room.id, name: room.name });
}