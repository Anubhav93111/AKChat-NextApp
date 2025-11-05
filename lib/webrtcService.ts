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
    if (peers.has(peerId)) return peers.get(peerId)!;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        try { console.log('[webrtcService] sending ice to', peerId); } catch { }
        socketRef.current?.send(
          JSON.stringify({
            type: "webrtc-ice",
            targetUserId: peerId,
            fromUserId: localUserId,
            data: event.candidate,
          })
        );
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      try { console.log('[webrtcService] ontrack from', peerId, stream); } catch { }
      options.onTrack?.(stream, peerId);
    };

    pc.onconnectionstatechange = () => {
      try { console.log('[webrtcService] connectionState for', peerId, pc.connectionState); } catch { }
      // when connection fails we keep the pc around for debugging; callers can dispose and recreate if needed
    };

    peers.set(peerId, pc);
    return pc;
  }

  function addLocalTracksIfNeeded(pc: RTCPeerConnection, localStream?: MediaStream) {
    if (!localStream) return;
    try {
      const existing = pc
        .getSenders()
        .map((s) => s.track?.id)
        .filter((id): id is string => typeof id === "string");
      for (const track of localStream.getTracks()) {
        if (!existing.includes(track.id)) {
          pc.addTrack(track, localStream);
        }
      }
    } catch {
      // ignore addTrack errors
    }
  }

  async function callUser(targetUserId: number, localStream?: MediaStream) {
    const pc = createPeer(targetUserId);
    addLocalTracksIfNeeded(pc, localStream);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
  try { console.log('[webrtcService] sending offer to', targetUserId); } catch { }
    socketRef.current?.send(
      JSON.stringify({
        type: "webrtc-offer",
        targetUserId,
        fromUserId: localUserId,
        data: offer,
      })
    );
  }

  async function handleOffer(fromUserId: number, offer: RTCSessionDescriptionInit, localStream?: MediaStream) {
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
  try { console.log('[webrtcService] sending answer to', fromUserId); } catch { }
    socketRef.current?.send(
      JSON.stringify({
        type: "webrtc-answer",
        targetUserId: fromUserId,
        fromUserId: localUserId,
        data: answer,
      })
    );
  }

  async function handleAnswer(fromUserId: number, answer: RTCSessionDescriptionInit) {
    const pc = peers.get(fromUserId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(answer);
    } catch {
      // ignore
    }
  }

  async function handleIce(fromUserId: number, candidate: RTCIceCandidateInit) {
    const pc = peers.get(fromUserId);
    if (!pc) return;
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      // ignore
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