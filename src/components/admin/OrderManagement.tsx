import { useState } from 'react';
import { Order } from '../../lib/client';
import { CheckCircle, XCircle, Package, X } from 'lucide-react';

interface OrderManagementProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: string) => Promise<{ error: any }>;
  onFinalize: (orderId: string, deductionAmount: number) => Promise<{ error: any }>;
}

export default function OrderManagement({ orders, onUpdateStatus, onFinalize }: OrderManagementProps) {
  const [filter, setFilter] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const statusFilters = ['All', 'Pending Approval', 'Approved', 'Approved - Awaiting Logistics', 'Completed', 'Rejected'];

  const filteredOrders = orders.filter(order =>
    filter === 'All' || order.status === filter
  );

  const pendingOrders = filteredOrders.filter(o => o.status === 'Pending Approval');
  const otherOrders = filteredOrders.filter(o => o.status !== 'Pending Approval');
  const sortedOrders = [...pendingOrders, ...otherOrders];

  const handleApprove = async (orderId: string) => {
    setLoading(true);
    await onUpdateStatus(orderId, 'Approved');
    setLoading(false);
  };

  const handleReject = async (orderId: string) => {
    setLoading(true);
    await onUpdateStatus(orderId, 'Rejected');
    setLoading(false);
  };

  const handleFinalize = async () => {
    if (!selectedOrder) return;

    setLoading(true);
    const { error } = await onFinalize(selectedOrder.id, deductionAmount);
    setLoading(false);

    if (!error) {
      setSelectedOrder(null);
      setDeductionAmount(0);
    }
  };

  const calculateTotalAmount = (order: Order, deduction: number = 0) => {
    const totalQuintals = order.quantity_mt * 10;
    const grossAmount = totalQuintals * order.final_price_per_quintal;
    return grossAmount - deduction;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-slate-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
              {status !== 'All' && (
                <span className="ml-2 text-xs opacity-75">
                  ({orders.filter(o => o.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Commodity</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Buyer</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Price/Q</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedOrders.map((order) => (
                <tr
                  key={order.id}
                  className={`hover:bg-gray-50 ${
                    order.status === 'Pending Approval' ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.offer?.commodity || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">{order.offer?.variety}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.buyer?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.offer?.seller?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.quantity_mt} MT
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ₹{order.final_price_per_quintal}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'Approved - Awaiting Logistics' ? 'bg-purple-100 text-purple-800' :
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
                            onClick={() => handleApprove(order.id)}
                            disabled={loading}
                            className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            disabled={loading}
                            className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {order.status === 'Approved' && (
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-medium transition-colors"
                        >
                          Finalize QC
                        </button>
                      )}
                      {order.status === 'Completed' && (
                        <span className="text-xs text-gray-500">
                          Deduction: ₹{order.deduction_amount}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedOrders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No orders found</p>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Finalize Order - Quality Check</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Order ID</p>
                  <p className="text-sm font-mono font-medium text-gray-800">
                    {selectedOrder.id.slice(0, 16)}...
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Commodity</p>
                  <p className="text-sm font-medium text-gray-800">
                    {selectedOrder.offer?.commodity} - {selectedOrder.offer?.variety}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Quantity</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.quantity_mt} MT</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Price per Quintal</p>
                  <p className="text-sm font-medium text-gray-800">₹{selectedOrder.final_price_per_quintal}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality Report</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  {selectedOrder.offer?.quality_report && Object.keys(selectedOrder.offer.quality_report).length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(selectedOrder.offer.quality_report).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{key}:</span>
                          <span className="text-sm font-medium text-gray-800">{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No quality data available</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deduction Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(Number(e.target.value))}
                  placeholder="Enter deduction based on quality check"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter any deduction amount based on quality inspection results
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-6 text-white">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-90">Gross Amount</span>
                    <span className="text-lg font-medium">
                      ₹{calculateTotalAmount(selectedOrder, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-90">Deduction</span>
                    <span className="text-lg font-medium text-red-300">
                      - ₹{deductionAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-white/20 pt-3 flex justify-between items-center">
                    <span className="text-sm font-medium">Final Amount</span>
                    <span className="text-2xl font-bold">
                      ₹{calculateTotalAmount(selectedOrder, deductionAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleFinalize}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Complete Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
