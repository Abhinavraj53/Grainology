/**
 * Quality Parameter Structures for Paddy, Maize, and Wheat
 * Based on provided AgMarkNet style specifications
 */

export interface QualityParamDef {
  name: string;
  unit: string;
  standard: string;
  options: string[];
  remarks: string;
}

export const QUALITY_STRUCTURE: Record<string, QualityParamDef[]> = {
  Paddy: [
    { name: 'Moisture', unit: '%', standard: 'MAX 16%-17%', options: ['Below 16%', '16%', '16.5%', '17%', 'Above 17%'], remarks: 'Accept upto 16%, 1% deduction upto 17%, Above 17% - Reject' },
    { name: 'Foreign Matter', unit: '%', standard: 'MAX 2%', options: ['0%', '0.5%', '1.0%', '1.5%', '2.0%', 'Above 2%'], remarks: '' },
    { name: 'Damage & Discolour', unit: '%', standard: 'MAX 6%-8%', options: ['Below 6%', '6%', '7%', '8%', 'Above 8%'], remarks: 'Accept upto 6%, .5% deduction upto 7%, 1% deduction upto 8%, Above 8% - Reject' },
    { name: 'Admixture', unit: '%', standard: 'MAX 1%-2%', options: ['0%', '0.5%', '1.0%', '1.5%', '2.0%', 'Above 2%'], remarks: '' },
    { name: 'Green Paddy', unit: '%', standard: 'MAX 1%-2%', options: ['0%', '0.5%', '1.0%', '1.5%', '2.0%', 'Above 2%'], remarks: '' },
    { name: 'Dead Paddy', unit: '%', standard: 'MAX 1%-2%', options: ['0%', '0.5%', '1.0%', '1.5%', '2.0%', 'Above 2%'], remarks: '' },
    { name: 'Live Insect', unit: 'Count', standard: '0-5', options: ['0', '1', '2', '3', '4', '5', 'Above 5'], remarks: 'Accept upto 5 pieces, Above 5 pieces - Reject' },
  ],
  Maize: [
    { name: 'Moisture', unit: '%', standard: 'MAX 14%-15%', options: ['Below 14%', '14%', '14.5%', '15%', 'Above 15%'], remarks: 'Accept upto 14%, 1% deduction upto 15%, Above 15% - Reject' },
    { name: 'Fungus', unit: '%', standard: 'MAX 1%-2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: 'Accept upto 2%, Above 2% - Reject' },
    { name: 'Damage & Discolour', unit: '%', standard: 'MAX 6%-8%', options: ['Below 6%', '6%', '7%', '8%', 'Above 8%'], remarks: 'Accept upto 6%, .5% deduction upto 7%, 1% deduction upto 8%, Above 8% - Reject' },
    { name: 'Broken, Seiveield, Immature', unit: '%', standard: 'MAX 4%-6%', options: ['Below 4%', '4%', '5%', '6%', 'Above 6%'], remarks: '' },
    { name: 'Foreign Matter', unit: '%', standard: 'MAX 2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: '' },
    { name: 'Whole Grain', unit: '%', standard: 'MAX 2%-3%', options: ['Below 2%', '2%', '3%', 'Above 3%'], remarks: '' },
    { name: 'Live Insect', unit: 'Count', standard: '0-5', options: ['0', '1', '2', '3', '4', '5', 'Above 5'], remarks: 'Accept upto 5 pieces, Above 5 pieces - Reject' },
  ],
  Wheat: [
    { name: 'Moisture', unit: '%', standard: 'MAX 12%-13%', options: ['Below 12%', '12%', '12.5%', '13%', 'Above 13%'], remarks: 'Accept upto 12%, 1% deduction upto 13%, Above 13% - Reject' },
    { name: 'Hecto Litre Weight', unit: '%', standard: 'MIN 72%-74%', options: ['Above 74%', '74%', '73%', '72%', 'Below 72%'], remarks: 'Accept upto 74%, Below 74% - 1-5, Below 72% - Reject' },
    { name: 'Red Wheat', unit: '%', standard: 'MAX 5%-10%', options: ['Below 5%', '5%', '7.5%', '10%', 'Above 10%'], remarks: '' },
    { name: 'Karnal Bond', unit: '%', standard: 'MAX 0.5%', options: ['0%', '0.1%', '0.2%', '0.3%', '0.4%', '0.5%', 'Above 0.5%'], remarks: '' },
    { name: 'Foreign Matter', unit: '%', standard: 'MAX 3%', options: ['0%', '1%', '2%', '3%', 'Above 3%'], remarks: '' },
    { name: 'Mud Ball', unit: '%', standard: 'MAX 2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: '' },
    { name: 'Immature', unit: '%', standard: 'MAX 2%-3%', options: ['Below 2%', '2%', '3%', 'Above 3%'], remarks: '' },
    { name: 'Broken', unit: '%', standard: 'MAX 2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: '' },
    { name: 'Whole Grain', unit: '%', standard: 'MAX 1%', options: ['0%', '0.5%', '1%', 'Above 1%'], remarks: '' },
    { name: 'Live Insect', unit: 'Count', standard: '0-5', options: ['0', '1', '2', '3', '4', '5', 'Above 5'], remarks: 'Accept upto 5 pieces, Above 5 pieces - Reject' },
    { name: 'Damage & Discolour', unit: '%', standard: 'MAX 2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: '' },
    { name: 'Black & Black Tips', unit: '%', standard: 'MAX 0.5%', options: ['0%', '0.1%', '0.2%', '0.3%', '0.4%', '0.5%', 'Above 0.5%'], remarks: '' },
    { name: 'Wevilled', unit: '%', standard: 'MAX 1%', options: ['0%', '0.5%', '1%', 'Above 1%'], remarks: '' },
    { name: 'Lusture loss', unit: '%', standard: 'MAX 2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: '' },
    { name: 'Potia', unit: '%', standard: 'MAX 12%', options: ['Below 12%', '12%', 'Above 12%'], remarks: '' },
    { name: 'Gluten', unit: '%', standard: 'MIN 9%', options: ['Above 9%', '9%', 'Below 9%'], remarks: 'Accept upto 9%, Below 9% - Reject' },
  ]
};

