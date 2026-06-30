import dotenv from 'dotenv';
import mongoose from 'mongoose';
import QualityParameter from '../models/QualityParameter.js';

dotenv.config();

const qualityParameters = [
  {
    commodity: 'Paddy',
    s_no: 1,
    parameter_name: 'Moisture',
    unit_of_measurement: '%',
    standard_value: 'MAX 16%-17%',
    options: ['Below 16%', '16%', '16.5%', '17%', 'Above 17%'],
    remarks: 'Accept upto 16%, 1% deduction upto 17%, Above 17% - Reject'
  },
  { commodity: 'Paddy', s_no: 2, parameter_name: 'Foreign Matter', unit_of_measurement: '%', standard_value: 'MAX 2%', options: ['0%', '0.5%', '1.0%', '1.5%', '2.0%', 'Above 2%'], remarks: '' },
  { commodity: 'Paddy', s_no: 3, parameter_name: 'Damage & Discolour', unit_of_measurement: '%', standard_value: 'MAX 6%-8%', options: ['Below 6%', '6%', '7%', '8%', 'Above 8%'], remarks: 'Accept upto 6%, .5% deduction upto 7%, 1% deduction upto 8%, Above 8% - Reject' },
  { commodity: 'Paddy', s_no: 4, parameter_name: 'Admixture', unit_of_measurement: '%', standard_value: 'MAX 1%-2%', options: ['0%', '0.5%', '1.0%', '1.5%', '2.0%', 'Above 2%'], remarks: '' },
  { commodity: 'Paddy', s_no: 5, parameter_name: 'Green Paddy', unit_of_measurement: '%', standard_value: 'MAX 1%-2%', options: ['0%', '0.5%', '1.0%', '1.5%', '2.0%', 'Above 2%'], remarks: '' },
  { commodity: 'Paddy', s_no: 6, parameter_name: 'Dead Paddy', unit_of_measurement: '%', standard_value: 'MAX 1%-2%', options: ['0%', '0.5%', '1.0%', '1.5%', '2.0%', 'Above 2%'], remarks: '' },
  { commodity: 'Paddy', s_no: 7, parameter_name: 'Live Insect', unit_of_measurement: 'Count', standard_value: '0-5', options: ['0', '1', '2', '3', '4', '5', 'Above 5'], remarks: 'Accept upto 5 pieces, Above 5 pieces - Reject' },

  { commodity: 'Maize', s_no: 1, parameter_name: 'Moisture', unit_of_measurement: '%', standard_value: 'MAX 14%-15%', options: ['Below 14%', '14%', '14.5%', '15%', 'Above 15%'], remarks: 'Accept upto 14%, 1% deduction upto 15%, Above 15% - Reject' },
  { commodity: 'Maize', s_no: 2, parameter_name: 'Fungus', unit_of_measurement: '%', standard_value: 'MAX 1%-2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: 'Accept upto 2%, Above 2% - Reject' },
  { commodity: 'Maize', s_no: 3, parameter_name: 'Damage & Discolour', unit_of_measurement: '%', standard_value: 'MAX 6%-8%', options: ['Below 6%', '6%', '7%', '8%', 'Above 8%'], remarks: 'Accept upto 6%, .5% deduction upto 7%, 1% deduction upto 8%, Above 8% - Reject' },
  { commodity: 'Maize', s_no: 4, parameter_name: 'Broken, Seiveield, Immature', unit_of_measurement: '%', standard_value: 'MAX 4%-6%', options: ['Below 4%', '4%', '5%', '6%', 'Above 6%'], remarks: '' },
  { commodity: 'Maize', s_no: 5, parameter_name: 'Foreign Matter', unit_of_measurement: '%', standard_value: 'MAX 2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: '' },
  { commodity: 'Maize', s_no: 6, parameter_name: 'Whole Grain', unit_of_measurement: '%', standard_value: 'MAX 2%-3%', options: ['Below 2%', '2%', '3%', 'Above 3%'], remarks: '' },
  { commodity: 'Maize', s_no: 7, parameter_name: 'Live Insect', unit_of_measurement: 'Count', standard_value: '0-5', options: ['0', '1', '2', '3', '4', '5', 'Above 5'], remarks: 'Accept upto 5 pieces, Above 5 pieces - Reject' },

  { commodity: 'Wheat', s_no: 1, parameter_name: 'Moisture', unit_of_measurement: '%', standard_value: 'MAX 12%-13%', options: ['Below 12%', '12%', '12.5%', '13%', 'Above 13%'], remarks: 'Accept upto 12%, 1% deduction upto 13%, Above 13% - Reject' },
  { commodity: 'Wheat', s_no: 2, parameter_name: 'Hecto Litre Weight', unit_of_measurement: '%', standard_value: 'MIN 72%-74%', options: ['Above 74%', '74%', '73%', '72%', 'Below 72%'], remarks: 'Accept upto 74%, Below 74% - 1-5, Below 72% - Reject' },
  { commodity: 'Wheat', s_no: 3, parameter_name: 'Red Wheat', unit_of_measurement: '%', standard_value: 'MAX 5%-10%', options: ['Below 5%', '5%', '7.5%', '10%', 'Above 10%'], remarks: '' },
  { commodity: 'Wheat', s_no: 4, parameter_name: 'Karnal Bond', unit_of_measurement: '%', standard_value: 'MAX 0.5%', options: ['0%', '0.1%', '0.2%', '0.3%', '0.4%', '0.5%', 'Above 0.5%'], remarks: '' },
  { commodity: 'Wheat', s_no: 5, parameter_name: 'Foreign Matter', unit_of_measurement: '%', standard_value: 'MAX 3%', options: ['0%', '1%', '2%', '3%', 'Above 3%'], remarks: '' },
  { commodity: 'Wheat', s_no: 6, parameter_name: 'Mud Ball', unit_of_measurement: '%', standard_value: 'MAX 2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: '' },
  { commodity: 'Wheat', s_no: 7, parameter_name: 'Immature', unit_of_measurement: '%', standard_value: 'MAX 2%-3%', options: ['Below 2%', '2%', '3%', 'Above 3%'], remarks: '' },
  { commodity: 'Wheat', s_no: 8, parameter_name: 'Broken', unit_of_measurement: '%', standard_value: 'MAX 2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: '' },
  { commodity: 'Wheat', s_no: 9, parameter_name: 'Whole Grain', unit_of_measurement: '%', standard_value: 'MAX 1%', options: ['0%', '0.5%', '1%', 'Above 1%'], remarks: '' },
  { commodity: 'Wheat', s_no: 10, parameter_name: 'Live Insect', unit_of_measurement: 'Count', standard_value: '0-5', options: ['0', '1', '2', '3', '4', '5', 'Above 5'], remarks: 'Accept upto 5 pieces, Above 5 pieces - Reject' },
  { commodity: 'Wheat', s_no: 11, parameter_name: 'Damage & Discolour', unit_of_measurement: '%', standard_value: 'MAX 2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: '' },
  { commodity: 'Wheat', s_no: 12, parameter_name: 'Black & Black Tips', unit_of_measurement: '%', standard_value: 'MAX 0.5%', options: ['0%', '0.1%', '0.2%', '0.3%', '0.4%', '0.5%', 'Above 0.5%'], remarks: '' },
  { commodity: 'Wheat', s_no: 13, parameter_name: 'Wevilled', unit_of_measurement: '%', standard_value: 'MAX 1%', options: ['0%', '0.5%', '1%', 'Above 1%'], remarks: '' },
  { commodity: 'Wheat', s_no: 14, parameter_name: 'Lusture loss', unit_of_measurement: '%', standard_value: 'MAX 2%', options: ['0%', '1%', '2%', 'Above 2%'], remarks: '' },
  { commodity: 'Wheat', s_no: 15, parameter_name: 'Potia', unit_of_measurement: '%', standard_value: 'MAX 12%', options: ['Below 12%', '12%', 'Above 12%'], remarks: '' },
  { commodity: 'Wheat', s_no: 16, parameter_name: 'Gluten', unit_of_measurement: '%', standard_value: 'MIN 9%', options: ['Above 9%', '9%', 'Below 9%'], remarks: 'Accept upto 9%, Below 9% - Reject' }
];

const managedCommodities = ['Paddy', 'Maize', 'Wheat'];

const seedQualityParameters = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const deleteResult = await QualityParameter.deleteMany({
    commodity: { $in: managedCommodities }
  });

  const insertedParameters = await QualityParameter.insertMany(
    qualityParameters.map((parameter) => ({
      ...parameter,
      is_active: true
    }))
  );

  console.log(`Deleted ${deleteResult.deletedCount} existing quality parameters for ${managedCommodities.join(', ')}`);
  console.log(`Inserted ${insertedParameters.length} corrected quality parameters into quality_parameters_master`);
};

seedQualityParameters()
  .catch((error) => {
    console.error('Failed to seed quality parameters:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
