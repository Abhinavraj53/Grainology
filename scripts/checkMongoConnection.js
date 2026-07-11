import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const buildAtlasSeedListFallback = (primaryUri) => {
  try {
    const parsed = primaryUri ? new URL(primaryUri) : null;
    if (parsed?.protocol !== 'mongodb+srv:' || parsed.host !== 'grainology.we2saem.mongodb.net') {
      return null;
    }

    return [
      `mongodb://${parsed.username}:${parsed.password}@`,
      'ac-ixzgchw-shard-00-00.we2saem.mongodb.net:27017,',
      'ac-ixzgchw-shard-00-01.we2saem.mongodb.net:27017,',
      'ac-ixzgchw-shard-00-02.we2saem.mongodb.net:27017',
      parsed.pathname || '/grainology',
      '?ssl=true&authSource=admin&replicaSet=atlas-xmu1w9-shard-0&retryWrites=true&w=majority',
    ].join('');
  } catch {
    return null;
  }
};

const getAttempts = () => {
  const attempts = [];
  const primaryUri = process.env.MONGODB_URI;
  const directUri = process.env.MONGODB_DIRECT_URI;
  const preferDirect = String(process.env.MONGODB_PREFER_DIRECT || '').trim().toLowerCase() === 'true';
  const fallbackUri = buildAtlasSeedListFallback(primaryUri);

  if (directUri && preferDirect) attempts.push({ label: 'MONGODB_DIRECT_URI', uri: directUri });
  if (primaryUri) attempts.push({ label: 'MONGODB_URI', uri: primaryUri });
  if (directUri && !preferDirect) attempts.push({ label: 'MONGODB_DIRECT_URI', uri: directUri });
  if (fallbackUri && fallbackUri !== directUri) attempts.push({ label: 'resolved Atlas seed-list fallback', uri: fallbackUri });

  return attempts;
};

const main = async () => {
  const attempts = getAttempts();
  if (!attempts.length) {
    throw new Error('No MongoDB URI found. Set MONGODB_URI in .env.');
  }

  let lastError = null;
  for (const attempt of attempts) {
    try {
      console.log(`Checking MongoDB via ${attempt.label}...`);
      const conn = await mongoose.connect(attempt.uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log(`MongoDB OK via ${attempt.label}: ${conn.connection.host}/${conn.connection.name}`);
      await mongoose.disconnect();
      return;
    } catch (error) {
      lastError = error;
      console.error(`MongoDB failed via ${attempt.label}: ${error.message}`);
      await mongoose.disconnect().catch(() => {});
    }
  }

  throw lastError || new Error('MongoDB connection failed.');
};

main().catch((error) => {
  console.error(`MongoDB check failed: ${error.message}`);
  console.error('Fix Atlas Network Access/IP whitelist and confirm MONGODB_DIRECT_URI in .env.');
  process.exit(1);
});
