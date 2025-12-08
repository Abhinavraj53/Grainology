import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
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
    type: String
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

