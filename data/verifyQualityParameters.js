import dotenv from 'dotenv';
import mongoose from 'mongoose';
import QualityParameter from '../models/QualityParameter.js';

dotenv.config();

const expectedCounts = {
  Paddy: 7,
  Maize: 7,
  Wheat: 16
};

const verifyQualityParameters = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const rows = await QualityParameter.find({
    commodity: { $in: Object.keys(expectedCounts) },
    is_active: true
  })
    .sort({ commodity: 1, s_no: 1 })
    .lean();

  const errors = [];

  for (const [commodity, expectedCount] of Object.entries(expectedCounts)) {
    const commodityRows = rows.filter((row) => row.commodity === commodity);
    if (commodityRows.length !== expectedCount) {
      errors.push(`${commodity} expected ${expectedCount} active rows, found ${commodityRows.length}`);
    }
  }

  for (const row of rows) {
    const label = `${row.commodity} / ${row.s_no} / ${row.parameter_name}`;

    if (!Array.isArray(row.options)) {
      errors.push(`${label} options is not an array`);
      continue;
    }

    if (row.options.length === 0) {
      errors.push(`${label} options is empty`);
    }

    if (row.options.some((option) => typeof option !== 'string')) {
      errors.push(`${label} options contains non-string values`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Quality parameter verification failed:\n${errors.join('\n')}`);
  }

  console.log('Quality parameter verification passed');
  console.log(JSON.stringify(
    Object.fromEntries(
      Object.keys(expectedCounts).map((commodity) => [
        commodity,
        rows.filter((row) => row.commodity === commodity).length
      ])
    ),
    null,
    2
  ));
};

verifyQualityParameters()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
