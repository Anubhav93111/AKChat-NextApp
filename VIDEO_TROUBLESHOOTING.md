# Video Streaming Troubleshooting Guide

## Quick Diagnostic Steps

### 1. Check Browser Console (F12) on BOTH Devices

Look for these key log patterns:

**✅ Success Pattern:**
```
[VideoCall] local stream tracks [{kind:'video',...},{kind:'audio',...}]
[webrtcService] iceConnectionState for X connected
[webrtcService] ontrack from X ...
[VideoCall] onTrack from X tracks [...]
```

**❌ Problem Patterns:**
```
"Client not registered"          → WebSocket connection issue
"socket not open"                 → WebSocket not connected
"Failed to get media stream"      → Camera permission denied
"iceConnectionState ... failed"   → Network/firewall blocking
```

### 2. Common Issues & Solutions

#### Issue 1: No Local Video
**Symptoms**: Your own camera doesn't show
**Check:**
- Browser permissions (🔒 icon in URL bar)
- Allow camera and microphone
- Console shows: `Failed to get media stream`

**Solution:**
1. Click 🔒 icon in browser address bar
2. Set Camera and Microphone to "Allow"
3. Refresh the page
4. Click "Camera On" button

#### Issue 2: Can't See Remote Video
**Symptoms**: You see your video but not the other person's
**Check console for:**
```javascript
[VideoCall] onTrack from X tracks [...]  // Should show video + audio tracks
[webrtcService] connectionState for X connected  // Should be 'connected'
```

**Solution:**
1. **Both users** must turn camera ON
2. **Both users** must click "Enable Remote Audio" (required for autoplay)
3. **Both users** must be in the SAME room
4. Check WebSocket connection (see Issue 3)

#### Issue 3: WebSocket Not Connected
**Symptoms**: Console shows "Client not registered" or "socket not open"
**Solution:**
```javascript
// Open browser console and check:
console.log('Socket state:', window.socketRef?.current?.readyState);
// 1 = OPEN (✅), 0 = CONNECTING, 2 = CLOSING, 3 = CLOSED (❌)
```

If not OPEN (1):
- Check your internet connection
- Verify WebSocket server is running
- Check that NEXT_PUBLIC_SOCKET_URL is correct

#### Issue 4: Firewall/Network Blocking (ICE Failed)
**Symptoms**: Connection stays in "checking" state, never reaches "connected"
**Console shows:**
```
[webrtcService] iceConnectionState for X checking
[webrtcService] iceConnectionState for X failed  ❌
```

**Solution - Add TURN Server:**
1. Get TURN credentials (e.g., from Twilio, Metered.ca)
2. Add to Vercel environment variables:
```
NEXT_PUBLIC_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:turn.server.com","username":"user","credential":"pass"}]
```
3. Redeploy

**Quick Test**: Try on same WiFi network first (should work without TURN)

## Step-by-Step Testing

### Device 1 (User A):
1. Login and join room "test-room"
2. Open browser console (F12)
3. Click "Camera On" button
4. Look for: `[VideoCall] local stream tracks [...]` ✅
5. Click "Enable Remote Audio"
6. Wait for User B

### Device 2 (User B):
1. Login with different account
2. Join SAME room "test-room"
3. Open browser console (F12)
4. Click "Camera On" button
5. Look for: `[VideoCall] local stream tracks [...]` ✅
6. Click "Enable Remote Audio"

### Expected Console Logs (Device A):
```
[VideoCall] ws message {type:'user-list', users:[1,2]}
[VideoCall] initiating call to 2 with local tracks ...
[webrtcService] creating new RTCPeerConnection for 2
[webrtcService] adding local track video ...
[webrtcService] adding local track audio ...
[webrtcService] sending offer to 2 sdpLen=...
[webrtcService] iceConnectionState for 2 checking
[webrtcService] sending ice to 2 ...
[webrtcService] iceConnectionState for 2 connected ✅
[webrtcService] ontrack from 2 Stream {} tracks [...]
[VideoCall] onTrack from 2 tracks [{kind:'video',...}]
```

### Expected Console Logs (Device B):
```
[webrtcService] handleOffer from 1 sdpLen=...
[webrtcService] creating new RTCPeerConnection for 1
[webrtcService] adding local track video ...
[webrtcService] adding local track audio ...
[webrtcService] sending answer to 1 sdpLen=...
[webrtcService] iceConnectionState for 1 checking
[webrtcService] sending ice to 1 ...
[webrtcService] iceConnectionState for 1 connected ✅
[webrtcService] ontrack from 1 Stream {} tracks [...]
[VideoCall] onTrack from 1 tracks [{kind:'video',...}]
```

## Browser Console Commands

### Check Local Stream:
```javascript
const localVideo = document.querySelector('video');
console.log('Local stream:', localVideo?.srcObject);
console.log('Local tracks:', localVideo?.srcObject?.getTracks().map(t => ({
  kind: t.kind,
  id: t.id,
  enabled: t.enabled,
  readyState: t.readyState
})));
```

### Check Remote Streams:
```javascript
const remoteVideos = Array.from(document.querySelectorAll('video')).slice(1);
remoteVideos.forEach((v, i) => {
  console.log(`Remote video ${i}:`, {
    srcObject: v.srcObject,
    tracks: v.srcObject?.getTracks().map(t => ({
      kind: t.kind,
      enabled: t.enabled
    })),
    readyState: v.readyState,
    muted: v.muted,
    videoWidth: v.videoWidth,
    videoHeight: v.videoHeight
  });
});
```

### Test Camera Access:
```javascript
navigator.mediaDevices.getUserMedia({video: true, audio: true})
  .then(stream => {
    console.log('✅ Camera access granted');
    console.log('Tracks:', stream.getTracks().map(t => ({
      kind: t.kind,
      id: t.id,
      label: t.label
    })));
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(err => console.error('❌ Camera access denied:', err));
```

### Check Available Devices:
```javascript
navigator.mediaDevices.enumerateDevices().then(devices => {
  const media = devices.filter(d => 
    d.kind === 'videoinput' || d.kind === 'audioinput'
  );
  console.log('Available devices:', media);
});
```

## Network Requirements

- **Same WiFi**: Should work without TURN server
- **Different Networks**: Usually needs TURN server (especially corporate firewalls)
- **Mobile Data**: Usually works (less strict NAT)
- **HTTPS Required**: WebRTC requires HTTPS in production (localhost is exempt)

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome/Edge | ✅ Excellent | Best support |
| Firefox | ✅ Good | Full support |
| Safari | ⚠️ Good | May need `playsinline` |
| Old Browsers | ❌ No | Upgrade required |

## Still Not Working?

### Collect Detailed Logs:

**On Device 1:**
1. Open console (F12)
2. Clear console
3. Turn camera ON
4. Select all logs (Ctrl+A), copy (Ctrl+C)
5. Paste into `device1-logs.txt`

**On Device 2:**
1. Repeat same steps
2. Save as `device2-logs.txt`

Share both log files for analysis.

### Check WebSocket Server Logs:

If you have access to the WebSocket server, check for:
```
🔁 Forwarding signaling: webrtc-offer from 1 to 2
🔁 Forwarding signaling: webrtc-answer from 2 to 1
🔁 Forwarding signaling: webrtc-ice from 1 to 2
```

If these are missing, the signaling isn't working.

## Production Checklist

- [ ] HTTPS enabled (required for WebRTC)
- [ ] Camera/mic permissions granted
- [ ] Both users in same room
- [ ] Both users clicked "Camera On"
- [ ] Both users clicked "Enable Remote Audio"
- [ ] WebSocket server deployed and accessible
- [ ] TURN server configured (for different networks)
- [ ] Browser console shows no errors

## Free TURN Server Options

- **Metered.ca**: Free tier available
- **Twilio**: Free trial credits
- **Open Relay Project**: `turn:openrelay.metered.ca:80`

Example config:
```bash
NEXT_PUBLIC_ICE_SERVERS='[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:openrelay.metered.ca:80","username":"openrelayproject","credential":"openrelayproject"}]'
```

---

**Remember**: Both users must have camera ON and be in the same room!
