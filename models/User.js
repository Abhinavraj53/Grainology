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
  trade_name: {
    type: String,
    trim: true
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
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approved_at: Date,
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
  // Verification document IDs for uniqueness checking (indexes defined via schema.index() below)
  verification_documents: {
    aadhaar_number: { type: String, trim: true },
    pan_number: { type: String, trim: true, uppercase: true },
    gstin: { type: String, trim: true, uppercase: true },
    cin: { type: String, trim: true, uppercase: true }
  },
  // Uploaded verification document (for simple registration) – single, kept for backward compat
  uploaded_document: {
    document_type: {
      type: String,
      enum: ['aadhaar', 'pan', 'driving_license', 'voter_id', 'passport', 'gstin', 'cin', 'other'],
    },
    document_type_label: String, // when document_type is 'other', user can specify e.g. "Ration Card"
    cloudinary_url: String,
    cloudinary_public_id: String,
    view_url: String,
    download_url: String,
    file_name: String,
    file_size: Number,
    uploaded_at: Date,
  },
  // Multiple uploaded documents (user can choose multiple types; all selected must be uploaded)
  uploaded_documents: [{
    document_type: {
      type: String,
      enum: ['aadhaar', 'pan', 'driving_license', 'voter_id', 'passport', 'gstin', 'cin', 'other'],
    },
    document_type_label: String, // when document_type is 'other'
    cloudinary_url: String,
    cloudinary_public_id: String,
    view_url: String,
    download_url: String,
    file_name: String,
    file_size: Number,
    uploaded_at: Date,
  }],
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
// mobile_number: unique index is created by schema field option above, do not duplicate here

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

