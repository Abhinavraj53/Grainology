// Script to fix admin password in production database
// This will update the password and ensure it's properly hashed
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const fixAdminPassword = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('📍 Using MONGODB_URI from .env file\n');
    
    // Connect to production database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology');
    console.log('✅ Connected to MongoDB\n');

    const adminMobile = '9999999999';
    const adminPassword = 'Admin@123';

    // Find admin user by mobile number
    let admin = await User.findOne({ mobile_number: adminMobile });
    
    if (!admin) {
      console.log('❌ Admin user not found with mobile number:', adminMobile);
      console.log('   Searching for any admin user...\n');
      
      // Try to find any admin user
      admin = await User.findOne({ role: 'admin' });
      
      if (!admin) {
        console.log('❌ No admin user found in database!');
        console.log('   Please create an admin user first.\n');
        process.exit(1);
      } else {
        console.log('⚠️  Found admin with different mobile number:', admin.mobile_number);
        console.log('   Updating mobile number to:', adminMobile, '\n');
      }
    } else {
      console.log('✅ Admin user found!');
      console.log(`   Name: ${admin.name}`);
      console.log(`   Mobile: ${admin.mobile_number}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Email: ${admin.email || 'Not set'}\n`);
    }

    // Update admin details
    console.log('🔄 Updating admin password and details...');
    admin.password = adminPassword; // Will be hashed by pre-save hook
    admin.role = 'admin';
    admin.name = 'Admin User';
    admin.mobile_number = adminMobile;
    admin.email = 'admin@grainology.com';
    admin.entity_type = 'individual';
    admin.preferred_language = 'English';
    admin.country = 'India';
    admin.kyc_status = 'verified';
    admin.kyc_verified_at = new Date();
    
    await admin.save();
    console.log('✅ Admin user updated successfully!\n');

    // Verify password works
    console.log('🔐 Verifying password...');
    const isValid = await admin.comparePassword(adminPassword);
    
    if (!isValid) {
      console.log('❌ Password verification failed!');
      console.log('   This should not happen. Please check the password hash.\n');
    } else {
      console.log('✅ Password verified successfully!\n');
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 ADMIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Mobile Number: ${admin.mobile_number}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   User ID: ${admin._id}`);
    console.log(`   Password Verified: ${isValid ? '✅ YES' : '❌ NO'}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n💡 You can now login with:');
    console.log('   Mobile Number: 9999999999');
    console.log('   Password: Admin@123\n');

    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\n💡 Make sure:');
    console.error('   1. MONGODB_URI in .env points to production database');
    console.error('   2. MongoDB connection is accessible');
    console.error('   3. Network/IP is whitelisted in MongoDB Atlas\n');
    process.exit(1);
  }
};

fixAdminPassword();

