import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

// Check if MongoDB is connected
const checkDatabaseConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not connected',
      message: 'Please check your MongoDB connection. The database may not be accessible or your IP may not be whitelisted in MongoDB Atlas.'
    });
  }
  next();
};

export const authenticate = async (req, res, next) => {
  try {
    // Check database connection first
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database not connected',
        message: 'Please check your MongoDB connection. The database may not be accessible or your IP may not be whitelisted in MongoDB Atlas.'
      });
    }

    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    // Check if it's a database connection error
    if (error.name === 'MongooseError' || error.message?.includes('buffering timed out')) {
      return res.status(503).json({ 
        error: 'Database not connected',
        message: 'Please check your MongoDB connection. The database may not be accessible or your IP may not be whitelisted in MongoDB Atlas.'
      });
    }
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Export database check middleware for use in routes
export { checkDatabaseConnection };

export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' });
  }
};

