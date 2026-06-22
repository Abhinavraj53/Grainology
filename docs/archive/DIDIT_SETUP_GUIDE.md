# Didit.me Integration Setup Guide

## ✅ Configuration Complete

### Workflow Details:
- **Workflow ID**: `e925a20e-34cd-42f0-9ea0-696253f403e8`
- **Verification URL Format**: `https://verify.didit.me/verify/[SESSION_ID]`
- **Example URL**: `https://verify.didit.me/verify/4ZQuneoUZSlBugv4kqFIfg`

### Important URLs:

1. **Verification URL** (User-facing):
   - Format: `https://verify.didit.me/verify/[SESSION_ID]`
   - This is where users go to complete verification
   - Generated dynamically for each session

2. **Webhook/Callback URL** (Backend endpoint):
   - **Local**: `http://localhost:3001/api/kyc/didit/webhook`
   - **Production**: `https://your-domain.com/api/kyc/didit/webhook`
   - This is where Didit.me sends status updates

## 🔧 Setup Steps in Didit Console

### Step 1: Configure Workflow
1. Go to [Didit Business Console](https://business.didit.me/)
2. Open your workflow: `e925a20e-34cd-42f0-9ea0-696253f403e8`
3. Set **Callback URL**:
   - **For Local Testing (using ngrok)**: `https://your-ngrok-url.ngrok.io/api/kyc/didit/webhook`
   - **For Production**: `https://your-production-domain.com/api/kyc/didit/webhook`

### Step 2: Workflow Settings
- **Workflow Name**: Grainology KYC Verification
- **Type**: KYC Verification
- **Callback URL**: (Set as above)
- **Steps**: 
  - ✅ ID Verification (FREE) - **Required**
  - Optional: Liveness, Face Match

### Step 3: ID Verification Configuration
- **Countries**: India ✅
- **Documents**: ID CARD, PASSPORT, DRIVER'S LICENSE
- **Capture Method**: Camera scan ✅, Upload ✅

## 🔄 How It Works

### Flow:
1. **User uploads document** → Backend creates Didit.me session
2. **Didit.me returns verification URL** → User redirected to verify
3. **User completes verification** → Didit.me processes document
4. **Didit.me sends webhook** → Backend updates user KYC status
5. **User returns to app** → KYC status updated automatically

### Backend Endpoints:
- `POST /api/auth/didit/verify-document-before-signup` - Document upload (pre-signup)
- `POST /api/kyc/didit/verify-document` - Document upload (authenticated)
- `POST /api/kyc/didit/webhook` - Webhook receiver (public)

## 📝 Testing Locally

### Option 1: Use ngrok (Recommended)
```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start your backend
cd backend && npm run dev

# In another terminal, start ngrok
ngrok http 3001

# Use the ngrok URL in Didit Console Callback URL:
# https://abc123.ngrok.io/api/kyc/didit/webhook
```

### Option 2: Test without webhook
- Users can still verify manually
- You can check verification status using the status endpoint
- Webhook will work once you deploy to production

## 🚀 Production Setup

1. Deploy your backend to a server
2. Set `APP_BASE_URL` in `.env`:
   ```env
   APP_BASE_URL=https://api.yourdomain.com
   ```
3. Update Callback URL in Didit Console:
   ```
   https://api.yourdomain.com/api/kyc/didit/webhook
   ```

## ✅ Verification

Your backend is now configured with:
- ✅ Workflow ID: `e925a20e-34cd-42f0-9ea0-696253f403e8`
- ✅ API Key: Configured in `.env`
- ✅ Webhook endpoint: `/api/kyc/didit/webhook`
- ✅ All routes using Didit.me

Ready to test!

