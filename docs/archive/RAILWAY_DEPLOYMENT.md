# Railway.com Deployment Guide

## Backend URL
**Production Backend**: `https://grainology-production.up.railway.app`  
**Internal Service URL**: `grainology.railway.internal` (for service-to-service communication only)

## Environment Variables for Railway

Set these in your Railway dashboard (Variables tab):

### Required Variables
```env
NODE_ENV=production
PORT=3001
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

## Railway Settings

- **Build Command**: `npm install`
- **Start Command**: `npm start` or `node server.js`
- **Health Check Path**: `/health`
- **Auto-Deploy**: Yes (if connected to GitHub)

## Important Notes

1. **MongoDB Atlas**: 
   - Make sure to whitelist Railway's IP addresses in MongoDB Atlas
   - Or allow all IPs (`0.0.0.0/0`) for testing

2. **CORS**: 
   - The backend is configured to accept requests from `https://grainologyagri.com`
   - Update `FRONTEND_URL` if your frontend domain changes

3. **Health Check**:
   - Test your deployment: `https://grainology-production.up.railway.app/health`
   - Should return: `{"status":"ok","message":"Grainology API is running"}`

4. **Internal vs Public URLs**:
   - `grainology.railway.internal` - Use for internal service-to-service communication
   - `grainology-production.up.railway.app` - Use for frontend/external API calls
   - You can also set up a custom domain in Railway settings

## Testing the Deployment

```bash
# Test health endpoint
curl https://grainology-production.up.railway.app/health

# Test API endpoint
curl https://grainology-production.up.railway.app/api/auth/session
```

## Frontend Configuration

Update your frontend `.env` file:
```env
VITE_API_URL=https://grainology-production.up.railway.app/api
```

Or if using a custom domain:
```env
VITE_API_URL=https://api.grainologyagri.com/api
```

## Custom Domain Setup

1. Go to Railway dashboard → Your Service → Settings → Networking
2. Add your custom domain (e.g., `api.grainologyagri.com`)
3. Update DNS records as instructed by Railway
4. Update `VITE_API_URL` in frontend `.env` to use the custom domain

