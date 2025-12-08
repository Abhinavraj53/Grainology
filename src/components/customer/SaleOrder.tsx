import { useState, useEffect } from 'react';
import { Store, Package, DollarSign, MapPin, ClipboardCheck, Calendar, Archive } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CSVUpload from '../CSVUpload';

interface Variety {
  commodity_name: string;
  variety_name: string;
  description: string;
}

interface QualityParameter {
  id: string;
  s_no: number;
  parameter_name: string;
  unit_of_measurement: string;
  standard_value: string;
  remarks: string;
  actual_value?: string;
}

interface SaleOrderProps {
  userId: string;
  userName: string;
}

export default function SaleOrder({ userId, userName }: SaleOrderProps) {
  const [commodity, setCommodity] = useState('');
  const [variety, setVariety] = useState('');
  const [quantityMt, setQuantityMt] = useState<number>(0);
  const [ratePerMt, setRatePerMt] = useState<number>(0);
  const [supplyAddress, setSupplyAddress] = useState('');
  const [packagingBag, setPackagingBag] = useState('Jute');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [saudaExpiryDate, setSaudaExpiryDate] = useState('');

  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [filteredVarieties, setFilteredVarieties] = useState<Variety[]>([]);
  const [qualityParameters, setQualityParameters] = useState<QualityParameter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const commodities = ['Paddy', 'Maize', 'Wheat'];

  useEffect(() => {
    fetchVarieties();
  }, []);

  useEffect(() => {
    if (commodity) {
      const filtered = varieties.filter(v => v.commodity_name === commodity);
      setFilteredVarieties(filtered);
      setVariety('');
      fetchQualityParameters(commodity);
    }
  }, [commodity, varieties]);

  const fetchVarieties = async () => {
    const { data, error } = await supabase
      .from('variety_master')
      .select('*')
      .eq('is_active', true)
      .order('commodity_name', { ascending: true })
      .order('variety_name', { ascending: true });

    if (data) {
      setVarieties(data);
    }
  };

  const fetchQualityParameters = async (selectedCommodity: string) => {
    const { data, error } = await supabase
      .from('quality_parameters_master')
      .select('*')
      .eq('commodity', selectedCommodity)
      .eq('is_active', true)
      .order('s_no', { ascending: true });

    if (data && !error) {
      setQualityParameters(data.map(param => ({
        ...param,
        actual_value: param.standard_value
      })));
    }
  };

  const updateQualityParameter = (id: string, field: 'actual_value' | 'remarks', value: string) => {
    setQualityParameters(prev =>
      prev.map(param =>
        param.id === id ? { ...param, [field]: value } : param
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent, status: 'Draft' | 'Submitted') => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!commodity || !variety || !quantityMt || !ratePerMt || !supplyAddress || !saudaExpiryDate) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('sale_orders')
        .insert({
          seller_id: userId,
          commodity,
          variety,
          quantity_mt: quantityMt,
          rate_per_mt: ratePerMt,
          supply_address: supplyAddress,
          quality_parameters: { parameters: qualityParameters },
          packaging_bag: packagingBag,
          payment_terms: paymentTerms,
          sauda_expiry_date: saudaExpiryDate,
          status,
        });

      if (insertError) throw insertError;

      setSuccess(`Sale order ${status === 'Draft' ? 'saved as draft' : 'submitted'} successfully!`);

      // Reset form
      setCommodity('');
      setVariety('');
      setQuantityMt(0);
      setRatePerMt(0);
      setSupplyAddress('');
      setPaymentTerms('');
      setSaudaExpiryDate('');
      setQualityParameters([]);
    } catch (err: any) {
      setError(err.message || 'Failed to save sale order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <CSVUpload type="sale-orders" />
      <div className="mb-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            3. Under Buy & Sell: Supplier/Vendor Module of App (I want to Sell)
          </h1>
          <p className="text-sm text-gray-700 mt-1">To be entered by Seller</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg">
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Sale Order</h2>
          </div>
        </div>

        <form className="p-6 space-y-6">
          {/* Commodity */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">1. Commodity</span>
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg appearance-none"
              >
                <option value="">Select Commodity</option>
                {commodities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <p className="text-sm text-gray-600 mt-1">Example: Paddy</p>
          </div>

          {/* Variety */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">2. Variety</span>
            </label>
            <select
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              required
              disabled={!commodity}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg appearance-none disabled:bg-gray-100"
            >
              <option value="">Select Variety</option>
              {filteredVarieties.map((v) => (
                <option key={v.variety_name} value={v.variety_name}>
                  {v.variety_name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-600 mt-1">Example: Katarni</p>
          </div>

          {/* Quantity and Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="text-gray-900">3. Quantity (MT)*</span>
              </label>
              <input
                type="number"
                value={quantityMt || ''}
                onChange={(e) => setQuantityMt(Number(e.target.value))}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="text-gray-900">4. Rate (Rs.) per MT*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  value={ratePerMt || ''}
                  onChange={(e) => setRatePerMt(Number(e.target.value))}
                  required
                  min="0"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="25,250"
                />
              </div>
            </div>
          </div>

          {/* Place of Supply */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">5. Place of Supply*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <textarea
                value={supplyAddress}
                onChange={(e) => setSupplyAddress(e.target.value)}
                required
                rows={2}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg resize-none"
                placeholder="Address of Supply (i.e Vinod Kumar Warehouse, near Banjara Hotel, Village Harpur, Maliabagh, Bihar)"
              />
            </div>
          </div>

          {/* Quality Parameters */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
              <label className="text-sm font-semibold text-gray-700">
                <span className="text-gray-900">6. Quality Parameters:</span>
              </label>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border-2 border-blue-200 mb-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Quality Parameters of {commodity || 'selected commodity'} will be same as provided by customer
              </p>
              <p className="text-xs text-gray-700">
                Same quality parameters will be auto populated as confirmed by customer
              </p>
            </div>

            {qualityParameters.length > 0 && (
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-800 text-white">
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 font-semibold text-sm">
                    <div className="col-span-1">S No.</div>
                    <div className="col-span-2">Particulars</div>
                    <div className="col-span-2">Unit of Measurement</div>
                    <div className="col-span-3">Standard Quality Parameter example</div>
                    <div className="col-span-4">Remarks</div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-300">
                  {qualityParameters.map((param) => (
                    <div key={param.id} className="grid grid-cols-12 gap-2 px-4 py-3 bg-white hover:bg-gray-50">
                      <div className="col-span-1 flex items-center">
                        <span className="font-semibold text-gray-700">{param.s_no}</span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <span className="font-medium text-gray-900">{param.parameter_name}</span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <span className="text-gray-700">{param.unit_of_measurement}</span>
                      </div>
                      <div className="col-span-3 flex items-center">
                        <input
                          type="text"
                          value={param.actual_value || ''}
                          onChange={(e) => updateQualityParameter(param.id, 'actual_value', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50 font-medium"
                          placeholder={param.standard_value}
                        />
                      </div>
                      <div className="col-span-4 flex items-center">
                        <input
                          type="text"
                          value={param.remarks}
                          onChange={(e) => updateQualityParameter(param.id, 'remarks', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Enter remarks"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Packaging Bag */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">7. Packaging Bag*</span>
            </label>
            <div className="relative">
              <Archive className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={packagingBag}
                onChange={(e) => setPackagingBag(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg appearance-none"
              >
                <option value="Jute">Jute</option>
                <option value="Plastic Paper (PP)">Plastic Paper (PP)</option>
              </select>
            </div>
            <p className="text-sm text-gray-600 mt-1">Select Jute/Plastic Paper (PP)</p>
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">8. Payment Terms*</span>
            </label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="3rd day"
            />
          </div>

          {/* Sauda Expiry Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="text-gray-900">9. Sauda Expiry Date*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={saudaExpiryDate}
                onChange={(e) => setSaudaExpiryDate(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">DD/MM/YYYY</p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'Draft')}
              disabled={loading}
              className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'Submitted')}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Sale Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
