import mongoose from 'mongoose';

const qualityParameterSchema = new mongoose.Schema({
  commodity: {
    type: String,
    required: true
  },
  s_no: {
    type: Number,
    required: true,
    default: 0
  },
  parameter_name: {
    type: String,
    required: true
  },
  unit_of_measurement: {
    type: String,
    required: true
  },
  standard_value: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    default: []
  },
  remarks: {
    type: String,
    default: ''
  },
  options: {
    type: [String],
    default: []
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

qualityParameterSchema.index({ commodity: 1, s_no: 1 });
qualityParameterSchema.index({ commodity: 1, parameter_name: 1 });

const QualityParameter = mongoose.model('QualityParameter', qualityParameterSchema, 'quality_parameters_master');

export default QualityParameter;
