import express from 'express';
import axios from 'axios';
import multer from 'multer';
import FormDataLib from 'form-data';
import Cashfree from '../lib/cashfree.js';

const router = express.Router();

// Cashfree Configuration (for fallback methods)
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID || '';
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET || '';
const CASHFREE_BASE_URL = process.env.CASHFREE_BASE_URL || 'https://api.cashfree.com';

// Multer configuration for document uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
  }
});

// Get Cashfree access token (for Payout APIs)
async function getCashfreeAccessToken() {
  try {
    // Try method 1: Using x-client-id and x-client-secret headers (Verification API style)
    try {
      const response = await axios.post(
        `${CASHFREE_BASE_URL}/payout/v1/authorize`,
        {},
        {
          headers: {
            'x-client-id': CASHFREE_CLIENT_ID,
            'x-client-secret': CASHFREE_CLIENT_SECRET,
            'Content-Type': 'application/json',
          }
        }
      );
      if (response.data.data?.token || response.data.token) {
        return response.data.data?.token || response.data.token;
      }
    } catch (headerError) {
      console.log('Header-based auth failed, trying body-based...');
    }

    // Try method 2: Using body with clientId and clientSecret (Payout API style)
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/payout/v1/authorize`,
      {
        client_id: CASHFREE_CLIENT_ID,
        client_secret: CASHFREE_CLIENT_SECRET,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    return response.data.data?.token || response.data.token;
  } catch (error) {
    console.error('Cashfree token error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    // Return null instead of throwing - verification APIs use client credentials directly
    return null;
  }
}

// Verify PAN (pre-signup - public route)
router.post('/verify-pan', async (req, res) => {
  try {
    const { pan, name } = req.body;

    // Log incoming request for debugging
    console.log('PAN verification request:', { pan: pan ? pan.substring(0, 3) + '***' : 'missing', name: name ? name.substring(0, 3) + '***' : 'missing' });

    if (!pan || !name) {
      return res.status(400).json({
        success: false,
        error: 'PAN number and name are required',
        message: 'Please provide both PAN number and name',
      });
    }

    // Trim whitespace
    const cleanPan = pan.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanPan || !cleanName) {
      return res.status(400).json({
        success: false,
        error: 'PAN number and name cannot be empty',
        message: 'Please provide valid PAN number and name',
      });
    }

    // PAN format validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(cleanPan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PAN format. PAN should be in format: ABCDE1234F',
        message: 'PAN must be 10 characters: 5 letters, 4 numbers, 1 letter (e.g., ABCDE1234F)',
      });
    }

    // Check if Cashfree credentials are configured
    if (!CASHFREE_CLIENT_ID || !CASHFREE_CLIENT_SECRET) {
      console.error('Cashfree credentials not configured');
      return res.status(500).json({
        success: false,
        error: 'Verification service not configured',
        message: 'Cashfree credentials are missing. Please contact support.',
      });
    }

    // Method 1: Try using Cashfree Verification SDK
    try {
      console.log('Trying Cashfree Verification SDK for PAN...');
      const panRequest = {
        pan: cleanPan,
        name: cleanName
      };

      const verifyResponse = await Cashfree.VrsPanVerification(panRequest);
      
      if (verifyResponse.data?.status === 'SUCCESS' || verifyResponse.data?.status === 'VALID') {
        return res.json({
          success: true,
          verified: true,
          pan: cleanPan,
          name: verifyResponse.data.name || cleanName,
          type: verifyResponse.data.type || 'Individual',
          details: verifyResponse.data,
        });
      } else if (verifyResponse.data?.status === 'INVALID_PAN') {
        return res.status(400).json({
          success: false,
          verified: false,
          error: 'Invalid PAN',
          message: 'The PAN number or name does not match. Please check and try again.',
          details: verifyResponse.data,
        });
      }
    } catch (verifyError) {
      console.log('SDK verification failed, trying fallback...', verifyError.response?.data || verifyError.message);
    }

    // Method 2: Fallback to Payout API with token
    const token = await getCashfreeAccessToken();

    if (!token) {
      console.error('Failed to get Cashfree access token');
      return res.status(500).json({
        success: false,
        error: 'Failed to authenticate with verification service',
        message: 'Unable to connect to verification service. Please check your Cashfree credentials and ensure they have verification API access.',
        details: 'Token generation failed. Make sure your Cashfree account has Payout/Verification API access enabled.',
      });
    }

    console.log('Calling Cashfree PAN verification API (Payout)...');

    // Verify PAN using Cashfree Payout API
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/payout/v1.2/validation/pan`,
      {
        pan: cleanPan,
        name: cleanName,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
        }
      }
    );

    console.log('Cashfree PAN verification response:', {
      status: response.data.status,
      message: response.data.message,
    });

    if (response.data.status === 'SUCCESS' && response.data.message === 'PAN details are valid') {
      return res.json({
        success: true,
        verified: true,
        pan: cleanPan,
        name: response.data.name || cleanName,
        type: response.data.type || 'Individual',
        details: response.data,
      });
    } else {
      // Cashfree returned a response but verification failed
      return res.status(400).json({
        success: false,
        verified: false,
        error: response.data.message || 'PAN verification failed',
        message: response.data.message || 'The PAN number or name does not match. Please check and try again.',
        details: response.data,
      });
    }
  } catch (error) {
    console.error('PAN verification error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401 || status === 403) {
        return res.status(500).json({
          success: false,
          error: 'Authentication failed',
          message: 'Verification service authentication failed. Please check Cashfree credentials.',
          details: data,
        });
      }

      if (status === 400) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: data.message || 'Invalid PAN details',
          message: data.message || 'The provided PAN number or name is invalid. Please check and try again.',
          details: data,
        });
      }

      return res.status(status).json({
        success: false,
        error: 'Verification service error',
        message: data.message || 'An error occurred during PAN verification. Please try again.',
        details: data,
      });
    }

    // Network or other errors
    return res.status(500).json({
      success: false,
      error: 'Failed to verify PAN',
      message: 'Unable to connect to verification service. Please try again later.',
      details: error.message,
    });
  }
});

// Verify Aadhaar via number only using DigiLocker (pre-signup - public route)
router.post('/verify-aadhaar-number', async (req, res) => {
  try {
    const { aadhaar_number } = req.body;

    if (!aadhaar_number) {
      return res.status(400).json({
        error: 'Aadhaar number is required',
      });
    }

    // Aadhaar format validation (12 digits)
    const aadhaarRegex = /^[0-9]{12}$/;
    const cleanAadhaar = aadhaar_number.replace(/\s/g, '');
    
    if (!aadhaarRegex.test(cleanAadhaar)) {
      return res.status(400).json({
        error: 'Invalid Aadhaar format. Aadhaar should be 12 digits.',
      });
    }

    // Additional validation: Aadhaar should not start with 0 or 1
    if (cleanAadhaar.startsWith('0') || cleanAadhaar.startsWith('1')) {
      return res.status(400).json({
        error: 'Invalid Aadhaar number. Aadhaar cannot start with 0 or 1.',
      });
    }

    const reference_id = `aadhaar_${cleanAadhaar}_${Date.now()}`;

    try {
      // Method 1: Try using Cashfree Verification SDK
      console.log('Trying Cashfree Verification SDK for DigiLocker...');
      const digilockerRequest = {
        verification_id: reference_id,
        redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/kyc-callback?ref=${reference_id}&aadhaar=${cleanAadhaar}`,
        document_requested: ['AADHAAR']
      };

      const response = await Cashfree.VrsDigilockerVerificationCreateUrl(digilockerRequest, undefined, { timeout: 10000 });

      if (response.data?.verification_url || response.data?.data?.verification_url) {
        return res.json({
          success: true,
          verified: false, // Not verified yet - user needs to complete DigiLocker flow
          verification_pending: true,
          verification_url: response.data.verification_url || response.data.data?.verification_url,
          reference_id: reference_id,
          aadhaar_number: cleanAadhaar,
          message: 'Please complete verification via DigiLocker',
          verification_method: 'digilocker',
        });
      }
    } catch (verifyApiError) {
      console.error('Cashfree Verification API error:', {
        message: verifyApiError.message,
        code: verifyApiError.code,
        response: verifyApiError.response?.data,
        timeout: verifyApiError.code === 'ECONNABORTED'
      });
      
      // If timeout, return error immediately
      if (verifyApiError.code === 'ECONNABORTED' || verifyApiError.message?.includes('timeout')) {
        return res.status(504).json({
          success: false,
          error: 'Verification request timed out',
          message: 'The verification service took too long to respond. Please try again.',
          aadhaar_number: cleanAadhaar,
        });
      }
      
      // Method 2: Fallback to old endpoint with Bearer token
      try {
        const token = await getCashfreeAccessToken();
        if (token) {
          const fallbackResponse = await axios.post(
            `${CASHFREE_BASE_URL}/pg/lrs/digilocker/link`,
            {
              reference_id: reference_id,
              document_type: 'aadhaar',
              redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/kyc-callback?ref=${reference_id}&aadhaar=${cleanAadhaar}`,
            },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-api-version': '2022-09-01',
              },
              timeout: 10000 // 10 second timeout
            }
          );

          if (fallbackResponse.data.status === 'SUCCESS' || fallbackResponse.data.verification_url) {
            return res.json({
              success: true,
              verified: false,
              verification_pending: true,
              verification_url: fallbackResponse.data.data?.verification_url || fallbackResponse.data.verification_url,
              reference_id: reference_id,
              aadhaar_number: cleanAadhaar,
              message: 'Please complete verification via DigiLocker',
              verification_method: 'digilocker',
            });
          }
        }
      } catch (fallbackError) {
        console.error('Fallback DigiLocker error:', fallbackError.response?.data || fallbackError.message);
      }
      
      // If both methods fail, return format validation only
      return res.json({
        success: true,
        verified: false, // NOT verified - only format validated
        verification_pending: true,
        aadhaar_number: cleanAadhaar,
        message: 'Aadhaar format validated. Full verification requires DigiLocker authentication.',
        verification_method: 'format_validation',
        error: 'DigiLocker verification unavailable. Please try again.',
        details: verifyApiError.response?.data || verifyApiError.message,
        note: 'Format validation only. Full verification with details fetch requires DigiLocker authentication.',
      });
    }

  } catch (error) {
    console.error('Aadhaar number verification error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to verify Aadhaar number',
      details: error.response?.data || error.message,
    });
  }
});

// Get DigiLocker verification status and fetch details (pre-signup - public route)
router.get('/digilocker-status/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;
    const { aadhaar_number } = req.query;

    try {
      // Method 1: Try using Cashfree Verification SDK
      console.log('Checking DigiLocker status using SDK...');
      const statusResponse = await Cashfree.VrsDigilockerVerificationFetchStatus(undefined, undefined, referenceId, { timeout: 10000 });
      
      const statusData = statusResponse.data?.data || statusResponse.data;
      const isVerified = statusData?.verification_status === 'SUCCESS' || 
                        statusData?.status === 'SUCCESS' || 
                        statusData?.status === 'verified';

      if (isVerified) {
        // Fetch document details using SDK
        try {
          const docResponse = await Cashfree.VrsDigilockerVerificationFetchDocument('AADHAAR', undefined, undefined, referenceId, { timeout: 10000 });
          
          const docData = docResponse.data?.data || docResponse.data;
          return res.json({
            success: true,
            verified: true,
            status: 'verified',
            aadhaar_number: aadhaar_number || docData.aadhaar_number,
            name: docData.name || docData.full_name,
            date_of_birth: docData.date_of_birth || docData.dob,
            gender: docData.gender,
            address: docData.address || docData.full_address,
            father_name: docData.father_name,
            details: docData,
          });
        } catch (docError) {
          console.error('Document fetch error:', docError.response?.data || docError.message);
          // Return verified status even if document fetch fails
          return res.json({
            success: true,
            verified: true,
            status: 'verified',
            aadhaar_number: aadhaar_number,
            message: 'Verification successful, but details fetch failed',
          });
        }
      }

      return res.json({
        success: true,
        verified: false,
        status: statusData?.verification_status || statusData?.status || 'pending',
        message: 'Verification pending',
      });
    } catch (verifyApiError) {
      console.error('Verification API error:', verifyApiError.response?.data || verifyApiError.message);
      
      // Method 2: Fallback to old endpoint with Bearer token
      const token = await getCashfreeAccessToken();
      if (token) {
        try {
          const fallbackResponse = await axios.get(
            `${CASHFREE_BASE_URL}/pg/lrs/digilocker/status/${referenceId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'x-api-version': '2022-09-01',
              }
            }
          );

          if (fallbackResponse.data.status === 'SUCCESS') {
            const data = fallbackResponse.data.data || {};
            const isVerified = data.verification_status === 'SUCCESS' || data.status === 'verified';
            
            if (isVerified && data.document_data) {
              const docData = data.document_data || {};
              return res.json({
                success: true,
                verified: true,
                status: 'verified',
                aadhaar_number: aadhaar_number || docData.aadhaar_number,
                name: docData.name || docData.full_name,
                date_of_birth: docData.date_of_birth || docData.dob,
                gender: docData.gender,
                address: docData.address || docData.full_address,
                father_name: docData.father_name,
                details: docData,
              });
            }
            
            return res.json({
              success: true,
              verified: isVerified,
              status: data.verification_status || data.status || 'pending',
              message: isVerified ? 'Verification successful' : 'Verification pending',
            });
          }
        } catch (fallbackError) {
          console.error('Fallback status error:', fallbackError.response?.data || fallbackError.message);
        }
      }
      
      throw verifyApiError;
    }
  } catch (error) {
    console.error('DigiLocker status error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to get DigiLocker status',
      details: error.response?.data || error.message,
    });
  }
});

// Verify Aadhaar via OCR (pre-signup - public route)
router.post('/verify-aadhaar-ocr', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aadhaar document file is required' });
    }

    const { aadhaar_number } = req.body;

    if (!aadhaar_number) {
      return res.status(400).json({
        error: 'Aadhaar number is required',
      });
    }

    // Aadhaar format validation (12 digits)
    const aadhaarRegex = /^[0-9]{12}$/;
    if (!aadhaarRegex.test(aadhaar_number)) {
      return res.status(400).json({
        error: 'Invalid Aadhaar format. Aadhaar should be 12 digits.',
      });
    }

    const token = await getCashfreeAccessToken();

    // Convert file to base64
    const base64Document = req.file.buffer.toString('base64');

    // Verify Aadhaar using Cashfree Smart OCR API
    const formData = new FormDataLib();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append('document_type', 'aadhaar');
    formData.append('verification_level', 'level_2');

    const response = await axios.post(
      `${CASHFREE_BASE_URL}/pg/lrs/orders/ocr/verify`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders(),
          'x-api-version': '2022-09-01',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (response.data.status === 'SUCCESS') {
      const extractedData = response.data.data || {};
      
      // Verify if extracted Aadhaar matches provided number
      const extractedAadhaar = extractedData.aadhaar_number?.replace(/\s/g, '') || '';
      if (extractedAadhaar && extractedAadhaar !== aadhaar_number.replace(/\s/g, '')) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: 'Aadhaar number in document does not match provided number',
        });
      }

      return res.json({
        success: true,
        verified: true,
        aadhaar_number: aadhaar_number,
        name: extractedData.name || extractedData.full_name,
        date_of_birth: extractedData.date_of_birth || extractedData.dob,
        gender: extractedData.gender,
        address: extractedData.address,
        father_name: extractedData.father_name,
        extracted_details: extractedData,
      });
    } else {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Aadhaar verification failed',
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Aadhaar OCR verification error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to verify Aadhaar',
      details: error.response?.data || error.message,
    });
  }
});

// Verify Aadhaar via number only (pre-signup - public route)
router.post('/verify-aadhaar', async (req, res) => {
  try {
    const { aadhaar_number } = req.body;

    if (!aadhaar_number) {
      return res.status(400).json({
        error: 'Aadhaar number is required',
      });
    }

    // Aadhaar format validation (12 digits)
    const aadhaarRegex = /^[0-9]{12}$/;
    if (!aadhaarRegex.test(aadhaar_number.replace(/\s/g, ''))) {
      return res.status(400).json({
        error: 'Invalid Aadhaar format. Aadhaar should be 12 digits.',
      });
    }

    const token = await getCashfreeAccessToken();
    const cleanAadhaar = aadhaar_number.replace(/\s/g, '');
    const reference_id = `aadhaar_${cleanAadhaar}_${Date.now()}`;

    // Create DigiLocker verification link for Aadhaar
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/pg/lrs/digilocker/link`,
      {
        reference_id: reference_id,
        document_type: 'aadhaar',
        redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/kyc-callback`,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
        }
      }
    );

    if (response.data.status === 'SUCCESS') {
      // For now, return the verification URL and reference_id
      // The frontend will handle the DigiLocker flow
      return res.json({
        success: true,
        verification_url: response.data.data?.verification_url || response.data.verification_url,
        reference_id: reference_id,
        aadhaar_number: cleanAadhaar,
        message: 'Please complete verification via DigiLocker',
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Failed to create verification link',
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Aadhaar verification error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to verify Aadhaar',
      details: error.response?.data || error.message,
    });
  }
});

// Create DigiLocker link for Aadhaar verification (pre-signup - public route)
router.post('/create-digilocker-link', async (req, res) => {
  try {
    const { reference_id } = req.body;

    if (!reference_id) {
      return res.status(400).json({
        error: 'Reference ID is required',
      });
    }

    const token = await getCashfreeAccessToken();

    // Create DigiLocker verification link
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/pg/lrs/digilocker/link`,
      {
        reference_id: reference_id,
        document_type: 'aadhaar',
        redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/kyc-callback`,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
        }
      }
    );

    if (response.data.status === 'SUCCESS') {
      return res.json({
        success: true,
        verification_url: response.data.data?.verification_url || response.data.verification_url,
        reference_id: reference_id,
      });
    } else {
      return res.status(400).json({
        error: 'Failed to create DigiLocker link',
        details: response.data,
      });
    }
  } catch (error) {
    console.error('DigiLocker link creation error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to create DigiLocker link',
      details: error.response?.data || error.message,
    });
  }
});

// Get DigiLocker verification status (pre-signup - public route)
router.get('/digilocker-status/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;

    const token = await getCashfreeAccessToken();

    const response = await axios.get(
      `${CASHFREE_BASE_URL}/pg/lrs/digilocker/status/${referenceId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-version': '2022-09-01',
        }
      }
    );

    if (response.data.status === 'SUCCESS') {
      const data = response.data.data || {};
      return res.json({
        success: true,
        status: data.verification_status || data.status,
        verified: data.verification_status === 'SUCCESS' || data.status === 'verified',
        details: data,
      });
    } else {
      return res.json({
        success: false,
        status: 'pending',
        verified: false,
        details: response.data,
      });
    }
  } catch (error) {
    console.error('DigiLocker status error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to get DigiLocker status',
      details: error.response?.data || error.message,
    });
  }
});

// Cashfree Webhook Endpoint
// This endpoint receives webhook notifications from Cashfree
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Cashfree sends webhook data in the request body
    // Handle both raw JSON and parsed JSON
    let webhookData;
    if (Buffer.isBuffer(req.body)) {
      webhookData = JSON.parse(req.body.toString());
    } else if (typeof req.body === 'string') {
      webhookData = JSON.parse(req.body);
    } else {
      webhookData = req.body;
    }
    
    console.log('Cashfree Webhook Received:', JSON.stringify(webhookData, null, 2));
    
    // Extract webhook information
    const {
      type,           // Webhook event type
      data,           // Event data
      eventTime,      // Timestamp
      referenceId,    // Reference ID for the verification
      verification_id, // Alternative field name
    } = webhookData;

    // Handle different webhook event types
    switch (type) {
      case 'VERIFICATION.SUCCESS':
      case 'verification.success':
        // Verification completed successfully
        console.log('✅ Verification successful for:', referenceId || verification_id);
        // You can update your database here
        // Example: Update user KYC status
        break;
        
      case 'VERIFICATION.FAILED':
      case 'verification.failed':
        // Verification failed
        console.log('❌ Verification failed for:', referenceId || verification_id);
        // Handle failure case
        break;
        
      case 'VERIFICATION.PENDING':
      case 'verification.pending':
        // Verification is pending
        console.log('⏳ Verification pending for:', referenceId || verification_id);
        break;
        
      default:
        console.log('ℹ️  Unknown webhook type:', type, 'Data:', data);
    }

    // Always return 200 OK to acknowledge receipt
    // Cashfree will retry if it doesn't receive 200
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received',
      received: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Still return 200 to prevent Cashfree from retrying
    // Log the error for debugging
    res.status(200).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

