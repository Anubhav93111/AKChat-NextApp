# 🎥 Video Chat Across Different Networks - TURN Server Setup

## Problem You're Experiencing

✅ **Same WiFi**: Video works perfectly  
❌ **Different Networks**: No video (you and your friend on different WiFi/mobile data)

## Why This Happens

When users are on different networks, NAT (Network Address Translation) and firewalls block direct peer-to-peer WebRTC connections. You need a **TURN server** to relay the video/audio data.

## Solution: Add TURN Server Configuration

### Step 1: Local Development (Testing)

I've already created `.env.local` with free TURN servers. To test locally:

1. **Make sure `.env.local` exists** (already created)
2. **Restart your Next.js dev server**:
   ```powershell
   # Stop the current server (Ctrl+C)
   npm run dev
   ```
3. **Test with a friend**:
   - You: Join room on localhost
   - Friend: Use ngrok or similar to access your local server
   - Should work across different networks now!

### Step 2: Production (Vercel) - **DO THIS NOW!**

Your production app needs the TURN server configuration:

#### Quick Fix (5 minutes):

1. **Go to Vercel Dashboard**:
   - https://vercel.com/your-username/inksync-nextapp/settings/environment-variables

2. **Add Environment Variable**:
   - Click **"Add New"**
   - Name: `NEXT_PUBLIC_ICE_SERVERS`
   - Value (copy exactly):
   ```
   [{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:openrelay.metered.ca:80","username":"openrelayproject","credential":"openrelayproject"},{"urls":"turn:openrelay.metered.ca:443","username":"openrelayproject","credential":"openrelayproject"},{"urls":"turn:openrelay.metered.ca:443?transport=tcp","username":"openrelayproject","credential":"openrelayproject"}]
   ```
   - Environment: Select **Production**, **Preview**, and **Development**
   - Click **"Save"**

3. **Redeploy** (choose one):
   - **Option A**: Push any commit (triggers auto-deploy)
   - **Option B**: Go to Deployments tab → Click "..." on latest → "Redeploy"

4. **Test**:
   - You and your friend join the same room on www.inksync.live
   - Both turn camera ON
   - Both click "Enable Remote Audio"
   - Should work now! 🎉

### Step 3: Verify It's Working

#### What You Should See in Console:

**Before TURN** (different networks):
```
[webrtcService] iceConnectionState for X checking
[webrtcService] iceConnectionState for X checking
[webrtcService] iceConnectionState for X failed ❌
```

**After TURN** (working):
```
[webrtcService] iceConnectionState for X checking
[webrtcService] sending ice to X candidate typ relay raddr ... ← TURN candidate!
[webrtcService] iceConnectionState for X connected ✅
[webrtcService] ontrack from X ...
```

Look for **"typ relay"** in ICE candidates - this means TURN is working!

## Free TURN Server We're Using

**Open Relay Project** (by Metered.ca)
- **Cost**: Free forever
- **Bandwidth**: Shared, fair use
- **Reliability**: Good for testing/small apps
- **Credentials**:
  - URLs: `turn:openrelay.metered.ca:80`, `turn:openrelay.metered.ca:443`
  - Username: `openrelayproject`
  - Password: `openrelayproject`

### Limitations of Free TURN:
- Shared with everyone (slower during peak times)
- Not guaranteed uptime
- May have connection limits

## For Better Production Quality

If you get many users or need reliability, upgrade to a paid TURN service:

### Option 1: Metered.ca (Recommended)
- **Free Tier**: 50GB/month
- **Paid**: $0.50/GB after that
- **Signup**: https://www.metered.ca/
- **Setup**:
  1. Create account → Get API key
  2. Generate credentials: https://www.metered.ca/tools/openrelay/
  3. Replace `NEXT_PUBLIC_ICE_SERVERS` in Vercel

### Option 2: Twilio
- **Free Trial**: $15 credit
- **Paid**: $0.50/GB
- **Signup**: https://www.twilio.com/stun-turn
- **Setup**:
  1. Create account → Get credentials
  2. Update `.env.production.template` with Twilio values
  3. Add to Vercel environment variables

### Option 3: Xirsys
- **Free Tier**: Limited
- **Paid**: Various plans
- **Signup**: https://xirsys.com/

## Testing Across Networks

### Test Scenario 1: You + Friend (Different WiFi)
1. You: https://www.inksync.live → Login → Join room "test123"
2. Friend: https://www.inksync.live → Login → Join room "test123"
3. Both: Turn camera ON + Enable Remote Audio
4. Check console for "typ relay" in ICE candidates
5. Should see each other's video! ✅

### Test Scenario 2: WiFi + Mobile Data
1. You: On WiFi → Join room
2. Friend: On mobile data (4G/5G) → Join same room
3. Should work with TURN server

### Test Scenario 3: Corporate Network + Home
- Most challenging (corporate firewalls block everything)
- TURN server is essential
- May need TURN over TCP (port 443) - already configured!

## Troubleshooting

### Still Not Working After Adding TURN?

1. **Check Vercel Environment Variable**:
   ```powershell
   # Verify it was added correctly
   # Go to: https://vercel.com/your-project/settings/environment-variables
   # Should see: NEXT_PUBLIC_ICE_SERVERS with the long JSON value
   ```

2. **Check Console Logs**:
   ```javascript
   // In browser console, check what ICE servers are being used:
   console.log('ICE Servers:', process.env.NEXT_PUBLIC_ICE_SERVERS);
   ```

3. **Verify TURN Credentials**:
   - Try this test: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
   - Add the TURN server config
   - Should see "relay" candidates

4. **Check Browser Console**:
   - Look for: `[webrtcService] sending ice to X candidate typ relay`
   - If you see "typ relay" → TURN is working!
   - If only "typ host" or "typ srflx" → TURN not being used

### Common Mistakes:

❌ **Forgot to redeploy** after adding env var  
✅ Solution: Redeploy on Vercel

❌ **JSON format error** in NEXT_PUBLIC_ICE_SERVERS  
✅ Solution: Copy-paste exactly from this guide (no line breaks!)

❌ **Added to wrong environment** (only Production)  
✅ Solution: Add to Production, Preview, AND Development

❌ **Browser cache** showing old version  
✅ Solution: Hard refresh (Ctrl+Shift+R) or incognito mode

## How TURN Works (Visual)

**Without TURN** (same network):
```
You ←→ Friend
(Direct P2P connection)
✅ Works on same WiFi
❌ Blocked on different networks
```

**With TURN** (different networks):
```
You ←→ TURN Server ←→ Friend
(Relayed through server)
✅ Works on same WiFi
✅ Works on different networks
✅ Works through firewalls
```

## Performance Impact

- **Same Network**: Uses direct P2P (no TURN) - fastest, no extra latency
- **Different Networks**: Uses TURN relay - slight latency (50-200ms typically)
- **Bandwidth**: TURN doesn't compress, just relays the video/audio data

## Cost Estimate (Free Tier)

**Metered.ca Free Tier**: 50GB/month
- **HD video call**: ~2-3 MB/minute per user
- **1 hour call**: ~120-180 MB
- **Free tier supports**: ~50 hours of calls per month
- **After that**: $0.50/GB (~$1 per 2 hours)

For personal use with friends, free tier is plenty! 🎉

## Next Steps

1. ✅ Add `NEXT_PUBLIC_ICE_SERVERS` to Vercel (see Step 2 above)
2. ✅ Redeploy the app
3. ✅ Test with your friend on different networks
4. ✅ Check console for "typ relay" to confirm TURN is working
5. 📊 Monitor usage if you get lots of users

---

**TL;DR**: Add the environment variable to Vercel (5 mins), redeploy, and you can video chat with your friend across different networks! 🚀
