/**
 * Unit conversion utilities for agricultural commodities
 *
 * Standard conversions:
 * - 1 MT (Metric Ton) = 10 Quintal = 1000 KG
 * - 1 Quintal = 100 KG = 0.1 MT
 * - 1 KG = 0.01 Quintal = 0.001 MT
 */

export type UnitType = 'MT' | 'Quintal' | 'KG';

export interface ConversionResult {
  MT: number;
  Quintal: number;
  KG: number;
}

/**
 * Convert any quantity from one unit to all other units
 * @param quantity - The quantity to convert
 * @param fromUnit - The source unit
 * @returns Object containing the quantity in all three units
 */
export function convertToAllUnits(quantity: number, fromUnit: UnitType): ConversionResult {
  let quantityInMT: number;

  // First convert to MT as the base unit
  switch (fromUnit) {
    case 'MT':
      quantityInMT = quantity;
      break;
    case 'Quintal':
      quantityInMT = quantity * 0.1;
      break;
    case 'KG':
      quantityInMT = quantity * 0.001;
      break;
    default:
      quantityInMT = quantity;
  }

  // Convert from MT to all units
  return {
    MT: quantityInMT,
    Quintal: quantityInMT * 10,
    KG: quantityInMT * 1000,
  };
}

/**
 * Convert quantity from one unit to another specific unit
 * @param quantity - The quantity to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns The converted quantity
 */
export function convertUnit(quantity: number, fromUnit: UnitType, toUnit: UnitType): number {
  if (fromUnit === toUnit) return quantity;

  const allUnits = convertToAllUnits(quantity, fromUnit);
  return allUnits[toUnit];
}

/**
 * Format quantity with unit label
 * @param quantity - The quantity
 * @param unit - The unit type
 * @returns Formatted string with quantity and unit
 */
export function formatQuantityWithUnit(quantity: number, unit: UnitType): string {
  return `${quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}`;
}

/**
 * Calculate total value based on rate per unit and quantity
 * @param ratePerUnit - Price per unit
 * @param quantity - Quantity
 * @param unit - Unit of measurement
 * @returns Total value
 */
export function calculateTotalValue(ratePerUnit: number, quantity: number, unit: UnitType): number {
  return ratePerUnit * quantity;
}

/**
 * Convert rate from one unit to another
 * For example, if rate is per Quintal, convert to rate per MT
 * @param rate - The rate
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns The converted rate
 */
export function convertRate(rate: number, fromUnit: UnitType, toUnit: UnitType): number {
  if (fromUnit === toUnit) return rate;

  // When converting rates, the conversion is inverse
  // If 1 MT = 10 Quintal, then rate per MT = rate per Quintal * 10
  const quantity = 1;
  const convertedQuantity = convertUnit(quantity, fromUnit, toUnit);

  // Rate conversion is inverse of quantity conversion
  return rate / convertedQuantity;
}
