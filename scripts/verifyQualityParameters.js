import mongoose from 'mongoose';
import dotenv from 'dotenv';
import QualityParameter from '../models/QualityParameter.js';
import { QUALITY_PARAMETER_DEFINITIONS } from './qualityParameterDefinitions.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology';

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const compareArrays = (left, right) =>
  left.length === right.length && left.every((item, index) => item === right[index]);

const verifyQualityParameters = async () => {
  await mongoose.connect(mongoUri);

  const errors = [];

  for (const [commodity, expectedParams] of Object.entries(QUALITY_PARAMETER_DEFINITIONS)) {
    const docs = await QualityParameter.find({ commodity }).sort({ param_name: 1 }).lean();
    const actualByName = new Map(docs.map((doc) => [doc.param_name, doc]));
    const expectedNames = new Set(expectedParams.map((param) => param.name));

    for (const expected of expectedParams) {
      const actual = actualByName.get(expected.name);

      if (!actual) {
        errors.push(`${commodity}: missing parameter "${expected.name}"`);
        continue;
      }

      if (actual.unit !== expected.unit) {
        errors.push(`${commodity} / ${expected.name}: unit mismatch (${actual.unit} !== ${expected.unit})`);
      }

      if (actual.standard !== expected.standard) {
        errors.push(`${commodity} / ${expected.name}: standard mismatch (${actual.standard} !== ${expected.standard})`);
      }

      if ((actual.remarks || '') !== expected.remarks) {
        errors.push(`${commodity} / ${expected.name}: remarks mismatch`);
      }

      if (!compareArrays(normalizeArray(actual.options), expected.options)) {
        errors.push(`${commodity} / ${expected.name}: options mismatch`);
      }
    }

    for (const actualName of actualByName.keys()) {
      if (!expectedNames.has(actualName)) {
        errors.push(`${commodity}: unexpected parameter "${actualName}"`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('Quality parameter verification failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Quality parameter verification passed.');
  console.log(`Verified Paddy options for ${QUALITY_PARAMETER_DEFINITIONS.Paddy.length} parameters.`);
}

try {
  await verifyQualityParameters();
  await mongoose.disconnect();
  process.exit(process.exitCode || 0);
} catch (error) {
  console.error('Failed to verify quality parameters:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
}
