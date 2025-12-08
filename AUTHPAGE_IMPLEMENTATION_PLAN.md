# AuthPage.tsx - New 5-Step Registration Flow Implementation

## Current Status
- ❌ Old flow still in place (4 steps: Basic Info → Address → Account → Verification)
- ❌ Still using Didit.me references
- ❌ Role selection happens in Step 3 (too late)

## New Implementation (5 Steps)

### Step 1: Role Selection (FIRST)
- User selects their role FIRST
- Dropdown: farmer, trader, fpo, corporate, miller, financer
- This determines what verification options they see

### Step 2: Verification Method Selection
**For Individual Roles (farmer, trader):**
- Choose: PAN Card OR Aadhaar Card
- Input fields based on choice

**For Company Roles (fpo, corporate, etc.):**
- Choose: GST Number OR CIN Number
- Input fields based on choice

### Step 3: Document Verification (Cashfree)
- User enters document details
- Calls Cashfree API
- Shows verification status

### Step 4: Auto-filled Details (Read-only)
- After successful verification:
  - Name (from document) - READ ONLY
  - Date of Birth (from document) - READ ONLY
  - Address (from document) - READ ONLY
  - All fields auto-filled and disabled

### Step 5: Review & Create Account
- Email
- Password
- Mobile number
- Address details
- Review all information
- Create account

## Changes Required
1. Move role selection to Step 1
2. Add verification method selection in Step 2
3. Replace Didit.me with Cashfree API calls
4. Add auto-fill functionality after verification
5. Add review step before account creation
6. Remove all Didit.me references

