# Cashfree Public Key

This folder contains the Cashfree public key for 2FA signature generation.

## File
- `cashfree_public_key.pem` - Cashfree public key for Secure ID API 2FA authentication

## Usage

The public key is used to generate signatures for Cashfree Secure ID API calls when 2FA (Two-Factor Authentication) is enabled.

### Signature Generation Process

According to [Cashfree documentation](https://www.cashfree.com/docs/api-reference/vrs/getting-started):

1. Retrieve your `clientId` (X-Client-Id header value)
2. Append with CURRENT UNIX timestamp separated by period (.)
3. Encrypt using RSA with this public key (PKCS1_OAEP padding)
4. Base64 encode the result
5. Pass as `X-Cf-Signature` header

The signature is valid for 5 minutes.

### Implementation

The signature generation is implemented in `utils/cashfreeSignature.js` and is automatically used in:
- `routes/cashfreeKYC.js` - For Cashfree KYC verification API calls

### Password Protection

If your public key file is password-protected (as downloaded from Cashfree dashboard), you'll need to:
1. Extract the key from the password-protected file
2. Save the extracted key as `cashfree_public_key.pem` in this folder

The password is sent to your registered email address when you download the key from Cashfree dashboard.

## Security Note

Public keys are meant to be public and can be committed to version control. However, ensure:
- The key file is not password-protected in the repository
- Only authorized team members have access to the repository
- The key corresponds to the correct Cashfree account/environment

