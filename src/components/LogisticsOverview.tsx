import { useState, useEffect } from 'react';
import { Truck, Package, MapPin, Clock } from 'lucide-react';
import { api } from '../lib/client';

interface LogisticsOverviewProps {
  showFullDetails?: boolean;
}

interface Shipment {
  id: string;
  status: string;
  actual_delivery_date?: string;
  expected_delivery_date?: string;
  pickup_location?: string;
  delivery_location?: string;
  transporter_name?: string;
  order_id?: any;
  createdAt?: string;
}

export default function LogisticsOverview({ showFullDetails = false }: LogisticsOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [logisticsData, setLogisticsData] = useState({
    activeShipments: 0,
    completedToday: 0,
    inTransit: 0,
    pendingPickup: 0,
    totalProviders: 0,
    onTimeDeliveryRate: '0%'
  });
  const [recentShipments, setRecentShipments] = useState<Shipment[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [providersRes, shipmentsRes] = await Promise.all([
          api.from('logistics_providers').select('*').eq('is_active', true),
          api.from('logistics_shipments').select('*')
        ]);

        if (cancelled) return;

        const providers = Array.isArray(providersRes.data) ? providersRes.data : [];
        const shipments: Shipment[] = Array.isArray(shipmentsRes.data) ? shipmentsRes.data : [];

        const today = new Date().toDateString();

        const inTransit = shipments.filter((s) => (s.status || '').toLowerCase() === 'in_transit').length;
        const pendingPickup = shipments.filter((s) => (s.status || '').toLowerCase() === 'pending').length;
        const delivered = shipments.filter((s) => (s.status || '').toLowerCase() === 'delivered');
        const activeShipments = inTransit + pendingPickup;

        const completedToday = delivered.filter((s) => {
          const d = s.actual_delivery_date ? new Date(s.actual_delivery_date) : null;
          return d ? d.toDateString() === today : false;
        }).length;

        let onTimeRate = '0%';
        if (delivered.length > 0) {
          const onTime = delivered.filter((s) => {
            if (!s.actual_delivery_date || !s.expected_delivery_date) return false;
            return new Date(s.actual_delivery_date) <= new Date(s.expected_delivery_date);
          }).length;
          onTimeRate = `${Math.round((onTime / delivered.length) * 100)}%`;
        }

        setLogisticsData({
          activeShipments,
          completedToday,
          inTransit,
          pendingPickup,
          totalProviders: providers.length,
          onTimeDeliveryRate: onTimeRate
        });

        if (showFullDetails && shipments.length > 0) {
          setRecentShipments(
            shipments
              .sort((a, b) => new Date((b.createdAt as string) || 0).getTime() - new Date((a.createdAt as string) || 0).getTime())
              .slice(0, 10)
          );
        }
      } catch {
        if (!cancelled) setLogisticsData((prev) => ({ ...prev }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [showFullDetails]);

  const statusLabel = (s: string) => {
    const v = (s || '').toLowerCase();
    if (v === 'delivered') return 'Delivered';
    if (v === 'in_transit') return 'In Transit';
    if (v === 'pending') return 'Pending Pickup';
    if (v === 'cancelled') return 'Cancelled';
    return s || '—';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 p-3 rounded-lg">
            <Truck className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Logistics Overview</h3>
            <p className="text-sm text-gray-600">Track Your Shipments</p>
          </div>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-600 border-solid" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-3 rounded-lg">
            <Truck className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Logistics Overview</h3>
            <p className="text-sm text-gray-600">Track Your Shipments</p>
          </div>
        </div>
      </div>

      {/* Stats Grid - real data */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Active Shipments</p>
          <p className="text-2xl font-bold text-purple-600">{logisticsData.activeShipments}</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Completed Today</p>
          <p className="text-2xl font-bold text-green-600">{logisticsData.completedToday}</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">In Transit</p>
          <p className="text-2xl font-bold text-blue-600">{logisticsData.inTransit}</p>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Pending Pickup</p>
          <p className="text-2xl font-bold text-orange-600">{logisticsData.pendingPickup}</p>
        </div>
        <div className="p-3 bg-indigo-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Total Providers</p>
          <p className="text-2xl font-bold text-indigo-600">{logisticsData.totalProviders}</p>
        </div>
        <div className="p-3 bg-teal-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">On-Time Rate</p>
          <p className="text-2xl font-bold text-teal-600">{logisticsData.onTimeDeliveryRate}</p>
        </div>
      </div>

      {showFullDetails && (
        <div className="mt-6 space-y-4">
          <h4 className="font-semibold text-gray-800 mb-3">Recent Shipments</h4>
          {recentShipments.length === 0 ? (
            <p className="text-sm text-gray-500">No shipments yet.</p>
          ) : (
            recentShipments.map((shipment) => (
              <div key={shipment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-gray-900">{shipment.id}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{shipment.pickup_location || '—'} → {shipment.delivery_location || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {shipment.actual_delivery_date
                            ? `Delivered ${new Date(shipment.actual_delivery_date).toLocaleDateString()}`
                            : shipment.expected_delivery_date
                              ? `Expected ${new Date(shipment.expected_delivery_date).toLocaleDateString()}`
                              : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    (shipment.status || '').toLowerCase() === 'delivered' ? 'bg-green-100 text-green-800' :
                    (shipment.status || '').toLowerCase() === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                    (shipment.status || '').toLowerCase() === 'pending' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {statusLabel(shipment.status)}
                  </span>
                </div>
                {shipment.transporter_name && (
                  <p className="text-xs text-gray-500 mt-2">Provider: {shipment.transporter_name}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

