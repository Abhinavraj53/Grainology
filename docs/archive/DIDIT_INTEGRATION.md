# Didit.me ID Verification Integration

## Overview
This project now supports two KYC verification methods:
1. **Didit.me** - Document image verification (AI-powered, fraud detection)
2. **QuickeKYC** - Number-based verification (Aadhaar/PAN/GST numbers)

## Configuration

### Backend Environment Variables
Add these to `backend/.env`:

```env
# Didit.me Configuration
DIDIT_APP_ID=9e436e07-d8a2-4e4e-8832-fba0e66183e6
DIDIT_API_KEY=uaYe00AVB711Cv_wf1Rky-ZUW4L-_6-fIa9WlNlg8GM
DIDIT_BASE_URL=https://verification.didit.me
DIDIT_WORKFLOW_ID=your-workflow-id-here
APP_BASE_URL=http://localhost:3001
```

### Setup Steps
1. Go to [Didit Business Console](https://business.didit.me/)
2. Create a verification workflow
3. Copy the `workflow_id` and add it to `DIDIT_WORKFLOW_ID` in `.env`
4. Configure webhook URL in Didit Console: `http://your-domain/api/kyc/didit/webhook`

## API Endpoints

### Public Endpoints (Pre-Signup)
- `POST /api/auth/didit/create-session-before-signup` - Create verification session
- `POST /api/auth/didit/verify-document-before-signup` - Upload and verify document (multipart/form-data)

### Authenticated Endpoints
- `POST /api/kyc/didit/create-session` - Create verification session (requires auth)
- `POST /api/kyc/didit/verify-document` - Upload and verify document (requires auth, multipart/form-data)
- `GET /api/kyc/didit/status/:verificationId` - Check verification status

### Webhook Endpoint
- `POST /api/kyc/didit/webhook` - Receive verification results from Didit.me

## Frontend Usage

### Registration Flow
1. User completes Steps 1-3
2. In Step 4 (Identity Verification):
   - **Option 1**: Choose "Document Upload" → Upload ID document → Verify
   - **Option 2**: Choose "Number Verification" → Enter Aadhaar/PAN/GST → Verify
3. Verification status is stored with user account

### Verification Methods

#### Didit.me (Document Upload)
- Upload JPEG, PNG, or PDF
- Supports: Aadhaar, PAN, Passport, Driving License, Voter ID
- AI-powered document verification
- Fraud detection and tampering checks

#### QuickeKYC (Number Verification)
- Enter document numbers directly
- Supports: Aadhaar (12 digits), PAN (10 chars), GST (15 chars)
- Faster verification process

## Testing

1. **Test Didit.me Document Upload:**
   ```
   1. Start registration
   2. Reach Step 4
   3. Select "Document Upload"
   4. Choose document type
   5. Upload document image
   6. Click "Verify Document"
   ```

2. **Test QuickeKYC Number Verification:**
   ```
   1. Start registration
   2. Reach Step 4
   3. Select "Number Verification"
   4. Choose document type (Aadhaar/PAN/GST)
   5. Enter document number
   6. Click "Verify Identity"
   ```

## Files Modified

### Backend
- `backend/routes/kyc.js` - Added Didit.me routes
- `backend/routes/auth.js` - Added pre-signup Didit.me routes
- `backend/package.json` - form-data package (already installed)

### Frontend
- `src/components/AuthPage.tsx` - Added document upload UI and Didit.me integration

## Notes
- Didit.me requires a workflow to be created in their console
- Webhook URL must be publicly accessible for production
- Document size limit: 10MB
- Supported formats: JPEG, PNG, PDF
