import { useState, useEffect } from 'react';
import { X, Save, User, Package } from 'lucide-react';
import { api } from '../../lib/api';

interface AdminTradeOrderFormProps {
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

interface Offer {
  id: string;
  commodity: string;
  variety: string;
  quantity_mt: number;
  price_per_quintal: number;
  location: string;
  seller: {
    name: string;
  };
}

export default function AdminTradeOrderForm({ onClose, onSuccess }: AdminTradeOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Customer and offer selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);

  // Form fields
  const [quantityMt, setQuantityMt] = useState('');
  const [finalPricePerQuintal, setFinalPricePerQuintal] = useState('');
  const [status, setStatus] = useState('Pending Approval');
  const [deductionAmount, setDeductionAmount] = useState('0');

  useEffect(() => {
    loadCustomers();
    loadOffers();
  }, []);

  useEffect(() => {
    // When offer is selected, auto-fill price
    if (selectedOfferId) {
      const offer = offers.find(o => o.id === selectedOfferId);
      if (offer && !finalPricePerQuintal) {
        setFinalPricePerQuintal(offer.price_per_quintal.toString());
      }
    }
  }, [selectedOfferId, offers]);

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

  const loadOffers = async () => {
    try {
      setLoadingOffers(true);
      const session = await api.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/offers?status=Active`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOffers(data);
      }
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!selectedCustomerId || !selectedOfferId) {
        throw new Error('Please select both customer and offer');
      }

      if (!quantityMt || !finalPricePerQuintal) {
        throw new Error('Please fill in quantity and price');
      }

      const selectedOffer = offers.find(o => o.id === selectedOfferId);
      if (selectedOffer && parseFloat(quantityMt) > selectedOffer.quantity_mt) {
        throw new Error(`Quantity cannot exceed available offer quantity (${selectedOffer.quantity_mt} MT)`);
      }

      const session = await api.auth.getSession();
      const token = session.data.session?.access_token;

      const orderData = {
        buyer_id: selectedCustomerId,
        offer_id: selectedOfferId,
        quantity_mt: parseFloat(quantityMt),
        final_price_per_quintal: parseFloat(finalPricePerQuintal),
        status: status,
        deduction_amount: parseFloat(deductionAmount) || 0
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/orders/trade-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to create trade order');
      }

      setSuccess('Trade order created successfully!');
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
  const selectedOffer = offers.find(o => o.id === selectedOfferId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Create Trade Order (Admin POS)</h2>
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
              Select Buyer
            </h3>
            {loadingCustomers ? (
              <div className="text-center py-4">Loading customers...</div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buyer <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a buyer...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email}) - {customer.role}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Selected Buyer:</span> {selectedCustomer.name} 
                      {selectedCustomer.mobile_number && ` - ${selectedCustomer.mobile_number}`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Offer Selection */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600" />
              Select Offer
            </h3>
            {loadingOffers ? (
              <div className="text-center py-4">Loading offers...</div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offer <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedOfferId}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select an offer...</option>
                  {offers.map(offer => (
                    <option key={offer.id} value={offer.id}>
                      {offer.commodity} - {offer.variety} | {offer.quantity_mt} MT @ ₹{offer.price_per_quintal}/Quintal | {offer.seller.name}
                    </option>
                  ))}
                </select>
                {selectedOffer && (
                  <div className="mt-3 p-3 bg-white rounded border border-green-200 space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Selected Offer:</span> {selectedOffer.commodity} - {selectedOffer.variety}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Seller:</span> {selectedOffer.seller.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Available Quantity:</span> {selectedOffer.quantity_mt} MT
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Price:</span> ₹{selectedOffer.price_per_quintal}/Quintal
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Location:</span> {selectedOffer.location}
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
                  Quantity (MT) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={quantityMt}
                  onChange={(e) => setQuantityMt(e.target.value)}
                  required
                  max={selectedOffer?.quantity_mt}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder={`Max: ${selectedOffer?.quantity_mt || 'N/A'} MT`}
                />
                {selectedOffer && (
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {selectedOffer.quantity_mt} MT
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Price (₹/Quintal) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={finalPricePerQuintal}
                  onChange={(e) => setFinalPricePerQuintal(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deduction Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Approved - Awaiting Logistics">Approved - Awaiting Logistics</option>
                </select>
              </div>
            </div>

            {quantityMt && finalPricePerQuintal && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-900 font-semibold mb-1">Order Value:</p>
                <p className="text-lg font-bold text-purple-700">
                  ₹{((parseFloat(quantityMt) || 0) * 10 * (parseFloat(finalPricePerQuintal) || 0) - (parseFloat(deductionAmount) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  ({(parseFloat(quantityMt) || 0) * 10} Quintals × ₹{finalPricePerQuintal}/Quintal - ₹{deductionAmount || 0} deduction)
                </p>
              </div>
            )}
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
              disabled={loading || !selectedCustomerId || !selectedOfferId}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Trade Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

