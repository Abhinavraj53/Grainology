import { useState, useEffect } from 'react';
import { Order, Offer, supabase, LogisticsShipment } from '../../lib/supabase';
import { Users, Package, ShoppingCart, AlertCircle, TrendingUp, DollarSign, UserCheck, Cloud, CheckCircle, Truck } from 'lucide-react';
import MandiBhaav from '../MandiBhaav';
import { WeatherCache, DashboardCache } from '../../lib/sessionStorage';

interface EnhancedDashboardProps {
  stats: {
    totalUsers: number;
    totalFarmers: number;
    totalTraders: number;
    verifiedUsers: number;
    activeOffers: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
  };
  orders: Order[];
  offers: Offer[];
}

export default function EnhancedDashboard({ stats, orders, offers }: EnhancedDashboardProps) {
  const [shipments, setShipments] = useState<LogisticsShipment[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<any[]>([]);

  useEffect(() => {
    // Get admin user ID from session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user?.id) {
        const userId = session.user.id;
        // Check cache first
        const cached = DashboardCache.getAdminData(userId) as { shipments: LogisticsShipment[]; vendorPerformance: any[] } | null;
        if (cached && cached.shipments && cached.vendorPerformance) {
          setShipments(cached.shipments || []);
          setVendorPerformance(cached.vendorPerformance || []);
          // Still load fresh data in background
          loadShipmentsAndPerformance(userId);
        } else {
          loadShipmentsAndPerformance(userId);
        }
      }
    });
    loadWeather();
  }, [orders]);

  const loadShipmentsAndPerformance = async (userId?: string) => {
    const { data: shipmentsData } = await supabase
      .from('logistics_shipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (shipmentsData) {
      setShipments(shipmentsData);
    }

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
        shipments: shipmentsData || [],
        vendorPerformance: performanceData
      });
    }
  };

  const recentOrders = orders.slice(0, 10);

  const commodityDistribution = offers.reduce((acc, offer) => {
    acc[offer.commodity] = (acc[offer.commodity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const orderStatusDistribution = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deliveryStats = {
    pending: shipments.filter(s => s.status === 'pending').length,
    inTransit: shipments.filter(s => s.status === 'in_transit').length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    total: shipments.length
  };


  const [weather, setWeather] = useState<{
    location: string;
    state: string;
    temperature_min: number;
    temperature_max: number;
    humidity: number;
    rainfall: number;
    weather_condition: string;
  } | null>(null);

  const [weatherLoading, setWeatherLoading] = useState(false);

  const loadWeather = async () => {
    try {
      setWeatherLoading(true);
      // Admin view: default to Patna, Bihar (can be extended later)
      const location = 'Patna';
      const state = 'Bihar';

      // Check cache first
      const cached = WeatherCache.get(location, state) as {
        location: string;
        state: string;
        temperature_min: number;
        temperature_max: number;
        humidity: number;
        rainfall: number;
        weather_condition: string;
      } | null;
      if (cached) {
        setWeather(cached);
        setWeatherLoading(false);
        return;
      }

      // Fetch from API
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const params = new URLSearchParams({
        location,
        state,
      });

      const token = localStorage.getItem('auth_token') || '';

      const response = await fetch(`${baseUrl}/weather/current?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch weather data (admin)');
        setWeather(null);
        setWeatherLoading(false);
        return;
      }

      const data = await response.json();
      const weatherData = {
        location: data.location || location,
        state: data.state || state,
        temperature_min: data.temperature_min,
        temperature_max: data.temperature_max,
        humidity: data.humidity,
        rainfall: data.rainfall,
        weather_condition: data.weather_condition || data.weather_description || 'Unknown',
      };
      setWeather(weatherData);
      // Cache the data
      WeatherCache.set(location, state, weatherData);
    } catch (error) {
      console.error('Error loading weather (admin):', error);
    } finally {
      setWeatherLoading(false);
    }
  };


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
              <p className="text-xs opacity-75 mt-1">Live in marketplace</p>
            </div>
            <Package className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Orders</p>
              <p className="text-4xl font-bold mt-2">{stats.totalOrders}</p>
              <p className="text-xs opacity-75 mt-1">
                {stats.completedOrders} Completed
              </p>
            </div>
            <ShoppingCart className="w-12 h-12 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Pending Orders</p>
              <p className="text-4xl font-bold mt-2">{stats.pendingOrders}</p>
              <p className="text-xs opacity-75 mt-1">Needs approval</p>
            </div>
            <AlertCircle className="w-12 h-12 opacity-30" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Platform Revenue</p>
              <p className="text-5xl font-bold mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-2">Simulated from completed orders</p>
            </div>
            <DollarSign className="w-16 h-16 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Verified Users</p>
              <p className="text-5xl font-bold mt-2">{stats.verifiedUsers}</p>
              <p className="text-xs opacity-75 mt-2">KYC completed users</p>
            </div>
            <UserCheck className="w-16 h-16 opacity-30" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Weather & Advisory</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Weather</p>
                  <p className="text-xs text-gray-500">
                    {weather
                      ? `${weather.location}, ${weather.state}`
                      : weatherLoading
                        ? 'Loading...'
                        : 'Patna, Bihar'}
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {weather
                    ? `${Math.round((weather.temperature_min + weather.temperature_max) / 2)}°C`
                    : weatherLoading
                      ? '...'
                      : '--'}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                {weather
                  ? `${weather.weather_condition}. Humidity ${Math.round(weather.humidity || 0)}%.` +
                    (weather.rainfall && weather.rainfall > 0 ? ` Rainfall ${weather.rainfall} mm.` : '')
                  : weatherLoading
                    ? 'Loading latest weather from Open-Meteo...'
                    : 'Weather data not available.'}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-gray-800 mb-2">Crop Advisory</p>
              <p className="text-sm text-gray-600">
                Good time for harvesting paddy. Moisture levels optimal for storage.
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-gray-800 mb-2">Market Tip</p>
              <p className="text-sm text-gray-600">
                Wheat prices expected to rise next week due to festival demand.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mandi Bhav Component with all filters */}
      <MandiBhaav />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600" />
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
                      style={{ width: `${(count / Math.max(stats.activeOffers, 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {Object.keys(commodityDistribution).length === 0 && (
                <p className="text-center text-gray-500 py-8">No active offers</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Order Status Overview</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {Object.entries(orderStatusDistribution).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                  <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                    status === 'Completed' ? 'bg-green-100 text-green-800' :
                    status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                    status === 'Approved - Awaiting Logistics' ? 'bg-purple-100 text-purple-800' :
                    status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {count}
                  </span>
                </div>
              ))}
              {Object.keys(orderStatusDistribution).length === 0 && (
                <p className="text-center text-gray-500 py-8">No orders yet</p>
              )}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Delivery Status Overview</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-700">{deliveryStats.pending}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600">In Transit</p>
                <p className="text-3xl font-bold text-blue-700">{deliveryStats.inTransit}</p>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Delivered</p>
                  <p className="text-3xl font-bold text-green-700">{deliveryStats.delivered}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Shipments</p>
                  <p className="text-2xl font-bold text-gray-800">{deliveryStats.total}</p>
                </div>
              </div>
            </div>
            {deliveryStats.total > 0 && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${(deliveryStats.delivered / deliveryStats.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  {Math.round((deliveryStats.delivered / deliveryStats.total) * 100)}% Delivery Success Rate
                </p>
              </div>
            )}
          </div>
        </div>

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
    </div>
  );
}
