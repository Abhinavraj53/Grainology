import { useState, useEffect } from 'react';
import { Order, Offer, supabase } from '../../lib/supabase';
import { Users, Package, ShoppingCart, TrendingUp, DollarSign, CheckCircle } from 'lucide-react';
import MandiBhaav from '../MandiBhaav';
import Weathersonu from '../weathersonu';
import { DashboardCache } from '../../lib/sessionStorage';

interface EnhancedDashboardProps {
  stats: {
    totalUsers: number;
    totalFarmers: number;
    totalTraders: number;
    verifiedUsers: number;
    totalPurchaseOrders: number;
    totalSaleOrders: number;
    totalConfirmedSalesOrders: number;
    totalConfirmedPurchaseOrders: number;
    totalConfirmedSalesAmount: number;
    totalConfirmedPurchaseAmount: number;
  };
  orders: Order[];
  offers: Offer[];
}

export default function EnhancedDashboard({ stats, orders }: EnhancedDashboardProps) {
  const [vendorPerformance, setVendorPerformance] = useState<any[]>([]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    // Get admin user ID from session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user?.id) {
        const userId = session.user.id;
        // Check cache first
        const cached = DashboardCache.getAdminData(userId) as { vendorPerformance: any[] } | null;
        if (cached && cached.vendorPerformance) {
          setVendorPerformance(cached.vendorPerformance || []);
          // Still load fresh data in background
          loadVendorPerformance(userId);
        } else {
          loadVendorPerformance(userId);
        }
      }
    });
  }, [orders]);

  const loadVendorPerformance = async (userId?: string) => {
    const { data: suppliers } = await supabase
      .from('profiles')
      .select('id, name, role')
      .in('role', ['farmer', 'fpo', 'corporate'])
      .limit(5);

    let performanceData: any[] = [];
    if (suppliers) {
      const performance = await Promise.all(
        suppliers.map(async (supplier: any) => {
          const { data: supplierOffers } = await supabase
            .from('offers')
            .select('id')
            .eq('seller_id', supplier.id);

          const offerIds = (supplierOffers || []).map((o: any) => o.id);

          const { data: supplierOrders } = await supabase
            .from('orders')
            .select('id, status')
            .in('offer_id', offerIds);

          const completedCount = supplierOrders?.filter((o: any) => o.status === 'Completed').length || 0;
          const totalCount = supplierOrders?.length || 0;

          return {
            name: supplier.name,
            completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
            totalOrders: totalCount
          };
        })
      );

      performanceData = performance;
      setVendorPerformance(performanceData);
    }

    // Cache the data
    if (userId) {
      DashboardCache.setAdminData(userId, {
        shipments: [],
        vendorPerformance: performanceData
      });
    }
  };

  const recentOrders = orders.slice(0, 10);




  return (
    <div className="space-y-6">
      {/* First Row: All Users, Total Purchase Orders, Total Sales Orders, Total Confirmed Sales Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">All Users</p>
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
              <p className="text-sm opacity-90">Total Purchase Orders</p>
              <p className="text-4xl font-bold mt-2">{stats.totalPurchaseOrders}</p>
              <p className="text-xs opacity-75 mt-1">All purchase orders</p>
            </div>
            <Package className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Sales Orders</p>
              <p className="text-4xl font-bold mt-2">{stats.totalSaleOrders}</p>
              <p className="text-xs opacity-75 mt-1">All sales orders</p>
            </div>
            <ShoppingCart className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Confirmed Sales Orders</p>
              <p className="text-4xl font-bold mt-2">{stats.totalConfirmedSalesOrders}</p>
              <p className="text-xs opacity-75 mt-1">Total confirmed</p>
            </div>
            <CheckCircle className="w-12 h-12 opacity-30" />
          </div>
        </div>
      </div>

      {/* Second Row: Total Confirmed Purchase Orders, Total Amount Confirmed Sales, Total Amount Confirmed Purchase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Confirmed Purchase Orders</p>
              <p className="text-4xl font-bold mt-2">{stats.totalConfirmedPurchaseOrders}</p>
              <p className="text-xs opacity-75 mt-1">Total confirmed</p>
            </div>
            <CheckCircle className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Confirmed Sales Amount</p>
              <p className="text-3xl font-bold mt-2">₹{stats.totalConfirmedSalesAmount.toLocaleString('en-IN')}</p>
              <p className="text-xs opacity-75 mt-2">All confirmed sales orders</p>
            </div>
            <DollarSign className="w-16 h-16 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Confirmed Purchase Amount</p>
              <p className="text-3xl font-bold mt-2">₹{stats.totalConfirmedPurchaseAmount.toLocaleString('en-IN')}</p>
              <p className="text-xs opacity-75 mt-2">All confirmed purchase orders</p>
            </div>
            <DollarSign className="w-16 h-16 opacity-30" />
          </div>
        </div>
      </div>

      {/* Location & Weather Component */}
      <div className="grid grid-cols-1 gap-6">
        <Weathersonu />
      </div>

      {/* Mandi Bhav Component with all filters */}
      <MandiBhaav />

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
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
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.offer?.seller?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.quantity_mt} MT</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ₹{(order.quantity_mt * 10 * order.final_price_per_quintal).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'Approved - Awaiting Logistics' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(order.sauda_confirmation_date || order.created_at)}
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

      {/* Vendor Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Vendor Performance</h3>
          </div>
        </div>
        <div className="p-6">
          {vendorPerformance.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Loading performance data...</p>
          ) : (
            <div className="space-y-4">
              {vendorPerformance.map((vendor, index) => (
                <div key={index} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-medium text-gray-800">{vendor.name}</p>
                      <p className="text-xs text-gray-500">{vendor.totalOrders} orders</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      vendor.completionRate >= 80 ? 'bg-green-100 text-green-800' :
                      vendor.completionRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {vendor.completionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        vendor.completionRate >= 80 ? 'bg-green-500' :
                        vendor.completionRate >= 50 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${vendor.completionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

