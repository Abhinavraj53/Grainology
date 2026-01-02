// Script to delete all users and create a single admin user
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const resetAndCreateAdmin = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology');
    console.log('✅ Connected to MongoDB');

    // Delete all users
    const deleteResult = await User.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} users from database`);

    // Admin credentials
    const adminMobile = '9999999999';
    const adminPassword = 'Admin@123';
    const adminName = 'Admin User';
    const adminEmail = 'admin@grainology.com';

    // Create admin user
    const admin = new User({
      email: adminEmail,
      password: adminPassword, // Will be hashed by pre-save hook
      name: adminName,
      mobile_number: adminMobile,
      role: 'admin',
      entity_type: 'individual',
      preferred_language: 'English',
      country: 'India',
      kyc_status: 'verified',
      kyc_verified_at: new Date(),
    });

    await admin.save();
    
    console.log('\n✅ Admin user created successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 ADMIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Mobile Number: ${adminMobile}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Email: ${adminEmail} (optional - can login with mobile)`);
    console.log(`   Name: ${adminName}`);
    console.log(`   Role: Admin`);
    console.log(`   User ID: ${admin._id}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('   Login using Mobile Number: 9999999999');
    console.log('   Password: Admin@123\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

resetAndCreateAdmin();

