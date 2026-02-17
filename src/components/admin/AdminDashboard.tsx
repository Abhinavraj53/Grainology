import { Order, Offer } from '../../lib/client';
import { Users, Package, ShoppingCart, AlertCircle, TrendingUp, Calendar, DollarSign, UserCheck } from 'lucide-react';

interface AdminDashboardProps {
  stats: {
    totalUsers: number;
    totalFarmers: number;
    totalTraders: number;
    activeOffers: number;
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
  };
  orders: Order[];
  offers: Offer[];
}

export default function AdminDashboard({ stats, orders, offers }: AdminDashboardProps) {
  const recentOrders = orders.slice(0, 8);

  const commodityDistribution = offers.reduce((acc, offer) => {
    acc[offer.commodity] = (acc[offer.commodity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const orderStatusDistribution = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Users</p>
              <p className="text-4xl font-bold mt-2">{stats.totalUsers}</p>
              <p className="text-xs opacity-75 mt-1">
                {stats.totalFarmers} Farmers | {stats.totalTraders} Traders
              </p>
            </div>
            <Users className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Active Offers</p>
              <p className="text-4xl font-bold mt-2">{stats.activeOffers}</p>
            </div>
            <Package className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Orders</p>
              <p className="text-4xl font-bold mt-2">{stats.totalOrders}</p>
            </div>
            <ShoppingCart className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Pending Orders</p>
              <p className="text-4xl font-bold mt-2">{stats.pendingOrders}</p>
            </div>
            <AlertCircle className="w-12 h-12 opacity-30" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Total Revenue (Simulated)</p>
            <p className="text-5xl font-bold mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">From completed orders</p>
          </div>
          <DollarSign className="w-16 h-16 opacity-30" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Commodity Distribution</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(commodityDistribution).map(([commodity, count]) => (
                <div key={commodity}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">{commodity}</span>
                    <span className="text-sm font-bold text-gray-900">{count} offers</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${(count / stats.activeOffers) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Order Status Overview</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(orderStatusDistribution).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                  <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                    status === 'Completed' ? 'bg-green-100 text-green-800' :
                    status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                    status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commodity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {order.offer?.commodity || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.buyer?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.quantity_mt} MT</td>
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
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentOrders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No orders yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
