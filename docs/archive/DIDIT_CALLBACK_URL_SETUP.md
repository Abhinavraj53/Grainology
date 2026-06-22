# 🔗 Didit.me Callback URL Setup Guide

## What is Callback URL?

The **Callback URL** (also called Webhook URL) is where Didit.me sends automatic status updates when verification is completed.

## 🔄 Two Different URLs:

### 1. **Verification URL** (What you provided)
- **URL**: `https://verify.didit.me/verify/4ZQuneoUZSlBugv4kqFIfg`
- **Purpose**: Where users go to complete verification
- **Generated**: Dynamically for each verification session

### 2. **Callback/Webhook URL** (What we need to set)
- **URL**: `http://localhost:3001/api/kyc/didit/webhook` (local)
- **Purpose**: Where Didit.me sends status updates to your backend
- **Location**: Set in Didit Console workflow settings

## ✅ Setup Steps:

### Step 1: Set Callback URL in Didit Console

1. Go to [Didit Business Console](https://business.didit.me/)
2. Navigate to **Workflows** → Your workflow (`e925a20e-34cd-42f0-9ea0-696253f403e8`)
3. Find **"Callback URL"** field
4. Enter:
   - **Local Testing (with ngrok)**: `https://your-ngrok-url.ngrok.io/api/kyc/didit/webhook`
   - **Production**: `https://your-production-domain.com/api/kyc/didit/webhook`

### Step 2: For Local Testing (Using ngrok)

Since Didit.me can't reach `localhost`, use ngrok:

```bash
# Install ngrok (if not installed)
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start your backend
cd backend
npm run dev

# In another terminal, start ngrok
ngrok http 3001

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Use in Didit Console: https://abc123.ngrok.io/api/kyc/didit/webhook
```

### Step 3: Verify Setup

Your backend webhook endpoint is ready at:
- **Route**: `POST /api/kyc/didit/webhook`
- **Status**: ✅ Already implemented
- **Location**: `backend/routes/kyc.js`

## 📋 Current Configuration:

```
✅ Workflow ID: e925a20e-34cd-42f0-9ea0-696253f403e8
✅ API Key: Configured in .env
✅ Webhook Endpoint: /api/kyc/didit/webhook (ready)
⚠️  Callback URL: Needs to be set in Didit Console
```

## 🧪 How It Works:

1. User uploads document → Backend creates session
2. Didit.me returns verification URL → User completes verification
3. Didit.me processes verification
4. Didit.me sends POST to your Callback URL with status
5. Backend updates user KYC status automatically

## ✅ Checklist:

- [x] Workflow ID set in .env
- [x] API Key configured
- [x] Webhook endpoint implemented
- [ ] Callback URL set in Didit Console ← **DO THIS**
- [ ] Test verification flow
- [ ] Verify webhook receives updates

