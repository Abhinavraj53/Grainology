# CORS and 502 Error Fix - Grainology Project

## Problem Summary
The Grainology application was experiencing:
1. **CORS Errors**: "No 'Access-Control-Allow-Origin' header is present on the requested resource"
2. **502 Bad Gateway Errors**: Backend returning 502 errors from Render deployment
3. **Frontend unable to communicate** with backend API at `https://grainology-xcg8.onrender.com`

## Root Cause Analysis

### 1. CORS Policy Blocking
- Frontend origin: `https://grainologyagri.com`
- Backend origin: `https://grainology-xcg8.onrender.com`
- CORS headers were not being sent on all responses, especially error responses

### 2. Server Crash/Unresponsiveness  
- Backend likely crashing or not starting due to missing `MONGODB_URI` environment variable
- Server was trying to connect to database before starting, causing hangs
- Render was returning 502 because the app wasn't responding

## Solutions Implemented

### 1. Enhanced CORS Header Handling
**File**: `server.js`

**Changes**:
- Added CORS header middleware that applies to ALL responses (including errors and 404s)
- Implemented custom CORS header application function `applyCorsHeaders()` that:
  - Validates incoming origin against whitelist
  - Sets `Access-Control-Allow-Origin` header
  - Adds `Vary: Origin` header for caching
  - Allows credentials
  - Sets proper preflight (OPTIONS) status codes

**Configuration**:
- Allowed origins include:
  - `http://localhost:3000` (local dev)
  - `http://localhost:5173` (Vite dev)
  - `https://grainologyagri.com` (production)
  - `https://www.grainologyagri.com` (www variant)
  - Environment-configured origins via `CORS_ORIGINS` or `ALLOWED_ORIGINS`

### 2. Graceful Server Startup
**File**: `server.js`

**Changes**:
- Modified server startup to NOT wait for database connection
- Server now starts immediately and serves API even if DB is temporarily unavailable
- Database connection happens asynchronously in background
- Auto-retry logic for database reconnection (every 10 seconds by default)

**Code**:
```javascript
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API running on http://0.0.0.0:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});
```

### 3. Improved Error Handling
**File**: `server.js`

**Changes**:
- Error handlers now always include CORS headers
- 404 responses include proper CORS headers
- Better error logging with stack traces (in development)
- Graceful shutdown handling for SIGTERM signals

## Environment Variables Required

Make sure these are set in your Render deployment:

```env
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/grainology
PORT=3001
NODE_ENV=production

# Optional but recommended
FRONTEND_URL=https://grainologyagri.com
CORS_ORIGINS=https://grainologyagri.com,https://www.grainologyagri.com
DB_RETRY_INTERVAL_MS=10000
```

## Testing the Fix

### 1. Test CORS Headers
```bash
curl -H "Origin: https://grainologyagri.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://grainology-xcg8.onrender.com/api/health -v
```

Should return:
- `Access-Control-Allow-Origin: https://grainologyagri.com`
- `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`
- HTTP 204 status

### 2. Test Health Endpoint
```bash
curl https://grainology-xcg8.onrender.com/health
```

Should return: `{"status":"ok"}`

### 3. Test Authenticated Endpoint
```bash
curl -H "Cookie: auth_token=YOUR_TOKEN" \
     https://grainology-xcg8.onrender.com/api/auth/session
```

## Deployment Steps

1. **Update environment variables** on Render:
   - Go to Service > Environment
   - Ensure `MONGODB_URI` is set correctly
   - Verify `CORS_ORIGINS` includes all frontend URLs

2. **Deploy the updated code**:
   ```bash
   git add .
   git commit -m "fix: Improve CORS header handling and graceful server startup"
   git push origin main
   ```

3. **Verify deployment**:
   - Check Render logs for "✅ API running on" message
   - Test CORS preflight requests
   - Test actual API calls from frontend

## Troubleshooting

### Still Getting CORS Errors?
1. Check browser console for exact error message
2. Verify `CORS_ORIGINS` on Render includes your frontend domain
3. Check Render logs for any error messages
4. Ensure frontend is sending from exact origin (protocol+domain+port must match)

### Still Getting 502 Errors?
1. Check Render logs for database connection errors
2. Verify `MONGODB_URI` is correctly set
3. If using MongoDB Atlas, check IP whitelist (allow 0.0.0.0/0 for testing)
4. Check if MongoDB service is running

### Server Not Starting?
1. Verify `NODE_ENV` is set (shouldn't cause crash but good to check)
2. Check all required npm packages are installed
3. Look for any missing `.env` variables

## Related Files Modified
- `server.js` - Main API server configuration

## Verification Checklist
- [x] CORS headers applied to all responses
- [x] Server starts without waiting for DB
- [x] Error responses include CORS headers
- [x] Preflight (OPTIONS) requests handled
- [x] 404 responses include CORS headers
- [x] Graceful shutdown on SIGTERM
- [x] Better error logging
- [x] Syntax validation passed

## Next Steps
- Monitor Render logs for any remaining issues
- Consider adding request rate limiting in future
- Add monitoring/alerting for 5xx errors
- Document API endpoints with CORS requirements
