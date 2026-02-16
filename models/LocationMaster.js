import mongoose from 'mongoose';

const locationMasterSchema = new mongoose.Schema({
  state: {
    type: String,
    default: '',
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

locationMasterSchema.index({ state: 1, name: 1 }, { unique: true, sparse: true });

const LocationMaster = mongoose.model('LocationMaster', locationMasterSchema);

export default LocationMaster;
