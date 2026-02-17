# Simple Registration System - Implementation Guide

## Overview
Registration process को simplify किया गया है। अब Cashfree और Aadhaar verification APIs use नहीं हो रहे हैं। Simple registration flow implement किया गया है।

## New Registration Flow

### Step 1: User Type Selection
- User selects "Who are you" (user type):
  - Farmer
  - Trader
  - FPO
  - Corporate
  - Miller
  - Financer

### Step 2: Document Type Selection (Dynamic)
- Based on user type, document options appear:
  - **Farmer**: Aadhaar, PAN, Driving License, Voter ID
  - **Trader**: Aadhaar, PAN, GSTIN, Driving License
  - **FPO**: Aadhaar, PAN, GSTIN, CIN, Registration Certificate
  - **Corporate**: GSTIN, CIN, PAN, Registration Certificate
  - **Miller**: Aadhaar, PAN, GSTIN, License
  - **Financer**: Aadhaar, PAN, GSTIN, License

### Step 3: User Information
- Full Name (required)
- WhatsApp Number (required)
- Email ID (optional)
- Password (required, min 6 characters)

### Step 4: Document Upload
- User uploads verification document (PDF or Image)
- Document is uploaded to Cloudinary
- View and Download URLs stored in MongoDB

### Step 5: OTP Verification
- **WhatsApp OTP** (required): Sent to WhatsApp number
- **Email OTP** (if email provided): Sent via Mailgun

### Step 6: Registration Complete
- Account created
- Welcome email sent (if email provided)
- User logged in automatically

## API Endpoints

### 1. Send WhatsApp OTP
```
POST /api/registration/send-whatsapp-otp
Body: { mobile_number: "9876543210" }
```

### 2. Send Email OTP (Optional)
```
POST /api/registration/send-email-otp
Body: { email: "user@example.com" }
```

### 3. Get Document Options
```
POST /api/registration/get-document-options
Body: { user_type: "farmer" }
Response: { document_options: [...] }
```

### 4. Complete Registration
```
POST /api/registration/register
Content-Type: multipart/form-data
Body:
  - name: "User Name"
  - mobile_number: "9876543210"
  - email: "user@example.com" (optional)
  - password: "password123"
  - user_type: "farmer"
  - document_type: "aadhaar"
  - whatsapp_otp: "123456"
  - email_otp: "123456" (if email provided)
  - document: [file]
```

### 5. Admin: View User Documents
```
GET /api/admin/users/:id/verification-document
Headers: Authorization: Bearer <admin_token>
```

### 6. Admin: Get All Users with Documents
```
GET /api/admin/users-with-documents
Headers: Authorization: Bearer <admin_token>
```

## Environment Variables Required

Add these to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Mailgun Configuration (for Email OTP and Welcome Email)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
MAILGUN_FROM_EMAIL=noreply@yourdomain.com

# WhatsApp API Configuration (for WhatsApp OTP)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_KEY=your_whatsapp_api_key
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

## Installation

Install new dependencies:
```bash
npm install cloudinary mailgun.js
```

## Database Changes

User model में `uploaded_document` field add किया गया है:
```javascript
uploaded_document: {
  document_type: String,
  cloudinary_url: String,
  cloudinary_public_id: String,
  view_url: String,
  download_url: String,
  file_name: String,
  file_size: Number,
  uploaded_at: Date,
}
```

## Commented Out Code

- `routes/cashfreeKYC.js` - All Cashfree routes commented out in `server.js`
- `routes/sandboxKYC.js` - All Sandbox KYC routes commented out in `server.js`

## Admin Panel Features

Admin can:
1. View all users with verification documents
2. View specific user's verification document
3. See document view and download URLs
4. Verify/reject user documents (update `kyc_status`)

## Frontend Integration

Frontend में ये changes करने होंगे:

1. **Registration Form**:
   - Step 1: User type dropdown
   - Step 2: Document type dropdown (dynamic, based on user type)
   - Step 3: Name, WhatsApp, Email (optional), Password
   - Step 4: Document upload
   - Step 5: OTP verification (WhatsApp + Email if provided)

2. **API Calls**:
   - Call `/api/registration/send-whatsapp-otp` when user enters mobile
   - Call `/api/registration/send-email-otp` if email provided
   - Call `/api/registration/get-document-options` when user type changes
   - Call `/api/registration/register` with all data + OTPs + document

3. **Admin Panel**:
   - Show users with documents
   - View document in new tab
   - Download document
   - Update KYC status

## Testing

1. Test WhatsApp OTP:
```bash
curl -X POST http://localhost:3001/api/registration/send-whatsapp-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile_number": "9876543210"}'
```

2. Test Registration:
```bash
curl -X POST http://localhost:3001/api/registration/register \
  -F "name=Test User" \
  -F "mobile_number=9876543210" \
  -F "email=test@example.com" \
  -F "password=password123" \
  -F "user_type=farmer" \
  -F "document_type=aadhaar" \
  -F "whatsapp_otp=123456" \
  -F "email_otp=123456" \
  -F "document=@/path/to/document.pdf"
```

## Notes

- OTPs are stored in memory (for production, use Redis)
- OTP expiry: 10 minutes
- Max OTP attempts: 5
- Document size limit: 10MB
- Supported formats: JPEG, PNG, PDF
- Documents stored in Cloudinary folder: `grainology/verification/{user_type}`

## Migration

Existing users के लिए:
- Old registration flow still works (via `/api/auth/signup`)
- New users should use `/api/registration/register`
- Admin can view both old and new verification documents
