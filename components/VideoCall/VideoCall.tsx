"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRoomSocket } from "@/lib/hooks/useRoomSocket";
import { createPeerManager, type PeerManager } from "@/lib/webrtcService";

export default function VideoCall() {
  const { socketRef, userId } = useRoomSocket();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const managerRef = useRef<PeerManager | null>(null);
  const remoteVideoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  // monitors for remote audio activity to avoid feedback/echo
  const remoteAudioMonitors = useRef<Record<number, {
    ctx: AudioContext;
    source: MediaStreamAudioSourceNode;
    analyser: AnalyserNode;
    rafId?: number;
    silenceTimeout?: number;
  }>>({});
  const [calling, setCalling] = useState(false);
  const callingRef = useRef<boolean>(false);
  const [registered, setRegistered] = useState(false);
  const [autoMuted, setAutoMuted] = useState(false); // true when auto-muting mic due to remote audio

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        stream.getVideoTracks().forEach((t) => (t.enabled = false));
        stream.getAudioTracks().forEach((t) => (t.enabled = false));
        setLocalStream(stream);
        localStreamRef.current = stream;
      } catch (e) {
        console.error("Failed to get media stream", e);
      }
    })();
  }, []);

  // keep ref in sync with state
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // keep calling ref in sync
  useEffect(() => {
    callingRef.current = calling;
  }, [calling]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!socketRef?.current) return;

    const manager = createPeerManager(socketRef, userId ? Number(userId) : undefined, {
      onTrack: (stream, peerId) => {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
        const el = remoteVideoRefs.current[peerId];
        if (el) el.srcObject = stream;
        // start monitoring remote audio to reduce echo by auto-muting local mic while others speak
        try {
          startRemoteAudioMonitor(peerId, stream);
        } catch (err) {
          console.warn('failed to start remote audio monitor', err);
        }
      },
    });

    managerRef.current = manager;

    const handler = (ev: MessageEvent) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.data);
      } catch (err) {
        console.warn('[VideoCall] failed to parse ws message', err);
        return;
      }

      console.log('[VideoCall] ws message', parsed);

      if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) return;
      const msg = parsed as Record<string, unknown>;
      const type = String(msg.type);

      if (type === "register-success") {
        setRegistered(true);
      }

      if (type === "error") {
        console.error('[VideoCall] server error:', msg.message ?? msg);
      }

      if (type === "webrtc-offer") {
        const from = typeof msg.fromUserId === 'number' ? msg.fromUserId : Number(msg.fromUserId);
        manager.handleOffer(from, msg.data as RTCSessionDescriptionInit, localStream || undefined);
      }
      if (type === "webrtc-answer") {
        const from = typeof msg.fromUserId === 'number' ? msg.fromUserId : Number(msg.fromUserId);
        manager.handleAnswer(from, msg.data as RTCSessionDescriptionInit);
      }
      if (type === "webrtc-ice") {
        const from = typeof msg.fromUserId === 'number' ? msg.fromUserId : Number(msg.fromUserId);
        manager.handleIce(from, msg.data as RTCIceCandidateInit);
      }

      if (type === "user-list" && callingRef.current) {
        const usersRaw = msg.users;
        const users = Array.isArray(usersRaw) ? usersRaw.map((u) => Number(u)) : [];
        const others = users.filter((id) => id !== Number(userId));
        const manager = managerRef.current;
        if (!manager) return;

        const s = localStreamRef.current;
        for (const id of others) {
          try {
            console.log('[VideoCall] initiating call to', id);
            manager.callUser(id, s || undefined);
          } catch (err) {
            console.warn('callUser failed', id, err);
          }
        }
        // reset calling flag after initiating calls
        setCalling(false);
      }
    };

    const sock = socketRef.current;
    const monitorsSnapshot = remoteAudioMonitors.current;
    sock.addEventListener("message", handler);
    return () => {
      sock?.removeEventListener("message", handler);
      manager.dispose();
      // stop audio monitors using the snapshot
      for (const idStr of Object.keys(monitorsSnapshot)) {
        const id = Number(idStr);
        stopRemoteAudioMonitor(id);
      }
    };
  }, [socketRef, userId]);

  // Helper: apply effective mic enabled state (user preference AND auto-mute)
  function applyEffectiveMicState(userMicOn: boolean, autoMutedFlag: boolean, s?: MediaStream | null) {
    const effective = userMicOn && !autoMutedFlag;
    const str = s || localStreamRef.current;
    if (!str) return;
    str.getAudioTracks().forEach((t) => {
      try { t.enabled = effective; } catch {}
    });
  }

  function setAutoMute(flag: boolean) {
    setAutoMuted(flag);
    applyEffectiveMicState(micOn, flag, localStreamRef.current);
  }

  function startRemoteAudioMonitor(peerId: number, stream: MediaStream) {
    // if already monitoring, skip
    if (remoteAudioMonitors.current[peerId]) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtor();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      let rafId: number | undefined;
      let silenceTimer: number | undefined;

      const threshold = 15; // tune this threshold (0-255)
      const check = () => {
        analyser.getByteFrequencyData(data);
        // compute average
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        if (avg > threshold) {
          // remote is speaking — auto-mute local mic
          setAutoMute(true);
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = undefined;
          }
        } else {
          // schedule unmute after short silence
          if (!silenceTimer) {
            silenceTimer = window.setTimeout(() => {
              setAutoMute(false);
              silenceTimer = undefined;
            }, 700);
          }
        }
        rafId = window.requestAnimationFrame(check);
      };

      rafId = window.requestAnimationFrame(check);
      remoteAudioMonitors.current[peerId] = { ctx, source, analyser, rafId, silenceTimeout: silenceTimer };
    } catch (err) {
      console.warn('audio monitor failed', err);
    }
  }

  function stopRemoteAudioMonitor(peerId: number) {
    const m = remoteAudioMonitors.current[peerId];
    if (!m) return;
    try {
      if (m.rafId) cancelAnimationFrame(m.rafId);
    } catch {}
    try { m.source.disconnect(); } catch {}
    try { m.analyser.disconnect(); } catch {}
    try { m.ctx.close(); } catch {}
    delete remoteAudioMonitors.current[peerId];
  }

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (cameraOn && localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [cameraOn, localStream]);

  useEffect(() => {
    if (!socketRef?.current || !registered) return;

    const startStreaming = async () => {
      // ensure we have a local stream and enable tracks
      let s = localStreamRef.current;
      try {
        if (!s) {
          s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setLocalStream(s);
          localStreamRef.current = s;
        }

        s.getVideoTracks().forEach((t) => (t.enabled = true));
        s.getAudioTracks().forEach((t) => (t.enabled = true));
        setCameraOn(true);
        setMicOn(true);

        const socket = socketRef.current!;
        const trySend = () => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "request-user-list" }));
            setCalling(true);
            callingRef.current = true;
          } else {
            setTimeout(trySend, 100);
          }
        };

        trySend();
      } catch (e) {
        console.error('Failed to start local stream on register', e);
      }
    };

    startStreaming();
  }, [localStream, socketRef, registered]);

  const toggleCamera = () => {
    if (!localStream) return;
    const newState = !cameraOn;
    localStream.getVideoTracks().forEach((t) => (t.enabled = newState));
    setCameraOn(newState);

    // when enabling camera, trigger a user-list request so peers are called immediately
    if (newState && socketRef?.current) {
      setCalling(true);
      callingRef.current = true;
      const socket = socketRef.current;
      const trySend = () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "request-user-list" }));
        } else {
          setTimeout(trySend, 150);
        }
      };
      trySend();
    }
  };

    const toggleMic = () => {
    if (!localStream) return;
    const newState = !micOn;
    setMicOn(newState);
    applyEffectiveMicState(newState, autoMuted, localStream);
  };

  return (
    <div className="p-2 bg-slate-800 rounded">
      <div className="flex gap-2 mb-2">
        <button
          onClick={toggleCamera}
          className={`px-3 py-2 rounded-md font-medium ${
            cameraOn ? "bg-green-500" : "bg-black"
          } text-white`}
        >
          {cameraOn ? "Camera On" : "Camera Off"}
        </button>
        <button
          onClick={toggleMic}
          className={`px-3 py-2 rounded-md font-medium ${
            micOn ? "bg-green-500" : "bg-black"
          } text-white`}
        >
          {micOn ? "Mic On" : "Mic Off"}
        </button>
        <div className="px-3 py-2 rounded-md font-semibold text-white bg-slate-700 flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${cameraOn ? 'bg-green-400' : 'bg-red-500'}`} />
          <span className="text-sm">{cameraOn ? 'Streaming' : 'Not streaming'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 items-start">
        <div className="flex flex-col gap-1">
          <div className="text-sm text-slate-300">You</div>
          <div
            className={`w-full rounded-xl overflow-hidden flex items-center justify-center ${
              localStream ? "border-4 border-green-500" : "border border-slate-600"
            }`}
            style={{ height: 220 }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", height: "100%", backgroundColor: "black" }}
            />
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
              const hasVideo =
                !!stream && stream.getVideoTracks().some((t) => t.enabled !== false);
              return (
                <div
                  key={k}
                  className={`w-full rounded-xl overflow-hidden border-4 ${
                    hasVideo ? "border-red-600" : "border-slate-700"
                  }`}
                  style={{ height: 220 }}
                >
                  {hasVideo ? (
                    <video
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      ref={(el) => {
                        remoteVideoRefs.current[id] = el;
                        if (el && stream) {
                          el.srcObject = stream;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-14 h-14 text-slate-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M6 20a6 6 0 0112 0"
                        />
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