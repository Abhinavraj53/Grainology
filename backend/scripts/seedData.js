// Seed script to populate initial data
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import QualityParameter from '../models/QualityParameter.js';

dotenv.config();

const seedQualityParameters = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology');

    const qualityParams = [
      { commodity: 'Paddy', param_name: 'Moisture', unit: '%', standard: 'MAX 16%-17%', remarks: 'Deduction for excess moisture' },
      { commodity: 'Paddy', param_name: 'Foreign Matter', unit: '%', standard: 'MAX 1%-2%', remarks: 'Deduction for impurities' },
      { commodity: 'Paddy', param_name: 'Broken Grains', unit: '%', standard: 'MAX 5%-10%', remarks: 'Affects milling quality' },
      { commodity: 'Paddy', param_name: 'Damaged Grains', unit: '%', standard: 'MAX 2%-3%', remarks: 'Heat or pest damage' },
      { commodity: 'Maize', param_name: 'Moisture', unit: '%', standard: 'MAX 14%-15%', remarks: 'Storage quality critical' },
      { commodity: 'Maize', param_name: 'Foreign Matter', unit: '%', standard: 'MAX 1%-2%', remarks: 'Reduces feed quality' },
      { commodity: 'Maize', param_name: 'Broken Kernels', unit: '%', standard: 'MAX 3%-5%', remarks: 'Processing loss' },
      { commodity: 'Maize', param_name: 'Discolored Kernels', unit: '%', standard: 'MAX 2%-3%', remarks: 'Quality indicator' },
      { commodity: 'Wheat', param_name: 'Moisture', unit: '%', standard: 'MAX 12%-13%', remarks: 'Milling moisture' },
      { commodity: 'Wheat', param_name: 'Foreign Matter', unit: '%', standard: 'MAX 1%-2%', remarks: 'Cleanliness standard' },
      { commodity: 'Wheat', param_name: 'Shriveled Grains', unit: '%', standard: 'MAX 3%-5%', remarks: 'Weight and quality' },
      { commodity: 'Wheat', param_name: 'Damaged Grains', unit: '%', standard: 'MAX 2%-3%', remarks: 'Pest or weather damage' }
    ];

    await QualityParameter.insertMany(qualityParams);
    console.log('✅ Quality parameters seeded successfully');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedQualityParameters();

