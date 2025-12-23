import { useState, useEffect } from 'react';
import { supabase, Order, LogisticsShipment } from '../../lib/supabase';
import { Package, MapPin, Truck, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface OrderTrackingProps {
  profileId: string;
}

export default function OrderTracking({ profileId }: OrderTrackingProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Record<string, LogisticsShipment>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrdersAndShipments();
  }, [profileId]);

  const loadOrdersAndShipments = async () => {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*, offer:offers(commodity, variety, location, seller:profiles!offers_seller_id_fkey(name)), buyer:profiles!orders_buyer_id_fkey(name)')
      .or(`buyer_id.eq.${profileId},offer_id.in.(select id from offers where seller_id='${profileId}')`)
      .order('created_at', { ascending: false });

    if (!ordersError && ordersData) {
      setOrders(ordersData as any);

      const orderIds = ordersData.map(o => o.id);
      if (orderIds.length > 0) {
        const { data: shipmentsData } = await supabase
          .from('logistics_shipments')
          .select('*')
          .in('order_id', orderIds);

        if (shipmentsData) {
          const shipmentsMap: Record<string, LogisticsShipment> = {};
          shipmentsData.forEach(s => {
            shipmentsMap[s.order_id] = s;
          });
          setShipments(shipmentsMap);
        }
      }
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Approved - Awaiting Logistics':
      case 'Approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending Approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getShipmentStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderTimeline = (order: Order, shipment?: LogisticsShipment) => {
    const timeline = [];

    timeline.push({
      title: 'Order Placed',
      date: order.sauda_confirmation_date 
        ? new Date(order.sauda_confirmation_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        : new Date(order.created_at).toLocaleString(),
      status: 'completed',
      icon: Package
    });

    if (order.status !== 'Rejected') {
      timeline.push({
        title: 'Order Approved',
        date: order.status === 'Pending Approval' ? 'Pending' : 'Approved',
        status: order.status === 'Pending Approval' ? 'pending' : 'completed',
        icon: CheckCircle
      });

      if (shipment) {
        timeline.push({
          title: 'Shipment Created',
          date: new Date(shipment.created_at).toLocaleString(),
          status: 'completed',
          icon: Truck
        });

        if (shipment.pickup_date) {
          timeline.push({
            title: 'Picked Up',
            date: new Date(shipment.pickup_date).toLocaleDateString(),
            status: shipment.status === 'pending' ? 'pending' : 'completed',
            icon: MapPin
          });
        }

        if (shipment.status === 'in_transit') {
          timeline.push({
            title: 'In Transit',
            date: shipment.expected_delivery_date ? `ETA: ${new Date(shipment.expected_delivery_date).toLocaleDateString()}` : 'In progress',
            status: 'active',
            icon: Truck
          });
        }

        if (shipment.status === 'delivered' && shipment.actual_delivery_date) {
          timeline.push({
            title: 'Delivered',
            date: new Date(shipment.actual_delivery_date).toLocaleDateString(),
            status: 'completed',
            icon: CheckCircle
          });
        }
      }

      if (order.status === 'Completed') {
        timeline.push({
          title: 'Order Completed',
          date: 'Completed',
          status: 'completed',
          icon: CheckCircle
        });
      }
    } else {
      timeline.push({
        title: 'Order Rejected',
        date: 'Rejected',
        status: 'rejected',
        icon: AlertCircle
      });
    }

    return timeline;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>No orders to track</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Track Your Orders</h2>
        <p className="text-gray-600 mb-6">Monitor the status and delivery progress of your orders</p>
      </div>

      {orders.map((order) => {
        const shipment = shipments[order.id];
        const timeline = getOrderTimeline(order, shipment);

        return (
          <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4">
              <div className="flex justify-between items-start text-white">
                <div>
                  <p className="text-sm opacity-90">Order ID: #{order.id.slice(0, 8)}</p>
                  <h3 className="text-xl font-bold mt-1">
                    {(order.offer as any)?.commodity} - {(order.offer as any)?.variety}
                  </h3>
                  <p className="text-sm mt-1">
                    Quantity: {order.quantity_mt} MT | Price: ₹{order.final_price_per_quintal}/quintal
                  </p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium border-2 ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Order Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Seller:</span>
                      <span className="font-medium">{(order.offer as any)?.seller?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Buyer:</span>
                      <span className="font-medium">{(order.buyer as any)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{(order.offer as any)?.location}</span>
                    </div>
                    {order.deduction_amount > 0 && (
                      <div className="flex justify-between text-yellow-700">
                        <span>Quality Deduction:</span>
                        <span className="font-medium">₹{order.deduction_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {shipment && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Delivery Details</h4>
                    <div className="space-y-2 text-sm">
                      {shipment.transporter_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transporter:</span>
                          <span className="font-medium">{shipment.transporter_name}</span>
                        </div>
                      )}
                      {shipment.vehicle_number && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vehicle:</span>
                          <span className="font-medium">{shipment.vehicle_number}</span>
                        </div>
                      )}
                      {shipment.driver_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Driver:</span>
                          <span className="font-medium">{shipment.driver_name}</span>
                        </div>
                      )}
                      {shipment.driver_contact && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Contact:</span>
                          <span className="font-medium">{shipment.driver_contact}</span>
                        </div>
                      )}
                      <div className="pt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getShipmentStatusColor(shipment.status)}`}>
                          {shipment.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-4">Order Timeline</h4>
                <div className="space-y-4">
                  {timeline.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={index} className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          step.status === 'completed' ? 'bg-green-100 text-green-600' :
                          step.status === 'active' ? 'bg-blue-100 text-blue-600' :
                          step.status === 'rejected' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 pb-4 border-b border-gray-200 last:border-0">
                          <p className={`font-medium ${
                            step.status === 'completed' ? 'text-green-800' :
                            step.status === 'active' ? 'text-blue-800' :
                            step.status === 'rejected' ? 'text-red-800' :
                            'text-gray-600'
                          }`}>
                            {step.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {step.date}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
