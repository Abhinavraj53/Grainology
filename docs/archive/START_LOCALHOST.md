# Localhost Development Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install all dependencies including:
- Backend: Express, MongoDB, Cloudinary, Mailgun, etc.
- Frontend: React, Vite, Tailwind CSS, etc.

### 2. Configure Environment Variables

#### Backend `.env` File
Create/update `.env` file in root directory:

```env
# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# MongoDB (keep your existing MongoDB URI)
MONGODB_URI=your_mongodb_connection_string_here

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Cloudinary (for document storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Mailgun (for email OTP and welcome emails)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain.com
MAILGUN_FROM_EMAIL=noreply@your_mailgun_domain.com

# WhatsApp API (for WhatsApp OTP)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_KEY=your_whatsapp_api_key
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

#### Frontend `.env.local` File
Create/update `.env.local` file in root directory:

```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Start Development Servers

#### Terminal 1: Backend Server
```bash
npm run dev
```
Backend will run on: **http://localhost:3001**

#### Terminal 2: Frontend Server
```bash
npm run dev:frontend
```
Frontend will run on: **http://localhost:5173**

### 4. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health

## Service Setup Instructions

### Cloudinary Setup (Required for Document Upload)

1. Go to https://cloudinary.com/
2. Sign up for free account
3. Go to Dashboard
4. Copy:
   - Cloud Name
   - API Key
   - API Secret
5. Add to `.env` file

### Mailgun Setup (Required for Email OTP)

1. Go to https://www.mailgun.com/
2. Sign up for free account (1000 emails/month free)
3. Verify your domain or use sandbox domain
4. Go to Settings → API Keys
5. Copy API Key
6. Add to `.env` file:
   - `MAILGUN_API_KEY`: Your API key
   - `MAILGUN_DOMAIN`: Your verified domain (e.g., `mg.yourdomain.com`)
   - `MAILGUN_FROM_EMAIL`: Email from your domain (e.g., `noreply@mg.yourdomain.com`)

### WhatsApp API Setup (Required for WhatsApp OTP)

**Option 1: Meta WhatsApp Business API**
1. Go to https://developers.facebook.com/
2. Create a Meta App
3. Add WhatsApp Business API product
4. Get:
   - Access Token (API Key)
   - Phone Number ID
5. Add to `.env` file

**Option 2: Twilio WhatsApp (Alternative)**
1. Go to https://www.twilio.com/
2. Sign up and get WhatsApp-enabled number
3. Use Twilio API instead

**Option 3: Development Mode (Mock)**
- For development, you can leave WhatsApp credentials empty
- OTP will be logged to console instead of sent

## Testing Registration Flow

1. Open http://localhost:5173/register
2. Select user type (e.g., Farmer)
3. Select document type (e.g., Aadhaar)
4. Fill in details:
   - Name
   - WhatsApp Number (10 digits)
   - Email (optional)
   - Password
5. Upload document (PDF or Image)
6. Click "Send OTP" for WhatsApp
7. Enter OTP and register

## Testing Admin Panel

1. Login as admin
2. Go to Admin Panel → Users
3. Click on any user
4. See "Uploaded Verification Document" section
5. Click "View Document" or "Download"

## Troubleshooting

### MongoDB Connection Error
- Check if MongoDB is running locally
- Or verify MongoDB Atlas connection string
- Check IP whitelist in MongoDB Atlas

### Cloudinary Upload Fails
- Verify Cloudinary credentials in `.env`
- Check file size (max 10MB)
- Check file format (JPEG, PNG, PDF only)

### Email/WhatsApp OTP Not Sending
- Check service credentials in `.env`
- For development, check console logs (OTP may be logged instead)
- Verify service accounts are active

### Frontend Can't Connect to Backend
- Check `VITE_API_URL` in `.env.local`
- Ensure backend is running on port 3001
- Check CORS settings in `server.js`

## Development Scripts

```bash
# Start backend only
npm run dev

# Start frontend only
npm run dev:frontend

# Start both (requires two terminals)
# Terminal 1: npm run dev
# Terminal 2: npm run dev:frontend

# Build for production
npm run build

# Production start
npm start
```

## Default Ports

- **Backend**: 3001
- **Frontend**: 5173 (Vite default)

## Important Notes

1. **MongoDB URI**: Keep your existing MongoDB connection string
2. **Services**: Cloudinary, Mailgun, and WhatsApp need to be configured for full functionality
3. **Development Mode**: Some features may work in mock mode if services aren't configured
4. **OTP Storage**: OTPs are stored in memory (for production, use Redis)
