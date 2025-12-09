import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate Cashfree 2FA signature for Secure ID APIs
 * According to Cashfree docs: https://www.cashfree.com/docs/api-reference/vrs/getting-started
 * 
 * Signature generation steps:
 * 1. Retrieve clientId (X-Client-Id header value)
 * 2. Append with CURRENT UNIX timestamp separated by period (.)
 * 3. Encrypt using RSA with Public key (PKCS1_OAEP padding)
 * 4. Base64 encode the result
 * 
 * Signature is valid for 5 minutes
 */
export function generateCashfreeSignature(clientId) {
  try {
    // Load public key from keys folder
    const publicKeyPath = path.join(__dirname, '..', 'keys', 'cashfree_public_key.pem');
    
    if (!fs.existsSync(publicKeyPath)) {
      console.warn('Cashfree public key not found at:', publicKeyPath);
      console.warn('2FA signature generation will be skipped. Make sure to whitelist IP or configure public key.');
      return null;
    }

    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

    // Step 1 & 2: Create payload: clientId + "." + current Unix timestamp
    const timestamp = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
    const payload = `${clientId}.${timestamp}`;

    // Step 3: Encrypt using RSA with PKCS1_OAEP padding
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256', // OAEP requires a hash algorithm
      },
      Buffer.from(payload, 'utf8')
    );

    // Step 4: Base64 encode
    const signature = encrypted.toString('base64');

    console.log('Generated Cashfree signature:', {
      clientId,
      timestamp,
      signatureLength: signature.length,
    });

    return signature;
  } catch (error) {
    console.error('Error generating Cashfree signature:', error);
    return null;
  }
}

/**
 * Get Cashfree API headers with 2FA signature if public key is available
 */
export function getCashfreeHeaders(clientId, clientSecret, includeSignature = true) {
  const headers = {
    'x-client-id': clientId,
    'x-client-secret': clientSecret,
    'Content-Type': 'application/json',
    'x-api-version': '2023-12-18',
  };

  // Add 2FA signature if public key is available
  if (includeSignature) {
    const signature = generateCashfreeSignature(clientId);
    if (signature) {
      headers['x-cf-signature'] = signature;
    }
  }

  return headers;
}

