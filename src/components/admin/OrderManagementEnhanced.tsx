import { useState } from 'react';
import { Order, supabase } from '../../lib/supabase';
import { Search, Filter, CheckCircle, XCircle, Package, Eye, FileText, Plus } from 'lucide-react';
import CSVUpload from '../CSVUpload';
import AdminTradeOrderForm from './AdminTradeOrderForm';

interface OrderManagementEnhancedProps {
  orders: Order[];
  onRefresh: () => void;
}

export default function OrderManagementEnhanced({ orders, onRefresh }: OrderManagementEnhancedProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.offer?.commodity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.offer?.seller?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleApproveOrder = async (orderId: string) => {
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'Approved - Awaiting Logistics' })
      .eq('id', orderId);

    if (updateError) {
      setError(updateError.message);
    } else {
      onRefresh();
    }

    setLoading(false);
  };

  const handleRejectOrder = async (orderId: string) => {
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'Rejected' })
      .eq('id', orderId);

    if (updateError) {
      setError(updateError.message);
    } else {
      onRefresh();
    }

    setLoading(false);
  };

  const handleCompleteOrder = async (orderId: string) => {
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'Completed',
        deduction_amount: deductionAmount,
        completed_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSelectedOrder(null);
      setDeductionAmount(0);
      onRefresh();
    }

    setLoading(false);
  };

  const calculateFinalAmount = (order: Order, deduction: number) => {
    const totalAmount = order.quantity_mt * 10 * order.final_price_per_quintal;
    return totalAmount - deduction;
  };

  return (
    <div className="space-y-6">
      {showCreateForm && (
        <AdminTradeOrderForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            onRefresh();
            setShowCreateForm(false);
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <CSVUpload type="orders" onUploadSuccess={onRefresh} />
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Trade Order (POS)
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Order ID, Buyer, Seller, or Commodity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved - Awaiting Logistics">Awaiting Logistics</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700 font-medium mb-1">Pending Approval</p>
            <p className="text-3xl font-bold text-yellow-800">
              {orders.filter(o => o.status === 'Pending Approval').length}
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-700 font-medium mb-1">Awaiting Logistics</p>
            <p className="text-3xl font-bold text-purple-800">
              {orders.filter(o => o.status === 'Approved - Awaiting Logistics').length}
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 font-medium mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-800">
              {orders.filter(o => o.status === 'Completed').length}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parties</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commodity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity & Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-mono text-gray-600">{order.id.slice(0, 12)}...</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div>
                        <p className="text-xs text-gray-500">Buyer:</p>
                        <p className="text-sm font-medium text-gray-900">{order.buyer?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Seller:</p>
                        <p className="text-sm font-medium text-gray-900">{order.offer?.seller?.name || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.offer?.commodity || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{order.offer?.variety || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.quantity_mt} MT</p>
                      <p className="text-xs text-gray-500">@ ₹{order.final_price_per_quintal}/quintal</p>
                      <p className="text-sm font-bold text-green-600 mt-1">
                        ₹{(order.quantity_mt * 10 * order.final_price_per_quintal).toLocaleString()}
                      </p>
                      {order.deduction_amount && order.deduction_amount > 0 && (
                        <p className="text-xs text-red-600">
                          -₹{order.deduction_amount.toLocaleString()} deduction
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'Approved - Awaiting Logistics' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {order.status === 'Pending Approval' && (
                        <>
                          <button
                            onClick={() => handleApproveOrder(order.id)}
                            disabled={loading}
                            className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
                            title="Approve Order"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectOrder(order.id)}
                            disabled={loading}
                            className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                            title="Reject Order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {order.status === 'Approved - Awaiting Logistics' && (
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                          title="Quality Check & Complete"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No orders found</p>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Order Details & Quality Control</h3>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setDeductionAmount(0);
                    setError('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Order ID:</span>
                      <p className="font-mono text-gray-900">{selectedOrder.id}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="font-medium text-gray-900">{selectedOrder.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <p className="text-gray-900">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Parties</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600">Buyer:</span>
                      <p className="font-medium text-gray-900">{selectedOrder.buyer?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Seller:</span>
                      <p className="font-medium text-gray-900">{selectedOrder.offer?.seller?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-800 mb-3">Commodity Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Commodity:</span>
                    <p className="font-medium text-gray-900">{selectedOrder.offer?.commodity || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Variety:</span>
                    <p className="font-medium text-gray-900">{selectedOrder.offer?.variety || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <p className="font-medium text-gray-900">{selectedOrder.quantity_mt} MT</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Price/Quintal:</span>
                    <p className="font-medium text-gray-900">₹{selectedOrder.final_price_per_quintal}</p>
                  </div>
                </div>
              </div>

              {selectedOrder.offer?.quality_report && Object.keys(selectedOrder.offer.quality_report).length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Seller's Quality Report
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {Object.entries(selectedOrder.offer.quality_report).map(([key, value]) => (
                      <div key={key} className="bg-white rounded p-3">
                        <span className="text-gray-600">{key}:</span>
                        <p className="font-medium text-gray-900">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="font-semibold text-gray-800 mb-3">Financial Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Amount:</span>
                    <span className="font-medium text-gray-900">
                      ₹{(selectedOrder.quantity_mt * 10 * selectedOrder.final_price_per_quintal).toLocaleString()}
                    </span>
                  </div>
                  {selectedOrder.status === 'Approved - Awaiting Logistics' && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">QC Deduction:</span>
                        <input
                          type="number"
                          value={deductionAmount}
                          onChange={(e) => setDeductionAmount(Number(e.target.value))}
                          min="0"
                          className="w-32 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="₹0"
                        />
                      </div>
                      <div className="flex justify-between pt-2 border-t border-yellow-300">
                        <span className="font-semibold text-gray-800">Final Amount:</span>
                        <span className="font-bold text-green-600 text-lg">
                          ₹{calculateFinalAmount(selectedOrder, deductionAmount).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedOrder.deduction_amount && selectedOrder.deduction_amount > 0 && (
                    <>
                      <div className="flex justify-between text-red-600">
                        <span>Deduction Applied:</span>
                        <span className="font-medium">-₹{selectedOrder.deduction_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-yellow-300">
                        <span className="font-semibold text-gray-800">Final Amount:</span>
                        <span className="font-bold text-green-600 text-lg">
                          ₹{calculateFinalAmount(selectedOrder, selectedOrder.deduction_amount).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedOrder.status === 'Approved - Awaiting Logistics' && (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleCompleteOrder(selectedOrder.id)}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Complete Order & Finalize Payment'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
