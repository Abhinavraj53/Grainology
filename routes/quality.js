import express from 'express';
import QualityParameter from '../models/QualityParameter.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const normalizeOptions = (options) => {
  if (Array.isArray(options)) {
    return options.map((option) => String(option)).filter(Boolean);
  }

  if (typeof options === 'string' && options.trim()) {
    try {
      const parsedOptions = JSON.parse(options);
      if (Array.isArray(parsedOptions)) {
        return parsedOptions.map((option) => String(option)).filter(Boolean);
      }
    } catch {
      // Fall back to comma-separated values for manually edited records.
    }

    return options
      .split(',')
      .map((option) => option.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeParameter = (parameter) => {
  const data = typeof parameter.toJSON === 'function' ? parameter.toJSON() : parameter;

  return {
    ...data,
    id: data.id || data._id?.toString(),
    s_no: data.s_no || 0,
    parameter_name: data.parameter_name || data.param_name || '',
    unit_of_measurement: data.unit_of_measurement || data.unit || '',
    standard_value: data.standard_value || data.standard || '',
    remarks: data.remarks || '',
    options: normalizeOptions(data.options),
    is_active: data.is_active !== false
  };
};

// Get all quality parameters
router.get('/', authenticate, async (req, res) => {
  try {
    const { commodity, is_active } = req.query;
    const query = {};
    
    if (commodity) {
      query.commodity = commodity;
    }

    if (is_active === undefined) {
      query.is_active = { $ne: false };
    } else {
      query.is_active = String(is_active) === 'true';
    }

    const parameters = await QualityParameter.find(query).sort({ commodity: 1, s_no: 1, parameter_name: 1 }).lean();
    res.json(parameters.map(normalizeParameter));
  } catch (error) {
    console.error('Get quality parameters error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quality parameters' });
  }
});

// Get quality parameter by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const parameter = await QualityParameter.findById(req.params.id).lean();
    if (!parameter) {
      return res.status(404).json({ error: 'Quality parameter not found' });
    }
    res.json(normalizeParameter(parameter));
  } catch (error) {
    console.error('Get quality parameter error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quality parameter' });
  }
});

// Create quality parameter (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];
    const parameters = await QualityParameter.insertMany(payload, { ordered: false });
    res.status(201).json(parameters.map(normalizeParameter));
  } catch (error) {
    console.error('Create quality parameter error:', error);
    res.status(500).json({ error: error.message || 'Failed to create quality parameter' });
  }
});

// Update quality parameter (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const parameter = await QualityParameter.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!parameter) {
      return res.status(404).json({ error: 'Quality parameter not found' });
    }

    res.json(normalizeParameter(parameter));
  } catch (error) {
    console.error('Update quality parameter error:', error);
    res.status(500).json({ error: error.message || 'Failed to update quality parameter' });
  }
});

// Delete quality parameter (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const parameter = await QualityParameter.findByIdAndDelete(req.params.id);
    if (!parameter) {
      return res.status(404).json({ error: 'Quality parameter not found' });
    }
    res.json({ message: 'Quality parameter deleted successfully' });
  } catch (error) {
    console.error('Delete quality parameter error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete quality parameter' });
  }
});

export default router;
