# DigiLocker Verification Fix - Summary

## Issues Fixed:

### ❌ Previous Issues:
1. Using wrong API endpoint (`/pg/lrs/digilocker/link`)
2. Wrong authentication method (Bearer token for verification APIs)
3. Single endpoint approach without fallback
4. No proper error handling

### ✅ Fixes Applied:

#### 1. Updated API Endpoints
- **Primary Method**: Uses Cashfree Verification API
  - Endpoint: `/verification/digilocker`
  - Status: `/verification/digilocker?verification_id={id}`
  - Document: `/verification/digilocker/document/AADHAAR?verification_id={id}`

#### 2. Fixed Authentication
- **Primary**: Uses `x-client-id` and `x-client-secret` headers (correct for Verification API)
- **Fallback**: Uses Bearer token authentication for old endpoints

#### 3. Added Dual-Method Approach
- **Method 1**: Try Cashfree Verification API first (recommended)
- **Method 2**: Fallback to old endpoint if Method 1 fails
- Better error handling and logging

#### 4. Improved Request Structure
```javascript
// New Verification API Request
{
  verification_id: reference_id,
  document_requested: ['AADHAAR'],
  redirect_url: callback_url,
  user_flow: 'signup'
}
```

## Changes Made:

### File: `backend/routes/cashfreeKYC.js`

1. **Updated `verify-aadhaar-number` route**:
   - Now tries Verification API first
   - Falls back to old endpoint if needed
   - Better error messages

2. **Updated `digilocker-status` route**:
   - Uses Verification API to check status
   - Fetches document details from `/verification/digilocker/document/AADHAAR`
   - Falls back to old endpoint if needed

3. **Updated `getCashfreeAccessToken`**:
   - Returns `null` instead of throwing (for graceful fallback)
   - Better for Verification API (uses client credentials directly)

## API Endpoints Used:

### Primary (Verification API):
- **Create Link**: `POST /verification/digilocker`
- **Check Status**: `GET /verification/digilocker?verification_id={id}`
- **Get Document**: `GET /verification/digilocker/document/AADHAAR?verification_id={id}`

### Fallback (Old API):
- **Create Link**: `POST /pg/lrs/digilocker/link`
- **Check Status**: `GET /pg/lrs/digilocker/status/{referenceId}`

## Testing:

1. **Restart backend server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Test Aadhaar verification**:
   - Enter 12-digit Aadhaar number
   - Click "Verify Aadhaar"
   - Should open DigiLocker link in popup

3. **Check server logs**:
   - Look for "Cashfree Verification API" or "Fallback" messages
   - Verify which method is being used

## Configuration:

Ensure `.env` has:
```
CASHFREE_CLIENT_ID=YOUR_CASHFREE_CLIENT_ID
CASHFREE_CLIENT_SECRET=YOUR_CASHFREE_CLIENT_SECRET
CASHFREE_BASE_URL=https://sandbox.cashfree.com
```

## Expected Behavior:

1. User enters Aadhaar number → Format validated
2. System creates DigiLocker link → Opens in popup
3. User authenticates via DigiLocker → Status polled
4. System fetches verified details → Auto-fills form
5. User proceeds to Step 4 → Details shown (read-only)

## Error Handling:

- If Verification API fails → Tries fallback endpoint
- If both fail → Returns format validation only
- Clear error messages in all cases
- Detailed logging for debugging
