'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import UserNav from '@/components/UserNav';
import { useState, useEffect } from 'react';

type Room = {
  id?: string;
  name?: string;
};

export default function UserDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { name } = useParams();

  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [message, setMessage] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const validRooms = data.filter((room) => room?.id && room?.name);
        setRooms(validRooms);
      }
    } catch (err) {
      console.error("❌ Failed to fetch rooms:", err);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const createRoom = async () => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName }),
      });

      const data = await res.json();
      console.log("🧾 Room creation response:", data);

      if (res.ok && data?.id && data?.name) {
        setMessage(`Room "${data.name}" created successfully!`);
        setNewRoomName('');
        setRooms((prev) => [...prev, data]);
      } else {
        setMessage(data.error || 'Failed to create room');
      }
    } catch (err) {
      console.error("❌ Room creation failed:", err);
      setMessage("Something went wrong while creating the room");
    }
  };

  const joinRoom = async () => {
    if (!joinRoomId || !session?.user?.id) return;

    try {
      const res = await fetch('/api/joinroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: joinRoomId, userId: session.user.id }),
      });

      const data = await res.json();
      if (res.ok && data?.id && data?.name) {
        setMessage(`Joined room "${data.name}" successfully!`);
        setJoinRoomId('');
        setRooms((prev) => {
          const alreadyExists = prev.some((room) => room.id === data.id);
          return alreadyExists ? prev : [...prev, data];
        });
      } else {
        setMessage(data.error || 'Failed to join room');
      }
    } catch (err) {
      console.error("❌ Failed to join room:", err);
      setMessage("Something went wrong while joining the room");
    }
  };

  const deleteRoom = async (roomId: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });

      const data = await res.json();
      if (res.ok) {
        setRooms((prev) => prev.filter((room) => room.id !== roomId));
        setMessage('Room deleted successfully');
      } else {
        setMessage(data.error || 'Failed to delete room');
      }
    } catch (err) {
      console.error("❌ Failed to delete room:", err);
      setMessage("Something went wrong while deleting the room");
    }
  };

  const copyToClipboard = async (roomId: string) => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedRoomId(roomId);
      setTimeout(() => setCopiedRoomId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (status === 'loading') return <p className="text-white">Loading...</p>;
  if (!session?.user || session.user.name !== name) {
    return <p className="text-red-500">Unauthorized access</p>;
  }

  return (
  <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-x-hidden">
    <UserNav />

    {/* Header / Hero */}
    <div className="w-full px-4 pt-8 pb-5">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 sm:gap-6 min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-300 bg-clip-text text-transparent">
              Welcome, {session.user.name}
            </span>
          </h1>
          <p className="mt-1 sm:mt-2 text-slate-300 text-xs sm:text-sm md:text-base">Create, join, and manage your rooms.</p>
        </div>
      </div>
    </div>

    {/* Actions: Create / Join */}
    <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm p-5 sm:p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Create Room</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 min-w-0">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Enter room name"
            className="flex-1 min-w-0 bg-slate-800/80 text-white px-4 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
          />
          <button
            onClick={createRoom}
            className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition"
          >
            Create
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm p-5 sm:p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Join Room</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 min-w-0">
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            placeholder="Enter Room ID"
            className="flex-1 min-w-0 bg-slate-800/80 text-white px-4 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
          />
          <button
            onClick={joinRoom}
            className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition"
          >
            Join
          </button>
        </div>
      </div>
    </div>

    {/* Feedback */}
    {message && (
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-emerald-400 text-sm md:text-base text-center my-3 font-medium">{message}</p>
      </div>
    )}

    {/* Rooms */}
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-10">
      <h2 className="text-lg md:text-xl font-semibold mb-4">Your Rooms</h2>
      {rooms.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 text-center text-slate-400">
          No rooms yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {rooms.map((room) => (
            <div
              key={room.id || Math.random().toString()}
              className="relative rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm p-5 sm:p-6 shadow-lg hover:shadow-xl transition"
            >
              <div className="flex items-start justify-between gap-3 mb-4 min-w-0">
                <h3 className="text-xl font-semibold tracking-tight break-words">{room.name || "Unnamed Room"}</h3>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="font-mono">{room.id ? `${room.id.slice(0, 8)}...` : "No ID"}</span>
                  {room.id && (
                    <button
                      onClick={() => copyToClipboard(room.id!)}
                      className="rounded-md px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200"
                      title="Copy Room ID"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/message/${room.name}`)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition"
                >
                  Enter Room
                </button>

                {room.id && (
                  <button
                    onClick={() => deleteRoom(room.id!)}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl transition"
                  >
                    Delete
                  </button>
                )}

                {copiedRoomId === room.id && (
                  <span className="text-emerald-400 text-xs text-center">Room ID copied!</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)};