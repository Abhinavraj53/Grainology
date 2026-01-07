import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false, // Made optional - users can register without email
    // Note: unique index is created separately below with sparse: true
    // Do NOT use 'unique: true' here as it creates a non-sparse index
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  mobile_number: {
    type: String,
    required: true, // Now required for registration
    unique: true,
    trim: true
  },
  preferred_language: {
    type: String,
    default: 'English'
  },
  address_line1: String,
  address_line2: String,
  district: String,
  state: String,
  country: {
    type: String,
    default: 'India'
  },
  pincode: String,
  role: {
    type: String,
    required: true,
    enum: ['admin', 'farmer', 'trader', 'fpo', 'corporate', 'miller', 'financer'],
    default: 'farmer'
  },
  entity_type: {
    type: String,
    enum: ['individual', 'company'],
    default: 'individual'
  },
  kyc_status: {
    type: String,
    enum: ['not_started', 'pending', 'verified', 'rejected'],
    default: 'not_started'
  },
  kyc_verified_at: Date,
  kyc_data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Verification document IDs for uniqueness checking
  verification_documents: {
    aadhaar_number: {
      type: String,
      sparse: true,
      trim: true
    },
    pan_number: {
      type: String,
      sparse: true,
      trim: true,
      uppercase: true
    },
    gstin: {
      type: String,
      sparse: true,
      trim: true,
      uppercase: true
    },
    cin: {
      type: String,
      sparse: true,
      trim: true,
      uppercase: true
    }
  },
  business_name: String,
  business_type: {
    type: String,
    enum: ['private_limited', 'partnership', 'proprietorship', 'llp']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      return ret;
    }
  }
});

// Create indexes for verification documents to ensure uniqueness
userSchema.index({ email: 1 }, { unique: true, sparse: true }); // sparse allows multiple null/undefined
userSchema.index({ 'verification_documents.aadhaar_number': 1 }, { unique: true, sparse: true });
userSchema.index({ 'verification_documents.pan_number': 1 }, { unique: true, sparse: true });
userSchema.index({ 'verification_documents.gstin': 1 }, { unique: true, sparse: true });
userSchema.index({ 'verification_documents.cin': 1 }, { unique: true, sparse: true });
userSchema.index({ mobile_number: 1 }, { unique: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;

