'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/NavBar';
import { useState, useEffect } from 'react';

type Room = {
    id: string;
    name: string;
};



export default function UserDashboard() {
    const router = useRouter();

    const { data: session, status } = useSession();
    const { name } = useParams();
    const [roomName, setRoomName] = useState('');
    const [message, setMessage] = useState('');
    const [rooms, setRooms] = useState<Room[]>([]);

    

    const createRoom = async () => {
        const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: roomName }),
        });

        const data = await res.json();
        if (res.ok) {
            setMessage(`Room "${data.name}" created successfully!`);
            setRoomName('');
            setRooms(data);
        } else {
            setMessage(data.error || 'Failed to create room');
        }
    };

    const fetchRooms = async () => {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        if (res.ok) setRooms(data);
    };


    useEffect(() => {
        fetchRooms(); // ✅ fetch rooms when page loads
    }, []);

    const deleteRoom = async (roomId: string) => {
        const res = await fetch('/api/rooms', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId }),
        });

        const data = await res.json();
        if (res.ok) {
            setRooms(prev => prev.filter(room => room.id !== roomId));
            setMessage('Room deleted successfully');
        } else {
            setMessage(data.error || 'Failed to delete room');
        }
    };


    if (status === 'loading') return <p>Loading...</p>;
    if (!session?.user || session.user.name !== name) {
        return <p>Unauthorized access</p>;
    }

    return (
        <div className="h-screen w-full box-border">
            <Navbar />
            <div className="w-full h-4/10 flex flex-col justify-center items-center">
                <h1>Welcome, {session.user.name}</h1>
            </div>

            <div className="createrooms bg-white text-black h-30 w-9/10 my-4 flex flex-col items-center gap-2">
                <h1 className="text-center">Create Rooms</h1>
                <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter room name"
                    className="border px-4 py-2 rounded w-3/4"
                />
                <button
                    onClick={createRoom}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Create Room
                </button>
                {message && <p className="text-green-600">{message}</p>}
            </div>

            <div className="rooms bg-blue-200 text-black h-50 w-full mx-1 p-4">
                <h1 className="text-center mb-4">Current Rooms</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-4">
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="bg-white shadow-md rounded-lg p-4 flex flex-col justify-between"
                        >
                            <h2 className="text-lg font-semibold mb-2">{room.name}</h2>
                            <button
                                onClick={() => router.push(`/message/${room.name}`)}
                                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                            >
                                Enter Room
                            </button>

                            <button
                                onClick={() => deleteRoom(room.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                            >
                                Delete
                            </button>

                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}