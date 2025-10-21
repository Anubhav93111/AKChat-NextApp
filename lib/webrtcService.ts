// lib/webrtcService.ts
// Simple WebRTC helper to manage peer connections and signaling via an existing WebSocket
import { MutableRefObject } from 'react';

type Handlers = {
  onTrack?: (stream: MediaStream, peerId: number) => void;
  onConnectionState?: (state: RTCPeerConnectionState, peerId: number) => void;
};

export function createPeerManager(
  socketRef: MutableRefObject<WebSocket | null>,
  localUserId: number,
  defaultHandlers?: Partial<Handlers>
) {
  const peers = new Map<number, RTCPeerConnection>();

  function createPeer(targetUserId: number, onTrack?: Handlers['onTrack']) {
    if (peers.has(targetUserId)) return peers.get(targetUserId)!;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

    pc.onconnectionstatechange = () => {
      // optional: expose connection state
    };

    pc.ontrack = (event) => {
      // call provided onTrack first, then default handler if present
      try {
        console.debug('[webrtcService] ontrack from', targetUserId, event.streams[0]);
      } catch (e) {}
      onTrack?.(event.streams[0], targetUserId);
      defaultHandlers?.onTrack?.(event.streams[0], targetUserId);
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && socketRef?.current && socketRef.current.readyState === WebSocket.OPEN) {
        const payload = { type: 'webrtc-ice', targetUserId, fromUserId: localUserId, data: ev.candidate };
        try { console.debug('[webrtcService] sending ice', payload); } catch (e) {}
        socketRef.current.send(JSON.stringify(payload));
      }
    };

    peers.set(targetUserId, pc);
    return pc;
  }

  function addLocalTracksIfNeeded(pc: RTCPeerConnection, localStream?: MediaStream) {
    if (!localStream) return;
    try {
      const existing = pc.getSenders().map((s) => s.track?.id).filter(Boolean as any) as string[];
      for (const track of localStream.getTracks()) {
        if (!existing.includes(track.id)) {
          pc.addTrack(track, localStream);
        }
      }
    } catch (e) {
      // ignore errors when adding tracks
    }
  }

  async function callUser(targetUserId: number, localStream?: MediaStream) {
    const pc = createPeer(targetUserId);
    // attach local tracks if they haven't been added already to this peer
    addLocalTracksIfNeeded(pc, localStream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    try { console.debug('[webrtcService] sending offer to', targetUserId); } catch (e) {}
    socketRef.current?.send(JSON.stringify({ type: 'webrtc-offer', targetUserId, fromUserId: localUserId, data: offer }));
  }

  async function handleOffer(fromUserId: number, offer: RTCSessionDescriptionInit, localStream?: MediaStream) {
    const pc = createPeer(fromUserId);
    // attach local tracks (answerer) if not already present
    addLocalTracksIfNeeded(pc, localStream);
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    try { console.debug('[webrtcService] sending answer to', fromUserId); } catch (e) {}
    socketRef.current?.send(JSON.stringify({ type: 'webrtc-answer', targetUserId: fromUserId, fromUserId: localUserId, data: answer }));
  }

  async function handleAnswer(fromUserId: number, answer: RTCSessionDescriptionInit) {
    const pc = peers.get(fromUserId);
    if (!pc) return;
    await pc.setRemoteDescription(answer);
  }

  function handleIce(fromUserId: number, candidate: RTCIceCandidateInit) {
    const pc = peers.get(fromUserId);
    if (!pc) return;
    try {
      pc.addIceCandidate(candidate as RTCIceCandidateInit);
    } catch (e) {
      // ignore
    }
  }

  function closePeer(peerId: number) {
    const pc = peers.get(peerId);
    if (pc) {
      try { pc.close(); } catch {};
      peers.delete(peerId);
    }
  }

  function dispose() {
    for (const [id, pc] of peers.entries()) {
      try { pc.close(); } catch {}
    }
    peers.clear();
  }

  return { createPeer, callUser, handleOffer, handleAnswer, handleIce, closePeer, dispose };
}
