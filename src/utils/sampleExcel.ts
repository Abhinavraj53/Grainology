import ExcelJS from 'exceljs';

export interface MasterListForExcel {
  locations: string[];
  warehouses: string[];
  commodities: string[];
  customers: string[];
  varieties?: string[]; // optional, can be for one commodity
  states?: string[]; // optional; if not provided, default Indian states are used
}

/** Column index (1-based) and Master List row number for dropdown source. */
export interface DropdownColumn {
  columnIndex: number;
  masterListRow: number;
}

/** Get Excel column letter from 1-based column index (1=A, 2=B, ..., 27=AA). */
function getColumnLetter(colIndex: number): string {
  let s = '';
  let i = colIndex;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s || 'A';
}

const DEFAULT_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

/**
 * Generate sample Excel file with Master List sheet + Sample Data sheet.
 * Dropdowns for State, Supplier/Seller, Location, Warehouse, Commodity, Variety reference Master List.
 * Returns buffer for download.
 */
export async function generateSampleExcel(
  options: {
    headers: string[];
    sampleRows: (string | number)[][];
    masterList: MasterListForExcel;
    sheetName?: string;
    filename?: string;
    /** Columns that get dropdown validation (reference Master List). 1-based column index + Master List row. */
    dropdownColumns?: DropdownColumn[];
  }
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Grainology';
  workbook.created = new Date();

  const states = (options.masterList.states && options.masterList.states.length > 0)
    ? options.masterList.states
    : DEFAULT_STATES;

  // Sheet 1: Master List (create first so we can reference it for dropdowns)
  const masterSheet = workbook.addWorksheet('Master List', { state: 'visible' });
  masterSheet.getColumn(1).width = 22;
  for (let c = 2; c <= 26; c++) {
    masterSheet.getColumn(c).width = 18;
  }
  masterSheet.addRow(['Use only these values in the Sample Data sheet.']);
  masterSheet.getRow(1).getCell(1).font = { bold: true };
  masterSheet.addRow([]);
  masterSheet.addRow(['Locations', ...options.masterList.locations]);
  masterSheet.addRow(['Warehouses', ...options.masterList.warehouses]);
  masterSheet.addRow(['Commodities', ...options.masterList.commodities]);
  masterSheet.addRow(['Customers / Sellers', ...options.masterList.customers]);
  if (options.masterList.varieties && options.masterList.varieties.length > 0) {
    masterSheet.addRow(['Varieties (sample)', ...options.masterList.varieties]);
  }
  masterSheet.addRow([]);
  masterSheet.addRow(['States (India)', ...states]);

  // Sheet 2: Sample Data (bulk upload template - open this sheet first via sheet order)
  const dataSheetName = options.sheetName || 'Sample Data';
  const dataSheet = workbook.addWorksheet(dataSheetName, {
    state: 'visible',
    views: [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }],
  });
  const headerRow = dataSheet.addRow(options.headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });
  options.sampleRows.forEach((row) => dataSheet.addRow(row));
  options.headers.forEach((h, i) => {
    const col = dataSheet.getColumn(i + 1);
    col.width = Math.min(36, Math.max(14, String(h).length + 2));
  });

  // Add dropdown validations: reference Master List rows (B to Z)
  const dropdownColumns = options.dropdownColumns || [];
  const maxDataRow = Math.max(2 + options.sampleRows.length, 300);
  for (const { columnIndex, masterListRow } of dropdownColumns) {
    const formula = `'Master List'!$B$${masterListRow}:$Z$${masterListRow}`;
    for (let r = 2; r <= maxDataRow; r++) {
      const cell = dataSheet.getCell(r, columnIndex);
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorTitle: 'Invalid value',
        error: 'Please select a value from the dropdown (use only values from Master List sheet).',
      };
    }
  }

  // Move Sample Data to first tab: remove Master List and re-add so order becomes [Sample Data, Master List]
  workbook.removeWorksheet('Master List');
  const masterAgain = workbook.addWorksheet('Master List', { state: 'visible' });
  masterAgain.getColumn(1).width = 22;
  for (let c = 2; c <= 26; c++) masterAgain.getColumn(c).width = 18;
  masterAgain.addRow(['Use only these values in the Sample Data sheet.']);
  masterAgain.getRow(1).getCell(1).font = { bold: true };
  masterAgain.addRow([]);
  masterAgain.addRow(['Locations', ...options.masterList.locations]);
  masterAgain.addRow(['Warehouses', ...options.masterList.warehouses]);
  masterAgain.addRow(['Commodities', ...options.masterList.commodities]);
  masterAgain.addRow(['Customers / Sellers', ...options.masterList.customers]);
  if (options.masterList.varieties && options.masterList.varieties.length > 0) {
    masterAgain.addRow(['Varieties (sample)', ...options.masterList.varieties]);
  }
  masterAgain.addRow([]);
  masterAgain.addRow(['States (India)', ...states]);

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/**
 * Trigger download of Excel file in browser
 */
export function downloadExcelBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
