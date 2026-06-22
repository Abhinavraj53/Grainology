# Railway 502 Bad Gateway Fix Guide

## Problem
Getting `502 Bad Gateway` or "Application Failed to Respond" errors from Railway.

Reference: [Railway Documentation - Application Failed to Respond](https://docs.railway.com/reference/errors/application-failed-to-respond)

## Root Causes

According to Railway documentation, this error occurs when:
1. **Application not listening on correct host/port** (most common)
2. **Target port mismatch** in Railway settings
3. **Application under heavy load** (less common)

## ✅ Fix Applied to Code

### 1. Server Binding (FIXED)
Updated `server.js` to match Railway's requirements:

```javascript
// Use PORT provided in environment or default to 3001
const PORT = process.env.PORT || 3001;

// Listen on PORT and 0.0.0.0 (required by Railway)
app.listen(PORT, "0.0.0.0", function () {
  console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
  // ...
});
```

**Key Points:**
- ✅ Host must be `"0.0.0.0"` (not `localhost` or `127.0.0.1`)
- ✅ Port must use `process.env.PORT` (Railway automatically sets this)
- ✅ Using function syntax as shown in Railway docs

## Steps to Fix in Railway Dashboard

### Step 1: Verify Environment Variables

Go to **Railway Dashboard → Your Service → Variables** and ensure:

```env
PORT=3001 (Railway sets this automatically, but verify)
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://grainologyagri.com
```

**Important:** Railway automatically sets `PORT`, so you typically don't need to set it manually. But if you do, make sure it matches what your app expects.

### Step 2: Check Target Port in Service Settings

1. Go to **Railway Dashboard → Your Service → Settings**
2. Scroll to **Networking** section
3. Check **Target Port** setting:
   - If your app listens on port `3001`, target port should be `3001`
   - If Railway assigned a different port (check logs), use that port
   - **Leave blank** if unsure - Railway will auto-detect

**Screenshot Location:** Settings → Networking → Target Port

### Step 3: Verify Start Command

In **Railway Dashboard → Your Service → Settings → Deploy**:

- **Start Command:** `npm start` or `node server.js`
- **Build Command:** `npm install` (if needed)

### Step 4: Check Railway Logs

1. Go to **Railway Dashboard → Your Service → Logs**
2. Look for these messages:
   ```
   🚀 Server running on 0.0.0.0:XXXX
   ✅ Connected to MongoDB
   ```
3. The `XXXX` is the port Railway assigned - note this number

### Step 5: Restart the Service

1. Go to **Railway Dashboard → Your Service → Settings**
2. Click **Restart** button
3. Wait 2-3 minutes for restart
4. Check logs to confirm server started

### Step 6: Test the Endpoint

After restart, test:

```bash
curl https://grainology-production.up.railway.app/health
```

Should return: `{"status":"ok","message":"Grainology API is running"}`

## Troubleshooting Checklist

- [ ] Code updated to bind to `0.0.0.0` ✅ (Already done)
- [ ] Railway logs show server starting on `0.0.0.0:PORT`
- [ ] Target port in Railway settings matches the port in logs
- [ ] Environment variables are set correctly
- [ ] Service has been restarted after code changes
- [ ] MongoDB connection is working (check logs for "Connected to MongoDB")
- [ ] No errors in Railway logs

## Common Issues

### Issue 1: Port Mismatch
**Symptom:** Server starts but still getting 502 errors

**Solution:**
1. Check Railway logs for the actual port: `Server running on 0.0.0.0:XXXX`
2. Go to Service Settings → Networking → Target Port
3. Set target port to match `XXXX` from logs
4. Or leave blank for auto-detection

### Issue 2: Server Not Starting
**Symptom:** No "Server running" message in logs

**Solution:**
1. Check for errors in Railway logs
2. Verify `package.json` has `"start": "node server.js"`
3. Check MongoDB connection (might be blocking startup)
4. Verify all environment variables are set

### Issue 3: MongoDB Connection Failing
**Symptom:** Server starts but crashes or can't connect to DB

**Solution:**
1. Check MongoDB Atlas IP whitelist
2. Add Railway IPs or use `0.0.0.0/0` for testing
3. Verify `MONGODB_URI` is correct in Railway variables

## Verification

After applying fixes, verify:

1. **Health Check:**
   ```bash
   curl https://grainology-production.up.railway.app/health
   ```

2. **CORS Test:**
   ```bash
   curl https://grainology-production.up.railway.app/api/cors-test \
     -H "Origin: https://grainologyagri.com"
   ```

3. **Check Logs:**
   - Should see: `🚀 Server running on 0.0.0.0:XXXX`
   - Should see: `✅ Connected to MongoDB`
   - No error messages

## Next Steps

1. ✅ Code fix applied (binding to 0.0.0.0)
2. ⏭️ Push code to GitHub (Railway will auto-deploy)
3. ⏭️ Check Railway logs after deployment
4. ⏭️ Verify target port matches actual port
5. ⏭️ Restart service if needed
6. ⏭️ Test endpoints

## Reference

- [Railway: Application Failed to Respond](https://docs.railway.com/reference/errors/application-failed-to-respond)
- [Railway: Public Networking](https://docs.railway.com/guides/public-networking#target-ports)

