import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Edit2, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';
import { usePopupContext } from '../../contexts/PopupContext';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';

interface Commodity {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
  approval_status?: 'pending' | 'approved' | 'declined';
  declined_reason?: string;
}

interface Variety {
  id: string;
  commodity_name: string;
  variety_name: string;
  description?: string;
  is_active: boolean;
  approval_status?: 'pending' | 'approved' | 'declined';
  declined_reason?: string;
}

interface QualityParameter {
  id: string;
  commodity: string;
  s_no?: number;
  param_name?: string;
  parameter_name?: string;
  unit?: string;
  unit_of_measurement?: string;
  standard?: string;
  standard_value?: string;
  options?: string[];
  remarks?: string;
  is_active?: boolean;
}

const toUpperCaseValue = (value: string) => value.toUpperCase();
const toUpperCaseLabel = (value?: string) => (value ? value.toUpperCase() : '');
const normalizeTextPayload = (value: string) => toUpperCaseValue(value.trim());
const toTitleCase = (value: string) => value
  .toLowerCase()
  .split(' ')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');
const getQualityName = (parameter: QualityParameter) => parameter.parameter_name || parameter.param_name || '';
const getQualityUnit = (parameter: QualityParameter) => parameter.unit_of_measurement || parameter.unit || '';
const getQualityStandard = (parameter: QualityParameter) => parameter.standard_value || parameter.standard || '';
const optionsToText = (options?: string[]) => (options || []).join(', ');
const textToOptions = (value: string) => value
  .split(',')
  .map((option) => option.trim())
  .filter(Boolean);

interface CommodityVarietyManagementProps {
  currentUserRole?: string;
}

const getApprovalBadgeClass = (status?: string) => {
  if (status === 'approved') return 'bg-green-100 text-green-800';
  if (status === 'declined') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-800';
};

const getApprovalLabel = (status?: string) => {
  if (status === 'approved') return 'APPROVED';
  if (status === 'declined') return 'DECLINED';
  return 'PENDING';
};

export default function CommodityVarietyManagement({ currentUserRole }: CommodityVarietyManagementProps) {
  const { showSuccess, showError } = useToastContext();
  const { showConfirm, showPrompt } = usePopupContext();
  const canApprove = currentUserRole === 'super_admin';
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [qualityParameters, setQualityParameters] = useState<QualityParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commodities' | 'varieties' | 'quality'>('commodities');

  // Commodity form state
  const [showCommodityForm, setShowCommodityForm] = useState(false);
  const [editingCommodity, setEditingCommodity] = useState<Commodity | null>(null);
  const [commodityForm, setCommodityForm] = useState({
    name: '',
    description: '',
    category: ''
  });

  // Variety form state
  const [showVarietyForm, setShowVarietyForm] = useState(false);
  const [editingVariety, setEditingVariety] = useState<Variety | null>(null);
  const [varietyForm, setVarietyForm] = useState({
    commodity_name: '',
    variety_name: '',
    description: ''
  });

  // Quality parameter form state
  const [selectedQualityCommodity, setSelectedQualityCommodity] = useState('');
  const [showQualityForm, setShowQualityForm] = useState(false);
  const [editingQualityParameter, setEditingQualityParameter] = useState<QualityParameter | null>(null);
  const [qualityForm, setQualityForm] = useState({
    s_no: '',
    param_name: '',
    unit: '',
    standard: '',
    optionsText: '',
    remarks: ''
  });

  const loadCommodities = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://grainology.onrender.com/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const response = await fetch(`${apiUrl}/commodity-master`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load commodities');
      const data = await response.json();
      setCommodities(data);
    } catch (error: any) {
      showError(error.message || 'Failed to load commodities');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const loadVarieties = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://grainology.onrender.com/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const response = await fetch(`${apiUrl}/variety-master`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load varieties');
      const data = await response.json();
      setVarieties(data);
    } catch (error: any) {
      showError(error.message || 'Failed to load varieties');
    }
  }, [showError]);

  const loadQualityParameters = useCallback(async () => {
    if (!selectedQualityCommodity) {
      setQualityParameters([]);
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://grainology.onrender.com/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const commodity = toTitleCase(selectedQualityCommodity);
      const params = new URLSearchParams({
        commodity,
        is_active: 'true'
      });

      const response = await fetch(`${apiUrl}/quality?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load quality parameters');

      const data: QualityParameter[] = await response.json();
      setQualityParameters(
        data.sort((a, b) => {
          const aSNo = a.s_no || 0;
          const bSNo = b.s_no || 0;
          if (aSNo !== bSNo) return aSNo - bSNo;
          return getQualityName(a).localeCompare(getQualityName(b));
        })
      );
    } catch (error: any) {
      showError(error.message || 'Failed to load quality parameters');
    }
  }, [selectedQualityCommodity, showError]);

  useLiveRefresh(loadCommodities, 10000, [loadCommodities]);
  useLiveRefresh(loadVarieties, 10000, [loadVarieties]);
  useLiveRefresh(loadQualityParameters, 10000, [loadQualityParameters]);

  useEffect(() => {
    if (!selectedQualityCommodity && commodities.length > 0) {
      const firstActiveCommodity = commodities.find((commodity) => commodity.is_active);
      if (firstActiveCommodity) {
        setSelectedQualityCommodity(toUpperCaseLabel(firstActiveCommodity.name));
      }
    }
  }, [commodities, selectedQualityCommodity]);

  const handleCommoditySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCommodityForm = {
      name: normalizeTextPayload(commodityForm.name),
      description: commodityForm.description.trim() ? normalizeTextPayload(commodityForm.description) : '',
      category: commodityForm.category.trim() ? normalizeTextPayload(commodityForm.category) : ''
    };

    if (!normalizedCommodityForm.name) {
      showError('Commodity name is required');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://grainology.onrender.com/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const url = editingCommodity
        ? `${apiUrl}/commodity-master/${editingCommodity.id}`
        : `${apiUrl}/commodity-master`;
      const method = editingCommodity ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(normalizedCommodityForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save commodity');
      }

      showSuccess(editingCommodity ? 'Commodity updated successfully' : 'Commodity created successfully');
      setShowCommodityForm(false);
      setEditingCommodity(null);
      setCommodityForm({ name: '', description: '', category: '' });
      loadCommodities();
    } catch (error: any) {
      showError(error.message || 'Failed to save commodity');
    }
  };

  const handleVarietySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedVarietyForm = {
      commodity_name: normalizeTextPayload(varietyForm.commodity_name),
      variety_name: normalizeTextPayload(varietyForm.variety_name),
      description: varietyForm.description.trim() ? normalizeTextPayload(varietyForm.description) : ''
    };

    if (!normalizedVarietyForm.commodity_name || !normalizedVarietyForm.variety_name) {
      showError('Commodity and variety names are required');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://grainology.onrender.com/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const url = editingVariety
        ? `${apiUrl}/variety-master/${editingVariety.id}`
        : `${apiUrl}/variety-master`;
      const method = editingVariety ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(normalizedVarietyForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save variety');
      }

      showSuccess(editingVariety ? 'Variety updated successfully' : 'Variety created successfully');
      setShowVarietyForm(false);
      setEditingVariety(null);
      setVarietyForm({ commodity_name: '', variety_name: '', description: '' });
      loadVarieties();
    } catch (error: any) {
      showError(error.message || 'Failed to save variety');
    }
  };

  const handleQualitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const options = textToOptions(qualityForm.optionsText);
    const sNo = Number(qualityForm.s_no) || qualityParameters.length + 1;
    const commodity = toTitleCase(selectedQualityCommodity);
    const paramName = qualityForm.param_name.trim();
    const unit = qualityForm.unit.trim();
    const standard = qualityForm.standard.trim();

    if (!commodity) {
      showError('Commodity is required');
      return;
    }

    if (!paramName || !unit || !standard || options.length === 0) {
      showError('Parameter name, unit, standard, and at least one option are required');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://grainology.onrender.com/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const payload = {
        commodity,
        s_no: sNo,
        param_name: paramName,
        parameter_name: paramName,
        unit,
        unit_of_measurement: unit,
        standard,
        standard_value: standard,
        options,
        remarks: qualityForm.remarks.trim(),
        is_active: true
      };

      const url = editingQualityParameter
        ? `${apiUrl}/quality/${editingQualityParameter.id}`
        : `${apiUrl}/quality`;
      const method = editingQualityParameter ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save quality parameter');
      }

      showSuccess(editingQualityParameter ? 'Quality parameter updated successfully' : 'Quality parameter created successfully');
      setShowQualityForm(false);
      setEditingQualityParameter(null);
      setQualityForm({ s_no: '', param_name: '', unit: '', standard: '', optionsText: '', remarks: '' });
      loadQualityParameters();
    } catch (error: any) {
      showError(error.message || 'Failed to save quality parameter');
    }
  };

  const handleDeleteCommodity = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Deactivate Commodity',
      message: 'Are you sure you want to deactivate this commodity? It will be hidden from selection but existing records will remain.',
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://grainology.onrender.com/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const response = await fetch(`${apiUrl}/commodity-master/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete commodity');
      showSuccess('Commodity deactivated successfully');
      loadCommodities();
    } catch (error: any) {
      showError(error.message || 'Failed to delete commodity');
    }
  };

  const handleCommodityApproval = async (commodityId: string, status: 'approved' | 'declined') => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const declineReasonInput = status === 'declined'
        ? await showPrompt({
            title: 'Decline Commodity',
            message: 'Enter decline reason for this commodity.',
            inputLabel: 'Decline reason',
            placeholder: 'Reason for declining',
            confirmText: 'Decline',
            cancelText: 'Cancel',
            required: true,
            tone: 'warning',
          })
        : null;
      if (status === 'declined' && declineReasonInput === null) return;
      const reason = (declineReasonInput || '').trim();
      if (status === 'declined' && !reason) {
        showError('Decline reason is required');
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'https://grainology.onrender.com/api';
      const response = await fetch(`${apiUrl}/commodity-master/${commodityId}/approval`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, reason })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update approval');
      }

      showSuccess(`Commodity ${status === 'approved' ? 'approved' : 'declined'} successfully`);
      loadCommodities();
    } catch (error: any) {
      showError(error.message || 'Failed to update commodity approval');
    }
  };

  const handleDeleteVariety = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Deactivate Variety',
      message: 'Are you sure you want to deactivate this variety? It will be hidden from selection but existing records will remain.',
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://grainology.onrender.com/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const response = await fetch(`${apiUrl}/variety-master/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete variety');
      showSuccess('Variety deactivated successfully');
      loadVarieties();
    } catch (error: any) {
      showError(error.message || 'Failed to delete variety');
    }
  };

  const handleDeleteQualityParameter = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Quality Parameter',
      message: 'Are you sure you want to delete this quality parameter?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://grainology.onrender.com/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const response = await fetch(`${apiUrl}/quality/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete quality parameter');
      showSuccess('Quality parameter deleted successfully');
      loadQualityParameters();
    } catch (error: any) {
      showError(error.message || 'Failed to delete quality parameter');
    }
  };

  const handleVarietyApproval = async (varietyId: string, status: 'approved' | 'declined') => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const declineReasonInput = status === 'declined'
        ? await showPrompt({
            title: 'Decline Variety',
            message: 'Enter decline reason for this variety.',
            inputLabel: 'Decline reason',
            placeholder: 'Reason for declining',
            confirmText: 'Decline',
            cancelText: 'Cancel',
            required: true,
            tone: 'warning',
          })
        : null;
      if (status === 'declined' && declineReasonInput === null) return;
      const reason = (declineReasonInput || '').trim();
      if (status === 'declined' && !reason) {
        showError('Decline reason is required');
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'https://grainology.onrender.com/api';
      const response = await fetch(`${apiUrl}/variety-master/${varietyId}/approval`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, reason })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update approval');
      }

      showSuccess(`Variety ${status === 'approved' ? 'approved' : 'declined'} successfully`);
      loadVarieties();
    } catch (error: any) {
      showError(error.message || 'Failed to update variety approval');
    }
  };

  const openEditCommodity = (commodity: Commodity) => {
    setEditingCommodity(commodity);
    setCommodityForm({
      name: toUpperCaseLabel(commodity.name),
      description: toUpperCaseLabel(commodity.description),
      category: toUpperCaseLabel(commodity.category)
    });
    setShowCommodityForm(true);
  };

  const openEditVariety = (variety: Variety) => {
    setEditingVariety(variety);
    setVarietyForm({
      commodity_name: toUpperCaseLabel(variety.commodity_name),
      variety_name: toUpperCaseLabel(variety.variety_name),
      description: toUpperCaseLabel(variety.description)
    });
    setShowVarietyForm(true);
  };

  const openEditQualityParameter = (parameter: QualityParameter) => {
    setEditingQualityParameter(parameter);
    setQualityForm({
      s_no: String(parameter.s_no || ''),
      param_name: getQualityName(parameter),
      unit: getQualityUnit(parameter),
      standard: getQualityStandard(parameter),
      optionsText: optionsToText(parameter.options),
      remarks: parameter.remarks || ''
    });
    setShowQualityForm(true);
  };

  const activeCommodities = commodities.filter(c => c.is_active);
  const activeVarieties = varieties.filter(v => v.is_active);
  const activeQualityParameters = qualityParameters.filter(p => p.is_active !== false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Package className="w-8 h-8 text-green-600" />
          Commodity & Variety Management
        </h1>
        <p className="text-gray-600">Manage commodities and their varieties</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('commodities')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'commodities'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Commodities ({activeCommodities.length})
            </button>
            <button
              onClick={() => setActiveTab('varieties')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'varieties'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Varieties ({activeVarieties.length})
            </button>
            <button
              onClick={() => setActiveTab('quality')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'quality'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Quality Parameters
            </button>
          </nav>
        </div>
      </div>

      {/* Commodities Tab */}
      {activeTab === 'commodities' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Commodities</h2>
            <button
              onClick={() => {
                setEditingCommodity(null);
                setCommodityForm({ name: '', description: '', category: '' });
                setShowCommodityForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Commodity
            </button>
          </div>

          {showCommodityForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">
                  {editingCommodity ? 'Edit Commodity' : 'Add New Commodity'}
                </h3>
                <button
                  onClick={() => {
                    setShowCommodityForm(false);
                    setEditingCommodity(null);
                    setCommodityForm({ name: '', description: '', category: '' });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCommoditySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commodity Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={commodityForm.name}
                    onChange={(e) => setCommodityForm({ ...commodityForm, name: toUpperCaseValue(e.target.value) })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Paddy, Wheat, Maize"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={commodityForm.description}
                    onChange={(e) => setCommodityForm({ ...commodityForm, description: toUpperCaseValue(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={commodityForm.category}
                    onChange={(e) => setCommodityForm({ ...commodityForm, category: toUpperCaseValue(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Cereal, Pulses"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {editingCommodity ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommodityForm(false);
                      setEditingCommodity(null);
                      setCommodityForm({ name: '', description: '', category: '' });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeCommodities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No commodities found. Add your first commodity above.
                    </td>
                  </tr>
                ) : (
                  activeCommodities.map((commodity) => (
                    <tr key={commodity.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{toUpperCaseLabel(commodity.name)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{toUpperCaseLabel(commodity.category) || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{toUpperCaseLabel(commodity.description) || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full w-fit ${getApprovalBadgeClass(commodity.approval_status)}`}>
                            {getApprovalLabel(commodity.approval_status)}
                          </span>
                          {commodity.approval_status === 'declined' && commodity.declined_reason && (
                            <span className="text-xs text-red-700 max-w-xs truncate" title={commodity.declined_reason}>
                              {commodity.declined_reason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        {canApprove && commodity.approval_status === 'pending' && (
                          <button
                            onClick={() => handleCommodityApproval(commodity.id, 'approved')}
                            className="text-green-700 hover:text-green-900 mr-3"
                            title="Approve"
                          >
                            Approve
                          </button>
                        )}
                        {canApprove && commodity.approval_status === 'pending' && (
                          <button
                            onClick={() => handleCommodityApproval(commodity.id, 'declined')}
                            className="text-amber-700 hover:text-amber-900 mr-3"
                            title="Decline"
                          >
                            Decline
                          </button>
                        )}
                        <button
                          onClick={() => openEditCommodity(commodity)}
                          disabled={currentUserRole === 'admin' && commodity.approval_status === 'approved'}
                          className="text-blue-600 hover:text-blue-900 mr-3 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={currentUserRole === 'admin' && commodity.approval_status === 'approved' ? 'Approved commodity cannot be edited by Admin' : 'Edit'}
                        >
                          <Edit2 className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteCommodity(commodity.id)}
                          disabled={currentUserRole === 'admin' && commodity.approval_status === 'approved'}
                          className="text-red-600 hover:text-red-900 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={currentUserRole === 'admin' && commodity.approval_status === 'approved' ? 'Approved commodity cannot be deactivated by Admin' : 'Deactivate'}
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Varieties Tab */}
      {activeTab === 'varieties' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Varieties</h2>
            <button
              onClick={() => {
                setEditingVariety(null);
                setVarietyForm({ commodity_name: '', variety_name: '', description: '' });
                setShowVarietyForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Variety
            </button>
          </div>

          {showVarietyForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">
                  {editingVariety ? 'Edit Variety' : 'Add New Variety'}
                </h3>
                <button
                  onClick={() => {
                    setShowVarietyForm(false);
                    setEditingVariety(null);
                    setVarietyForm({ commodity_name: '', variety_name: '', description: '' });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleVarietySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commodity <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={varietyForm.commodity_name}
                    onChange={(e) => setVarietyForm({ ...varietyForm, commodity_name: toUpperCaseValue(e.target.value) })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Commodity</option>
                    {activeCommodities.map((c) => (
                      <option key={c.id} value={toUpperCaseLabel(c.name)}>{toUpperCaseLabel(c.name)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variety Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={varietyForm.variety_name}
                    onChange={(e) => setVarietyForm({ ...varietyForm, variety_name: toUpperCaseValue(e.target.value) })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Katarni, Sonam, Milling Quality"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={varietyForm.description}
                    onChange={(e) => setVarietyForm({ ...varietyForm, description: toUpperCaseValue(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {editingVariety ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVarietyForm(false);
                      setEditingVariety(null);
                      setVarietyForm({ commodity_name: '', variety_name: '', description: '' });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commodity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variety</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeVarieties.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No varieties found. Add your first variety above.
                    </td>
                  </tr>
                ) : (
                  activeVarieties
                    .sort((a, b) => {
                      const aCommodity = toUpperCaseLabel(a.commodity_name);
                      const bCommodity = toUpperCaseLabel(b.commodity_name);
                      if (aCommodity !== bCommodity) {
                        return aCommodity.localeCompare(bCommodity);
                      }
                      return toUpperCaseLabel(a.variety_name).localeCompare(toUpperCaseLabel(b.variety_name));
                    })
                    .map((variety) => (
                      <tr key={variety.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{toUpperCaseLabel(variety.commodity_name)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900">{toUpperCaseLabel(variety.variety_name)}</td>
                        <td className="px-4 py-3 text-gray-600">{toUpperCaseLabel(variety.description) || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full w-fit ${getApprovalBadgeClass(variety.approval_status)}`}>
                              {getApprovalLabel(variety.approval_status)}
                            </span>
                            {variety.approval_status === 'declined' && variety.declined_reason && (
                              <span className="text-xs text-red-700 max-w-xs truncate" title={variety.declined_reason}>
                                {variety.declined_reason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          {canApprove && variety.approval_status === 'pending' && (
                            <button
                              onClick={() => handleVarietyApproval(variety.id, 'approved')}
                              className="text-green-700 hover:text-green-900 mr-3"
                              title="Approve"
                            >
                              Approve
                            </button>
                          )}
                          {canApprove && variety.approval_status === 'pending' && (
                            <button
                              onClick={() => handleVarietyApproval(variety.id, 'declined')}
                              className="text-amber-700 hover:text-amber-900 mr-3"
                              title="Decline"
                            >
                              Decline
                            </button>
                          )}
                          <button
                            onClick={() => openEditVariety(variety)}
                            disabled={currentUserRole === 'admin' && variety.approval_status === 'approved'}
                            className="text-blue-600 hover:text-blue-900 mr-3 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={currentUserRole === 'admin' && variety.approval_status === 'approved' ? 'Approved variety cannot be edited by Admin' : 'Edit'}
                          >
                            <Edit2 className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteVariety(variety.id)}
                            disabled={currentUserRole === 'admin' && variety.approval_status === 'approved'}
                            className="text-red-600 hover:text-red-900 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={currentUserRole === 'admin' && variety.approval_status === 'approved' ? 'Approved variety cannot be deactivated by Admin' : 'Deactivate'}
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quality Parameters Tab */}
      {activeTab === 'quality' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Quality Parameters</h2>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commodity <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedQualityCommodity}
                onChange={(e) => {
                  setSelectedQualityCommodity(e.target.value);
                  setShowQualityForm(false);
                  setEditingQualityParameter(null);
                  setQualityForm({ s_no: '', param_name: '', unit: '', standard: '', optionsText: '', remarks: '' });
                }}
                className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="" disabled>Select Commodity</option>
                {activeCommodities.map((commodity) => (
                  <option key={commodity.id} value={toUpperCaseLabel(commodity.name)}>
                    {toUpperCaseLabel(commodity.name)}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setEditingQualityParameter(null);
                setQualityForm({
                  s_no: String(activeQualityParameters.length + 1),
                  param_name: '',
                  unit: '',
                  standard: '',
                  optionsText: '',
                  remarks: ''
                });
                setShowQualityForm(true);
              }}
              disabled={!selectedQualityCommodity}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Quality Parameter
            </button>
          </div>

          {!selectedQualityCommodity && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <span>Select a commodity to view and manage its quality parameters.</span>
            </div>
          )}

          {showQualityForm && selectedQualityCommodity && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">
                  {editingQualityParameter ? 'Edit Quality Parameter' : 'Add New Quality Parameter'}
                </h3>
                <button
                  onClick={() => {
                    setShowQualityForm(false);
                    setEditingQualityParameter(null);
                    setQualityForm({ s_no: '', param_name: '', unit: '', standard: '', optionsText: '', remarks: '' });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleQualitySubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">S No.</label>
                    <input
                      type="number"
                      min="1"
                      value={qualityForm.s_no}
                      onChange={(e) => setQualityForm({ ...qualityForm, s_no: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parameter Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={qualityForm.param_name}
                      onChange={(e) => setQualityForm({ ...qualityForm, param_name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Moisture"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={qualityForm.unit}
                      onChange={(e) => setQualityForm({ ...qualityForm, unit: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="%, Count"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Standard <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={qualityForm.standard}
                      onChange={(e) => setQualityForm({ ...qualityForm, standard: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="MAX 2%"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={qualityForm.optionsText}
                    onChange={(e) => setQualityForm({ ...qualityForm, optionsText: e.target.value })}
                    required
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0%, 0.5%, 1.0%, Above 2%"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter dropdown options separated by commas.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    value={qualityForm.remarks}
                    onChange={(e) => setQualityForm({ ...qualityForm, remarks: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Optional remarks"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {editingQualityParameter ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQualityForm(false);
                      setEditingQualityParameter(null);
                      setQualityForm({ s_no: '', param_name: '', unit: '', standard: '', optionsText: '', remarks: '' });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standard</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Options</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!selectedQualityCommodity ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Select a commodity to view quality parameters.
                    </td>
                  </tr>
                ) : activeQualityParameters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No quality parameters found for {selectedQualityCommodity}. Add the first one above.
                    </td>
                  </tr>
                ) : (
                  activeQualityParameters.map((parameter, index) => (
                    <tr key={parameter.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{parameter.s_no || index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900">{getQualityName(parameter)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{getQualityUnit(parameter)}</td>
                      <td className="px-4 py-3 text-gray-600">{getQualityStandard(parameter)}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-md">
                        <div className="flex flex-wrap gap-1">
                          {(parameter.options || []).map((option) => (
                            <span key={option} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                              {option}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{parameter.remarks || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditQualityParameter(parameter)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteQualityParameter(parameter.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
