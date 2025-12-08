# Complete Cashfree Integration Implementation Plan

## Overview
Replace Didit.me with Cashfree Payments API for KYC verification with role-based registration flow.

## Implementation Steps

### Backend Changes:
1. ✅ Create Cashfree routes (done)
2. ⏳ Update Cashfree routes to match actual API structure
3. ⏳ Remove Didit.me routes from auth.js (lines 37-253)
4. ⏳ Remove Didit.me routes from kyc.js
5. ⏳ Remove Didit.me from .env
6. ⏳ Add GST/CIN verification routes (if needed)

### Frontend Changes:
1. ⏳ Complete rewrite of AuthPage.tsx with new 5-step flow:
   - Step 1: Role selection
   - Step 2: Verification method selection (PAN/Aadhaar for individuals, GST/CIN for companies)
   - Step 3: Document verification
   - Step 4: Auto-fill verified details (read-only)
   - Step 5: Review and create account
2. ⏳ Remove all Didit.me references from frontend

## Registration Flow Details

### Step 1: Role Selection
- Dropdown with: farmer, trader, fpo, corporate, miller, financer
- Company roles: fpo, corporate

### Step 2: Verification Method
- **For Individual Roles (farmer, trader):**
  - Choose: PAN or Aadhaar
  - Input: PAN number + name OR Aadhaar number
- **For Company Roles (fpo, corporate, etc.):**
  - Choose: GST or CIN
  - Input: GST number OR CIN number

### Step 3: Document Verification
- Call Cashfree API
- Verify document
- Show verification status

### Step 4: Auto-filled Details (Read-only)
- Name (from document)
- Date of Birth (from document)
- Address (from document)
- Other verified details
- All fields read-only

### Step 5: Basic Details & Confirmation
- Email
- Password
- Mobile number
- Other required fields
- Review and create account

