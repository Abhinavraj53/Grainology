import { useState, useMemo } from 'react';
import { QualityParameter } from '../../lib/supabase';
import { Package } from 'lucide-react';

interface NewOfferProps {
  qualityParams: QualityParameter[];
  onCreateOffer: (offerData: any) => Promise<{ error: any }>;
}

export default function NewOffer({ qualityParams, onCreateOffer }: NewOfferProps) {
  const [commodity, setCommodity] = useState('Paddy');
  const [variety, setVariety] = useState('');
  const [quantityMt, setQuantityMt] = useState<number>(0);
  const [pricePerQuintal, setPricePerQuintal] = useState<number>(0);
  const [location, setLocation] = useState('');
  const [qualityReport, setQualityReport] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentParams = useMemo(() => {
    return qualityParams.filter(param => param.commodity === commodity);
  }, [commodity, qualityParams]);

  const handleQualityChange = (paramName: string, value: string) => {
    setQualityReport(prev => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const offerData = {
      commodity,
      variety,
      quantity_mt: quantityMt,
      price_per_quintal: pricePerQuintal,
      location,
      quality_report: qualityReport,
      status: 'Active',
    };

    const { error: submitError } = await onCreateOffer(offerData);

    setLoading(false);

    if (submitError) {
      setError(submitError.message);
    } else {
      setCommodity('Paddy');
      setVariety('');
      setQuantityMt(0);
      setPricePerQuintal(0);
      setLocation('');
      setQualityReport({});
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Create New Offer</h2>
              <p className="text-sm text-gray-600">List your commodity for sale in the marketplace</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commodity *
              </label>
              <select
                value={commodity}
                onChange={(e) => {
                  setCommodity(e.target.value);
                  setQualityReport({});
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Paddy">Paddy</option>
                <option value="Maize">Maize</option>
                <option value="Wheat">Wheat</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variety *
              </label>
              <input
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                required
                placeholder="e.g., Basmati, Hybrid, Local"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity (MT) *
              </label>
              <input
                type="number"
                value={quantityMt || ''}
                onChange={(e) => setQuantityMt(Number(e.target.value))}
                required
                min="0.1"
                step="0.1"
                placeholder="Enter quantity in Metric Tons"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price per Quintal (₹) *
              </label>
              <input
                type="number"
                value={pricePerQuintal || ''}
                onChange={(e) => setPricePerQuintal(Number(e.target.value))}
                required
                min="1"
                placeholder="Enter price in rupees"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="e.g., Punjab, Maharashtra"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality Parameters</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the quality metrics for your commodity. These values will be verified during QC.
            </p>

            {currentParams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentParams.map((param) => (
                  <div key={param.id} className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {param.param_name} ({param.unit})
                    </label>
                    <input
                      type="text"
                      value={qualityReport[param.param_name] || ''}
                      onChange={(e) => handleQualityChange(param.param_name, e.target.value)}
                      placeholder={`Standard: ${param.standard}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                    {param.remarks && (
                      <p className="text-xs text-gray-500 mt-1">{param.remarks}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No quality parameters available for this commodity.</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Estimated Total Value</span>
              <span className="text-2xl font-bold text-green-600">
                ₹{(quantityMt * 10 * pricePerQuintal).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Based on {quantityMt} MT × 10 quintals/MT × ₹{pricePerQuintal}/quintal
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Offer...' : 'Create Offer'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCommodity('Paddy');
                setVariety('');
                setQuantityMt(0);
                setPricePerQuintal(0);
                setLocation('');
                setQualityReport({});
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
