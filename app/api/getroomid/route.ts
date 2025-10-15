import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("📨 POST /api/getroomid reached");

  try {
    const { name } = await req.json();
    console.log("🧭 Incoming room name:", name," and type of name is: ", typeof(name));

    if (!name || typeof name !== "string") {
      console.warn("⚠️ Invalid or missing room name");
      return NextResponse.json({ error: "Room name is required" }, { status: 400 });
    }

    // Log all rooms for debugging
    const allRooms = await prisma.roomId.findMany();
    console.log("📦 All rooms in DB:", allRooms.map(r => r.name));

    // Try to find the room
    const room = await prisma.roomId.findFirst({
      where: {
        name
      },
      select: { id: true },
    });

    console.log("🔍 Room match result:", room);

    if (!room) {
      console.warn("⚠️ Room not found, creating new room:", name);

      const newRoom = await prisma.roomId.create({
        data: { name },
      });

      console.log("🆕 Room created:", newRoom);
      return NextResponse.json({ roomId: newRoom.id }, { status: 201 });
    }

    return NextResponse.json({ roomId: room.id }, { status: 200 });
  } catch (err) {
    console.error("❌ Unexpected error in /getroomid:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}