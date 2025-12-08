import { useState, useEffect } from 'react';
import { ShoppingCart, Eye, CheckCircle, XCircle, Clock, Filter, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatQuantityWithUnit, UnitType } from '../../utils/unitConversion';
import CSVUpload from '../CSVUpload';
import AdminPurchaseOrderForm from './AdminPurchaseOrderForm';

interface PurchaseOrder {
  id: string;
  customer_name: string;
  sauda_confirmation_date: string;
  commodity: string;
  variety: string;
  unit_of_measurement: UnitType;
  rate_per_unit: number;
  quantity: number;
  remarks: string;
  payment_terms: string;
  delivery_period: string;
  quality_parameters: any;
  status: string;
  created_at: string;
  buyer: {
    name: string;
    email: string;
    mobile_number: string;
  };
}

export default function PurchaseOrderManagement() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredOrders(purchaseOrders);
    } else {
      setFilteredOrders(purchaseOrders.filter(order => order.status === statusFilter));
    }
  }, [statusFilter, purchaseOrders]);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        buyer:profiles!purchase_orders_buyer_id_fkey(name, email, mobile_number)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPurchaseOrders(data as any);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      await loadPurchaseOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    }
    setUpdating(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      'Draft': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      'Submitted': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      'Confirmed': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'In Progress': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      'Completed': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'Cancelled': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig['Draft'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-4 h-4" />
        {status}
      </span>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {showCreateForm && (
        <AdminPurchaseOrderForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            loadPurchaseOrders();
            setShowCreateForm(false);
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <CSVUpload type="purchase-orders" onUploadSuccess={loadPurchaseOrders} />
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Purchase Order (POS)
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Purchase Orders Management</h2>
              <p className="text-sm text-gray-600">Review and manage all customer purchase orders</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Orders</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Confirmed">Confirmed</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Commodity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rate</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sauda Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                      <div className="text-xs text-gray-500">{order.buyer.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{order.commodity}</div>
                      <div className="text-xs text-gray-500">{order.variety}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatQuantityWithUnit(order.quantity, order.unit_of_measurement)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ₹{order.rate_per_unit.toLocaleString('en-IN')} / {order.unit_of_measurement}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(order.sauda_confirmation_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-green-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Purchase Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Header */}
              <div className="grid grid-cols-2 gap-6 pb-6 border-b border-gray-200">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order ID</p>
                  <p className="font-mono font-semibold text-gray-900">#{selectedOrder.id.slice(0, 16)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Customer Name</p>
                    <p className="font-medium text-gray-900">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Buyer Email</p>
                    <p className="font-medium text-gray-900">{selectedOrder.buyer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Mobile Number</p>
                    <p className="font-medium text-gray-900">{selectedOrder.buyer.mobile_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sauda Confirmation Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedOrder.sauda_confirmation_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Commodity Details */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Commodity Details</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Commodity</p>
                      <p className="font-medium text-gray-900">{selectedOrder.commodity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Variety</p>
                      <p className="font-medium text-gray-900">{selectedOrder.variety}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Unit of Measurement</p>
                        <p className="font-bold text-gray-900 text-lg">{selectedOrder.unit_of_measurement}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Rate per Unit</p>
                        <p className="font-bold text-green-600 text-lg">
                          ₹{selectedOrder.rate_per_unit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Quantity</p>
                        <p className="font-bold text-gray-900 text-lg">
                          {formatQuantityWithUnit(selectedOrder.quantity, selectedOrder.unit_of_measurement)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">Total Order Value</p>
                    <p className="text-2xl font-bold text-green-700">
                      ₹{(selectedOrder.rate_per_unit * selectedOrder.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Terms & Conditions</h4>
                <div className="space-y-3">
                  {selectedOrder.payment_terms && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Payment Terms</p>
                      <p className="text-sm text-blue-800">{selectedOrder.payment_terms}</p>
                    </div>
                  )}
                  {selectedOrder.delivery_period && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-900 mb-1">Delivery Period</p>
                      <p className="text-sm text-yellow-800">{selectedOrder.delivery_period}</p>
                    </div>
                  )}
                  {selectedOrder.quality_parameters?.parameters && Array.isArray(selectedOrder.quality_parameters.parameters) && selectedOrder.quality_parameters.parameters.length > 0 && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-purple-900 mb-3">Quality Parameters</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-purple-100">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-purple-900">S.No</th>
                              <th className="px-3 py-2 text-left font-semibold text-purple-900">Parameter</th>
                              <th className="px-3 py-2 text-left font-semibold text-purple-900">Unit</th>
                              <th className="px-3 py-2 text-left font-semibold text-purple-900">Value</th>
                              <th className="px-3 py-2 text-left font-semibold text-purple-900">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-purple-200">
                            {selectedOrder.quality_parameters.parameters.map((param: any, idx: number) => (
                              <tr key={idx} className="hover:bg-purple-50">
                                <td className="px-3 py-2 text-purple-900">{param.s_no}</td>
                                <td className="px-3 py-2 text-purple-900 font-medium">{param.parameter_name}</td>
                                <td className="px-3 py-2 text-purple-800">{param.unit_of_measurement}</td>
                                <td className="px-3 py-2 text-purple-900 font-semibold">{param.actual_value || param.standard_value}</td>
                                <td className="px-3 py-2 text-purple-800 text-xs">{param.remarks}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {selectedOrder.remarks && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Remarks</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">{selectedOrder.remarks}</p>
                  </div>
                </div>
              )}

              {/* Status Update Actions */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Update Order Status</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status !== 'Confirmed' && selectedOrder.status !== 'Completed' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'Confirmed')}
                      disabled={updating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Confirm Order
                    </button>
                  )}
                  {selectedOrder.status === 'Confirmed' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'In Progress')}
                      disabled={updating}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    >
                      Mark In Progress
                    </button>
                  )}
                  {selectedOrder.status === 'In Progress' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'Completed')}
                      disabled={updating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Mark Completed
                    </button>
                  )}
                  {selectedOrder.status !== 'Cancelled' && selectedOrder.status !== 'Completed' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'Cancelled')}
                      disabled={updating}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
