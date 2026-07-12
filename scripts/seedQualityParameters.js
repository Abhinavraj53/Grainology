import mongoose from 'mongoose';
import dotenv from 'dotenv';
import QualityParameter from '../models/QualityParameter.js';
import { QUALITY_PARAMETER_DEFINITIONS } from './qualityParameterDefinitions.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology';

const buildExpectedDocs = () =>
  Object.entries(QUALITY_PARAMETER_DEFINITIONS).flatMap(([commodity, params]) =>
    params.map((param) => ({
      commodity,
      param_name: param.name,
      unit: param.unit,
      standard: param.standard,
      options: param.options,
      remarks: param.remarks
    }))
  );

const syncQualityParameters = async () => {
  await mongoose.connect(mongoUri);

  const expectedDocs = buildExpectedDocs();
  const commodityNames = Object.keys(QUALITY_PARAMETER_DEFINITIONS);
  const expectedKeys = new Set(expectedDocs.map((doc) => `${doc.commodity}::${doc.param_name}`));

  let upserted = 0;

  for (const doc of expectedDocs) {
    await QualityParameter.updateOne(
      { commodity: doc.commodity, param_name: doc.param_name },
      { $set: doc },
      { upsert: true, runValidators: true }
    );
    upserted += 1;
  }

  const existingDocs = await QualityParameter.find(
    { commodity: { $in: commodityNames } },
    { commodity: 1, param_name: 1 }
  ).lean();

  const staleIds = existingDocs
    .filter((doc) => !expectedKeys.has(`${doc.commodity}::${doc.param_name}`))
    .map((doc) => doc._id);

  let removed = 0;
  if (staleIds.length > 0) {
    const deleteResult = await QualityParameter.deleteMany({ _id: { $in: staleIds } });
    removed = deleteResult.deletedCount || 0;
  }

  console.log(`Seeded quality parameters: ${upserted} upserted, ${removed} stale removed.`);
  console.log(`Paddy parameters synced: ${QUALITY_PARAMETER_DEFINITIONS.Paddy.length}`);
}

try {
  await syncQualityParameters();
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error('Failed to seed quality parameters:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
}
