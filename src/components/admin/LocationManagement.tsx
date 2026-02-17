import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

interface LocationItem {
  id: string;
  name: string;
  state?: string;
  is_active: boolean;
}

export default function LocationManagement() {
  const { showSuccess, showError } = useToastContext();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);
  const [locationForm, setLocationForm] = useState({ name: '' });
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [searchingDuplicate, setSearchingDuplicate] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const token = localStorage.getItem('auth_token');

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedState.trim()
        ? `${apiUrl}/location-master?state=${encodeURIComponent(selectedState)}`
        : `${apiUrl}/location-master`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load locations');
      const data = await response.json();
      setLocations(data);
    } catch (error: any) {
      showError(error.message || 'Failed to load locations');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [selectedState, apiUrl, token, showError]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const effectiveState = (editingLocation?.state ?? selectedState ?? '').trim();
  // Realtime duplicate search (debounced)
  useEffect(() => {
    if (!effectiveState || !locationForm.name.trim()) {
      setDuplicateMessage('');
      return;
    }
    const t = setTimeout(async () => {
      setSearchingDuplicate(true);
      setDuplicateMessage('');
      try {
        const res = await fetch(
          `${apiUrl}/location-master/search?state=${encodeURIComponent(effectiveState)}&q=${encodeURIComponent(locationForm.name.trim())}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await res.json();
        const locationId = editingLocation?.id ?? (editingLocation as any)?._id;
        if (data.exists && (!editingLocation || data.location?.id !== locationId)) {
          setDuplicateMessage('A location with this name already exists in this state. Cannot create duplicate.');
        }
      } catch {
        setDuplicateMessage('');
      } finally {
        setSearchingDuplicate(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [effectiveState, locationForm.name, editingLocation, apiUrl, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stateForSubmit = (selectedState ?? editingLocation?.state ?? '').trim();
    if (!stateForSubmit && !editingLocation) {
      showError('Please select a state first');
      return;
    }
    if (!locationForm.name.trim()) {
      showError('Location name is required');
      return;
    }
    if (duplicateMessage) {
      showError(duplicateMessage);
      return;
    }

    try {
      const locationId = editingLocation?.id ?? (editingLocation as any)?._id;
      const url = editingLocation && locationId
        ? `${apiUrl}/location-master/${locationId}`
        : `${apiUrl}/location-master`;
      const method = editingLocation && locationId ? 'PUT' : 'POST';
      const body = { state: stateForSubmit || (editingLocation?.state ?? ''), name: locationForm.name.trim() };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save location');
      }

      const saved = await response.json();
      showSuccess(editingLocation ? 'Location updated successfully!' : 'Location added successfully!');
      resetForm();
      if (editingLocation) {
        setLocations(prev => prev.map(l => l.id === editingLocation.id ? { ...l, ...saved, state: saved.state ?? selectedState } : l));
      } else {
        setLocations(prev => [{ ...saved, id: saved.id || (saved as any)._id, state: saved.state ?? selectedState, is_active: true }, ...prev]);
      }
      loadLocations();
    } catch (error: any) {
      showError(error.message || 'Failed to save location');
    }
  };

  const handleEdit = (location: LocationItem) => {
    setEditingLocation(location);
    setLocationForm({ name: location.name });
    const stateVal = location.state ?? selectedState ?? '';
    setSelectedState(stateVal);
    setShowForm(true);
  };

  const handleDelete = async (location: LocationItem) => {
    if (!window.confirm(`Are you sure you want to deactivate "${location.name}"? It will no longer appear in Confirm Sales/Purchase order dropdowns.`)) {
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/location-master/${location.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to deactivate location');
      }
      showSuccess('Location deactivated successfully!');
      loadLocations();
    } catch (error: any) {
      showError(error.message || 'Failed to deactivate location');
    }
  };

  const resetForm = () => {
    setLocationForm({ name: '' });
    setEditingLocation(null);
    setShowForm(false);
    setDuplicateMessage('');
  };

  if (!token) {
    return (
      <div className="p-4 text-red-600">Authentication required. Please log in.</div>
    );
  }

  const activeLocations = locations.filter(l => l.is_active);
  const inactiveLocations = locations.filter(l => !l.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <MapPin className="w-8 h-8 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-800">Location Management</h1>
        </div>
      </div>

      <p className="text-gray-600">
        First select a <strong>State</strong>, then add locations for that state. Locations appear in Confirm Sales/Purchase order forms.
      </p>

      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select State (required to add or view locations)</label>
        <select
          value={selectedState}
          onChange={(e) => {
            setSelectedState(e.target.value);
            setShowForm(false);
            setEditingLocation(null);
            setLocationForm({ name: '' });
            setDuplicateMessage('');
          }}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">-- Choose State --</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {(selectedState || editingLocation) && (
        <button
          onClick={() => { setShowForm(true); setEditingLocation(null); setLocationForm({ name: '' }); setDuplicateMessage(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Location
        </button>
      )}

      {showForm && (selectedState || editingLocation) && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </h2>
            <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedState || (editingLocation?.state ?? '')}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setDuplicateMessage('');
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">-- Choose State --</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g. GULABBAGH, BUXAR, PATNA"
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
                {editingLocation ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {selectedState ? `Locations in ${selectedState}` : 'All Locations'}
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : activeLocations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{selectedState ? 'No locations in this state yet. Select state and add a location above.' : 'No locations added yet. Select a state above to add a location.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeLocations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{loc.state || selectedState}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loc.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(loc)} className="text-blue-600 hover:text-blue-900" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(loc)} className="text-red-600 hover:text-red-900" title="Deactivate">
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

      {inactiveLocations.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Inactive Locations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inactiveLocations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loc.state || selectedState}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">{loc.name}</td>
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
