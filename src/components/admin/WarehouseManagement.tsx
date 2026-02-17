import { useState, useEffect, useCallback } from 'react';
import { Warehouse, Plus, Edit2, Trash2, X, Save, MapPin } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';

interface WarehouseItem {
  id: string;
  name: string;
  location_id?: string;
  is_active: boolean;
}

interface LocationItem {
  id: string;
  name: string;
  state?: string;
  is_active: boolean;
}

export default function WarehouseManagement() {
  const { showSuccess, showError } = useToastContext();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);
  const [warehouseForm, setWarehouseForm] = useState({ name: '' });
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [searchingDuplicate, setSearchingDuplicate] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoadingLocations(false);
        return;
      }
      setLoadingLocations(true);
      try {
        const res = await fetch(`${apiUrl}/location-master?is_active=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load locations');
        const data = await res.json();
        setLocations(data);
      } catch (e: any) {
        showError(e.message || 'Failed to load locations');
        setLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    };
    load();
  }, [apiUrl, token, showError]);

  const loadWarehouses = useCallback(async () => {
    setLoadingWarehouses(true);
    try {
      const url = selectedLocationId.trim()
        ? `${apiUrl}/warehouse-master?location_id=${encodeURIComponent(selectedLocationId)}`
        : `${apiUrl}/warehouse-master`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load warehouses');
      const data = await res.json();
      setWarehouses(data);
    } catch (e: any) {
      showError(e.message || 'Failed to load warehouses');
      setWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  }, [selectedLocationId, apiUrl, token, showError]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  // Realtime duplicate search (debounced)
  useEffect(() => {
    if (!selectedLocationId.trim() || !warehouseForm.name.trim()) {
      setDuplicateMessage('');
      return;
    }
    const t = setTimeout(async () => {
      setSearchingDuplicate(true);
      setDuplicateMessage('');
      try {
        const res = await fetch(
          `${apiUrl}/warehouse-master/search?location_id=${encodeURIComponent(selectedLocationId)}&q=${encodeURIComponent(warehouseForm.name.trim())}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.exists && (!editingWarehouse || data.warehouse?.id !== editingWarehouse.id)) {
          setDuplicateMessage('A warehouse with this name already exists at this location. Cannot create duplicate.');
        }
      } catch {
        setDuplicateMessage('');
      } finally {
        setSearchingDuplicate(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [selectedLocationId, warehouseForm.name, editingWarehouse, apiUrl, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const locIdForSubmit = (selectedLocationId || (editingWarehouse?.location_id != null ? String(editingWarehouse.location_id) : ''))?.trim() ?? '';
    if (!locIdForSubmit) {
      showError('Please select a location');
      return;
    }
    if (!warehouseForm.name.trim()) {
      showError('Warehouse name is required');
      return;
    }
    if (duplicateMessage) {
      showError(duplicateMessage);
      return;
    }

    try {
      const warehouseId = editingWarehouse?.id ?? (editingWarehouse as any)?._id;
      const url = editingWarehouse && warehouseId
        ? `${apiUrl}/warehouse-master/${warehouseId}`
        : `${apiUrl}/warehouse-master`;
      const method = editingWarehouse && warehouseId ? 'PUT' : 'POST';
      const body = { location_id: locIdForSubmit, name: warehouseForm.name.trim() };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save warehouse');
      }

      const saved = await response.json();
      showSuccess(editingWarehouse ? 'Warehouse updated successfully!' : 'Warehouse created successfully!');
      resetForm();
      if (editingWarehouse) {
        setWarehouses(prev => prev.map(w => w.id === editingWarehouse.id ? { ...w, ...saved, location_id: saved.location_id ?? selectedLocationId } : w));
      } else {
        setWarehouses(prev => [{ ...saved, id: saved.id || (saved as any)._id, location_id: saved.location_id ?? selectedLocationId, is_active: true }, ...prev]);
      }
      loadWarehouses();
    } catch (error: any) {
      showError(error.message || 'Failed to save warehouse');
    }
  };

  const handleEdit = (warehouse: WarehouseItem) => {
    setEditingWarehouse(warehouse);
    setWarehouseForm({ name: warehouse.name });
    const locId = warehouse.location_id != null ? String(warehouse.location_id) : selectedLocationId || '';
    setSelectedLocationId(locId);
    setShowForm(true);
  };

  const handleDelete = async (warehouse: WarehouseItem) => {
    if (!window.confirm(`Are you sure you want to deactivate "${warehouse.name}"?`)) return;
    try {
      const res = await fetch(`${apiUrl}/warehouse-master/${warehouse.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to deactivate warehouse');
      }
      showSuccess('Warehouse deactivated successfully!');
      loadWarehouses();
    } catch (error: any) {
      showError(error.message || 'Failed to deactivate warehouse');
    }
  };

  const resetForm = () => {
    setWarehouseForm({ name: '' });
    setEditingWarehouse(null);
    setShowForm(false);
    setDuplicateMessage('');
  };

  if (!token) {
    return (
      <div className="p-4 text-red-600">Authentication required. Please log in.</div>
    );
  }

  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const activeWarehouses = warehouses.filter(w => w.is_active);
  const inactiveWarehouses = warehouses.filter(w => !w.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Warehouse className="w-8 h-8 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-800">Warehouse Management</h1>
        </div>
      </div>

      <p className="text-gray-600">
        First select a <strong>Location</strong>, then add warehouses for that location.
      </p>

      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Location (required to add or view warehouses)</label>
        <select
          value={selectedLocationId}
          onChange={(e) => {
            setSelectedLocationId(e.target.value);
            setShowForm(false);
            setEditingWarehouse(null);
            setWarehouseForm({ name: '' });
            setDuplicateMessage('');
          }}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          disabled={loadingLocations}
        >
          <option value="">-- Choose Location --</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}{loc.state ? ` (${loc.state})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedLocationId && (
        <button
          onClick={() => { setShowForm(true); setEditingWarehouse(null); setWarehouseForm({ name: '' }); setDuplicateMessage(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Warehouse
        </button>
      )}

      {showForm && (selectedLocationId || editingWarehouse) && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
            </h2>
            <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => {
                setSelectedLocationId(e.target.value);
                setDuplicateMessage('');
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">-- Choose Location --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}{loc.state ? ` (${loc.state})` : ''}
                </option>
              ))}
            </select>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter warehouse name"
              />
              {searchingDuplicate && <p className="text-xs text-gray-500 mt-1">Checking...</p>}
              {duplicateMessage && <p className="text-sm text-red-600 mt-1">{duplicateMessage}</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!!duplicateMessage || searchingDuplicate}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {editingWarehouse ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {selectedLocationId ? `Warehouses at ${selectedLocation?.name || 'this location'}` : 'All Warehouses'}
          </h2>
        </div>
        {loadingWarehouses ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : activeWarehouses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Warehouse className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{selectedLocationId ? 'No warehouses at this location yet. Add one above.' : 'No warehouses added yet. Select a location above to add a warehouse.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeWarehouses.map((wh) => (
                  <tr key={wh.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{wh.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(wh)} className="text-blue-600 hover:text-blue-900" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(wh)} className="text-red-600 hover:text-red-900" title="Deactivate">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {inactiveWarehouses.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Inactive Warehouses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inactiveWarehouses.map((wh) => (
                  <tr key={wh.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">{wh.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
