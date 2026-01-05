import mongoose from 'mongoose';

const warehouseMasterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
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

const WarehouseMaster = mongoose.model('WarehouseMaster', warehouseMasterSchema);

export default WarehouseMaster;

