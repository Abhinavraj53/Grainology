/**
 * Utility to map CSV/Excel columns to database fields using user-provided mappings
 */

/**
 * Get value from record using column mapping or fallback to default column names
 * @param {Object} record - The CSV record
 * @param {Object} columnMapping - User-provided column mapping (e.g., { invoice_number: 'Invoice No' })
 * @param {Array} fallbackNames - Array of possible column names to try
 * @param {*} defaultValue - Default value if not found
 * @returns {*} The mapped value
 */
export const getMappedValue = (record, columnMapping, fallbackNames = [], defaultValue = '') => {
  // First try the mapped column name
  if (columnMapping) {
    const mappedColumn = columnMapping;
    if (mappedColumn && record[mappedColumn] !== undefined && record[mappedColumn] !== null && record[mappedColumn] !== '') {
      return record[mappedColumn];
    }
  }
  
  // Then try fallback names
  for (const name of fallbackNames) {
    if (record[name] !== undefined && record[name] !== null && record[name] !== '') {
      return record[name];
    }
  }
  
  return defaultValue;
};

/**
 * Parse date from various formats
 * @param {string} dateValue - Date value from CSV
 * @returns {string} Date in YYYY-MM-DD format
 */
export const parseDate = (dateValue) => {
  if (!dateValue || dateValue === '' || dateValue === 'N/A') {
    return new Date().toISOString().split('T')[0];
  }
  
  // Handle DD/MM/YY or DD/MM/YYYY format
  if (dateValue.includes('/')) {
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  
  // Handle YYYY-MM-DD format
  if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateValue;
  }
  
  // Try to parse as Date object
  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return new Date().toISOString().split('T')[0];
};

/**
 * Parse numeric value, handling various formats including Indian number format with commas
 * @param {*} value - Value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} Parsed number
 */
export const parseNumeric = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '' || value === '-' || 
      value === 'Not Available' || value === 'Not Applicable' || String(value).trim() === '') {
    return defaultValue;
  }
  
  // Convert to string and remove all commas (handles both Indian and Western number formats)
  // Indian format: 1,54,026.00 or 12,34,567.89
  // Western format: 1,540,026.00 or 12,345,678.90
  let cleanValue = String(value).trim();
  
  // Remove all commas (thousands separators)
  cleanValue = cleanValue.replace(/,/g, '');
  
  // Remove any currency symbols or spaces
  cleanValue = cleanValue.replace(/[₹$€£¥\s]/g, '');
  
  // Parse as float and preserve precision (round to 4 decimal places)
  const parsed = parseFloat(cleanValue);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  // Round to 4 decimal places to preserve precision
  return Math.round(parsed * 10000) / 10000;
};

/**
 * Convert value to N/A if empty
 * @param {*} value - Value to convert
 * @returns {string} Value or 'N/A'
 */
export const toNA = (value) => {
  if (value === null || value === undefined || value === '' || value === '-' || 
      value === 'Not Available' || String(value).trim() === '') {
    return 'N/A';
  }
  return String(value).trim();
};

/**
 * Get all available column names from the first record
 * @param {Array} records - Array of CSV records
 * @returns {Array} Array of column names
 */
export const getAvailableColumns = (records) => {
  if (!records || records.length === 0) {
    return [];
  }
  return Object.keys(records[0] || {});
};
