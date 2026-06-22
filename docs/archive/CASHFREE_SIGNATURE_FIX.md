# Cashfree Authentication Setup - IP Whitelisting Guide

## Current Configuration
**IP Whitelisting is now the default authentication method** (no public key signature required).

## Setup IP Whitelisting

### Step 1: Get Your Server IP Address

**For Render.com:**
1. Check your service logs for outbound IP
2. Or use a service to detect your IP:
   ```bash
   curl https://api.ipify.org
   ```
3. Render services typically have a static outbound IP - check Render documentation

**For other platforms:**
- Check your server's public IP address
- For dynamic IPs, you may need to update the whitelist periodically

### Step 2: Configure in Cashfree Dashboard

1. Log in to Cashfree dashboard
2. Go to **Developers** → **Two-Factor Authentication**
3. Click **Switch Method** button
4. Select **IP Whitelisting** (not Public Key)
5. Click **Add IP Address**
6. Enter your server's IP address
7. Save the configuration

### Step 3: Verify Configuration

The code is already configured to use IP whitelisting by default. No environment variables needed!

To verify:
```bash
curl https://grainology-rmg1.onrender.com/api/cashfree/diagnostics
```

You should see:
- `authenticationMode: "IP Whitelisting"`
- `usingIpWhitelisting: true`

## Alternative: Using Public Key Signature (Not Recommended)

If you prefer to use public key signature instead of IP whitelisting:

1. Set environment variable:
   ```env
   CASHFREE_USE_SIGNATURE=true
   ```

2. Follow the public key setup steps below

### Public Key Configuration (Optional)

#### Step 1: Verify Client ID Matches
The Client ID used in signature must **exactly** match the one in Cashfree dashboard:

1. Check your environment variable:
   ```bash
   echo $CASHFREE_CLIENT_ID
   ```

2. Compare with Cashfree dashboard:
   - Go to **Developers** → **API Keys**
   - Verify the Client ID matches exactly (case-sensitive, no extra spaces)

#### Step 2: Download Fresh Public Key
1. Go to Cashfree dashboard: **Developers** → **Two-Factor Authentication**
2. Click **Generate Public Key** (or download existing one)
3. If the key is password-protected:
   - Extract the key using the password (sent to your email)
   - Save the extracted key content
4. Save the key file:
   ```bash
   # Create keys directory if it doesn't exist
   mkdir -p keys
   
   # Save the public key
   # The file should start with either:
   # -----BEGIN RSA PUBLIC KEY----- (PKCS#1)
   # OR
   # -----BEGIN PUBLIC KEY----- (PKCS#8)
   ```
5. Ensure the file is at: `keys/cashfree_public_key.pem`

#### Step 3: Verify Key Format
The key file should look like this:

**PKCS#1 Format (Preferred):**
```
-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA...
(multiple lines of base64 encoded key)
...
-----END RSA PUBLIC KEY-----
```

**PKCS#8 Format (Also works):**
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...
(multiple lines of base64 encoded key)
...
-----END PUBLIC KEY-----
```

**Important:**
- No extra whitespace before/after
- No password protection (must be plain text)
- Must match the key in your Cashfree dashboard

## Diagnostic Endpoint

Check your configuration:
```bash
curl https://grainology-rmg1.onrender.com/api/cashfree/diagnostics
```

This will show:
- ✅/❌ Client ID and Secret configuration
- ✅/❌ Public key file status
- ✅/❌ Signature generation capability
- Recommendations for fixing issues

## Common Issues

### Issue 1: Public Key Doesn't Match Dashboard
**Symptom:** Signature mismatch error
**Fix:** Download a fresh public key from Cashfree dashboard and replace the file

### Issue 2: Client ID Mismatch
**Symptom:** Signature mismatch error
**Fix:** 
- Check logs for the exact Client ID being used
- Ensure `CASHFREE_CLIENT_ID` environment variable matches dashboard exactly
- No extra spaces or characters

### Issue 3: Wrong Environment
**Symptom:** Signature works in one environment but not another
**Fix:**
- Sandbox and Production use different keys
- Ensure you're using the correct key for your environment
- Check `CASHFREE_BASE_URL` matches your environment

### Issue 4: Password-Protected Key
**Symptom:** Key file exists but signature fails
**Fix:**
- Extract the key from password-protected file
- Save only the plain text key content (without password wrapper)

## Testing

After fixing, test with:
```bash
# Test CIN verification
curl -X POST https://grainology-rmg1.onrender.com/api/cashfree/verify-cin \
  -H "Content-Type: application/json" \
  -d '{"cin": "U62091UP2025PTC232070"}'
```

Check server logs for:
- `✅ Added x-cf-signature header to Cashfree API request`
- `🔑 Using Cashfree Client ID: CF1089370D...`
- No signature mismatch errors

## Environment Variables

For Render.com, add these in your service settings:

```env
# Required
CASHFREE_CLIENT_ID=your_client_id_here
CASHFREE_CLIENT_SECRET=your_client_secret_here
CASHFREE_BASE_URL=https://api.cashfree.com

# Optional - Only set if you want to use public key signature instead of IP whitelisting
# CASHFREE_USE_SIGNATURE=true
```

**Note:** By default, IP whitelisting is used. No additional environment variables needed!

## Still Having Issues?

1. Check the diagnostic endpoint output
2. Verify public key file exists and is readable
3. Ensure Client ID in logs matches Cashfree dashboard exactly
4. Try generating a new public key in Cashfree dashboard
5. Consider using IP whitelisting as an alternative
