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

// Sign up
router.post('/signup', async (req, res) => {
  try {
    // Check database connection
    const dbError = checkDB(req, res);
    if (dbError) return;

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

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user with KYC status based on verification
    const user = new User({
      email,
      password,
      name,
      mobile_number,
      preferred_language: preferred_language || 'English',
      address_line1,
      address_line2,
      district,
      state,
      country: country || 'India',
      pincode,
      role: role || 'farmer',
      entity_type: entity_type || 'individual',
      business_name: entity_type === 'company' ? business_name : undefined,
      business_type: entity_type === 'company' ? business_type : undefined,
      kyc_status: kyc_verification_data ? 'verified' : 'not_started',
      kyc_verified_at: kyc_verification_data ? new Date() : undefined,
      kyc_data: kyc_verification_data || {}
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
        email: user.email,
        ...userObj
      },
      session: {
        access_token: token,
        user: {
          id: user._id.toString(),
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    // Check if it's a database connection error
    if (error.name === 'MongooseError' || error.message?.includes('buffering timed out') || error.message?.includes('connection')) {
      return res.status(503).json({ 
        error: 'Database not connected',
        message: 'Please check your MongoDB connection. The database may not be accessible or your IP may not be whitelisted in MongoDB Atlas.'
      });
    }
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// Sign in
router.post('/signin', async (req, res) => {
  try {
    // Check database connection
    const dbError = checkDB(req, res);
    if (dbError) return;

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
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
        email: user.email,
        ...userObj
      },
      session: {
        access_token: token,
        user: {
          id: user._id.toString(),
          email: user.email
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
          email: user.email,
          ...userObj
        },
        session: {
          access_token: token,
          user: {
            id: user._id.toString(),
            email: user.email
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
        email: user.email,
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

