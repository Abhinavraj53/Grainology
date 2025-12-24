import { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';

interface Commodity {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
}

interface Variety {
  id: string;
  commodity_name: string;
  variety_name: string;
  description?: string;
  is_active: boolean;
}

export default function CommodityVarietyManagement() {
  const { showSuccess, showError } = useToastContext();
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commodities' | 'varieties'>('commodities');

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

  useEffect(() => {
    loadCommodities();
    loadVarieties();
  }, []);

  const loadCommodities = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
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
  };

  const loadVarieties = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
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
  };

  const handleCommoditySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commodityForm.name.trim()) {
      showError('Commodity name is required');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
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
        body: JSON.stringify(commodityForm)
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
    if (!varietyForm.commodity_name.trim() || !varietyForm.variety_name.trim()) {
      showError('Commodity and variety names are required');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
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
        body: JSON.stringify(varietyForm)
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

  const handleDeleteCommodity = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this commodity? It will be hidden from selection but existing records will remain.')) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
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

  const handleDeleteVariety = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this variety? It will be hidden from selection but existing records will remain.')) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
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

  const openEditCommodity = (commodity: Commodity) => {
    setEditingCommodity(commodity);
    setCommodityForm({
      name: commodity.name,
      description: commodity.description || '',
      category: commodity.category || ''
    });
    setShowCommodityForm(true);
  };

  const openEditVariety = (variety: Variety) => {
    setEditingVariety(variety);
    setVarietyForm({
      commodity_name: variety.commodity_name,
      variety_name: variety.variety_name,
      description: variety.description || ''
    });
    setShowVarietyForm(true);
  };

  const activeCommodities = commodities.filter(c => c.is_active);
  const activeVarieties = varieties.filter(v => v.is_active);

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
                    onChange={(e) => setCommodityForm({ ...commodityForm, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Paddy, Wheat, Maize"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={commodityForm.description}
                    onChange={(e) => setCommodityForm({ ...commodityForm, description: e.target.value })}
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
                    onChange={(e) => setCommodityForm({ ...commodityForm, category: e.target.value })}
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeCommodities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No commodities found. Add your first commodity above.
                    </td>
                  </tr>
                ) : (
                  activeCommodities.map((commodity) => (
                    <tr key={commodity.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{commodity.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{commodity.category || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{commodity.description || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditCommodity(commodity)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit2 className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteCommodity(commodity.id)}
                          className="text-red-600 hover:text-red-900"
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
                    onChange={(e) => setVarietyForm({ ...varietyForm, commodity_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Commodity</option>
                    {activeCommodities.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
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
                    onChange={(e) => setVarietyForm({ ...varietyForm, variety_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Katarni, Sonam, Milling Quality"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={varietyForm.description}
                    onChange={(e) => setVarietyForm({ ...varietyForm, description: e.target.value })}
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeVarieties.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No varieties found. Add your first variety above.
                    </td>
                  </tr>
                ) : (
                  activeVarieties
                    .sort((a, b) => {
                      if (a.commodity_name !== b.commodity_name) {
                        return a.commodity_name.localeCompare(b.commodity_name);
                      }
                      return a.variety_name.localeCompare(b.variety_name);
                    })
                    .map((variety) => (
                      <tr key={variety.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{variety.commodity_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900">{variety.variety_name}</td>
                        <td className="px-4 py-3 text-gray-600">{variety.description || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditVariety(variety)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit2 className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteVariety(variety.id)}
                            className="text-red-600 hover:text-red-900"
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

