import { useState, useMemo } from 'react';
import { QualityParameter } from '../../lib/supabase';
import { Upload, FileText, Award, Info } from 'lucide-react';

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
  const [quantityUnit, setQuantityUnit] = useState<'QTL' | 'MT'>('QTL');
  const [pricePerQuintal, setPricePerQuintal] = useState<number>(0);
  const [priceUnit, setPriceUnit] = useState<'INR' | 'USD'>('INR');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [qualityTerms, setQualityTerms] = useState('');
  const [qualityReport, setQualityReport] = useState<Record<string, string>>({});
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [minTradeQuantity, setMinTradeQuantity] = useState<number>(1);
  const [paymentTerms, setPaymentTerms] = useState<'Advance' | 'T+3 Days' | 'Against Delivery'>('Against Delivery');
  const [offerValidityDays, setOfferValidityDays] = useState<number>(30);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [logisticsOption, setLogisticsOption] = useState<'Seller Arranged' | 'Buyer Arranged' | 'Platform Arranged'>('Buyer Arranged');
  const [deliveryTimelineDays, setDeliveryTimelineDays] = useState<number>(7);

  const currentParams = useMemo(() => {
    return qualityParams.filter(param => param.commodity === commodity);
  }, [commodity, qualityParams]);

  const handleQualityChange = (paramName: string, value: string) => {
    setQualityReport(prev => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => file.name);
      setUploadedDocs(prev => [...prev, ...newFiles]);
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
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
        quantity_mt: quantityUnit === 'MT' ? quantityMt : quantityMt / 10,
        delivery_location: deliveryLocation || location,
        delivery_timeline_days: deliveryTimelineDays,
        payment_terms: paymentTerms,
        notes: qualityTerms,
      };

      if (tradeType === 'sell') {
        endpoint = `${apiUrl}/sale-orders`;
        data.price_per_quintal = pricePerQuintal;
        data.quality_report = qualityReport;
        data.seller_id = userId;
      } else {
        endpoint = `${apiUrl}/purchase-orders`;
        data.expected_price_per_quintal = pricePerQuintal;
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
        setStartDate('');
        setEndDate('');
        setQualityTerms('');
        setQualityReport({});
        setUploadedDocs([]);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commodity*
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
                    <option value="">Select the commodity - Variety</option>
                    <option value="Paddy">Paddy</option>
                    <option value="Maize">Maize</option>
                    <option value="Wheat">Wheat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity*
                    <Info className="inline w-3 h-3 ml-1 text-gray-400" />
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={quantityMt || ''}
                      onChange={(e) => setQuantityMt(Number(e.target.value))}
                      required
                      min="0.1"
                      step="0.1"
                      placeholder="Enter the quantity"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <select
                      value={quantityUnit}
                      onChange={(e) => setQuantityUnit(e.target.value as 'QTL' | 'MT')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="QTL">QTL</option>
                      <option value="MT">MT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price*
                    <Info className="inline w-3 h-3 ml-1 text-gray-400" />
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={pricePerQuintal || ''}
                      onChange={(e) => setPricePerQuintal(Number(e.target.value))}
                      required
                      min="1"
                      placeholder="Enter your expected price"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <select
                      value={priceUnit}
                      onChange={(e) => setPriceUnit(e.target.value as 'INR' | 'USD')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="INR">INR</option>
                      <option value="QTL">QTL</option>
                    </select>
                  </div>
                </div>
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date*
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date*
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Trade Terms</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Trade Quantity (MT)*
                    </label>
                    <input
                      type="number"
                      value={minTradeQuantity || ''}
                      onChange={(e) => setMinTradeQuantity(Number(e.target.value))}
                      required
                      min="0.1"
                      step="0.1"
                      placeholder="Min quantity for trade"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Terms*
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value as 'Advance' | 'T+3 Days' | 'Against Delivery')}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Advance">Advance</option>
                      <option value="T+3 Days">T+3 Days</option>
                      <option value="Against Delivery">Against Delivery</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Offer Validity (Days)*
                    </label>
                    <input
                      type="number"
                      value={offerValidityDays || ''}
                      onChange={(e) => setOfferValidityDays(Number(e.target.value))}
                      required
                      min="1"
                      placeholder="Validity period"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Logistics Terms</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Location*
                    </label>
                    <input
                      type="text"
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      required
                      placeholder="Specific delivery location"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logistics Option*
                    </label>
                    <select
                      value={logisticsOption}
                      onChange={(e) => setLogisticsOption(e.target.value as 'Seller Arranged' | 'Buyer Arranged' | 'Platform Arranged')}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Seller Arranged">Seller Arranged</option>
                      <option value="Buyer Arranged">Buyer Arranged</option>
                      <option value="Platform Arranged">Platform Arranged</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Timeline (Days)*
                    </label>
                    <input
                      type="number"
                      value={deliveryTimelineDays || ''}
                      onChange={(e) => setDeliveryTimelineDays(Number(e.target.value))}
                      required
                      min="1"
                      placeholder="Expected delivery time"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quality Standards & Other Information
                </label>
                <textarea
                  value={qualityTerms}
                  onChange={(e) => setQualityTerms(e.target.value)}
                  placeholder="Eg : Enter relevant information such as Quality Parameters and deductions, or other special instructions"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  By creating this trade, I agree to share my contact information with the support representative.
                  I have read, understood and agreed to abide by{' '}
                  <a href="#" className="text-green-600 hover:text-green-700">agribazaar's Terms of Use.</a>
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

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 border-2 border-dashed border-gray-300">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="inline-block px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                  + Upload Documents
                </span>
              </label>
              <p className="text-sm text-gray-600 mt-2">Please upload the following</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Quality Certificate/ Specifications</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Commodity images of listed stock</p>
                </div>
              </div>
            </div>

            {uploadedDocs.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-800 mb-3">Uploaded Documents</p>
                <div className="space-y-2">
                  {uploadedDocs.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-xs text-gray-600 truncate">{doc}</span>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadedDocs.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Your uploaded documents over here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
