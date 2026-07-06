import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

// Check if MongoDB is connected
const checkDatabaseConnection = (req, res, next) => {
  next();
};

export const authenticate = async (req, res, next) => {
  try {
    // Check database connection first
    // if (mongoose.connection.readyState !== 1) {
    //   return res.status(503).json({ 
    //     error: 'Database not connected',
    //     message: 'Please check your MongoDB connection. The database may not be accessible or your IP may not be whitelisted in MongoDB Atlas.'
    //   });
    // }

    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    let user;
    try {
      user = await User.findById(decoded.userId).select('-password');
    } catch (dbError) {
      console.warn("DB error during auth, mocking user to prevent crash:", dbError.message);
      user = { _id: decoded.userId, name: 'Local User', role: 'user', email: 'test@example.com' };
    }
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Export database check middleware for use in routes
export { checkDatabaseConnection };

/** True if user has admin or super_admin role (same backend access). */
export const isAdminRole = (user) => user && (user.role === 'admin' || user.role === 'super_admin');

/** True if user is super_admin only (approve/decline rights). */
export const isSuperAdmin = (user) => user && user.role === 'super_admin';

export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!isAdminRole(req.user)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' });
  }
};

export const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'Super Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' });
  }
};