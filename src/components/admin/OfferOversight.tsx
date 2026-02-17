import { useState } from 'react';
import { Offer, api } from '../../lib/client';
import { Search, Filter, Package, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import CSVUpload from '../CSVUpload';

interface OfferOversightProps {
  offers: Offer[];
  onRefresh: () => void;
}

export default function OfferOversight({ offers, onRefresh }: OfferOversightProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [commodityFilter, setCommodityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allOffers = offers;

  const filteredOffers = allOffers.filter(offer => {
    const matchesSearch =
      offer.commodity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.variety?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.seller?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCommodity = commodityFilter === 'all' || offer.commodity === commodityFilter;
    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;

    return matchesSearch && matchesCommodity && matchesStatus;
  });

  const commodityTypes = [...new Set(allOffers.map(o => o.commodity))];

  const handleToggleStatus = async (offerId: string, currentStatus: string) => {
    setLoading(true);
    setError('');

    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    const { error: updateError } = await api
      .from('offers')
      .update({ status: newStatus })
      .eq('id', offerId);

    if (updateError) {
      setError(updateError.message);
    } else {
      onRefresh();
      if (selectedOffer?.id === offerId) {
        setSelectedOffer({ ...selectedOffer, status: newStatus });
      }
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by commodity, variety, seller, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={commodityFilter}
              onChange={(e) => setCommodityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Commodities</option>
              {commodityTypes.map(commodity => (
                <option key={commodity} value={commodity}>{commodity}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Sold">Sold</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 font-medium mb-1">Active Offers</p>
            <p className="text-3xl font-bold text-green-800">
              {allOffers.filter(o => o.status === 'Active').length}
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 font-medium mb-1">Inactive Offers</p>
            <p className="text-3xl font-bold text-gray-800">
              {allOffers.filter(o => o.status === 'Inactive').length}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium mb-1">Sold Offers</p>
            <p className="text-3xl font-bold text-blue-800">
              {allOffers.filter(o => o.status === 'Sold').length}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commodity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOffers.map((offer) => (
                <tr key={offer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{offer.commodity}</p>
                      <p className="text-xs text-gray-500">{offer.variety}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {offer.seller?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {offer.quantity_mt} MT
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">₹{offer.price_per_quintal}/quintal</p>
                      <p className="text-xs text-gray-500">
                        Total: ₹{(offer.quantity_mt * 10 * offer.price_per_quintal).toLocaleString()}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {offer.location}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      offer.status === 'Active' ? 'bg-green-100 text-green-800' :
                      offer.status === 'Sold' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {offer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(offer.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedOffer(offer)}
                        className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {offer.status !== 'Sold' && (
                        <button
                          onClick={() => handleToggleStatus(offer.id, offer.status)}
                          disabled={loading}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                            offer.status === 'Active'
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                          title={offer.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {offer.status === 'Active' ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOffers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No offers found</p>
            </div>
          )}
        </div>
      </div>

      {selectedOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Offer Details</h3>
                <button
                  onClick={() => {
                    setSelectedOffer(null);
                    setError('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Commodity Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Commodity:</span>
                      <p className="font-medium text-gray-900">{selectedOffer.commodity}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Variety:</span>
                      <p className="text-gray-900">{selectedOffer.variety}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <p className="font-medium text-gray-900">{selectedOffer.quantity_mt} MT</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Price per Quintal:</span>
                      <p className="font-medium text-gray-900">₹{selectedOffer.price_per_quintal}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Value:</span>
                      <p className="font-bold text-green-600 text-lg">
                        ₹{(selectedOffer.quantity_mt * 10 * selectedOffer.price_per_quintal).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Seller & Location</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Seller:</span>
                      <p className="font-medium text-gray-900">{selectedOffer.seller?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Location:</span>
                      <p className="text-gray-900">{selectedOffer.location}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="capitalize font-medium text-gray-900">{selectedOffer.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <p className="text-gray-900">{new Date(selectedOffer.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedOffer.quality_report && Object.keys(selectedOffer.quality_report).length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold text-gray-800 mb-3">Quality Report</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {Object.entries(selectedOffer.quality_report).map(([key, value]) => (
                      <div key={key} className="bg-white rounded p-3">
                        <span className="text-gray-600">{key}:</span>
                        <p className="font-medium text-gray-900">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOffer.status !== 'Sold' && (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleToggleStatus(selectedOffer.id, selectedOffer.status)}
                    disabled={loading}
                    className={`flex-1 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedOffer.status === 'Active'
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {loading ? 'Processing...' : selectedOffer.status === 'Active' ? 'Deactivate Offer' : 'Activate Offer'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
