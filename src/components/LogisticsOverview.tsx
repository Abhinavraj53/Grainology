import { Truck, Package, MapPin, Clock } from 'lucide-react';

interface LogisticsOverviewProps {
  showFullDetails?: boolean;
}

export default function LogisticsOverview({ showFullDetails = false }: LogisticsOverviewProps) {
  // Static logistics data for demonstration
  const logisticsData = {
    activeShipments: 12,
    completedToday: 8,
    inTransit: 5,
    pendingPickup: 3,
    totalProviders: 15,
    averageDeliveryTime: '2.5 days',
    onTimeDeliveryRate: '94%'
  };

  const recentShipments = [
    {
      id: 'SH-001',
      commodity: 'Wheat',
      quantity: '50 MT',
      from: 'Patna, Bihar',
      to: 'Delhi, NCR',
      status: 'In Transit',
      provider: 'Fast Logistics',
      estimatedDelivery: '2 days',
      progress: 65
    },
    {
      id: 'SH-002',
      commodity: 'Paddy',
      quantity: '30 MT',
      from: 'Kolkata, WB',
      to: 'Mumbai, MH',
      status: 'Delivered',
      provider: 'Reliable Transport',
      estimatedDelivery: 'Completed',
      progress: 100
    },
    {
      id: 'SH-003',
      commodity: 'Maize',
      quantity: '25 MT',
      from: 'Ahmedabad, GJ',
      to: 'Bangalore, KA',
      status: 'Pending Pickup',
      provider: 'Express Cargo',
      estimatedDelivery: '3 days',
      progress: 0
    }
  ];

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

      {/* Stats Grid */}
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
          {recentShipments.map((shipment) => (
            <div key={shipment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-gray-900">{shipment.id}</span>
                    <span className="text-sm text-gray-600">• {shipment.commodity}</span>
                    <span className="text-sm text-gray-600">• {shipment.quantity}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{shipment.from} → {shipment.to}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{shipment.estimatedDelivery}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  shipment.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                  shipment.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {shipment.status}
                </span>
              </div>
              {shipment.status === 'In Transit' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{shipment.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${shipment.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">Provider: {shipment.provider}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

