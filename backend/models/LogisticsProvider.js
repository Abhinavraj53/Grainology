import mongoose from 'mongoose';

const logisticsProviderSchema = new mongoose.Schema({
  company_name: {
    type: String,
    required: true
  },
  contact_person: {
    type: String,
    required: true
  },
  mobile_number: {
    type: String,
    required: true
  },
  email: String,
  pickup_city: {
    type: String,
    required: true
  },
  delivery_city: {
    type: String,
    required: true
  },
  service_areas: [String],
  vehicle_types: {
    type: [String],
    default: ['Truck', 'Mini Truck', 'Tempo']
  },
  rate_per_km: {
    type: Number,
    default: 0
  },
  kyc_verified: {
    type: Boolean,
    default: false
  },
  kyc_documents: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  pan_number: String,
  gst_number: String,
  address: {
    type: String,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    default: ''
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

const LogisticsProvider = mongoose.model('LogisticsProvider', logisticsProviderSchema);

export default LogisticsProvider;

