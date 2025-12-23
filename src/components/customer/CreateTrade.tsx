import { useState, useMemo, useEffect } from 'react';
import { QualityParameter } from '../../lib/supabase';
import { FileText, Info, Package, Calendar, DollarSign, ClipboardCheck } from 'lucide-react';
import { QUALITY_STRUCTURE } from '../../constants/qualityParameters';
import { COMMODITY_VARIETIES } from '../../constants/commodityVarieties';

interface CreateTradeProps {
  qualityParams: QualityParameter[];
  onCreateOffer: (offerData: any) => Promise<{ error: any }>;
  userRole: 'farmer' | 'trader';
  userId: string;
}

export default function CreateTrade({ qualityParams, onCreateOffer, userRole, userId }: CreateTradeProps) {
  const [tradeType, setTradeType] = useState<'sell' | 'buy'>('sell');
  const [commodity, setCommodity] = useState('Paddy');
  const [variety, setVariety] = useState('');
  const [quantityMt, setQuantityMt] = useState<number>(0);
  const [quantityUnit, setQuantityUnit] = useState<'QTL' | 'MT'>('MT');
  const [pricePerQuintal, setPricePerQuintal] = useState<number>(0);
  const [priceUnit, setPriceUnit] = useState<'INR' | 'USD'>('INR');
  const [location, setLocation] = useState('');
  const [saudaDate, setSaudaDate] = useState('');
  const [qualityTerms, setQualityTerms] = useState('');
  const [qualityReport, setQualityReport] = useState<Record<string, string>>({});
  const [qualityParameters, setQualityParameters] = useState<any[]>([]);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [deliveryLocation, setDeliveryLocation] = useState('');

  // Update Quality Parameters based on Commodity selection
  useEffect(() => {
    if (commodity && QUALITY_STRUCTURE[commodity]) {
      const params = QUALITY_STRUCTURE[commodity].map((p, index) => ({
        id: `${commodity}-${index}`,
        s_no: index + 1,
        parameter_name: p.name,
        unit_of_measurement: p.unit,
        standard_value: p.standard,
        actual_value: p.options[0], // Default to first option
        remarks: p.remarks,
        options: p.options
      }));
      setQualityParameters(params);
      
      // Initialize quality report with default values
      const initialReport: Record<string, string> = {};
      params.forEach(p => {
        initialReport[p.parameter_name] = p.actual_value;
      });
      setQualityReport(initialReport);
    } else {
      setQualityParameters([]);
      setQualityReport({});
    }
  }, [commodity]);

  const currentParams = useMemo(() => {
    return qualityParams.filter(param => param.commodity === commodity);
  }, [commodity, qualityParams]);

  const handleQualityChange = (paramName: string, value: string) => {
    setQualityReport(prev => ({
      ...prev,
      [paramName]: value,
    }));
    
    // Also update the qualityParameters state to keep UI in sync
    setQualityParameters(prev =>
      prev.map(p => p.parameter_name === paramName ? { ...p, actual_value: value } : p)
    );
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setError('Authentication token not found. Please sign in again.');
        setLoading(false);
        return;
      }

      let endpoint = '';
      let data: any = {
        commodity,
        variety,
        quantity_mt: quantityMt,
        delivery_location: deliveryLocation || location,
        sauda_confirmation_date: saudaDate || null,
        notes: qualityTerms,
      };

      if (tradeType === 'sell') {
        endpoint = `${apiUrl}/sale-orders`;
        data.price_per_quintal = pricePerQuintal / 10;
        data.quality_report = qualityReport;
        data.seller_id = userId;
      } else {
        endpoint = `${apiUrl}/purchase-orders`;
        data.expected_price_per_quintal = pricePerQuintal / 10;
        data.quality_requirements = qualityReport;
        data.buyer_id = userId;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || `Failed to create ${tradeType} order`);
      } else {
        // Reset form
        setCommodity('Paddy');
        setVariety('');
        setQuantityMt(0);
        setPricePerQuintal(0);
        setLocation('');
        setSaudaDate('');
        setQualityTerms('');
        setQualityReport({});
        setAgreeToTerms(false);
        setError('');
      }
    } catch (err: any) {
      setError(err.message || `Failed to create ${tradeType} order`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your own Negotiable Trade</h1>
        <p className="text-gray-600">
          Sell or buy commodities at your convenience and price.
          <a href="#" className="text-green-600 hover:text-green-700 ml-1 font-medium">Learn How</a>
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        <div>
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Tell us about your requirements</h2>

              <div className="flex gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setTradeType('sell')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    tradeType === 'sell'
                      ? 'bg-green-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-green-600'
                  }`}
                >
                  I want to Sell
                </button>
                <button
                  type="button"
                  onClick={() => setTradeType('buy')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    tradeType === 'buy'
                      ? 'bg-green-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-green-600'
                  }`}
                >
                  I want to Buy
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* 1. Commodity Selection First */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="text-gray-900">1. Commodity: (Drop Down)</span>
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={commodity}
                      onChange={(e) => setCommodity(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg appearance-none"
                    >
                      <option value="">Select Commodity</option>
                      <option value="Paddy">Paddy</option>
                      <option value="Maize">Maize</option>
                      <option value="Wheat">Wheat</option>
                    </select>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Paddy/Maize/Wheat</p>
                </div>

                {/* Variety selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="text-gray-900">Variety: (Drop Down)</span>
                  </label>
                  <select
                    value={variety}
                    onChange={(e) => setVariety(e.target.value)}
                    required
                    disabled={!commodity}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg appearance-none disabled:bg-gray-100"
                  >
                    <option value="">Select Variety</option>
                    {commodity && COMMODITY_VARIETIES[commodity]?.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Choose Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="text-gray-900">2. Date: DD/MM/YYYY</span>
                  <span className="text-gray-600 font-normal ml-2">(Date of Sauda confirmation)</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={saudaDate}
                    onChange={(e) => setSaudaDate(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  />
                </div>
              </div>

              {/* 3, 4, 5. Unit, Rate, Quantity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="text-gray-900">3. Unit of Measurement</span>
                  </label>
                  <select
                    value="MT"
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold appearance-none bg-gray-50"
                  >
                    <option value="MT">MT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="text-gray-900">4. Rate per MT (INR)*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      value={pricePerQuintal || ''}
                      onChange={(e) => setPricePerQuintal(Number(e.target.value))}
                      required
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                      placeholder="Enter rate"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="text-gray-900">5. Quantity (MT)*</span>
                  </label>
                  <input
                    type="number"
                    value={quantityMt || ''}
                    onChange={(e) => setQuantityMt(Number(e.target.value))}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>

              {/* 6. Quality Parameters (Particulars Section) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardCheck className="w-6 h-6 text-green-600" />
                  <label className="text-sm font-semibold text-gray-700">
                    <span className="text-gray-900">6. Quality Parameters (Particulars Section):</span>
                  </label>
                </div>

                {commodity ? (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border-2 border-green-200 mb-4">
                    <p className="text-sm font-semibold text-green-800 mb-2">
                      ✓ Quality parameters auto-populated for {commodity}
                    </p>
                    <p className="text-xs text-gray-600">
                      Select the appropriate value for each parameter from the dropdowns below.
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                    <p className="text-sm text-yellow-800">
                      Please select a commodity to view quality parameters
                    </p>
                  </div>
                )}

                {qualityParameters.length > 0 && (
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-gray-800 text-white">
                      <div className="grid grid-cols-12 gap-2 px-4 py-3 font-semibold text-sm">
                        <div className="col-span-1">S No.</div>
                        <div className="col-span-3">Particulars</div>
                        <div className="col-span-2">UOM</div>
                        <div className="col-span-3">Standard</div>
                        <div className="col-span-3">Actual Value</div>
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-gray-300">
                      {qualityParameters.map((param) => (
                        <div key={param.id} className="grid grid-cols-12 gap-2 px-4 py-3 bg-white hover:bg-gray-50">
                          <div className="col-span-1 flex items-center">
                            <span className="font-semibold text-gray-700">{param.s_no}</span>
                          </div>
                          <div className="col-span-3 flex items-center">
                            <span className="font-medium text-gray-900">{param.parameter_name}</span>
                          </div>
                          <div className="col-span-2 flex items-center">
                            <span className="text-gray-700">{param.unit_of_measurement}</span>
                          </div>
                          <div className="col-span-3 flex items-center text-xs text-gray-600">
                            {param.standard_value}
                          </div>
                          <div className="col-span-3 flex items-center">
                            <select
                              value={qualityReport[param.parameter_name] || ''}
                              onChange={(e) => handleQualityChange(param.parameter_name, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-yellow-50 font-medium text-sm"
                            >
                              {param.options.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 7. Remarks */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="text-gray-900">7. Remarks</span>
                </label>
                <textarea
                  value={qualityTerms}
                  onChange={(e) => setQualityTerms(e.target.value)}
                  placeholder="Enter additional information, special instructions, or quality terms..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg resize-none"
                />
              </div>

              {/* Other Fields (Location) */}
              <div className="border-t border-gray-200 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location*
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      placeholder="Enter the location EXW or FOR (City, State)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Location (if different)
                    </label>
                    <input
                      type="text"
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      placeholder="Specific delivery location"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-4">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  By creating this trade, I agree to share my contact information with the support representative.
                  I have read, understood and agreed to abide by{' '}
                  <a href="#" className="text-green-600 hover:text-green-700 font-medium">Grainology's Terms of Use.</a>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('draft_trade', JSON.stringify({
                      commodity, variety, quantityMt, pricePerQuintal, location
                    }));
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  disabled={loading || !agreeToTerms}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
