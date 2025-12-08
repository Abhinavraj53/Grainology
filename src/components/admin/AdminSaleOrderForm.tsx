import { useState, useEffect } from 'react';
import { X, Save, User } from 'lucide-react';
import { api } from '../../lib/api';

interface AdminSaleOrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  mobile_number?: string;
  role: string;
}

export default function AdminSaleOrderForm({ onClose, onSuccess }: AdminSaleOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Customer selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Form fields
  const [commodity, setCommodity] = useState('');
  const [variety, setVariety] = useState('');
  const [quantityMt, setQuantityMt] = useState('');
  const [ratePerMt, setRatePerMt] = useState('');
  const [supplyAddress, setSupplyAddress] = useState('');
  const [deliveryTimelineDays, setDeliveryTimelineDays] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Against Delivery');
  const [status, setStatus] = useState('Open');
  const [notes, setNotes] = useState('');

  const commodities = ['Maize', 'Wheat', 'Paddy'];

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const session = await api.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/orders/customers`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!selectedCustomerId) {
        throw new Error('Please select a customer');
      }

      if (!commodity || !variety || !quantityMt || !ratePerMt || !supplyAddress) {
        throw new Error('Please fill in all required fields');
      }

      const session = await api.auth.getSession();
      const token = session.data.session?.access_token;

      const orderData = {
        seller_id: selectedCustomerId,
        commodity,
        variety,
        quantity_mt: parseFloat(quantityMt),
        price_per_quintal: parseFloat(ratePerMt),
        delivery_location: supplyAddress,
        delivery_timeline_days: deliveryTimelineDays ? parseInt(deliveryTimelineDays) : undefined,
        payment_terms: paymentTerms,
        status: status,
        notes: notes || undefined
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/orders/sale-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to create sale order');
      }

      setSuccess('Sale order created successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Create Sale Order (Admin POS)</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Customer Selection */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Select Seller
            </h3>
            {loadingCustomers ? (
              <div className="text-center py-4">Loading customers...</div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seller <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a seller...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email}) - {customer.role}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Selected:</span> {selectedCustomer.name} 
                      {selectedCustomer.mobile_number && ` - ${selectedCustomer.mobile_number}`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commodity <span className="text-red-500">*</span>
                </label>
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Commodity</option>
                  {commodities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variety <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  required
                  placeholder="e.g., Hybrid, Dara, Katarni"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity (MT) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={quantityMt}
                  onChange={(e) => setQuantityMt(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₹/Quintal) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ratePerMt}
                  onChange={(e) => setRatePerMt(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Note: Price is per quintal (1 MT = 10 quintals)</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={supplyAddress}
                  onChange={(e) => setSupplyAddress(e.target.value)}
                  required
                  placeholder="e.g., Warehouse, Buxar, Bihar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Timeline (Days)
                </label>
                <input
                  type="number"
                  value={deliveryTimelineDays}
                  onChange={(e) => setDeliveryTimelineDays(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Advance">Advance</option>
                  <option value="Against Delivery">Against Delivery</option>
                  <option value="T+3 Days">T+3 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Open">Open</option>
                  <option value="In Negotiation">In Negotiation</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCustomerId}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Sale Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

