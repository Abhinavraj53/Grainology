import { useState, useEffect } from 'react';
import { api, Order, LogisticsShipment } from '../../lib/client';
import { Truck, MapPin, Calendar, Phone, User, Package, CheckCircle, XCircle } from 'lucide-react';
import CSVUpload from '../CSVUpload';

export default function LogisticsManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<LogisticsShipment[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    transporter_name: '',
    vehicle_number: '',
    driver_name: '',
    driver_contact: '',
    pickup_location: '',
    delivery_location: '',
    pickup_date: '',
    expected_delivery_date: ''
  });

  useEffect(() => {
    loadOrders();
    loadShipments();
  }, []);

  const loadOrders = async () => {
    const { data, error } = await api
      .from('orders')
      .select('*, offer:offers(commodity, variety, location, seller:profiles!offers_seller_id_fkey(name)), buyer:profiles!orders_buyer_id_fkey(name)')
      .eq('status', 'Approved - Awaiting Logistics')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as any);
    }
  };

  const loadShipments = async () => {
    const { data, error } = await api
      .from('logistics_shipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setShipments(data);
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: shipmentError } = await api
        .from('logistics_shipments')
        .insert({
          order_id: selectedOrder.id,
          ...formData,
          status: 'pending'
        });

      if (shipmentError) throw shipmentError;

      setSuccess('Logistics shipment created successfully');
      setShowForm(false);
      setSelectedOrder(null);
      setFormData({
        transporter_name: '',
        vehicle_number: '',
        driver_name: '',
        driver_contact: '',
        pickup_location: '',
        delivery_location: '',
        pickup_date: '',
        expected_delivery_date: ''
      });
      loadOrders();
      loadShipments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShipmentStatus = async (shipmentId: string, newStatus: string) => {
    setLoading(true);
    setError('');

    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'delivered') {
        updateData.actual_delivery_date = new Date().toISOString().split('T')[0];
      }

      const { error: updateError } = await api
        .from('logistics_shipments')
        .update(updateData)
        .eq('id', shipmentId);

      if (updateError) throw updateError;

      if (newStatus === 'delivered') {
        const shipment = shipments.find(s => s.id === shipmentId);
        if (shipment) {
          await api
            .from('orders')
            .update({ status: 'Completed' })
            .eq('id', shipment.order_id);
        }
      }

      setSuccess('Shipment status updated successfully');
      loadShipments();
      loadOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <CSVUpload type="logistics-shipments" onUploadSuccess={() => { loadOrders(); loadShipments(); }} />
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Truck className="w-6 h-6 text-blue-600" />
          Logistics Management
        </h2>
        <p className="text-gray-600 mb-6">Manage transportation and delivery of agricultural commodities</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Orders Awaiting Logistics</h3>
          {orders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No orders awaiting logistics arrangement</p>
          ) : (
            <div className="grid gap-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {(order.offer as any)?.commodity} - {(order.offer as any)?.variety}
                      </p>
                      <p className="text-sm text-gray-600">
                        Buyer: {(order.buyer as any)?.name} | Seller: {(order.offer as any)?.seller?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Quantity: {order.quantity_mt} MT | From: {(order.offer as any)?.location}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowForm(true);
                        setFormData({
                          ...formData,
                          pickup_location: (order.offer as any)?.location || '',
                          delivery_location: ''
                        });
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Arrange Logistics
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && selectedOrder && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Create Logistics Shipment</h3>
          <form onSubmit={handleCreateShipment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transporter Name
                </label>
                <input
                  type="text"
                  value={formData.transporter_name}
                  onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter transporter name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., MH-12-AB-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter driver name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver Contact
                </label>
                <input
                  type="tel"
                  value={formData.driver_contact}
                  onChange={(e) => setFormData({ ...formData, driver_contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.pickup_location}
                  onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter pickup location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.delivery_location}
                  onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter delivery location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup Date
                </label>
                <input
                  type="date"
                  value={formData.pickup_date}
                  onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Shipment
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedOrder(null);
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Active Shipments</h3>
        {shipments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active shipments</p>
        ) : (
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-800 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Shipment #{shipment.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {shipment.transporter_name || 'N/A'} | {shipment.vehicle_number || 'N/A'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    shipment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                    shipment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {shipment.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-600">Pickup</p>
                      <p className="font-medium text-gray-800">{shipment.pickup_location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-gray-600">Delivery</p>
                      <p className="font-medium text-gray-800">{shipment.delivery_location}</p>
                    </div>
                  </div>
                  {shipment.driver_name && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-600">Driver</p>
                        <p className="font-medium text-gray-800">{shipment.driver_name}</p>
                        {shipment.driver_contact && (
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {shipment.driver_contact}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {shipment.status !== 'delivered' && shipment.status !== 'cancelled' && (
                  <div className="flex gap-2 mt-3">
                    {shipment.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateShipmentStatus(shipment.id, 'in_transit')}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                      >
                        Mark In Transit
                      </button>
                    )}
                    {shipment.status === 'in_transit' && (
                      <button
                        onClick={() => handleUpdateShipmentStatus(shipment.id, 'delivered')}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark Delivered
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateShipmentStatus(shipment.id, 'cancelled')}
                      disabled={loading}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
