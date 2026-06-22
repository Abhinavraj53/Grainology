# Render 502 Bad Gateway Error - Fix Guide

## Why This Error Occurs

The **502 Bad Gateway** error means Render's proxy cannot reach your Node.js application. This happens when:

1. **Service is Sleeping** (Most Common on Free Tier)
   - Render free tier services sleep after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds to wake up
   - During wake-up, you get 502 errors

2. **Service Crashed or Not Running**
   - Application crashed during startup
   - MongoDB connection failed
   - Missing environment variables
   - Code errors preventing startup

3. **Service Not Deployed**
   - Code not pushed to Render
   - Deployment failed
   - Service not started

## Why CORS Error Shows Up

The CORS error appears because:
- **502 Bad Gateway** = Server not responding
- When server doesn't respond, **no CORS headers are sent**
- Browser sees missing CORS headers and blocks the request
- This is a **secondary error** - the real issue is the 502

## Solutions

### Solution 1: Wait for Service to Wake Up (Free Tier)

If you're on Render's free tier:

1. **First request after inactivity:**
   - Wait 30-60 seconds
   - Try the request again
   - Service should wake up and respond

2. **To prevent sleeping:**
   - Upgrade to paid plan (always-on)
   - Or use a service like UptimeRobot to ping your service every 10 minutes

### Solution 2: Check Render Service Status

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Find your service: `grainology-rmg1`

2. **Check Service Status:**
   - Should show: **"Live"** (green)
   - If shows: **"Sleeping"** - wait for it to wake up
   - If shows: **"Failed"** or **"Stopped"** - see Solution 3

3. **Check Logs:**
   - Click on your service → **Logs** tab
   - Look for:
     - `🚀 Server running on 0.0.0.0:XXXX`
     - `✅ Connected to MongoDB`
     - Any error messages

### Solution 3: Fix Service Issues

If service shows "Failed" or "Stopped":

#### A. Check Environment Variables

Go to **Render Dashboard → Your Service → Environment**:

**Required Variables:**
```env
NODE_ENV=production
PORT=10000 (Render sets this automatically, but verify)
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://grainologyagri.com
```

#### B. Check MongoDB Connection

1. **Verify MongoDB URI is correct**
2. **Check MongoDB Atlas IP Whitelist:**
   - Go to MongoDB Atlas → Network Access
   - Add `0.0.0.0/0` (allow all IPs) for testing
   - Or add Render's IP ranges

3. **Check Render Logs for MongoDB errors:**
   - Look for: `❌ MongoDB connection error`
   - Fix the connection string if needed

#### C. Restart the Service

1. **Render Dashboard → Your Service → Manual Deploy**
2. Click **"Clear build cache & deploy"**
3. Wait 3-5 minutes for deployment
4. Check logs to confirm server started

### Solution 4: Verify Code is Deployed

1. **Check if latest code is deployed:**
   - Render Dashboard → Your Service → Deploys
   - Should show latest commit

2. **If code not deployed:**
   - Push code to GitHub (if auto-deploy enabled)
   - Or manually trigger deploy in Render

## Quick Diagnostic Steps

### Step 1: Test Health Endpoint
```bash
curl https://grainology-rmg1.onrender.com/health
```

**Expected:** `{"status":"ok","message":"Grainology API is running"}`
**If 502:** Service is sleeping or not running

### Step 2: Check Render Dashboard
- Service status should be "Live"
- Logs should show server running

### Step 3: Check Render Logs
Look for:
- ✅ `🚀 Server running on 0.0.0.0:XXXX`
- ✅ `✅ Connected to MongoDB`
- ❌ Any error messages

## Prevention (For Free Tier)

To prevent service from sleeping:

1. **Use UptimeRobot (Free):**
   - Sign up at https://uptimerobot.com
   - Add monitor for: `https://grainology-rmg1.onrender.com/health`
   - Set interval to 5 minutes
   - This keeps service awake

2. **Upgrade to Paid Plan:**
   - Render paid plans keep services always-on
   - No sleep/wake delays

## Current Status Check

Run this to check if service is awake:

```bash
# Test health (may take 30-60 seconds if sleeping)
time curl -w "\nTime: %{time_total}s\n" https://grainology-rmg1.onrender.com/health
```

- **If responds quickly (< 2s):** Service is awake ✅
- **If takes 30-60s:** Service was sleeping, now awake ✅
- **If 502 after 60s:** Service has issues, check logs ❌

## Summary

**The 502 error is happening because:**
1. Render service is sleeping (free tier) - **Most likely**
2. Service crashed - Check Render logs
3. Service not deployed - Check Render dashboard

**The CORS error is a symptom:**
- Server not responding = No CORS headers sent
- Fix the 502 first, CORS will work automatically

**Next Steps:**
1. Check Render dashboard for service status
2. Check Render logs for errors
3. Wait 30-60 seconds if service is sleeping
4. Restart service if needed

