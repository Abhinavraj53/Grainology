# Localhost Setup Guide - Complete Instructions

## ✅ Files Created

1. **`.env`** - Backend environment variables
2. **`.env.local`** - Frontend environment variables

## 📋 Setup Steps

### Step 1: Update MongoDB URI

Open `.env` file and update the MongoDB URI:

```env
# If using local MongoDB:
MONGODB_URI=mongodb://localhost:27017/grainology

# OR if using MongoDB Atlas (keep your existing URI):
MONGODB_URI=your_existing_mongodb_atlas_connection_string
```

### Step 2: Configure Services

#### A. Cloudinary (Required for Document Upload)

1. Sign up at https://cloudinary.com/ (Free tier available)
2. Go to Dashboard
3. Copy your credentials:
   - Cloud Name
   - API Key
   - API Secret
4. Update `.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

#### B. Mailgun (Required for Email OTP)

1. Sign up at https://www.mailgun.com/ (1000 emails/month free)
2. Verify your domain OR use sandbox domain
3. Go to Settings → API Keys
4. Update `.env`:
   ```env
   MAILGUN_API_KEY=your_api_key
   MAILGUN_DOMAIN=mg.yourdomain.com
   MAILGUN_FROM_EMAIL=noreply@mg.yourdomain.com
   ```

#### C. WhatsApp API (Required for WhatsApp OTP)

**Option 1: Meta WhatsApp Business API**
1. Go to https://developers.facebook.com/
2. Create app → Add WhatsApp product
3. Get Access Token and Phone Number ID
4. Update `.env`:
   ```env
   WHATSAPP_API_URL=https://graph.facebook.com/v18.0
   WHATSAPP_API_KEY=your_access_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   ```

**Option 2: Development Mode (Mock)**
- Leave WhatsApp credentials empty for now
- OTP will be logged to console instead of sent
- You can test the flow without WhatsApp API

### Step 3: Install Dependencies

```bash
npm install
```

This installs:
- ✅ cloudinary
- ✅ mailgun.js
- ✅ All other dependencies

### Step 4: Start Development Servers

#### Option A: Run Separately (Recommended)

**Terminal 1 - Backend:**
```bash
npm run dev
```
Backend runs on: **http://localhost:3001**

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```
Frontend runs on: **http://localhost:5173**

#### Option B: Run Both Together

If you have `concurrently` installed:
```bash
npm run dev:all
```

### Step 5: Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health

## 🧪 Testing

### Test Registration Flow

1. Open http://localhost:5173/register
2. Complete the 4-step registration:
   - Step 1: Select user type (Farmer, Trader, etc.)
   - Step 2: Select document type (Aadhaar, PAN, etc.)
   - Step 3: Fill details + upload document
   - Step 4: Verify OTPs and register

### Test Admin Panel

1. Login as admin
2. Go to Admin Panel → Users
3. Click on any user
4. View verification document

## 🔧 Environment Variables Summary

### Backend (.env)
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...
MAILGUN_FROM_EMAIL=...
WHATSAPP_API_URL=...
WHATSAPP_API_KEY=...
WHATSAPP_PHONE_NUMBER_ID=...
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3001/api
```

## ⚠️ Important Notes

1. **MongoDB URI**: Keep your existing MongoDB connection string
2. **Services**: Configure Cloudinary, Mailgun, and WhatsApp for full functionality
3. **Development**: Some features work in mock mode if services aren't configured
4. **OTP**: In development, OTPs may be logged to console if services aren't configured

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB connection
- Verify PORT 3001 is available
- Check `.env` file exists and has correct format

### Frontend won't start
- Check if port 5173 is available
- Verify `.env.local` has `VITE_API_URL`
- Run `npm install` again

### Registration fails
- Check backend is running
- Verify MongoDB connection
- Check Cloudinary credentials (for document upload)
- Check console for errors

### OTP not sending
- Verify Mailgun/WhatsApp credentials
- Check service accounts are active
- For development, check console logs (OTP may be logged)

## 📝 Quick Commands

```bash
# Install dependencies
npm install

# Start backend
npm run dev

# Start frontend
npm run dev:frontend

# Check MongoDB connection
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"

# Check if ports are in use
lsof -i :3001  # Backend
lsof -i :5173  # Frontend
```

## ✅ Verification Checklist

- [ ] `.env` file created with all variables
- [ ] `.env.local` file created with `VITE_API_URL`
- [ ] MongoDB URI configured
- [ ] Dependencies installed (`npm install`)
- [ ] Backend starts successfully (`npm run dev`)
- [ ] Frontend starts successfully (`npm run dev:frontend`)
- [ ] Can access http://localhost:5173
- [ ] Can access http://localhost:3001/health

## 🚀 Ready to Go!

Once all services are configured and servers are running:
1. Open http://localhost:5173
2. Click "Register"
3. Complete the simple registration flow
4. Test the admin panel to view documents

Happy coding! 🎉
