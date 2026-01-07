# Render.com Deployment Guide

## Backend URL
**Production Backend**: https://grainology-rmg1.onrender.com

## Environment Variables for Render

Set these in your Render dashboard (Settings → Environment):

### Required Variables
```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your-strong-jwt-secret-key-here
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://grainologyagri.com
```

### Optional Variables (if using Cashfree)
```env
CASHFREE_CLIENT_ID=your_cashfree_client_id
CASHFREE_CLIENT_SECRET=your_cashfree_client_secret
CASHFREE_BASE_URL=https://api.cashfree.com
```

### Optional Variables (if using Didit.me)
```env
DIDIT_APP_ID=your_didit_app_id
DIDIT_API_KEY=your_didit_api_key
DIDIT_BASE_URL=https://verification.didit.me
DIDIT_WORKFLOW_ID=your-workflow-id-here
```

## Render Settings

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`
- **Auto-Deploy**: Yes

## Important Notes

1. **MongoDB Atlas**: 
   - Make sure to whitelist Render's IP addresses in MongoDB Atlas
   - Or allow all IPs (`0.0.0.0/0`) for testing

2. **CORS**: 
   - The backend is configured to accept requests from `https://grainologyagri.com`
   - Update `FRONTEND_URL` if your frontend domain changes

3. **Health Check**:
   - Test your deployment: `https://grainology-rmg1.onrender.com/health`
   - Should return: `{"status":"ok","message":"Grainology API is running"}`

## Testing the Deployment

```bash
# Test health endpoint
curl https://grainology-rmg1.onrender.com/health

# Test API endpoint
curl https://grainology-rmg1.onrender.com/api/auth/session
```

## Frontend Configuration

Update your frontend `.env` file:
```env
VITE_API_URL=https://grainology-rmg1.onrender.com/api
```

