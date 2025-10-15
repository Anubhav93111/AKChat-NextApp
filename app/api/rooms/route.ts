import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  console.log("📨 POST /api/room called");

  try {
    const session = await getServerSession(authOptions);
    console.log("🔐 Session:", session);

    if (!session?.user?.email) {
      console.warn("⚠️ Unauthorized: No session email");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log("📦 Request body:", body);

    const { name } = body;
    if (!name) {
      console.warn("⚠️ Room name missing in request");
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    console.log("👤 User found:", user);

    if (!user) {
      console.warn("⚠️ User not found for email:", session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const createdRoom = await prisma.roomId.create({
  data: {
    name,
    users: {
      connect: { id: user.id },
    },
  },
  include: {
    users: true,
  },
});
    console.log("🏠 Room created:", createdRoom);

    return NextResponse.json(createdRoom, { status: 201 });
  } catch (error) {
    console.error("❌ Room creation error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  console.log("📨 GET /api/room called");

  try {
    const session = await getServerSession(authOptions);
    console.log("🔐 Session:", session);

    if (!session?.user?.email) {
      console.warn("⚠️ Unauthorized: No session email");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userWithRooms = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { rooms: true },
    });
    console.log("👤 User with rooms:", userWithRooms);

    if (!userWithRooms) {
      console.warn("⚠️ User not found for email:", session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(userWithRooms.rooms, { status: 200 });
  } catch (error) {
    console.error("❌ Room fetch error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  console.log("📨 DELETE /api/room called");

  try {
    const session = await getServerSession(authOptions);
    console.log("🔐 Session:", session);

    if (!session?.user?.email) {
      console.warn("⚠️ Unauthorized: No session email");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log("📦 Request body:", body);

    const { roomId } = body;
    if (!roomId) {
      console.warn("⚠️ Room ID missing in request");
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const room = await prisma.roomId.findUnique({
      where: { id: roomId },
      include: { users: true },
    });
    console.log("🏠 Room found:", room);

    const isOwner = room?.users.some(user => user.email === session.user.email);
    console.log("🔍 Is owner:", isOwner);

    if (!isOwner) {
      console.warn("⚠️ Forbidden: User not owner of room", session.user.email);
      return NextResponse.json({ error: 'Forbidden: Not your room' }, { status: 403 });
    }

    await prisma.roomId.delete({
      where: { id: roomId },
    });
    console.log("🗑️ Room deleted:", roomId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Room delete error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}