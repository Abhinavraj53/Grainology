import mongoose from 'mongoose';

const warehouseMasterSchema = new mongoose.Schema({
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LocationMaster',
    default: null
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

warehouseMasterSchema.index({ location_id: 1, name: 1 }, { unique: true, sparse: true });

const WarehouseMaster = mongoose.model('WarehouseMaster', warehouseMasterSchema);

export default WarehouseMaster;

