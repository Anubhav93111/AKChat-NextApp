# TURN Server Setup for Vercel

## 🚀 Quick Setup (5 minutes)

### Step 1: Add Environment Variable to Vercel

1. **Go to Vercel Dashboard**:
   - Visit: https://vercel.com/
   - Select your InkSync project
   - Go to: **Settings** → **Environment Variables**

2. **Add New Variable**:
   - Click **"Add New"** button
   - Fill in:

   **Name:**
   ```
   NEXT_PUBLIC_ICE_SERVERS
   ```

   **Value:** (copy this ENTIRE line - it's one long line with no breaks)
   ```
   [{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:openrelay.metered.ca:80","username":"openrelayproject","credential":"openrelayproject"},{"urls":"turn:openrelay.metered.ca:443","username":"openrelayproject","credential":"openrelayproject"},{"urls":"turn:openrelay.metered.ca:443?transport=tcp","username":"openrelayproject","credential":"openrelayproject"}]
   ```

   **Environments:**
   - ✅ Production
   - ✅ Preview  
   - ✅ Development

3. **Click "Save"**

### Step 2: Redeploy Your App

**Option A - Trigger Auto Deploy** (Recommended):
```powershell
# Make a small change and push
git add .
git commit -m "Add TURN server configuration for cross-network video calls"
git push origin main
```

**Option B - Manual Redeploy**:
- Go to Vercel → Deployments tab
- Click "..." on latest deployment
- Click "Redeploy"
- Check "Use existing Build Cache" (optional)
- Click "Redeploy"

### Step 3: Test It!

After deployment completes (~2 minutes):

1. **You**: Go to https://www.inksync.live
   - Login → Join a room → Turn Camera ON → Enable Remote Audio

2. **Your Friend** (on different WiFi/network):
   - Go to https://www.inksync.live
   - Login → Join SAME room → Turn Camera ON → Enable Remote Audio

3. **Check Console** (F12):
   - Look for: `[webrtcService] sending ice to X candidate typ relay`
   - "typ relay" means TURN is working! ✅

### Expected Result:

**Before TURN (not working):**
```
[webrtcService] iceConnectionState for 2 checking
[webrtcService] iceConnectionState for 2 failed ❌
```

**After TURN (working!):**
```
[webrtcService] iceConnectionState for 2 checking
[webrtcService] sending ice to 2 candidate typ relay ... ← TURN!
[webrtcService] iceConnectionState for 2 connected ✅
[VideoCall] onTrack from 2 tracks [...] ✅
```

---

## ✅ That's It!

You should now be able to video chat with your friend across different networks!

## 📊 Free TURN Server Info

We're using **Open Relay Project** (by Metered.ca):
- **Free forever**
- **Bandwidth**: Shared, fair use (~50GB/month free tier)
- **Reliability**: Good for personal/small projects
- **No signup required**

If you need more bandwidth or better reliability later, check `TURN_SERVER_SETUP.md` for paid options.
