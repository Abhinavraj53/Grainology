# IMMEDIATE FIX NEEDED

## Problem
User sees OLD registration flow:
- Step 1: Basic Information (Mobile, Language) ❌
- Should be: Step 1: Role Selection ✅

## What Needs to Change RIGHT NOW

### Step 1: ✅ DONE - Changed to Role Selection

### Step 2: Need to REPLACE "Address Details" with:
- **Verification Method Selection**
- For Individual (farmer/trader): PAN or Aadhaar choice
- For Company (fpo/corporate/etc): GST or CIN choice

### Step 3: Need to REPLACE "Account Details" with:
- **Document Verification (Cashfree)**
- User enters document details and verifies via Cashfree API

### Step 4: Need to REPLACE "Identity Verification (Didit)" with:
- **Auto-filled Details (Read-only)**
- Show verified data from Step 3 (name, DOB, address - all read-only)

### Step 5: Need to ADD:
- **Review & Create Account**
- Email, password, mobile
- Review all data
- Create account

## Current Flow (WRONG):
1. Basic Info
2. Address
3. Account Details + Role
4. Verification (Didit)

## New Flow (CORRECT):
1. Role Selection ✅
2. Verification Method ⏳
3. Cashfree Verification ⏳
4. Auto-filled Details ⏳
5. Review & Create ⏳

