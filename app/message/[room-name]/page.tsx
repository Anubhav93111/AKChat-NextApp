// app/message/[room-name]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Messages from "./comt/message-room/messages";
import DrawApp from "./comt/canvas-draw/drawApp";
import VideoCall from "@/components/VideoCall";
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
  <div className="flex flex-col w-screen ">
  <div className="flex-1 overflow-auto">
    <DrawApp />
  </div>

  <div className="flex w-full ">
    <div className="w-1/2 overflow-auto ">
      <Messages />
    </div>
    <div className="w-1/2 p-2 overflow-auto">
      <VideoCall />
    </div>
  </div>
</div>
    </RoomSocketProvider>
  );
}