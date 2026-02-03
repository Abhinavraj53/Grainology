# Cashfree IP Whitelisting - Complete Guide

## Problem
आपको error मिल रहा है: `IP not whitelisted. Your current ip is 74.220.48.2`

## Important: IP Whitelisting कैसे काम करता है

**⚠️ Important:** IP Whitelisting में आपको **exact IP address** add करना होता है जो API call कर रहा है। "सभी जगह से काम करने वाला IP" जैसी कोई चीज़ नहीं है।

## Solution: Add Your Current IP

### Step 1: Cashfree Dashboard में जाएं
1. Cashfree Dashboard login करें
2. **Developers** → **Two-Factor Authentication** पर जाएं
3. सुनिश्चित करें कि **"IP Whitelisting"** method selected है (Public Key नहीं)

### Step 2: Current IP Add करें
1. **"Add IP Address"** button click करें
2. यह IP add करें: **`74.220.48.2`**
3. Save करें
4. 2-3 minutes wait करें

### Step 3: Test करें
अब API call करके test करें।

## Render.com के लिए Special Instructions

Render.com services में **dynamic IPs** हो सकते हैं, मतलब IP address बदल सकता है।

### Option 1: Multiple IPs Add करें (Recommended)
अगर IP बदलता है, तो आपको multiple IPs add करने होंगे:
1. जब भी नया error आए, error message में IP address देखें
2. उस IP को Cashfree dashboard में add करें
3. धीरे-धीरे सभी possible IPs add हो जाएंगे

### Option 2: Static IP Use करें
Render.com में static IP setup करें (अगर available हो):
- Render.com documentation check करें
- Static IP service use करें (paid option हो सकता है)

### Option 3: Public Key Signature Use करें (Best Solution)
अगर IP बार-बार बदल रहा है, तो **Public Key Signature** use करना बेहतर है:

1. **Cashfree Dashboard में:**
   - Developers → Two-Factor Authentication
   - "Switch Method" → "Public Key" select करें
   - Public Key download करें

2. **Code में:**
   - Environment variable add करें: `CASHFREE_USE_SIGNATURE=true`
   - Public key file को `keys/cashfree_public_key.pem` में save करें

3. **Advantages:**
   - ✅ किसी भी IP से काम करता है
   - ✅ IP changes से problem नहीं होगी
   - ✅ More secure

## Current Error Details

आपका current error:
- **Error Code:** `ip_validation_failed`
- **Current IP:** `74.220.48.2`
- **Status:** IP whitelist में नहीं है

## Quick Fix Steps

1. ✅ Cashfree Dashboard खोलें
2. ✅ Developers → Two-Factor Authentication
3. ✅ IP Whitelisting method ensure करें
4. ✅ IP `74.220.48.2` add करें
5. ✅ Save करें और 2-3 minutes wait करें
6. ✅ Test करें

## Long-term Solution

अगर IP बार-बार बदल रहा है:
- **Best:** Public Key Signature use करें (कहीं से भी काम करेगा)
- **Alternative:** Render.com का static IP range पता करके सभी IPs add करें

## Testing

After adding IP, test with:
```bash
# Test CIN verification
curl -X POST https://grainology-rmg1.onrender.com/api/cashfree/verify-cin \
  -H "Content-Type: application/json" \
  -d '{"cin": "U62091UP2025PTC232070"}'
```

## FAQ

**Q: क्या मैं "0.0.0.0/0" जैसा wildcard IP add कर सकता हूं?**
A: नहीं, Cashfree wildcard IPs support नहीं करता। आपको exact IPs add करने होंगे।

**Q: अगर IP बदल जाए तो क्या करूं?**
A: नया IP add करें, या Public Key Signature use करें।

**Q: Render.com का static IP कैसे पता करूं?**
A: Render.com documentation check करें, या support से contact करें।

**Q: Public Key Signature क्यों बेहतर है?**
A: क्योंकि यह किसी भी IP से काम करता है और IP changes से problem नहीं होती।
