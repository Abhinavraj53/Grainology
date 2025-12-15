import { useState, useEffect } from 'react';
import { Profile, Order, Offer, supabase } from '../../lib/supabase';
import { TrendingUp, Cloud, Package, ShoppingCart, AlertCircle } from 'lucide-react';
import KYCVerification from '../KYCVerification';

interface DashboardProps {
  profile: Profile | null;
  orders: Order[];
  offers: Offer[];
}

// Helper to normalize commodity names
const normalizeCommodity = (commodity: string): string | null => {
  if (!commodity) return null;
  const lower = commodity.toLowerCase();
  if (lower.includes('maize') || lower.includes('corn')) return 'Maize';
  if (lower.includes('paddy') || lower.includes('rice')) return 'Paddy';
  if (lower.includes('wheat')) return 'Wheat';
  return null;
};

// Fetch live Mandi data
async function fetchLiveMandi() {
  const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/mandi/live?limit=1000`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch live mandi prices');
  }
  return response.json();
}

export default function Dashboard({ profile, orders, offers }: DashboardProps) {
  const [marketRates, setMarketRates] = useState([
    { commodity: 'Paddy', rate: '₹0/quintal', change: '0%', trend: 'neutral' as 'up' | 'down' | 'neutral' },
    { commodity: 'Maize', rate: '₹0/quintal', change: '0%', trend: 'neutral' as 'up' | 'down' | 'neutral' },
    { commodity: 'Wheat', rate: '₹0/quintal', change: '0%', trend: 'neutral' as 'up' | 'down' | 'neutral' },
  ]);

  useEffect(() => {
    loadMarketRates();
  }, []);

  const loadMarketRates = async () => {
    try {
      const live = await fetchLiveMandi();
      if (live?.records?.length) {
        const records = live.records.map((r: any) => {
          const normalized = normalizeCommodity(r.commodity);
          return normalized ? { ...r, commodity: normalized } : null;
        }).filter(Boolean);

        // Calculate average prices for each commodity
        const commodityData: Record<string, { prices: number[], yesterdayPrices: number[] }> = {
          Maize: { prices: [], yesterdayPrices: [] },
          Paddy: { prices: [], yesterdayPrices: [] },
          Wheat: { prices: [], yesterdayPrices: [] },
        };

        // Get most recent date from records
        const allDates = records.map((r: any) => new Date(r.price_date).getTime()).filter(Boolean);
        const mostRecentDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date();
        mostRecentDate.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(mostRecentDate);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        // Use most recent data (within last 7 days) for today, and day before for yesterday
        records.forEach((record: any) => {
          if (commodityData[record.commodity] && record.modal_price > 0) {
            const priceDate = new Date(record.price_date);
            priceDate.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((mostRecentDate.getTime() - priceDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 0) {
              commodityData[record.commodity].prices.push(record.modal_price);
            } else if (daysDiff === 1) {
              commodityData[record.commodity].yesterdayPrices.push(record.modal_price);
            } else if (daysDiff <= 7 && commodityData[record.commodity].prices.length === 0) {
              // If no today's data, use recent data
              commodityData[record.commodity].prices.push(record.modal_price);
            }
          }
        });

        const rates = ['Maize', 'Paddy', 'Wheat'].map(commodity => {
          const data = commodityData[commodity];
          const avgPrice = data.prices.length > 0
            ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
            : 0;
          const avgYesterday = data.yesterdayPrices.length > 0
            ? Math.round(data.yesterdayPrices.reduce((a, b) => a + b, 0) / data.yesterdayPrices.length)
            : avgPrice;

          const change = avgYesterday > 0 && avgPrice > 0
            ? ((avgPrice - avgYesterday) / avgYesterday * 100).toFixed(1)
            : '0';
          const trend = parseFloat(change) > 0 ? 'up' : parseFloat(change) < 0 ? 'down' : 'neutral';

          return {
            commodity,
            rate: avgPrice > 0 ? `₹${avgPrice.toLocaleString()}/quintal` : 'No data available',
            change: avgPrice > 0 ? `${change.startsWith('-') ? '' : '+'}${change}%` : '0%',
            trend,
          };
        });

        setMarketRates(rates);
      }
    } catch (err) {
      console.error('Error loading market rates:', err);
    }
  };

  if (!profile) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-700">Loading profile...</p>
        </div>
      </div>
    );
  }

  const myOffers = offers.filter(o => o.seller_id === profile.id);
  const pendingOrders = orders.filter(o => o.status === 'Pending Approval');

  const handleKYCComplete = async () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">My Orders</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{orders.length}</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>

        {profile.role === 'farmer' && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Offers</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{myOffers.length}</p>
              </div>
              <Package className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{pendingOrders.length}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {orders.filter(o => o.status === 'Completed').length}
              </p>
            </div>
            <Package className="w-12 h-12 text-teal-500 opacity-20" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Market Rates (Mandi Bhav)</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {marketRates.map((rate) => (
              <div key={rate.commodity} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{rate.commodity}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{rate.rate}</p>
                </div>
                <div className={`text-right ${
                  rate.trend === 'up' ? 'text-green-600' : 
                  rate.trend === 'down' ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  <p className="text-sm font-medium">{rate.change}</p>
                  <p className="text-xs mt-1">vs yesterday</p>
                </div>
              </div>
            ))}
          </div>
        </div>

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
                <p className="text-sm font-medium text-gray-600">Today's Weather</p>
                <p className="text-2xl font-bold text-gray-800">28°C</p>
              </div>
              <p className="text-sm text-gray-600">Partly cloudy with chance of rain</p>
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

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commodity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity (MT)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/Quintal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {order.offer?.commodity || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.quantity_mt}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">₹{order.final_price_per_quintal}</td>
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
          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No orders yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
