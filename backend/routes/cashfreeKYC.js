import express from 'express';
import axios from 'axios';
import multer from 'multer';
import FormDataLib from 'form-data';

const router = express.Router();

// Cashfree Configuration
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
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/payout/v1/authorize`,
      {
        clientId: CASHFREE_CLIENT_ID,
        clientSecret: CASHFREE_CLIENT_SECRET,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    return response.data.data?.token || response.data.token;
  } catch (error) {
    console.error('Cashfree token error:', error.response?.data || error.message);
    // Return null instead of throwing - verification APIs use client credentials directly
    return null;
  }
}

// Verify PAN (pre-signup - public route)
router.post('/verify-pan', async (req, res) => {
  try {
    const { pan, name } = req.body;

    if (!pan || !name) {
      return res.status(400).json({
        error: 'PAN number and name are required',
      });
    }

    // PAN format validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid PAN format. PAN should be in format: ABCDE1234F',
      });
    }

    const token = await getCashfreeAccessToken();

    // Verify PAN using Cashfree API
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/payout/v1.2/validation/pan`,
      {
        pan: pan.toUpperCase(),
        name: name,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
        }
      }
    );

    if (response.data.status === 'SUCCESS' && response.data.message === 'PAN details are valid') {
      return res.json({
        success: true,
        verified: true,
        pan: pan.toUpperCase(),
        name: response.data.name || name,
        type: response.data.type || 'Individual',
        details: response.data,
      });
    } else {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'PAN verification failed',
        details: response.data,
      });
    }
  } catch (error) {
    console.error('PAN verification error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to verify PAN',
      details: error.response?.data || error.message,
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
      // Method 1: Try using Cashfree Verification API with client credentials
      const response = await axios.post(
        `${CASHFREE_BASE_URL}/verification/digilocker`,
        {
          verification_id: reference_id,
          document_requested: ['AADHAAR'],
          redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/kyc-callback?ref=${reference_id}&aadhaar=${cleanAadhaar}`,
          user_flow: 'signup',
        },
        {
          headers: {
            'x-client-id': CASHFREE_CLIENT_ID,
            'x-client-secret': CASHFREE_CLIENT_SECRET,
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.data.verification_url || response.data.data?.verification_url) {
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
      console.error('Cashfree Verification API error:', verifyApiError.response?.data || verifyApiError.message);
      
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
              }
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
      // Method 1: Try using Cashfree Verification API
      const statusResponse = await axios.get(
        `${CASHFREE_BASE_URL}/verification/digilocker?verification_id=${referenceId}`,
        {
          headers: {
            'x-client-id': CASHFREE_CLIENT_ID,
            'x-client-secret': CASHFREE_CLIENT_SECRET,
          }
        }
      );

      const statusData = statusResponse.data.data || statusResponse.data;
      const isVerified = statusData.verification_status === 'SUCCESS' || 
                        statusData.status === 'SUCCESS' || 
                        statusData.status === 'verified';

      if (isVerified) {
        // Fetch document details
        try {
          const docResponse = await axios.get(
            `${CASHFREE_BASE_URL}/verification/digilocker/document/AADHAAR?verification_id=${referenceId}`,
            {
              headers: {
                'x-client-id': CASHFREE_CLIENT_ID,
                'x-client-secret': CASHFREE_CLIENT_SECRET,
              }
            }
          );

          const docData = docResponse.data.data || docResponse.data;
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
        status: statusData.verification_status || statusData.status || 'pending',
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

export default router;

