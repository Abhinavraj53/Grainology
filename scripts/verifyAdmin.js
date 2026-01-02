// Script to verify admin user exists and test login
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const verifyAdmin = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology');
    console.log('✅ Connected to MongoDB\n');

    // Find admin user
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.log('❌ No admin user found!');
      console.log('Creating admin user now...\n');
      
      // Create admin user
      const adminMobile = '9999999999';
      const adminPassword = 'Admin@123';
      const adminName = 'Admin User';
      const adminEmail = 'admin@grainology.com';

      const newAdmin = new User({
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        mobile_number: adminMobile,
        role: 'admin',
        entity_type: 'individual',
        preferred_language: 'English',
        country: 'India',
        kyc_status: 'verified',
        kyc_verified_at: new Date(),
      });

      await newAdmin.save();
      console.log('✅ Admin user created!\n');
      
      // Test password
      const isPasswordValid = await newAdmin.comparePassword('Admin@123');
      console.log('🔐 Password Test:');
      console.log(`   Password "Admin@123" is valid: ${isPasswordValid ? '✅ YES' : '❌ NO'}\n`);
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('📧 ADMIN CREDENTIALS:');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`   Mobile Number: ${adminMobile}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   User ID: ${newAdmin._id}`);
      console.log('═══════════════════════════════════════════════════════\n');
    } else {
      console.log('✅ Admin user found!\n');
      console.log('📋 Admin Details:');
      console.log(`   Name: ${admin.name}`);
      console.log(`   Mobile Number: ${admin.mobile_number}`);
      console.log(`   Email: ${admin.email || 'Not set'}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   User ID: ${admin._id}\n`);
      
      // Test password
      const testPasswords = ['Admin@123', 'admin123', 'Admin123'];
      console.log('🔐 Testing Passwords:');
      for (const pwd of testPasswords) {
        const isValid = await admin.comparePassword(pwd);
        console.log(`   "${pwd}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
      }
      console.log('');
      
      // Show all users count
      const totalUsers = await User.countDocuments();
      console.log(`📊 Total users in database: ${totalUsers}`);
      
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📧 LOGIN CREDENTIALS:');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`   Mobile Number: ${admin.mobile_number}`);
      console.log(`   Password: Try "Admin@123" (tested above)`);
      console.log('═══════════════════════════════════════════════════════\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

verifyAdmin();

