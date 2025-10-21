"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRoomSocket } from '@/lib/hooks/useRoomSocket';
import { createPeerManager } from '@/lib/webrtcService';

export default function VideoCall() {
  const { socketRef, userId, roomId } = useRoomSocket();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const managerRef = useRef<any>(null);
  const remoteVideoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    if (!socketRef?.current) return;
    const manager = createPeerManager(socketRef, userId, {
      onTrack: (stream: MediaStream, peerId: number) => {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
        // attach to ref if element exists
        const el = remoteVideoRefs.current[peerId];
        if (el) el.srcObject = stream;
      },
    });
    managerRef.current = manager;

    const messageHandler = (ev: MessageEvent) => {
      try {
        const d = JSON.parse(ev.data);
        console.debug('[VideoCall] ws message', d);
        if (d.type === 'webrtc-offer') {
          manager.handleOffer(d.fromUserId, d.data, localStream || undefined);
        }
        if (d.type === 'webrtc-answer') {
          manager.handleAnswer(d.fromUserId, d.data);
        }
        if (d.type === 'webrtc-ice') {
          manager.handleIce(d.fromUserId, d.data);
        }
        if (d.type === 'user-list') {
          // optionally update UI showing active users
        }
      } catch (e) {
        // ignore
      }
    };

    socketRef.current.addEventListener('message', messageHandler as EventListener);

    return () => {
      socketRef.current?.removeEventListener('message', messageHandler as EventListener);
      manager.dispose();
    };
  }, [socketRef, userId, localStream]);

  // ensure the local video element always reflects the current localStream and cameraOn state
  useEffect(() => {
    if (localVideoRef.current) {
      if (localStream && cameraOn) {
        localVideoRef.current.srcObject = localStream;
      } else {
        // if camera is off, clear the video element
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream, cameraOn]);

  useEffect(() => {
    // attach tracks from peers by wrapping manager.createPeer so ontrack updates state and video refs
    if (!managerRef.current) return;
    const manager = managerRef.current;
    const originalCreate = manager.createPeer.bind(manager);
    manager.createPeer = (targetUserId: number, onTrack?: (stream: MediaStream, peerId: number) => void) => {
      const pc = originalCreate(targetUserId, (stream: MediaStream, peerId: number) => {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
        // attach to existing ref if element present
        const el = remoteVideoRefs.current[peerId];
        if (el) el.srcObject = stream;
        onTrack?.(stream, peerId);
      });
      return pc;
    };
  }, [managerRef.current]);

  const ensureLocalStream = async () => {
    if (localStream) return localStream;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(s);
      // ensure UI shows the local video when a stream has been obtained
      setCameraOn(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = s;
      return s;
    } catch (e) {
      console.error('getUserMedia failed', e);
      return null;
    }
  };

  const toggleCamera = async () => {
    if (!localStream) {
      const s = await ensureLocalStream();
      if (s) {
        setCameraOn(true);
        // ensure video tracks enabled
        for (const t of s.getVideoTracks()) t.enabled = true;
      }
      return;
    }

    // toggle video tracks enabled
    const newState = !cameraOn;
    for (const t of localStream.getVideoTracks()) t.enabled = newState;
    setCameraOn(newState);
  };

  const toggleMic = async () => {
    if (!localStream) {
      const s = await ensureLocalStream();
      if (s) {
        setMicOn(true);
        for (const t of s.getAudioTracks()) t.enabled = true;
      }
      return;
    }

    const newState = !micOn;
    for (const t of localStream.getAudioTracks()) t.enabled = newState;
    setMicOn(newState);
  };

  const callAll = () => {
    // request the server for the active user list, then call them when reply arrives
    if (!socketRef?.current) return;
    setCalling(true);
    socketRef.current.send(JSON.stringify({ type: 'request-user-list' }));
  };

  // handle incoming user-list response to actually call peers
  useEffect(() => {
    if (!socketRef?.current) return;
    const handler = (ev: MessageEvent) => {
      try {
        const d = JSON.parse(ev.data);
        if (d.type === 'user-list' && calling) {
          // expected payload: { users: number[] }
          const users: number[] = d.users || [];
          const others = users.filter((id: number) => id !== userId);
          const manager = managerRef.current;
          if (!manager) return;
          // ensure local stream exists, then call peers using the freshest localStream
          (async () => {
            let s = localStream;
            if (!s) {
              try {
                s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(s);
                if (localVideoRef.current) localVideoRef.current.srcObject = s;
              } catch (e) {
                console.error('getUserMedia failed during callAll', e);
                setCalling(false);
                return;
              }
            }

            for (const id of others) {
              try {
                // pass the up-to-date stream reference
                manager.callUser(id, s);
              } catch (e) {
                console.warn('callUser failed', id, e);
              }
            }
          })();
        }
      } catch (e) {
        // ignore
      }
    };

    socketRef.current.addEventListener('message', handler as EventListener);
    return () => socketRef.current?.removeEventListener('message', handler as EventListener);
  }, [socketRef, calling, localStream, userId]);

  return (
    <div className="p-2 bg-slate-800 rounded">
      <div className="flex gap-2 mb-2">
        <button
          onClick={toggleCamera}
          className={`px-3 py-2 rounded-md font-medium ${cameraOn ? 'bg-green-500 text-white' : 'bg-black text-white'}`}
        >
          {cameraOn ? 'Camera On' : 'Camera Off'}
        </button>

        <button
          onClick={toggleMic}
          className={`px-3 py-2 rounded-md font-medium ${micOn ? 'bg-green-500 text-white' : 'bg-black text-white'}`}
        >
          {micOn ? 'Mic On' : 'Mic Off'}
        </button>

        <button
          onClick={callAll}
          className={`px-3 py-2 rounded-md font-semibold text-white ${calling ? 'bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {calling ? 'Calling...' : 'Call Active'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 items-start">
        <div className="flex flex-col gap-1">
          <div className="text-sm text-slate-300">You</div>
          <div className={`w-full rounded-xl overflow-hidden flex items-center justify-center ${localStream ? 'border-4 border-green-500' : 'border border-slate-600'}`} style={{ height: 220 }}>
            {localStream && cameraOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 20a6 6 0 0112 0" />
                </svg>
                <div className="text-sm">Camera is off</div>
                <div className={`text-xs ${micOn ? 'text-green-400' : 'text-red-400'}`}>{micOn ? 'Mic on' : 'Mic muted'}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-sm text-slate-300">Others</div>
          <div className="grid grid-cols-1 gap-2">
            {Object.keys(remoteStreams).length === 0 && (
              <div className="text-sm text-slate-400">No remote streams yet</div>
            )}
            {Object.keys(remoteStreams).map((k) => {
              const id = Number(k);
              const stream = remoteStreams[id];
              const hasVideo = !!stream && stream.getVideoTracks().some((t) => t.enabled !== false);
              return (
                <div key={k} className={`w-full rounded-xl overflow-hidden border-4 ${hasVideo ? 'border-red-600' : 'border-slate-700'}`} style={{ height: 220 }}>
                  {hasVideo ? (
                    <video
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      ref={(el) => { remoteVideoRefs.current[id] = el; if (el && stream) el.srcObject = stream; }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 20a6 6 0 0112 0" />
                      </svg>
                      <div className="text-sm">Video off</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
