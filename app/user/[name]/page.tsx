'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/NavBar';
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
  <div className="min-h-screen w-full bg-slate-900 text-slate-100 font-sans">
    <Navbar />
    <div className="w-full py-6 flex flex-col items-center">
      <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
    </div>

    {/* Create Room Section */}
    <div className="bg-slate-800 text-white w-11/12 max-w-xl mx-auto my-4 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-center">Create Room</h2>
      <input
        type="text"
        value={newRoomName}
        onChange={(e) => setNewRoomName(e.target.value)}
        placeholder="Enter room name"
        className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
      />
      <button
        onClick={createRoom}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition duration-200"
      >
        Create Room
      </button>
    </div>

    {/* Join Room Section */}
    <div className="bg-slate-800 text-white w-11/12 max-w-xl mx-auto my-4 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-center">Join Room</h2>
      <input
        type="text"
        value={joinRoomId}
        onChange={(e) => setJoinRoomId(e.target.value)}
        placeholder="Enter Room ID to Join"
        className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
      />
      <button
        onClick={joinRoom}
        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition duration-200"
      >
        Join Room
      </button>
    </div>

    {/* Message Feedback */}
    {message && (
      <p className="text-green-400 text-center my-2 font-medium">{message}</p>
    )}

    {/* Room Cards */}
    <div className="w-full px-4 py-6">
      <h2 className="text-center text-xl font-semibold mb-6">Current Rooms</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div
            key={room.id || Math.random().toString()}
            className="relative bg-slate-800 text-white rounded-xl shadow-xl p-6 flex flex-col justify-between transition-transform hover:scale-[1.02] hover:shadow-2xl"
          >
            {/* Header */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold">{room.name || "Unnamed Room"}</h3>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="font-mono">
                    {room.id ? `${room.id.slice(0, 8)}...` : "No ID"}
                  </span>
                  {room.id && (
                    <button
                      onClick={() => copyToClipboard(room.id!)}
                      className="text-blue-400 hover:text-blue-300 transition"
                      title="Copy Room ID"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-auto">
              <button
                onClick={() => router.push(`/message/${room.name}`)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition duration-200"
              >
                Enter Room
              </button>

              {room.id && (
                <button
                  onClick={() => deleteRoom(room.id!)}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition duration-200"
                >
                  Delete
                </button>
              )}

              {copiedRoomId === room.id && (
                <span className="text-green-400 text-sm text-center">Room ID copied!</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)};