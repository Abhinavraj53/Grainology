import { useState, useEffect } from 'react';
import { ClipboardCheck, ArrowLeft, Save, FileSpreadsheet } from 'lucide-react';
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

interface Supply {
  id: string;
  date: string;
  commodity: string;
  variety: string;
  invoice_no: string;
  truck_number: string;
  net_weight_mt: number;
  rate_per_mt: number;
  supplier: {
    name: string;
  };
}

interface SupplierQualityReportProps {
  supply: Supply;
  onClose: () => void;
  onSave: () => void;
}

export default function SupplierQualityReport({ supply, onClose, onSave }: SupplierQualityReportProps) {
  const [parameters, setParameters] = useState<QualityParameter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');
  const [existingReport, setExistingReport] = useState<any>(null);

  useEffect(() => {
    loadQualityReport();
  }, [supply.id]);

  const loadQualityReport = async () => {
    // Check if quality report already exists
    const { data: existingReports } = await supabase
      .from('supplier_quality_reports')
      .select('*')
      .eq('supply_id', supply.id)
      .maybeSingle();

    if (existingReports) {
      setExistingReport(existingReports);
      setParameters(existingReports.quality_parameters || []);
      setNotes(existingReports.notes || '');
    } else {
      // Load standard parameters for the commodity
      loadStandardParameters();
    }
  };

  const loadStandardParameters = async () => {
    const { data, error } = await supabase
      .from('quality_parameters_master')
      .select('*')
      .eq('commodity', supply.commodity)
      .eq('is_active', true)
      .order('s_no', { ascending: true });

    if (data && !error) {
      const defaultParams: QualityParameter[] = data.map(param => ({
        s_no: param.s_no,
        parameter_name: param.parameter_name,
        unit_of_measurement: param.unit_of_measurement,
        standard_quality: param.standard_value,
        actual_quality: '',
        remarks: param.remarks || '',
        deduction: 0
      }));
      setParameters(defaultParams);
    }
  };

  const updateParameter = (index: number, field: keyof QualityParameter, value: string | number) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate deduction based on actual quality
    if (field === 'actual_quality') {
      const deduction = calculateDeduction(updated[index]);
      updated[index].deduction = deduction;
    }

    setParameters(updated);
  };

  const calculateDeduction = (param: QualityParameter): number => {
    if (!param.actual_quality) return 0;

    const actual = parseFloat(param.actual_quality.replace('%', ''));
    if (isNaN(actual)) return 0;

    const commodity = supply.commodity;
    const grossAmount = supply.net_weight_mt * supply.rate_per_mt;

    // Calculation logic based on commodity and parameter
    switch (param.parameter_name) {
      case 'Moisture':
        if (actual > 17) {
          return grossAmount * 0.02; // 2% deduction if above 17%
        } else if (actual > 16) {
          return grossAmount * 0.01; // 1% deduction between 16-17%
        }
        return 0;

      case 'Foreign Matter':
        if (actual > 2) {
          return grossAmount * 0.01; // 1% deduction if above 2%
        }
        return 0;

      case 'Dammage & Discolour':
        if (actual > 8) {
          return grossAmount * 0.02; // 2% deduction if above 8%
        } else if (actual > 7) {
          return grossAmount * 0.01; // 1% deduction between 7-8%
        } else if (actual > 6) {
          return grossAmount * 0.005; // 0.5% deduction between 6-7%
        }
        return 0;

      default:
        return 0;
    }
  };

  const calculateTotalDeduction = (): number => {
    return parameters.reduce((total, param) => total + param.deduction, 0);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (parameters.some(p => !p.actual_quality)) {
      setError('Please fill all actual quality values');
      return;
    }

    setLoading(true);

    try {
      const totalDeduction = calculateTotalDeduction();

      const reportData = {
        supply_id: supply.id,
        commodity: supply.commodity,
        quality_parameters: parameters,
        total_deduction: totalDeduction,
        report_status: 'Submitted',
        notes
      };

      if (existingReport) {
        const { error: updateError } = await supabase
          .from('supplier_quality_reports')
          .update(reportData)
          .eq('id', existingReport.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('supplier_quality_reports')
          .insert(reportData);

        if (insertError) throw insertError;
      }

      // Update deduction in supplier_commodity_supplies
      const { error: supplyUpdateError } = await supabase
        .from('supplier_commodity_supplies')
        .update({
          deduction_amount: totalDeduction,
          quality_report_status: 'Refer below report'
        })
        .eq('id', supply.id);

      if (supplyUpdateError) throw supplyUpdateError;

      setSuccess('Quality report saved successfully!');
      setTimeout(() => {
        onSave();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save quality report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6" />
            <div>
              <h3 className="text-xl font-semibold">Quality Parameter Report</h3>
              <p className="text-sm text-orange-100">*Refer below report</p>
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
          {/* Supply Information Header */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Supplier</p>
                <p className="font-semibold text-gray-900">{supply.supplier.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Date</p>
                <p className="font-semibold text-gray-900">{new Date(supply.date).toLocaleDateString('en-IN')}</p>
              </div>
              <div>
                <p className="text-gray-600">Commodity</p>
                <p className="font-semibold text-gray-900">{supply.commodity} - {supply.variety}</p>
              </div>
              <div>
                <p className="text-gray-600">Invoice No.</p>
                <p className="font-semibold text-gray-900">{supply.invoice_no}</p>
              </div>
              <div>
                <p className="text-gray-600">Truck Number</p>
                <p className="font-semibold text-gray-900">{supply.truck_number}</p>
              </div>
              <div>
                <p className="text-gray-600">Net Weight</p>
                <p className="font-semibold text-gray-900">{supply.net_weight_mt} MT</p>
              </div>
              <div>
                <p className="text-gray-600">Rate per MT</p>
                <p className="font-semibold text-gray-900">₹{supply.rate_per_mt.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-gray-600">Gross Amount</p>
                <p className="font-semibold text-green-700">₹{(supply.net_weight_mt * supply.rate_per_mt).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-sm text-blue-900">
              Below quality parameter report will be opened and actual quality parameters (highlighted with yellow color) needs to be filled for every supply of commodity (i.e. paddy)
            </p>
          </div>

          {/* Quality Parameters Table */}
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
                      <input
                        type="text"
                        value={param.actual_quality}
                        onChange={(e) => updateParameter(index, 'actual_quality', e.target.value)}
                        placeholder={param.standard_quality}
                        className="w-full px-3 py-2 border-2 border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-yellow-50 font-semibold text-gray-900"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={param.remarks}
                        onChange={(e) => updateParameter(index, 'remarks', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Enter remarks"
                      />
                    </td>
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

          {/* Sample Data Display */}
          {supply.commodity === 'Paddy' && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">Example Values for Reference:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-green-700">Moisture: <span className="font-bold">17%</span></p>
                  <p className="text-xs text-green-600">Standard: 16%-17%</p>
                </div>
                <div>
                  <p className="text-green-700">Foreign Matter: <span className="font-bold">2%</span></p>
                  <p className="text-xs text-green-600">Standard: 2%</p>
                </div>
                <div>
                  <p className="text-green-700">Dammage & Discolour: <span className="font-bold">7%</span></p>
                  <p className="text-xs text-green-600">Standard: 6%-8%</p>
                </div>
                <div>
                  <p className="text-green-700">Live Insect: <span className="font-bold">2</span></p>
                  <p className="text-xs text-green-600">Standard: 0-5</p>
                </div>
              </div>
            </div>
          )}

          {/* Deduction Summary */}
          <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-red-700">Gross Amount</p>
                <p className="text-xl font-bold text-gray-900">
                  ₹{(supply.net_weight_mt * supply.rate_per_mt).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
                  ₹{((supply.net_weight_mt * supply.rate_per_mt) - calculateTotalDeduction()).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="Enter any additional notes or observations..."
            />
          </div>

          {/* Excel Note */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-amber-700 flex-shrink-0 mt-1" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Note:</p>
              <p>Excel uploader & Downloader may be given for the above supply of commodity by the supplier because during season time more than 100 individual supplies by truck occurred on a single day</p>
            </div>
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
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-between border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Supplies
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Quality Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
