import { useState, useEffect } from 'react';
import { Store, X, Eye } from 'lucide-react';

interface SaleOrder {
  id: string;
  commodity: string;
  variety: string;
  quantity_mt: number;
  price_per_quintal: number;
  delivery_location: string;
  sauda_confirmation_date: string;
  status: string;
  createdAt: string;
  notes?: string;
  quality_report?: Record<string, string>;
}

interface SaleOrderHistoryProps {
  userId: string;
  userName: string;
}

export default function SaleOrderHistory({ userId, userName }: SaleOrderHistoryProps) {
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);

  useEffect(() => {
    fetchSaleOrders();
  }, []);

  const fetchSaleOrders = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch(`${apiUrl}/sale-orders?seller_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sale orders');
      }

      const data = await response.json();
      setOrders(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | undefined, fallbackDate?: string) => {
    const dateToUse = dateStr || fallbackDate;
    if (!dateToUse) return '-';
    try {
      const date = new Date(dateToUse);
      if (isNaN(date.getTime())) return dateToUse;
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateToUse;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sale orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Store className="w-8 h-8 text-green-600" />
          Sale Order History
        </h1>
        <p className="text-gray-600">View all your sale orders and their status</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 text-red-800 p-4">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Sale Orders Yet</h2>
          <p className="text-gray-600">Start by creating a new sale order using the Create Trade option.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Commodity</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Variety</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Quantity (MT)</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Price (MT)</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(order.sauda_confirmation_date, order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.commodity}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.variety || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-bold">{order.quantity_mt} MT</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                      ₹{((order.price_per_quintal || 0) * 10).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'In Negotiation' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                        order.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Sale Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Commodity</p>
                  <p className="text-lg text-gray-900 font-bold">{selectedOrder.commodity}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Variety</p>
                  <p className="text-lg text-gray-900 font-bold">{selectedOrder.variety || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Quantity</p>
                  <p className="text-lg text-gray-900 font-bold">{selectedOrder.quantity_mt} MT</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Price per MT</p>
                  <p className="text-lg text-gray-900 font-bold">₹{((selectedOrder.price_per_quintal || 0) * 10).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Sauda Date</p>
                  <p className="text-lg text-gray-900 font-bold">
                    {formatDate(selectedOrder.sauda_confirmation_date, selectedOrder.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Delivery Location</p>
                  <p className="text-lg text-gray-900 font-bold">{selectedOrder.delivery_location}</p>
                </div>
              </div>

              {selectedOrder.quality_report && Object.keys(selectedOrder.quality_report).length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Quality Parameters (Particulars)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(selectedOrder.quality_report).map(([param, value]) => (
                      <div key={param} className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-700 font-medium mb-1">{param}</p>
                        <p className="text-sm text-gray-900 font-bold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 border-t border-gray-200 pt-6">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Status</p>
                  <span className={`mt-1 inline-block px-3 py-1 rounded-full text-sm font-bold ${
                    selectedOrder.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                    selectedOrder.status === 'In Negotiation' ? 'bg-yellow-100 text-yellow-800' :
                    selectedOrder.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                    selectedOrder.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">System Entry Date</p>
                  <p className="text-gray-900 font-bold">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-sm text-gray-500 font-medium mb-2">Remarks / Notes</p>
                  <div className="bg-gray-50 p-4 rounded-lg text-gray-900 border border-gray-100 italic">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
