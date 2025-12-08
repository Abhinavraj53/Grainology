import { Offer, Profile } from '../../lib/supabase';
import { MapPin, Package } from 'lucide-react';

interface ActiveTradesProps {
  offers: Offer[];
  profile: Profile;
}

export default function ActiveTrades({ offers, profile }: ActiveTradesProps) {
  const myOffers = offers.filter(o => o.seller_id === profile.id);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Negotiate to find the best prices</h2>
        <p className="text-green-100">
          Send an offer directly to the counterparty to Buy/Sell at your convenience
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase">Type</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase">Trade ID</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase">Commodity</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase">Location</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase">Quantity</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {myOffers.map((offer) => (
              <tr key={offer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded uppercase">
                    SELL
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-mono text-gray-900">{offer.id.slice(0, 4)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{offer.commodity}</p>
                    <p className="text-xs text-gray-500">{offer.variety}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{offer.location}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{offer.quantity_mt} MT</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-900">₹ {offer.price_per_quintal}/KG</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {myOffers.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No active trades yet</p>
            <p className="text-gray-400 text-sm">Create your first trade to get started</p>
          </div>
        )}
      </div>

      {myOffers.length > 0 && (
        <div className="flex justify-center">
          <button className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors">
            See All Trades
          </button>
        </div>
      )}
    </div>
  );
}
