import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // adjust path if needed
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // adjust path if needed

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create the room and link it to the user
    await prisma.roomId.create({
      data: {
        name,
        users: {
          connect: { id: user.id },
        },
      },
    });

    const updatedUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { rooms: true },
  });

  return NextResponse.json(updatedUser?.rooms || [], { status: 201 });

  } catch (error) {
    console.error('Room creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userWithRooms = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        rooms: true,
      },
    });

    if (!userWithRooms) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(userWithRooms.rooms, { status: 200 });
  } catch (error) {
    console.error('Room fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Verify ownership
    const room = await prisma.roomId.findUnique({
      where: { id: roomId },
      include: { users: true },
    });

    const isOwner = room?.users.some(user => user.email === session.user.email);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: Not your room' }, { status: 403 });
    }

    await prisma.roomId.delete({
      where: { id: roomId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Room delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}