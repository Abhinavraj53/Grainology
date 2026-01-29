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
    // Validate and trim client ID
    if (!clientId || typeof clientId !== 'string') {
      console.error('Invalid clientId provided for signature generation');
      return null;
    }
    
    const trimmedClientId = clientId.trim();
    if (!trimmedClientId) {
      console.error('ClientId is empty after trimming');
      return null;
    }

    // Load public key from keys folder
    const publicKeyPath = path.join(__dirname, '..', 'keys', 'cashfree_public_key.pem');
    
    if (!fs.existsSync(publicKeyPath)) {
      console.warn('Cashfree public key not found at:', publicKeyPath);
      console.warn('2FA signature generation will be skipped. Make sure to whitelist IP or configure public key.');
      return null;
    }

    let publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    
    // Clean up the key - remove any extra whitespace and normalize line endings
    publicKey = publicKey.trim();
    publicKey = publicKey.replace(/\r\n/g, '\n');
    publicKey = publicKey.replace(/\r/g, '\n');
    
    // Validate key format
    const isPKCS1 = publicKey.includes('BEGIN RSA PUBLIC KEY');
    const isPKCS8 = publicKey.includes('BEGIN PUBLIC KEY');
    
    if (!isPKCS1 && !isPKCS8) {
      console.error('Invalid public key format. Expected PKCS#1 (BEGIN RSA PUBLIC KEY) or PKCS#8 (BEGIN PUBLIC KEY)');
      return null;
    }

    // Step 1 & 2: Create payload: clientId + "." + current Unix timestamp
    const timestamp = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
    const payload = `${trimmedClientId}.${timestamp}`;

    // Step 3: Encrypt using RSA with PKCS1_OAEP padding
    let encrypted;
    try {
      encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256', // OAEP requires a hash algorithm
        },
        Buffer.from(payload, 'utf8')
      );
    } catch (encryptError) {
      console.error('Public key encryption failed:', {
        error: encryptError.message,
        keyFormat: isPKCS1 ? 'PKCS#1' : 'PKCS#8',
        payloadLength: payload.length,
        clientIdLength: trimmedClientId.length,
      });
      // Re-throw with more context
      throw new Error(`Signature encryption failed: ${encryptError.message}. Please verify the public key format and that it matches your Cashfree account.`);
    }

    // Step 4: Base64 encode
    const signature = encrypted.toString('base64');

    // Detailed logging for debugging (but mask sensitive data)
    console.log('Generated Cashfree signature:', {
      clientId: trimmedClientId.substring(0, 10) + '...',
      clientIdLength: trimmedClientId.length,
      timestamp,
      payload: `${trimmedClientId.substring(0, 5)}...${timestamp}`,
      signatureLength: signature.length,
      signaturePreview: signature.substring(0, 30) + '...',
      keyFormat: isPKCS1 ? 'PKCS#1' : 'PKCS#8',
    });

    return signature;
  } catch (error) {
    console.error('Error generating Cashfree signature:', {
      message: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * Get Cashfree API headers with 2FA signature if public key is available
 */
export function getCashfreeHeaders(clientId, clientSecret, includeSignature = true) {
  // Validate credentials
  if (!clientId || !clientSecret) {
    console.error('Cashfree credentials are missing');
    throw new Error('Cashfree credentials (clientId and clientSecret) are required');
  }

  // Trim whitespace from credentials to ensure consistency
  const trimmedClientId = clientId.trim();
  const trimmedClientSecret = clientSecret.trim();

  if (!trimmedClientId || !trimmedClientSecret) {
    console.error('Cashfree credentials are empty after trimming');
    throw new Error('Cashfree credentials cannot be empty');
  }

  const headers = {
    'x-client-id': trimmedClientId,
    'x-client-secret': trimmedClientSecret,
    'Content-Type': 'application/json',
    'x-api-version': '2023-12-18',
  };

  // Add 2FA signature if public key is available
  if (includeSignature) {
    const signature = generateCashfreeSignature(trimmedClientId);
    if (signature) {
      headers['x-cf-signature'] = signature;
      console.log('✅ Added x-cf-signature header to Cashfree API request');
    } else {
      console.warn('⚠️  Signature generation failed or skipped. Requests may fail if IP is not whitelisted in Cashfree dashboard.');
      console.warn('   To fix: Either add your server IP to Cashfree whitelist OR ensure public key file exists at keys/cashfree_public_key.pem');
    }
  }

  return headers;
}

