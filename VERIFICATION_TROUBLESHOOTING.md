# KYC Verification Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Verification failed" error

#### Possible Causes:

1. **QuickeKYC API Key Issues**
   - Check if `QUICKEKYC_API_KEY` is set in `backend/.env`
   - Verify the API key is valid and active
   - Default test key: `d94a9e6a-3784-42ae-9eb0-7e719f93a43e`

2. **Invalid Document Numbers**
   - **Aadhaar**: Must be exactly 12 digits (no spaces/dashes)
   - **PAN**: Must be exactly 10 characters (e.g., ABCDE1234F)
   - **GST**: Must be exactly 15 characters (e.g., 29AAACU1901H1ZK)
   - **PAN Verification**: Requires Name and Date of Birth

3. **Network/API Issues**
   - QuickeKYC API might be down or slow
   - Check backend terminal logs for API responses
   - Verify internet connection

4. **API Response Format**
   - QuickeKYC might return different response formats
   - Check browser console (F12) for detailed error logs
   - Check backend terminal for full API response

## How to Debug

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try verification again
4. Look for error messages and "Verification API Response" logs

### Step 2: Check Backend Logs
1. Open terminal where backend is running
2. Look for:
   - "Pre-signup KYC verification - Calling QuickeKYC API"
   - "QuickeKYC Response Status"
   - "QuickeKYC Response Text"
   - Any error messages

### Step 3: Verify API Configuration
Check `backend/.env` file:
```env
QUICKEKYC_API_KEY=your-api-key-here
QUICKEKYC_BASE_URL=https://api.quickekyc.com
```

### Step 4: Test with Valid Data
- Use correct format for document numbers
- For PAN: Provide exact name as per PAN card
- For PAN: Use correct Date of Birth format (YYYY-MM-DD)

## Quick Test

To test if the API is reachable, try:
1. Use a valid 12-digit Aadhaar number (if testing Aadhaar)
2. Use a valid PAN format: ABCDE1234F (if testing PAN)
3. Make sure all required fields are filled

## Alternative: Skip Verification

If verification keeps failing:
1. Click "Skip verification for now (can verify later)"
2. Complete registration
3. Verify KYC later from profile settings

## Need More Help?

Check the logs:
- Backend terminal: Shows API calls and responses
- Browser console: Shows frontend errors
- Network tab: Shows HTTP request/response details
