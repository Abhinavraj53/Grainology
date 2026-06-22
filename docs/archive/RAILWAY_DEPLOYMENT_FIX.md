# Railway Deployment Fix - 502 Bad Gateway

## Problem
Getting `502 Bad Gateway` errors when accessing the Railway backend. This means Railway's proxy can't reach your Node.js server.

## Root Cause
The server was only binding to `localhost`, but Railway requires binding to `0.0.0.0` to be accessible from Railway's network.

## Fix Applied
Updated `server.js` to bind to `0.0.0.0`:

```javascript
// Before
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// After
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
});
```

## Railway Environment Variables Required

Make sure these are set in your Railway dashboard (Variables tab):

### Required
```env
PORT=3001
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://grainologyagri.com
```

### Important Notes
1. **PORT**: Railway automatically sets `PORT` environment variable, but you can override it
2. **HOST**: The server now defaults to `0.0.0.0` which is required for Railway
3. **MongoDB**: Make sure MongoDB Atlas allows connections from Railway IPs (or use `0.0.0.0/0` for testing)

## Railway Settings

In Railway dashboard:
- **Start Command**: `npm start` or `node server.js`
- **Build Command**: `npm install` (if needed)
- **Health Check Path**: `/health`

## After Deployment

1. Wait for Railway to deploy (2-5 minutes)
2. Test the health endpoint:
   ```bash
   curl https://grainology-production.up.railway.app/health
   ```
3. Should return: `{"status":"ok","message":"Grainology API is running"}`

## Troubleshooting

If still getting 502 errors:

1. **Check Railway Logs**:
   - Go to Railway dashboard → Your Service → Logs
   - Look for errors or startup messages
   - Should see: `🚀 Server running on 0.0.0.0:3001`

2. **Verify Environment Variables**:
   - Check that `PORT` is set (Railway sets this automatically)
   - Verify `MONGODB_URI` is correct
   - Ensure `FRONTEND_URL` is set to `https://grainologyagri.com`

3. **Check MongoDB Connection**:
   - Railway logs should show: `✅ Connected to MongoDB`
   - If not, check MongoDB Atlas IP whitelist

4. **Restart Service**:
   - In Railway dashboard → Your Service → Settings → Restart

## Next Steps

1. ✅ Code fix pushed to GitHub
2. ⏭️ Railway will auto-deploy (if connected to GitHub)
3. ⏭️ Or manually trigger deploy in Railway dashboard
4. ⏭️ Wait 2-5 minutes for deployment
5. ⏭️ Test endpoints again

