# ⚠️ CRITICAL: Vercel Environment Variable Setup for Cross-Network Video

## 🔴 Current Problem:
- ✅ Same WiFi: Video works
- ❌ Different WiFi: Video DOESN'T work (black screen or no remote stream)

## 🎯 Root Cause:
**Missing TURN server configuration in Vercel production environment!**

Without TURN, WebRTC cannot relay video between users on different networks/WiFi.

---

## 🚀 IMMEDIATE FIX (5 minutes):

### Step 1: Add Environment Variable to Vercel

1. **Open Vercel Dashboard**:
   - Go to: https://vercel.com/
   - Click on your project: **InkSync-NextApp**
   - Click **Settings** (top menu)
   - Click **Environment Variables** (left sidebar)

2. **Add New Variable**:
   - Click **"Add New"** button

3. **Enter Details**:
   
   **Name (Key):**
   ```
   NEXT_PUBLIC_ICE_SERVERS
   ```

   **Value (Copy this EXACTLY - one line, no line breaks!):**
   ```
   [{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:openrelay.metered.ca:80","username":"openrelayproject","credential":"openrelayproject"},{"urls":"turn:openrelay.metered.ca:443","username":"openrelayproject","credential":"openrelayproject"},{"urls":"turn:openrelay.metered.ca:443?transport=tcp","username":"openrelayproject","credential":"openrelayproject"}]
   ```

   **Environments (Select ALL THREE):**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. **Click "Save"**

---

### Step 2: Redeploy Your App

**Option A - Trigger Auto Redeploy (Recommended):**
```powershell
cd C:\Users\91901\OneDrive\Desktop\chatNext\InkSync-NextApp
git commit --allow-empty -m "Trigger redeploy with TURN server config"
git push origin main
```

**Option B - Manual Redeploy:**
1. Go to **Deployments** tab in Vercel
2. Click **"..."** on the latest deployment
3. Click **"Redeploy"**
4. Check **"Use existing Build Cache"** is OFF
5. Click **"Redeploy"**

---

### Step 3: Verify It Worked

After deployment completes (1-2 minutes):

1. **Open your app**: https://www.inksync.live
2. **Open Browser Console** (F12)
3. **Join a room** with camera ON
4. **Look for this log**:
   ```
   [webrtcService] ✅ Using custom ICE servers: 4 servers
   ```
   
   ✅ **If you see this** → TURN is configured correctly!
   ❌ **If you DON'T see this** → Environment variable wasn't added properly

5. **Check ICE candidates** in console:
   ```
   [webrtcService] sending ice to X candidate ...typ relay...
   ```
   
   ✅ **If you see "typ relay"** → TURN server is working!
   ❌ **If you only see "typ host" or "typ srflx"** → TURN not being used

---

## 🧪 Test Cross-Network Video:

### Before TURN (Current State):
```
Device 1 (WiFi A) ←✗→ Device 2 (WiFi B)
❌ No video, black screen, or empty remote streams array
```

### After TURN (Expected):
```
Device 1 (WiFi A) ←TURN Server→ Device 2 (WiFi B)
✅ Video works, both see each other
```

### Test Procedure:
1. **You**: On your WiFi → Join room "test123" → Camera ON
2. **Friend**: On different WiFi → Join room "test123" → Camera ON
3. **Both**: Click "Enable Remote Audio"
4. **Result**: Should see each other's video within 5 seconds

---

## 🔍 Troubleshooting After Adding TURN:

### If Still Not Working:

**Check 1 - Environment Variable Exists:**
```powershell
# In Vercel Dashboard → Settings → Environment Variables
# Should see: NEXT_PUBLIC_ICE_SERVERS with long JSON value
```

**Check 2 - Deployment Used New Config:**
```javascript
// In browser console (F12) on your app:
console.log('Checking env var...');
// You should see the log: [webrtcService] ✅ Using custom ICE servers: 4 servers
```

**Check 3 - ICE Connection State:**
```javascript
// Look for these logs in console:
[webrtcService] iceConnectionState for X checking
[webrtcService] sending ice to X ...typ relay...  ← MUST see "typ relay"!
[webrtcService] iceConnectionState for X connected ✅
```

**Check 4 - Remote Stream Received:**
```javascript
// In Debug panel, click "Debug: remote streams"
// Should show:
{
  "peerId": X,
  "stream": {
    "active": true,  ← MUST be true!
    "tracks": [...]  ← MUST have 2 tracks!
  }
}
```

---

## ⚠️ Common Mistakes:

1. ❌ **Forgot to redeploy** after adding env var
   - Solution: Redeploy using git push or manual redeploy

2. ❌ **JSON format error** (added line breaks)
   - Solution: Must be ONE LONG LINE with no line breaks!

3. ❌ **Only added to Production** (not Preview/Development)
   - Solution: Check ALL THREE environments

4. ❌ **Typo in variable name** (NEXT_PUBLC_ICE_SERVERS)
   - Solution: Must be exactly `NEXT_PUBLIC_ICE_SERVERS` (with underscore)

5. ❌ **Cache issue** (old build still running)
   - Solution: Hard refresh (Ctrl+Shift+R) or use Incognito mode

---

## 📊 Expected Console Output (Success):

```
[webrtcService] ✅ Using custom ICE servers: 4 servers
[webrtcService] creating new RTCPeerConnection for X
[webrtcService] sending offer to X sdpLen= ...
[webrtcService] iceGatheringState for X gathering
[webrtcService] sending ice to X ...typ host...
[webrtcService] sending ice to X ...typ srflx...
[webrtcService] sending ice to X ...typ relay...  ← KEY: TURN server used!
[webrtcService] handleAnswer from X sdpLen= ...
[webrtcService] iceConnectionState for X checking
[webrtcService] iceConnectionState for X connected ✅
[webrtcService] ontrack from X MediaStream {...}
[VideoCall] onTrack from X tracks [{kind:'video',...}, {kind:'audio',...}]
[VideoCall] ✅ PLAYING for peer X {videoWidth: 640, videoHeight: 480, ...}
```

---

## 💰 Cost Information:

**Open Relay Project (Free TURN):**
- Cost: **FREE** forever
- Bandwidth: Shared (fair use)
- Good for: Testing, small apps, personal use

**If you need better reliability later:**
- Metered.ca: 50GB/month free, then $0.50/GB
- Twilio: $15 free credit, then $0.50/GB
- Xirsys: Various paid plans

For personal use with friends: **FREE tier is plenty!** 🎉

---

## ✅ Success Criteria:

After completing these steps, you should have:

1. ✅ Environment variable `NEXT_PUBLIC_ICE_SERVERS` in Vercel (all environments)
2. ✅ App redeployed with new config
3. ✅ Console shows: `[webrtcService] ✅ Using custom ICE servers: 4 servers`
4. ✅ Console shows: `...typ relay...` in ICE candidates
5. ✅ Console shows: `iceConnectionState for X connected`
6. ✅ Video works between users on different WiFi networks
7. ✅ Debug panel shows remote stream with `active: true` and 2 tracks

---

**TL;DR**: Add `NEXT_PUBLIC_ICE_SERVERS` environment variable to Vercel with the TURN server config, redeploy, and cross-network video will work! 🚀
