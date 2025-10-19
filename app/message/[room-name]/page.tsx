// app/message/[room-name]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Messages from "./comt/message-room/messages";
import DrawApp from "./comt/canvas-draw/drawApp";
import { RoomSocketProvider } from "@/lib/hooks/useRoomSocket";

export default async function RoomPage({ params }: { params: Promise<{ "room-name": string }> }) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  const rawId = session?.user?.id;
  const userId = rawId ? Number(rawId) : null;
  const roomName = resolvedParams["room-name"];

  if (userId == null) {
    return <p className="text-red-500">Unauthorized access</p>;
  }

  return (
  <RoomSocketProvider roomName={roomName} userId={userId}>
      <div className="flex flex-col md:flex-row h-screen">
        <div className="flex-1 border-r border-slate-700">
          <Messages />
        </div>
        <div className="flex-1">
          <DrawApp />
        </div>
      </div>
    </RoomSocketProvider>
  );
}