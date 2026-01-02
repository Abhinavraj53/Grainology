// Script to generate bcrypt hash for password
import bcrypt from 'bcryptjs';

const password = 'Admin@123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔐 PASSWORD HASH GENERATED');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📋 Complete MongoDB Document:');
  console.log('═══════════════════════════════════════════════════════');
  console.log(JSON.stringify({
    name: "Admin User",
    mobile_number: "9999999999",
    password: hash,
    role: "admin",
    email: "admin@grainology.com",
    entity_type: "individual",
    preferred_language: "English",
    country: "India",
    kyc_status: "verified",
    kyc_verified_at: new Date(),
    kyc_data: {},
    verification_documents: {},
    createdAt: new Date(),
    updatedAt: new Date()
  }, null, 2));
  console.log('═══════════════════════════════════════════════════════\n');
  
  process.exit(0);
});

