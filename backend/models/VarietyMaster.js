import mongoose from 'mongoose';

const varietyMasterSchema = new mongoose.Schema({
  commodity_name: {
    type: String,
    required: true
  },
  variety_name: {
    type: String,
    required: true
  },
  description: String,
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

varietyMasterSchema.index({ commodity_name: 1, variety_name: 1 }, { unique: true });

const VarietyMaster = mongoose.model('VarietyMaster', varietyMasterSchema);

export default VarietyMaster;

