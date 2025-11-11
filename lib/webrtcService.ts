import type { MutableRefObject } from "react";

type PeerManagerOptions = {
  onTrack?: (stream: MediaStream, peerId: number) => void;
};

export type PeerManager = {
  callUser: (targetUserId: number, localStream?: MediaStream) => void;
  handleOffer: (fromUserId: number, offer: RTCSessionDescriptionInit, localStream?: MediaStream) => void;
  handleAnswer: (fromUserId: number, answer: RTCSessionDescriptionInit) => void;
  handleIce: (fromUserId: number, candidate: RTCIceCandidateInit) => void;
  dispose: () => void;
};

export function createPeerManager(
  socketRef: MutableRefObject<WebSocket | null>,
  localUserId: number | undefined,
  options: PeerManagerOptions
): PeerManager {
  const peers = new Map<number, RTCPeerConnection>();

  function createPeer(peerId: number): RTCPeerConnection {
    if (peers.has(peerId)) {
      console.log('[webrtcService] returning existing peer for', peerId);
      return peers.get(peerId)!;
    }

    console.log('[webrtcService] creating new RTCPeerConnection for', peerId);

    // allow build-time configuration of ICE servers via NEXT_PUBLIC_ICE_SERVERS
    // Example: NEXT_PUBLIC_ICE_SERVERS='[{"urls":"stun:stun.l.google.com:19302"}]'
    let iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
    try {
      // In Next.js, NEXT_PUBLIC_ vars are replaced at build time
      // Access them via globalThis to avoid process is not defined error
      const raw = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ICE_SERVERS 
        ? process.env.NEXT_PUBLIC_ICE_SERVERS 
        : (globalThis as any).NEXT_PUBLIC_ICE_SERVERS;
      
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          iceServers = parsed as RTCIceServer[];
          console.log('[webrtcService] ✅ Using custom ICE servers:', iceServers.length, 'servers');
        }
      }
    } catch (err) {
      console.warn('[webrtcService] failed to parse NEXT_PUBLIC_ICE_SERVERS, falling back to default', err);
    }

    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        try { console.log('[webrtcService] sending ice to', peerId, event.candidate?.candidate?.slice?.(0,200)); } catch { }
        try {
          const sock = socketRef.current;
          if (!sock) return;
          if (sock.readyState !== WebSocket.OPEN) {
            console.warn('[webrtcService] socket not open when sending ICE, readyState=', sock.readyState);
            return;
          }
          sock.send(
            JSON.stringify({
              type: "webrtc-ice",
              targetUserId: peerId,
              fromUserId: localUserId,
              data: event.candidate,
            })
          );
        } catch (err) {
          console.error('[webrtcService] failed to send ice', err);
        }
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      try { console.log('[webrtcService] ontrack from', peerId, stream, 'tracks', stream.getTracks().map(t => ({kind:t.kind,id:t.id,enabled:t.enabled}))); } catch { }
      options.onTrack?.(stream, peerId);
    };

    pc.oniceconnectionstatechange = () => {
      try { console.log('[webrtcService] iceConnectionState for', peerId, pc.iceConnectionState); } catch {}
      try { console.log('[webrtcService] connectionState for', peerId, pc.connectionState); } catch {}
      // If connection becomes 'failed' or 'disconnected' keep detailed logs available
    };

    pc.onicegatheringstatechange = () => {
      try { console.log('[webrtcService] iceGatheringState for', peerId, pc.iceGatheringState); } catch {}
    };

    pc.onnegotiationneeded = () => {
      try { console.log('[webrtcService] negotiationneeded for', peerId); } catch {}
    };

    // periodic diagnostics: collect basic stats while the PC is alive
    let statsInterval: number | null = null;
    const startStats = () => {
      if (statsInterval) return;
      statsInterval = window.setInterval(async () => {
        try {
          const stats = await pc.getStats();
          // log a small summary: candidate-pair, outbound/inbound bytes
          stats.forEach((report) => {
            try {
                  if (report.type === 'candidate-pair') {
                    const r = report as unknown as { state?: string; nominated?: boolean; transportId?: string };
                    if (r.state) {
                      console.log('[webrtcService][stats]', peerId, 'candidate-pair', r.state, 'nominated=', r.nominated, 'transportId=', r.transportId);
                    }
                  }
                  if (report.type === 'outbound-rtp') {
                    const r = report as unknown as { kind?: string; bytesSent?: number };
                    console.log('[webrtcService][stats]', peerId, 'outbound-rtp', r.kind, 'bytesSent=', r.bytesSent);
                  }
                  if (report.type === 'inbound-rtp') {
                    const r = report as unknown as { kind?: string; bytesReceived?: number };
                    console.log('[webrtcService][stats]', peerId, 'inbound-rtp', r.kind, 'bytesReceived=', r.bytesReceived);
                  }
            } catch (e) { }
          });
        } catch (e) {
          // ignore
        }
      }, 5000) as unknown as number;
    };

    const stopStats = () => {
      if (!statsInterval) return;
      try { clearInterval(statsInterval); } catch {}
      statsInterval = null;
    };

    pc.onconnectionstatechange = () => {
      try { console.log('[webrtcService] connectionState for', peerId, pc.connectionState); } catch { }
      // when connection fails we keep the pc around for debugging; callers can dispose and recreate if needed
    };

    peers.set(peerId, pc);
    // when connection state transitions to connected, start stats
    try {
      pc.addEventListener('connectionstatechange', () => {
        try {
          if (pc.connectionState === 'connected') startStats();
          if (pc.connectionState === 'closed' || pc.connectionState === 'failed' || pc.connectionState === 'disconnected') stopStats();
        } catch (e) {}
      });
    } catch {}
    return pc;
  }

  function addLocalTracksIfNeeded(pc: RTCPeerConnection, localStream?: MediaStream) {
    if (!localStream) return;
    try {
      const senders = pc.getSenders();
      const existing = senders.map((s) => ({ id: s.track?.id, kind: s.track?.kind }));
      console.log('[webrtcService] existing senders before addTrack', existing);
      for (const track of localStream.getTracks()) {
        if (!existing.some((e) => e.id === track.id)) {
          console.log('[webrtcService] adding local track', track.kind, track.id);
          pc.addTrack(track, localStream);
        } else {
          console.log('[webrtcService] track already added', track.kind, track.id);
        }
      }
      // log senders after a short tick
      setTimeout(() => {
        try {
          const after = pc.getSenders().map((s) => ({ id: s.track?.id, kind: s.track?.kind }));
          console.log('[webrtcService] senders after addTrack', after);
        } catch {}
      }, 50);
    } catch {
      // ignore addTrack errors
    }
  }

  async function callUser(targetUserId: number, localStream?: MediaStream) {
    const pc = createPeer(targetUserId);
    addLocalTracksIfNeeded(pc, localStream);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    try {
      console.log('[webrtcService] sending offer to', targetUserId, 'sdpLen=', String(offer.sdp?.length ?? 0));
      const sock = socketRef.current;
      if (!sock) {
        console.warn('[webrtcService] socket null when sending offer');
        return;
      }
      if (sock.readyState !== WebSocket.OPEN) {
        console.warn('[webrtcService] socket not open when sending offer, readyState=', sock.readyState);
        return;
      }
      sock.send(
        JSON.stringify({
          type: "webrtc-offer",
          targetUserId,
          fromUserId: localUserId,
          data: offer,
        })
      );
    } catch (err) {
      console.error('[webrtcService] failed to send offer to', targetUserId, err);
    }
  }

  async function handleOffer(fromUserId: number, offer: RTCSessionDescriptionInit, localStream?: MediaStream) {
    console.log('[webrtcService] handleOffer from', fromUserId, 'sdpLen=', String(offer.sdp?.length ?? 0));
    const pc = createPeer(fromUserId);
    // Typical order: set remote description first, then add local tracks and create answer
    try {
      await pc.setRemoteDescription(offer);
    } catch (err) {
      console.warn('[webrtcService] setRemoteDescription failed for offer from', fromUserId, err);
    }

  addLocalTracksIfNeeded(pc, localStream);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    try {
      console.log('[webrtcService] sending answer to', fromUserId, 'sdpLen=', String(answer.sdp?.length ?? 0));
      const sock = socketRef.current;
      if (!sock) {
        console.warn('[webrtcService] socket null when sending answer');
        return;
      }
      if (sock.readyState !== WebSocket.OPEN) {
        console.warn('[webrtcService] socket not open when sending answer, readyState=', sock.readyState);
        return;
      }
      sock.send(
        JSON.stringify({
          type: "webrtc-answer",
          targetUserId: fromUserId,
          fromUserId: localUserId,
          data: answer,
        })
      );
    } catch (err) {
      console.error('[webrtcService] failed to send answer to', fromUserId, err);
    }
  }

  async function handleAnswer(fromUserId: number, answer: RTCSessionDescriptionInit) {
    console.log('[webrtcService] handleAnswer from', fromUserId, 'sdpLen=', String(answer.sdp?.length ?? 0));
    const pc = peers.get(fromUserId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(answer);
    } catch {
      // ignore
    }
    try {
      console.log('[webrtcService] pc.senders after setRemoteDescription', pc.getSenders().map(s=>({id:s.track?.id,kind:s.track?.kind})));
    } catch {}
  }

  async function handleIce(fromUserId: number, candidate: RTCIceCandidateInit) {
    // candidate.candidate is optional on RTCIceCandidateInit; stringify safely without using `any`
    const candPreview = String(candidate.candidate ?? '').slice(0, 200);
    console.log('[webrtcService] handleIce from', fromUserId, 'cand=', candPreview);
    const pc = peers.get(fromUserId);
    if (!pc) {
      console.warn('[webrtcService] handleIce: no pc for', fromUserId);
      return;
    }
    try {
      await pc.addIceCandidate(candidate);
      console.log('[webrtcService] added ICE candidate for', fromUserId);
    } catch (err) {
      console.warn('[webrtcService] addIceCandidate failed for', fromUserId, err);
    }
  }

  function dispose() {
    for (const pc of peers.values()) {
      pc.close();
    }
    peers.clear();
  }

  return {
    callUser,
    handleOffer,
    handleAnswer,
    handleIce,
    dispose,
  };
}