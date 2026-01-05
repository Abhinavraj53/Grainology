import { useState, useEffect } from 'react';
import { Warehouse, Plus, Edit2, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';

interface WarehouseItem {
  id: string;
  name: string;
  is_active: boolean;
}

export default function WarehouseManagement() {
  const { showSuccess, showError } = useToastContext();
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);
  const [warehouseForm, setWarehouseForm] = useState({
    name: ''
  });

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const response = await fetch(`${apiUrl}/warehouse-master`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load warehouses');
      const data = await response.json();
      setWarehouses(data);
    } catch (error: any) {
      showError(error.message || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseForm.name.trim()) {
      showError('Warehouse name is required');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const url = editingWarehouse
        ? `${apiUrl}/warehouse-master/${editingWarehouse.id}`
        : `${apiUrl}/warehouse-master`;
      const method = editingWarehouse ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(warehouseForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save warehouse');
      }

      showSuccess(editingWarehouse ? 'Warehouse updated successfully!' : 'Warehouse created successfully!');
      resetForm();
      loadWarehouses();
    } catch (error: any) {
      showError(error.message || 'Failed to save warehouse');
    }
  };

  const handleEdit = (warehouse: WarehouseItem) => {
    setEditingWarehouse(warehouse);
    setWarehouseForm({ name: warehouse.name });
    setShowForm(true);
  };

  const handleDelete = async (warehouse: WarehouseItem) => {
    if (!window.confirm(`Are you sure you want to deactivate "${warehouse.name}"?`)) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showError('Authentication required');
        return;
      }

      const response = await fetch(`${apiUrl}/warehouse-master/${warehouse.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete warehouse');
      }

      showSuccess('Warehouse deactivated successfully!');
      loadWarehouses();
    } catch (error: any) {
      showError(error.message || 'Failed to delete warehouse');
    }
  };

  const resetForm = () => {
    setWarehouseForm({ name: '' });
    setEditingWarehouse(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const activeWarehouses = warehouses.filter(w => w.is_active);
  const inactiveWarehouses = warehouses.filter(w => !w.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Warehouse className="w-8 h-8 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-800">Warehouse Management</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Warehouse
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehouse Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter warehouse name"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
          <h2 className="text-lg font-semibold text-gray-800">Active Warehouses</h2>
        </div>
        {activeWarehouses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Warehouse className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No active warehouses found. Create one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeWarehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {warehouse.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(warehouse)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(warehouse)}
                          className="text-red-600 hover:text-red-900"
                          title="Deactivate"
                        >
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inactiveWarehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                      {warehouse.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        Inactive
                      </span>
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

