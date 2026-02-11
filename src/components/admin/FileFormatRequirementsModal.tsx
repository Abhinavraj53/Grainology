import { X } from 'lucide-react';

export type BulkUploadType = 'purchase' | 'sales';

interface ColumnSpec {
  name: string;
  required: boolean;
  format: string;
  notes?: string;
}

const PURCHASE_COLUMNS: ColumnSpec[] = [
  { name: 'Date of Transaction', required: false, format: 'DD/MM/YYYY', notes: 'e.g. 11/02/2026' },
  { name: 'State', required: true, format: 'Text', notes: 'Use only values from Master List sheet' },
  { name: 'Supplier Name', required: true, format: 'Text', notes: 'Use only values from Master List → Customers / Sellers' },
  { name: 'Location', required: true, format: 'Text', notes: 'Use only values from Master List → Locations' },
  { name: 'Warehouse Name', required: true, format: 'Text', notes: 'Use only values from Master List → Warehouses' },
  { name: 'Chamber No.', required: false, format: 'Number or text' },
  { name: 'Commodity', required: true, format: 'Text', notes: 'Use only values from Master List → Commodities' },
  { name: 'Variety', required: false, format: 'Text', notes: 'Use only values from Master List → Varieties (for that commodity)' },
  { name: 'Gate Pass No.', required: false, format: 'Text' },
  { name: 'Vehicle No.', required: true, format: 'Text' },
  { name: 'Weight Slip No.', required: false, format: 'Text' },
  { name: 'Gross Weight in MT (Vehicle + Goods)', required: false, format: 'Number', notes: 'e.g. 12.690' },
  { name: 'Tare Weight of Vehicle', required: false, format: 'Number (MT)' },
  { name: 'No. of Bags', required: false, format: 'Number' },
  { name: 'Net Weight in MT', required: true, format: 'Number', notes: 'e.g. 5.900' },
  { name: 'Rate Per MT', required: true, format: 'Number (Rs.)', notes: 'e.g. 22310.00' },
  { name: 'Gross Amount', required: false, format: 'Number (Rs.)' },
  { name: 'HLW (Hectolitre Weight) in Wheat', required: false, format: 'Number or "Not Applicable"' },
  { name: 'Excess HLW', required: false, format: 'Number' },
  { name: 'Deduction Amount Rs. (HLW)', required: false, format: 'Number' },
  { name: 'Moisture (MOI)', required: false, format: 'Number (%)' },
  { name: 'Excess Moisture', required: false, format: 'Number' },
  { name: 'Broken, Damage, Discolour, Immature (BDOI)', required: false, format: 'Number' },
  { name: 'Excess BDOI', required: false, format: 'Number' },
  { name: 'MOI+BDOI', required: false, format: 'Number' },
  { name: 'Weight Deduction in KG', required: false, format: 'Number' },
  { name: 'Deduction Amount Rs. (MOI+BDOI)', required: false, format: 'Number' },
  { name: 'Other Deduction 1', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 2', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 3', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 4', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 5', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 6', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 7', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 8', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 9', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 10', required: false, format: 'Number or "-"' },
  { name: 'Net Amount', required: false, format: 'Number (Rs.)' },
  { name: 'Remarks', required: false, format: 'Text' },
];

const SALES_COLUMNS: ColumnSpec[] = [
  { name: 'Date of Transaction', required: false, format: 'DD/MM/YYYY', notes: 'e.g. 11/02/2026' },
  { name: 'State', required: true, format: 'Text', notes: 'Use only values from Master List sheet' },
  { name: 'Customer', required: true, format: 'Text', notes: 'Use only values from Master List → Customers / Sellers' },
  { name: 'Seller Name', required: true, format: 'Text', notes: 'Use only values from Master List → Customers / Sellers' },
  { name: 'Location', required: true, format: 'Text', notes: 'Use only values from Master List → Locations' },
  { name: 'Warehouse Name', required: true, format: 'Text', notes: 'Use only values from Master List → Warehouses' },
  { name: 'Chamber No.', required: false, format: 'Number or text' },
  { name: 'Commodity', required: true, format: 'Text', notes: 'Use only values from Master List → Commodities' },
  { name: 'Variety', required: false, format: 'Text', notes: 'Use only values from Master List → Varieties' },
  { name: 'Gate Pass No.', required: false, format: 'Text' },
  { name: 'Vehicle No.', required: true, format: 'Text' },
  { name: 'Weight Slip No.', required: false, format: 'Text' },
  { name: 'Gross Weight in MT (Vehicle + Goods)', required: false, format: 'Number' },
  { name: 'Tare Weight of Vehicle', required: false, format: 'Number (MT)' },
  { name: 'No. of Bags', required: false, format: 'Number' },
  { name: 'Net Weight in MT', required: true, format: 'Number', notes: 'e.g. 5.900' },
  { name: 'Rate Per MT', required: true, format: 'Number (Rs.)', notes: 'e.g. 22310.00' },
  { name: 'Gross Amount', required: false, format: 'Number (Rs.)' },
  { name: 'HLW (Hectolitre Weight) in Wheat', required: false, format: 'Number or "Not Applicable"' },
  { name: 'Excess HLW', required: false, format: 'Number' },
  { name: 'Deduction Amount Rs. (HLW)', required: false, format: 'Number' },
  { name: 'Moisture (MOI)', required: false, format: 'Number (%)' },
  { name: 'Excess Moisture', required: false, format: 'Number' },
  { name: 'Broken, Damage, Discolour, Immature (BDOI)', required: false, format: 'Number' },
  { name: 'Excess BDOI', required: false, format: 'Number' },
  { name: 'MOI+BDOI', required: false, format: 'Number' },
  { name: 'Weight Deduction in KG (MOI+BDOI)', required: false, format: 'Number' },
  { name: 'Deduction Amount Rs. (MOI+BDOI)', required: false, format: 'Number' },
  { name: 'Other Deduction 1', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 1 Remarks', required: false, format: 'Text' },
  { name: 'Other Deduction 2', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 2 Remarks', required: false, format: 'Text' },
  { name: 'Other Deduction 3', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 3 Remarks', required: false, format: 'Text' },
  { name: 'Other Deduction 4', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 4 Remarks', required: false, format: 'Text' },
  { name: 'Other Deduction 5', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 5 Remarks', required: false, format: 'Text' },
  { name: 'Other Deduction 6', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 6 Remarks', required: false, format: 'Text' },
  { name: 'Other Deduction 7', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 7 Remarks', required: false, format: 'Text' },
  { name: 'Other Deduction 8', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 8 Remarks', required: false, format: 'Text' },
  { name: 'Other Deduction 9', required: false, format: 'Number or "-"' },
  { name: 'Other Deduction 9 Remarks', required: false, format: 'Text' },
  { name: 'Net Amount', required: false, format: 'Number (Rs.)' },
  { name: 'Remarks', required: false, format: 'Text' },
];

interface FileFormatRequirementsModalProps {
  open: boolean;
  onClose: () => void;
  type: BulkUploadType;
}

export default function FileFormatRequirementsModal({ open, onClose, type }: FileFormatRequirementsModalProps) {
  const columns = type === 'purchase' ? PURCHASE_COLUMNS : SALES_COLUMNS;
  const title = type === 'purchase' ? 'Confirmed Purchase Order' : 'Confirmed Sales Order';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            File format requirements — Bulk upload ({title})
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1">
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
            <strong>Important:</strong> Use the <strong>Sample Data</strong> sheet in the downloaded Excel for bulk upload. Column names must match exactly. For Location, Warehouse, Commodity, Customer/Seller, Variety, and State use <strong>only</strong> values from the <strong>Master List</strong> sheet (second tab).
          </div>
          <div className="mb-2 text-sm text-gray-600">
            <strong>File type:</strong> .xlsx or .csv • <strong>First row:</strong> Column headers • <strong>Each row:</strong> One transaction
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 font-semibold text-gray-700 w-8">#</th>
                  <th className="p-2 font-semibold text-gray-700">Column name</th>
                  <th className="p-2 font-semibold text-gray-700 w-24">Required</th>
                  <th className="p-2 font-semibold text-gray-700 w-32">Format</th>
                  <th className="p-2 font-semibold text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-2 text-gray-500">{i + 1}</td>
                    <td className="p-2 font-medium text-gray-900">{col.name}</td>
                    <td className="p-2">
                      <span className={col.required ? 'text-red-600 font-medium' : 'text-gray-500'}>
                        {col.required ? 'Yes' : 'Optional'}
                      </span>
                    </td>
                    <td className="p-2 text-gray-700">{col.format}</td>
                    <td className="p-2 text-gray-600">{col.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
