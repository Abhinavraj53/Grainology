# Complete Cashfree Implementation Guide

## Implementation Status

### ✅ Completed:
1. Removed Didit routes from auth.js
2. Created Cashfree routes file
3. Registered Cashfree routes in server.js
4. Added Cashfree credentials to .env

### ⏳ To Complete:

## Backend:
1. Update Cashfree routes to match actual API structure
2. Remove Didit from kyc.js (entire file needs cleanup)
3. Remove Didit from .env

## Frontend:
1. **Complete rewrite of AuthPage.tsx** with new 5-step flow:
   - Step 1: Role Selection (farmer, trader, fpo, corporate, miller, financer)
   - Step 2: Verification Method
     - Individual (farmer/trader): PAN or Aadhaar
     - Company (fpo, corporate, etc.): GST or CIN
   - Step 3: Document Verification (Cashfree API)
   - Step 4: Auto-filled Details (Read-only from verified document)
   - Step 5: Review & Create Account

2. Remove all Didit references

## New Flow Details:

**Step 1 - Role Selection:**
- Dropdown: farmer, trader, fpo, corporate, miller, financer

**Step 2 - Verification Method:**
- If role is farmer/trader → Choose: PAN or Aadhaar
- If role is fpo/corporate/etc → Choose: GST or CIN
- Input document number
- For PAN: Also need name
- For Aadhaar: Can use OCR or DigiLocker

**Step 3 - Verification:**
- Call Cashfree API
- Verify document
- Show status

**Step 4 - Auto-filled (Read-only):**
- Name (from document)
- Date of Birth (if available)
- Address (if available)
- All fields disabled/read-only

**Step 5 - Final Details:**
- Email
- Password
- Mobile number
- Review all data
- Create account

