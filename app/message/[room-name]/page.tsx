// app/message/[room-name]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import RoomClient from "./RoomClient";

export default async function RoomPage({ params }: { params: Promise<{ "room-name": string }> }) {
  const session = await getServerSession(authOptions);
  const rawId = session?.user?.id;
  const userId = rawId ? Number(rawId) : null;
  const { "room-name": roomName } = await params;

  if (userId == null) {
    return <p className="text-red-500">Unauthorized access</p>;
  }

  return <RoomClient roomName={roomName} userId={userId} />;
}