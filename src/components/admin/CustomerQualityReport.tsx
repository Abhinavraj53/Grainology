import { useState, useEffect } from 'react';
import { ClipboardCheck, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface QualityParameter {
  s_no: number;
  parameter_name: string;
  unit_of_measurement: string;
  standard_quality: string;
  actual_quality: string;
  remarks: string;
  deduction: number;
}

interface Sale {
  id: string;
  date: string;
  commodity: string;
  variety: string;
  invoice_no: string;
  weight_slip_no: string;
  bag_count: number;
  net_weight_mt: number;
  rate_per_mt: number;
  customer: {
    name: string;
  };
}

interface CustomerQualityReportProps {
  sale: Sale;
  onClose: () => void;
}

export default function CustomerQualityReport({ sale, onClose }: CustomerQualityReportProps) {
  const [parameters, setParameters] = useState<QualityParameter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQualityParameters();
  }, [sale.id]);

  const loadQualityParameters = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('quality_parameters_master')
      .select('*')
      .eq('commodity', sale.commodity)
      .eq('is_active', true)
      .order('s_no', { ascending: true });

    if (data && !error) {
      const params: QualityParameter[] = data.map(param => ({
        s_no: param.s_no,
        parameter_name: param.parameter_name,
        unit_of_measurement: param.unit_of_measurement,
        standard_quality: param.standard_value,
        actual_quality: getActualQualityExample(param.parameter_name),
        remarks: param.remarks || '',
        deduction: calculateExampleDeduction(param.parameter_name)
      }));
      setParameters(params);
    }

    setLoading(false);
  };

  const getActualQualityExample = (parameterName: string): string => {
    switch (parameterName) {
      case 'Moisture':
        return '17%';
      case 'Foreign Matter':
        return '2%';
      case 'Dammage & Discolour':
        return '7%';
      case 'Admixture':
        return '1%';
      case 'Green Paddy':
        return '1%';
      case 'Dead Paddy':
        return '1%';
      case 'Live Insect':
        return '2';
      default:
        return '';
    }
  };

  const calculateExampleDeduction = (parameterName: string): number => {
    const grossAmount = sale.net_weight_mt * sale.rate_per_mt;

    switch (parameterName) {
      case 'Moisture':
        return 2952.78;
      case 'Foreign Matter':
        return 0;
      case 'Dammage & Discolour':
        return 1476.39;
      case 'Admixture':
      case 'Green Paddy':
      case 'Dead Paddy':
      case 'Live Insect':
        return 0;
      default:
        return 0;
    }
  };

  const calculateTotalDeduction = (): number => {
    return parameters.reduce((total, param) => total + param.deduction, 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6" />
            <div>
              <h3 className="text-xl font-semibold">Quality Parameter Report</h3>
              <p className="text-sm text-blue-100">#Refer below report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Sale Information Header */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Customer</p>
                <p className="font-semibold text-gray-900">{sale.customer.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Date</p>
                <p className="font-semibold text-gray-900">{new Date(sale.date).toLocaleDateString('en-IN')}</p>
              </div>
              <div>
                <p className="text-gray-600">Commodity</p>
                <p className="font-semibold text-gray-900">{sale.commodity} - {sale.variety}</p>
              </div>
              <div>
                <p className="text-gray-600">Invoice No.</p>
                <p className="font-semibold text-gray-900">{sale.invoice_no}</p>
              </div>
              <div>
                <p className="text-gray-600">Weight Slip No.</p>
                <p className="font-semibold text-gray-900">{sale.weight_slip_no}</p>
              </div>
              <div>
                <p className="text-gray-600">Net Weight</p>
                <p className="font-semibold text-gray-900">{sale.net_weight_mt} MT</p>
              </div>
              <div>
                <p className="text-gray-600">Rate per MT</p>
                <p className="font-semibold text-gray-900">₹{sale.rate_per_mt.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-gray-600">Gross Amount</p>
                <p className="font-semibold text-green-700">₹{(sale.net_weight_mt * sale.rate_per_mt).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-sm text-blue-900 font-semibold">#Refer below report</p>
            <p className="text-sm text-blue-900 mt-1">
              Below quality parameter report will be opened and actual quality parameters (highlighted with yellow color) needs to be filled for every supply of commodity (i.e. paddy)
            </p>
          </div>

          {/* Quality Parameters Table */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading quality parameters...</p>
            </div>
          ) : (
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">S.No.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Particulars</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Unit of Measurement</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Standard Quality Parameter example</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold bg-yellow-600">
                      Actual Quality Parameters report provided by<br/>WSP (Warehouse Service Provider)
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Remarks</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold bg-yellow-600">Deduction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {parameters.map((param, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-700">{param.s_no}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{param.parameter_name}</td>
                      <td className="px-4 py-3 text-gray-700">{param.unit_of_measurement}</td>
                      <td className="px-4 py-3 text-gray-700">{param.standard_quality}</td>
                      <td className="px-4 py-3 bg-yellow-100">
                        <div className="px-3 py-2 border-2 border-yellow-400 rounded-lg bg-yellow-50 font-semibold text-gray-900">
                          {param.actual_quality}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{param.remarks}</td>
                      <td className="px-4 py-3 bg-yellow-100">
                        <div className="font-bold text-red-600">
                          {param.deduction > 0 ? `₹${param.deduction.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '0'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right font-bold text-gray-900">
                      Total Deduction:
                    </td>
                    <td className="px-4 py-3 bg-yellow-200">
                      <div className="text-xl font-bold text-red-700">
                        ₹{calculateTotalDeduction().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Deduction Summary */}
          <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-red-700">Gross Amount</p>
                <p className="text-xl font-bold text-gray-900">
                  ₹{(sale.net_weight_mt * sale.rate_per_mt).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-red-700">Total Deduction</p>
                <p className="text-xl font-bold text-red-600">
                  -₹{calculateTotalDeduction().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700">Net Amount</p>
                <p className="text-xl font-bold text-green-700">
                  ₹{((sale.net_weight_mt * sale.rate_per_mt) - calculateTotalDeduction()).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Excel Note */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-amber-700 flex-shrink-0 mt-1" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Note:</p>
              <p>Excel uploader & Downloader may be given for the above supply of commodity by the supplier because during season time more than 100 individual supplies by truck occurred on a single day</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-between border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
