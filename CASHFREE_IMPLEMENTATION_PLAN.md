# Cashfree Integration Implementation Plan

## Overview
Replace Didit.me with Cashfree Payments API for KYC verification with role-based registration flow.

## User Requirements

### Registration Flow:
1. **Step 1: Role Selection**
   - User selects role: farmer, trader, fpo, corporate, miller, financer
   
2. **Step 2: Verification Method Selection**
   - **For Farmer/Trader**: Choose PAN or Aadhaar
   - **For Company roles (fpo, corporate, etc.)**: Choose GST or CIN
   
3. **Step 3: Document Verification**
   - Verify using Cashfree API
   - Auto-fill verified details (read-only)
   
4. **Step 4: Basic Details & Confirmation**
   - Review auto-filled details
   - Fill remaining required fields
   - Confirm and create account

## Cashfree API Integration

### Credentials:
- Client ID: YOUR_CASHFREE_CLIENT_ID
- Client Secret: YOUR_CASHFREE_CLIENT_SECRET

### APIs to Implement:

1. **PAN Verification**
   - Endpoint: `/payout/v1.2/validation/pan` (or Secure ID endpoint)
   - Method: POST
   - Required: PAN number, Name
   
2. **Aadhaar Verification**
   - Option 1: DigiLocker (Recommended)
     - Create DigiLocker link
     - Redirect user
     - Get verification status
   - Option 2: OCR
     - Upload Aadhaar image
     - Extract and verify details
     
3. **GST/CIN Verification** (if available)
   - Check Cashfree KBY (Know Your Business) APIs
   - Or use alternative verification method

## Implementation Steps

1. ✅ Create Cashfree routes (`backend/routes/cashfreeKYC.js`)
2. ✅ Add Cashfree credentials to `.env`
3. ⏳ Register routes in `server.js`
4. ⏳ Remove Didit.me routes from `auth.js`
5. ⏳ Update `AuthPage.tsx` with new registration flow
6. ⏳ Implement auto-fill functionality
7. ⏳ Remove Didit.me from `.env`
8. ⏳ Update KYC routes to use Cashfree

## Note on GST/CIN
Cashfree may not have direct GST/CIN verification. We may need to:
- Use Cashfree's KBY (Know Your Business) APIs if available
- Or implement manual verification for GST/CIN
- Or use alternative service for company verification

