import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { authenticate, checkDatabaseConnection } from '../middleware/auth.js';

const router = express.Router();

// Helper function to check DB connection and return error
const checkDB = (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not connected',
      message: 'Please check your MongoDB connection. The database may not be accessible or your IP may not be whitelisted in MongoDB Atlas.'
    });
  }
  return null;
};

// Note: KYC verification is now handled by Cashfree routes at /api/cashfree/kyc/*

// Check if user exists by verification document
router.post('/check-verification-document', async (req, res) => {
  try {
    // Check database connection
    const dbError = checkDB(req, res);
    if (dbError) return;

    const { verification_method, document_id } = req.body;

    if (!verification_method || !document_id) {
      return res.status(400).json({ 
        error: 'Verification method and document ID are required',
        exists: false 
      });
    }

    // Normalize document ID based on method
    let normalizedDocId = String(document_id).trim();
    if (verification_method === 'pan' || verification_method === 'gst' || verification_method === 'cin') {
      normalizedDocId = normalizedDocId.toUpperCase();
    }

    // Build query based on verification method
    let query = {};
    switch (verification_method) {
      case 'aadhaar':
        query = { 'verification_documents.aadhaar_number': normalizedDocId };
        break;
      case 'pan':
        query = { 'verification_documents.pan_number': normalizedDocId };
        break;
      case 'gst':
        query = { 'verification_documents.gstin': normalizedDocId };
        break;
      case 'cin':
        query = { 'verification_documents.cin': normalizedDocId };
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid verification method',
          exists: false 
        });
    }

    const existingUser = await User.findOne(query);

    if (existingUser) {
      return res.status(200).json({ 
        exists: true,
        message: `An account already exists with this ${verification_method.toUpperCase()} number`
      });
    }

    return res.status(200).json({ 
      exists: false,
      message: 'Document ID is available'
    });
  } catch (error) {
    console.error('Check verification document error:', error);
    res.status(500).json({ 
      error: 'Failed to check verification document',
      exists: false
    });
  }
});

// Check if user exists (email or mobile number)
router.post('/check-user', async (req, res) => {
  try {
    // Check database connection
    const dbError = checkDB(req, res);
    if (dbError) return;

    const { email, mobile_number } = req.body;

    if (!email && !mobile_number) {
      return res.status(400).json({ 
        error: 'Email or mobile number is required',
        exists: false 
      });
    }

    const errors = [];
    let emailExists = false;
    let mobileExists = false;

    // Check email separately
    if (email) {
      const emailUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailUser) {
        emailExists = true;
        errors.push('email');
      }
    }

    // Check mobile number separately
    if (mobile_number) {
      const mobileUser = await User.findOne({ mobile_number: mobile_number.trim() });
      if (mobileUser) {
        mobileExists = true;
        errors.push('mobile');
      }
    }

    // Return specific error messages
    if (emailExists && mobileExists) {
      return res.status(200).json({ 
        exists: true,
        emailExists: true,
        mobileExists: true,
        message: 'This email is already used and This number is already used'
      });
    } else if (emailExists) {
      return res.status(200).json({ 
        exists: true,
        emailExists: true,
        mobileExists: false,
        message: 'This email is already used'
      });
    } else if (mobileExists) {
      return res.status(200).json({ 
        exists: true,
        emailExists: false,
        mobileExists: true,
        message: 'This number is already used'
      });
    }

    return res.status(200).json({ 
      exists: false,
      emailExists: false,
      mobileExists: false,
      message: 'Email and mobile number are available'
    });
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ 
      error: 'Failed to check user',
      exists: false
    });
  }
});

// Sign up
router.post('/signup', async (req, res) => {
  try {
    // Check database connection
    const dbError = checkDB(req, res);
    if (dbError) return;

    // Log incoming request for debugging
    console.log('Signup request received:', {
      email: req.body.email ? `${req.body.email.substring(0, 3)}***` : 'missing',
      name: req.body.name ? `${req.body.name.substring(0, 3)}***` : 'missing',
      hasPassword: !!req.body.password,
      passwordLength: req.body.password?.length || 0,
      role: req.body.role,
      hasKycData: !!req.body.kyc_verification_data,
    });

    const {
      email,
      password,
      name,
      mobile_number,
      preferred_language,
      address_line1,
      address_line2,
      district,
      state,
      country,
      pincode,
      role,
      entity_type,
      business_name,
      business_type,
      kyc_verification_data
    } = req.body;

    // Validate required fields
    if (!password || password.length < 6) {
      console.log('Validation failed: Password is missing or too short', { passwordLength: password?.length || 0 });
      return res.status(400).json({ error: 'Password is required and must be at least 6 characters' });
    }
    
    if (!name || !name.trim()) {
      console.log('Validation failed: Name is missing or empty');
      return res.status(400).json({ error: 'Name is required' });
    }

    // Mobile number is now required (email is optional)
    if (!mobile_number || !mobile_number.trim()) {
      console.log('Validation failed: Mobile number is missing or empty');
      return res.status(400).json({ error: 'Mobile number is required' });
    }

    // Validate mobile number format (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    const cleanMobile = mobile_number.trim().replace(/\D/g, '');
    if (!mobileRegex.test(cleanMobile)) {
      return res.status(400).json({ error: 'Mobile number must be 10 digits' });
    }

    // Validate email format if provided (optional)
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Check if user exists by mobile number
    const existingUserByMobile = await User.findOne({ mobile_number: cleanMobile });
    if (existingUserByMobile) {
      return res.status(400).json({ error: 'User with this mobile number already exists' });
    }

    // Check if user exists by email (if provided)
    if (email && email.trim()) {
      const existingUserByEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUserByEmail) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
    }

    // Check if user exists by verification document
    if (kyc_verification_data) {
      let verificationDocQuery = {};
      const verificationMethod = kyc_verification_data.verification_method || kyc_verification_data.verificationMethod;
      
      if (verificationMethod === 'aadhaar' || verificationMethod === 'sandbox') {
        const aadhaarNum = kyc_verification_data.aadhaar_data?.aadhaar_number || 
                          kyc_verification_data.aadhaarNumber || 
                          kyc_verification_data.aadhaar_number;
        if (aadhaarNum) {
          verificationDocQuery = { 'verification_documents.aadhaar_number': String(aadhaarNum).trim() };
        }
      } else if (verificationMethod === 'pan') {
        const panNum = kyc_verification_data.pan_data?.pan || kyc_verification_data.documentNumber;
        if (panNum) {
          verificationDocQuery = { 'verification_documents.pan_number': String(panNum).trim().toUpperCase() };
        }
      } else if (verificationMethod === 'gst') {
        const gstin = kyc_verification_data.gstin_data?.gstin || kyc_verification_data.documentNumber;
        if (gstin) {
          verificationDocQuery = { 'verification_documents.gstin': String(gstin).trim().toUpperCase() };
        }
      } else if (verificationMethod === 'cin') {
        const cin = kyc_verification_data.cin_data?.cin || kyc_verification_data.documentNumber;
        if (cin) {
          verificationDocQuery = { 'verification_documents.cin': String(cin).trim().toUpperCase() };
        }
      }

      if (Object.keys(verificationDocQuery).length > 0) {
        const existingUserByDoc = await User.findOne(verificationDocQuery);
        if (existingUserByDoc) {
          return res.status(400).json({ error: `User with this ${verificationMethod.toUpperCase()} already exists` });
        }
      }
    }

    // Extract verification document IDs
    const verificationDocuments = {};
    if (kyc_verification_data) {
      const verificationMethod = kyc_verification_data.verification_method || kyc_verification_data.verificationMethod;
      
      if (verificationMethod === 'aadhaar' || verificationMethod === 'sandbox') {
        const aadhaarNum = kyc_verification_data.aadhaar_data?.aadhaar_number || 
                          kyc_verification_data.aadhaarNumber || 
                          kyc_verification_data.aadhaar_number;
        if (aadhaarNum) {
          verificationDocuments.aadhaar_number = String(aadhaarNum).trim();
        }
      } else if (verificationMethod === 'pan') {
        const panNum = kyc_verification_data.pan_data?.pan || kyc_verification_data.documentNumber;
        if (panNum) {
          verificationDocuments.pan_number = String(panNum).trim().toUpperCase();
        }
      } else if (verificationMethod === 'gst') {
        const gstin = kyc_verification_data.gstin_data?.gstin || kyc_verification_data.documentNumber;
        if (gstin) {
          verificationDocuments.gstin = String(gstin).trim().toUpperCase();
        }
      } else if (verificationMethod === 'cin') {
        const cin = kyc_verification_data.cin_data?.cin || kyc_verification_data.documentNumber;
        if (cin) {
          verificationDocuments.cin = String(cin).trim().toUpperCase();
        }
      }
    }

    // Create user with KYC status based on verification
    const user = new User({
      email: email && email.trim() ? email.toLowerCase().trim() : undefined,
      password,
      name: name.trim(),
      mobile_number: cleanMobile,
      preferred_language: preferred_language || 'English',
      address_line1: address_line1?.trim() || undefined,
      address_line2: address_line2?.trim() || undefined,
      district: district?.trim() || undefined,
      state: state?.trim() || undefined,
      country: country || 'India',
      pincode: pincode?.trim() || undefined,
      role: role || 'farmer',
      entity_type: entity_type || 'individual',
      business_name: entity_type === 'company' ? business_name?.trim() : undefined,
      business_type: entity_type === 'company' ? business_type : undefined,
      kyc_status: kyc_verification_data ? 'verified' : 'not_started',
      kyc_verified_at: kyc_verification_data ? new Date() : undefined,
      kyc_data: kyc_verification_data ? {
        verification_method: kyc_verification_data.verification_method || kyc_verification_data.verificationMethod || 'sandbox',
        verification_id: kyc_verification_data.verification_id,
        aadhaar_data: kyc_verification_data.aadhaar_data || {},
        verified_at: kyc_verification_data.aadhaar_data?.verified_at || new Date().toISOString(),
        ...kyc_verification_data,
      } : {},
      verification_documents: verificationDocuments
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const userObj = user.toJSON();
    res.status(201).json({
      user: {
        id: user._id.toString(),
        mobile_number: user.mobile_number,
        email: user.email || null,
        ...userObj
      },
      session: {
        access_token: token,
        user: {
          id: user._id.toString(),
          mobile_number: user.mobile_number,
          email: user.email || null
        }
      }
    });
  } catch (error) {
    console.error('Signup error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errors: error.errors,
      stack: error.stack?.substring(0, 200),
    });
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      console.log('Mongoose validation errors:', errors);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.join(', '),
        message: errors[0] || 'Invalid input data'
      });
    }
    
    // Handle duplicate email error (MongoDB unique constraint)
    if (error.code === 11000 || error.code === 11001) {
      console.log('Duplicate email error');
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Check if it's a database connection error
    if (error.name === 'MongooseError' || error.message?.includes('buffering timed out') || error.message?.includes('connection')) {
      console.log('Database connection error');
      return res.status(503).json({ 
        error: 'Database not connected',
        message: 'Please check your MongoDB connection. The database may not be accessible or your IP may not be whitelisted in MongoDB Atlas.'
      });
    }
    
    console.log('Unknown error, returning 500');
    res.status(500).json({ 
      error: error.message || 'Failed to create user',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Sign in (using mobile number and password)
router.post('/signin', async (req, res) => {
  try {
    // Check database connection
    const dbError = checkDB(req, res);
    if (dbError) return;

    const { mobile_number, password } = req.body;

    if (!mobile_number || !password) {
      return res.status(400).json({ error: 'Mobile number and password are required' });
    }

    // Clean and validate mobile number
    const cleanMobile = mobile_number.trim().replace(/\D/g, '');
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(cleanMobile)) {
      return res.status(400).json({ error: 'Mobile number must be 10 digits' });
    }

    const user = await User.findOne({ mobile_number: cleanMobile });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const userObj = user.toJSON();
    res.json({
      user: {
        id: user._id.toString(),
        mobile_number: user.mobile_number,
        email: user.email || null,
        ...userObj
      },
      session: {
        access_token: token,
        user: {
          id: user._id.toString(),
          mobile_number: user.mobile_number,
          email: user.email || null
        }
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    // Check if it's a database connection error
    if (error.name === 'MongooseError' || error.message?.includes('buffering timed out') || error.message?.includes('connection')) {
      return res.status(503).json({ 
        error: 'Database not connected',
        message: 'Please check your MongoDB connection. The database may not be accessible or your IP may not be whitelisted in MongoDB Atlas.'
      });
    }
    res.status(500).json({ error: error.message || 'Failed to sign in' });
  }
});

// Get current session (allow unauthenticated - return null session)
router.get('/session', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({
        user: null,
        session: null
      });
    }

    // Check database connection before querying
    if (mongoose.connection.readyState !== 1) {
      // Return null session if DB is not connected (allows frontend to handle gracefully)
      return res.json({
        user: null,
        session: null
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.json({
          user: null,
          session: null
        });
      }

      const userObj = user.toJSON();
      res.json({
        user: {
          id: user._id.toString(),
          mobile_number: user.mobile_number,
          email: user.email || null,
          ...userObj
        },
        session: {
          access_token: token,
          user: {
            id: user._id.toString(),
            mobile_number: user.mobile_number,
            email: user.email || null
          }
        }
      });
    } catch (jwtError) {
      // Invalid or expired token
      return res.json({
        user: null,
        session: null
      });
    }
  } catch (error) {
    console.error('Session error:', error);
    // For database errors, return null session (allows frontend to handle gracefully)
    if (error.name === 'MongooseError' || error.message?.includes('buffering timed out') || error.message?.includes('connection')) {
      return res.json({
        user: null,
        session: null
      });
    }
    res.json({
      user: null,
      session: null
    });
  }
});

// Sign out (client-side token removal, but we can log it)
router.post('/signout', authenticate, async (req, res) => {
  res.json({ message: 'Signed out successfully' });
});

// Get user by token
router.get('/user', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userObj = user.toJSON();
    res.json({
      user: {
        id: user._id.toString(),
        mobile_number: user.mobile_number,
        email: user.email || null,
        ...userObj
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    // Check if it's a database connection error
    if (error.name === 'MongooseError' || error.message?.includes('buffering timed out') || error.message?.includes('connection')) {
      return res.status(503).json({ 
        error: 'Database not connected',
        message: 'Please check your MongoDB connection. The database may not be accessible or your IP may not be whitelisted in MongoDB Atlas.'
      });
    }
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
});

export default router;

