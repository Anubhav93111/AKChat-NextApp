"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRoomSocket } from "@/lib/hooks/useRoomSocket";
import { createPeerManager, type PeerManager } from "@/lib/webrtcService";

export default function VideoCall() {
  const { socketRef, userId, roomId } = useRoomSocket();
  const registerRetryRef = useRef(0);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const managerRef = useRef<PeerManager | null>(null);
  const remoteVideoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  // track ongoing play() promises to avoid concurrent play() calls which cause AbortError
  const remotePlayPromises = useRef<WeakMap<HTMLVideoElement, Promise<void>>>(new WeakMap());
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
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(false);
  const remoteAudioEnabledRef = useRef<boolean>(remoteAudioEnabled);

  useEffect(() => {
    remoteAudioEnabledRef.current = remoteAudioEnabled;
  }, [remoteAudioEnabled]);

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

  function attemptPlay(el: HTMLVideoElement | null) {
    if (!el) return;
    try {
      const map = remotePlayPromises.current;
      if (map.has(el)) return; // already trying to play
      const p = el.play();
      if (p && typeof p.then === 'function') {
        map.set(el, p as Promise<void>);
        p.then(() => {
          try { map.delete(el); } catch {}
        }).catch((err) => {
          try { map.delete(el); } catch {}
          // Log common play errors; do not rethrow
          console.warn('[VideoCall] video.play() failed or was interrupted', err);
        });
      }
    } catch (err) {
      console.warn('[VideoCall] attemptPlay error', err);
    }
  }

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
        try { console.log('[VideoCall] onTrack from', peerId, 'tracks', stream.getTracks().map(t=>({kind:t.kind,id:t.id,enabled:t.enabled}))); } catch {}
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
        const el = remoteVideoRefs.current[peerId];
        if (el) {
          try {
            // only set srcObject if it changed to avoid triggering load interruptions
            if (el.srcObject !== stream) el.srcObject = stream;
            try { el.muted = !remoteAudioEnabledRef.current; } catch {}
            // try to play if user enabled audio and we're not already trying
            if (remoteAudioEnabledRef.current) attemptPlay(el);
          } catch (e) {
            console.warn('[VideoCall] failed to attach stream to element', e);
          }
        }
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
        const message = typeof msg.message === 'string' ? msg.message : String(msg.message ?? msg);
        console.error('[VideoCall] server error:', message);
        // If server says client not registered, attempt to re-register (helps with races)
        if (message.includes('Client not registered')) {
          try {
            const sock = socketRef.current;
            if (sock && sock.readyState === WebSocket.OPEN && roomId && userId) {
              if (registerRetryRef.current < 3) {
                registerRetryRef.current += 1;
                console.log('[VideoCall] re-sending register attempt', registerRetryRef.current);
                sock.send(JSON.stringify({ type: 'register', roomId, userId }));
                // after re-registering, ask for user list again to re-initiate calls
                setTimeout(() => {
                  try {
                    if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: 'request-user-list' }));
                  } catch (e) { console.warn('[VideoCall] failed to request user-list after re-register', e); }
                }, 250);
              } else {
                console.warn('[VideoCall] exceeded register retry attempts');
              }
            }
          } catch (err) {
            console.warn('[VideoCall] re-register failed', err);
          }
        }
        return;
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
            console.log('[VideoCall] initiating call to', id, 'with local tracks', s ? s.getTracks().map(t=>({kind:t.kind,id:t.id,enabled:t.enabled})) : []);
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
        try {
          console.log('[VideoCall] local stream tracks', s.getTracks().map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled })));
        } catch (e) { console.warn('[VideoCall] failed to log local tracks', e); }
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
          console.log('[VideoCall] 🔄 Requesting user list to initiate calls');
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
    try {
      console.log('[VideoCall] toggleMic ->', newState, 'local audio tracks', localStream.getAudioTracks().map(t=>({id:t.id,enabled:t.enabled})));
    } catch (e) { console.warn('[VideoCall] toggleMic log failed', e); }
  };

    // Enable remote audio playback via a user gesture (bypasses autoplay restrictions)
    const toggleRemoteAudio = () => {
      const newState = !remoteAudioEnabled;
      setRemoteAudioEnabled(newState);
    };

    // Force re-initiate calls to all peers (useful if one side didn't receive stream)
    const forceReconnect = () => {
      if (!socketRef?.current || socketRef.current.readyState !== WebSocket.OPEN) {
        console.warn('[VideoCall] Cannot reconnect - socket not open');
        return;
      }
      console.log('[VideoCall] 🔄 Force reconnecting to all peers');
      setCalling(true);
      callingRef.current = true;
      socketRef.current.send(JSON.stringify({ type: "request-user-list" }));
    };

    // When remoteAudioEnabled changes, update all remote video elements
    useEffect(() => {
      for (const idStr of Object.keys(remoteVideoRefs.current)) {
        const el = remoteVideoRefs.current[Number(idStr)];
        if (!el) continue;
        try {
          el.muted = !remoteAudioEnabled;
          if (remoteAudioEnabled) {
            // try to play; browsers often require a user gesture to allow audio
            attemptPlay(el);
          }
        } catch (e) {
          console.warn('[VideoCall] failed to update remote video audio state', e);
        }
      }
    }, [remoteAudioEnabled]);

    // Ensure remote streams are attached to their video elements (covers cases where onTrack ran
    // before the element ref was mounted). This will re-attach srcObject when a stream appears.
    useEffect(() => {
      for (const k of Object.keys(remoteStreams)) {
        const id = Number(k);
        const stream = remoteStreams[id];
        const el = remoteVideoRefs.current[id];
        if (!stream) continue;
        if (el) {
          try {
            if (el.srcObject !== stream) {
              console.log('[VideoCall] ⚡ FORCE attaching remote stream to element for peer', id);
              console.log('[VideoCall] Stream tracks:', stream.getTracks().map(t => ({
                kind: t.kind,
                id: t.id,
                enabled: t.enabled,
                readyState: t.readyState,
                muted: t.muted
              })));
              el.srcObject = stream;
              // Force load the video
              el.load();
            }
            try { el.muted = !remoteAudioEnabledRef.current; } catch {}
            // log some state useful for debugging
            try { 
              console.log('[VideoCall] 📺 Video element state for peer', id, {
                readyState: el.readyState,
                videoWidth: el.videoWidth,
                videoHeight: el.videoHeight,
                paused: el.paused,
                muted: el.muted,
                srcObject: !!el.srcObject
              }); 
            } catch {}
            // attempt to play - CRITICAL for video to show!
            attemptPlay(el);
          } catch (err) {
            console.warn('[VideoCall] failed to attach stream in remoteStreams effect', id, err);
          }
        } else {
          // element not yet mounted; will be attached in ref callback later
          console.log('[VideoCall] ⏳ remote element not mounted yet for', id);
        }
      }
    }, [remoteStreams]);

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
        <button
          onClick={toggleRemoteAudio}
          className={`px-3 py-2 rounded-md font-medium ${
            remoteAudioEnabled ? "bg-green-500" : "bg-black"
          } text-white`}
        >
          {remoteAudioEnabled ? "Audio Enabled" : "Enable Audio"}
        </button>
        <button
          onClick={forceReconnect}
          className="px-3 py-2 rounded-md font-medium bg-blue-600 hover:bg-blue-700 text-white text-sm"
          title="Re-initiate video calls to all peers"
        >
          🔄 Reconnect
        </button>
        <div className="px-3 py-2 rounded-md font-semibold text-white bg-slate-700 flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${cameraOn ? 'bg-green-400' : 'bg-red-500'}`} />
          <span className="text-sm">{cameraOn ? 'Streaming' : 'Not streaming'}</span>
        </div>
      </div>

      {/* Debug panel: shows remoteStreams & video element state for troubleshooting */}
      <div className="mb-2">
        <details className="text-xs text-slate-300">
          <summary className="cursor-pointer">Debug: remote streams</summary>
          <pre className="text-xs text-slate-200 max-h-40 overflow-auto p-2 bg-slate-900 rounded">
            {JSON.stringify(
              Object.keys(remoteStreams).map((k) => {
                const s = remoteStreams[Number(k)];
                const el = remoteVideoRefs.current[Number(k)];
                return {
                  peerId: Number(k),
                  stream: s ? {
                    id: s.id,
                    active: s.active,
                    tracks: s.getTracks().map((t) => ({ 
                      kind: t.kind, 
                      id: t.id, 
                      enabled: t.enabled,
                      readyState: t.readyState,
                      muted: t.muted,
                      label: t.label
                    }))
                  } : null,
                  videoElement: el ? {
                    srcObject: !!el.srcObject,
                    readyState: el.readyState,
                    videoWidth: el.videoWidth,
                    videoHeight: el.videoHeight,
                    paused: el.paused,
                    muted: el.muted,
                    currentTime: el.currentTime
                  } : null
                };
              }),
              null,
              2
            )}
          </pre>
        </details>
      </div>

      <div className="grid grid-cols-2 gap-2 items-start">
        <div className="flex flex-col gap-1">
          <div className="text-sm text-slate-300">You</div>
          <div
            className={`w-full rounded-xl overflow-hidden flex items-center justify-center video-card-220 ${
              localStream ? "border-4 border-green-500" : "border border-slate-600"
            }`}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="video-element"
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
                !!stream && stream.getVideoTracks().length > 0;
              return (
                <div
                  key={k}
                  className={`w-full rounded-xl overflow-hidden border-4 video-card-220 relative ${
                    hasVideo ? "border-red-600" : "border-slate-700"
                  }`}
                >
                  <video
                    autoPlay
                    playsInline
                    muted
                    className="remote-video"
                    style={{ display: hasVideo ? 'block' : 'none' }}
                    ref={(el) => {
                      remoteVideoRefs.current[id] = el;
                      if (el && stream) {
                        try {
                          if (el.srcObject !== stream) {
                            console.log('[VideoCall] 🎬 Setting srcObject in ref callback for peer', id);
                            console.log('[VideoCall] Stream details:', {
                              id: stream.id,
                              active: stream.active,
                              tracks: stream.getTracks().map(t => ({
                                kind: t.kind,
                                id: t.id,
                                enabled: t.enabled,
                                readyState: t.readyState,
                                muted: t.muted,
                                label: t.label
                              }))
                            });
                            el.srcObject = stream;
                            // Force load
                            el.load();
                          }
                          // Always start muted to avoid echo, user can enable audio later
                          el.muted = !remoteAudioEnabledRef.current;
                          
                          // Add event listeners to diagnose why video isn't showing
                          el.onloadedmetadata = () => {
                            console.log('[VideoCall] 📊 Metadata loaded for peer', id, {
                              videoWidth: el.videoWidth,
                              videoHeight: el.videoHeight,
                              duration: el.duration
                            });
                          };
                          
                          el.onloadeddata = () => {
                            console.log('[VideoCall] 📦 Data loaded for peer', id);
                          };
                          
                          el.oncanplay = () => {
                            console.log('[VideoCall] ▶️ Can play for peer', id);
                          };
                          
                          el.onplaying = () => {
                            console.log('[VideoCall] ✅ PLAYING for peer', id, {
                              videoWidth: el.videoWidth,
                              videoHeight: el.videoHeight,
                              paused: el.paused,
                              currentTime: el.currentTime
                            });
                          };
                          
                          el.onerror = (e) => {
                            console.error('[VideoCall] ❌ Video error for peer', id, e);
                          };
                          
                          // ALWAYS attempt to play - critical for video to show
                          console.log('[VideoCall] 🎮 Attempting autoplay for peer', id);
                          attemptPlay(el);
                        } catch (e) {
                          console.warn('[VideoCall] ❌ failed to attach stream in ref', e);
                        }
                      }
                    }}
                  />
                  {/* Debug overlay - shows when video should be playing */}
                  {hasVideo && (
                    <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none">
                      Peer {id}
                    </div>
                  )}
                  {!hasVideo && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-200 bg-slate-800">
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