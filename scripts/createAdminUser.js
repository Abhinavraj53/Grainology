// Script to create or update an admin user in the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology');
    console.log('✅ Connected to MongoDB\n');

    // Admin credentials
    const adminMobile = '9999999999';
    const adminPassword = 'Admin@123';
    const adminName = 'Admin User';
    const adminEmail = 'admin@grainology.com';

    // Check if admin already exists
    let admin = await User.findOne({ 
      $or: [
        { mobile_number: adminMobile },
        { role: 'admin' }
      ]
    });

    if (admin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`   Mobile Number: ${admin.mobile_number}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email || 'Not set'}\n`);
      
      // Update password and ensure it's an admin
      admin.password = adminPassword; // Will be hashed by pre-save hook
      admin.role = 'admin';
      admin.name = adminName;
      admin.email = adminEmail;
      admin.mobile_number = adminMobile;
      admin.kyc_status = 'verified';
      admin.kyc_verified_at = new Date();
      
      await admin.save();
      console.log('✅ Admin user updated successfully!\n');
    } else {
      // Create new admin user
      admin = new User({
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
      console.log('✅ Admin user created successfully!\n');
    }

    // Verify password works
    const isPasswordValid = await admin.comparePassword(adminPassword);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 ADMIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Mobile Number: ${adminMobile}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Name: ${adminName}`);
    console.log(`   Role: Admin`);
    console.log(`   User ID: ${admin._id}`);
    console.log(`   Password Verified: ${isPasswordValid ? '✅ YES' : '❌ NO'}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n💡 Login Instructions:');
    console.log('   - Use Mobile Number: 9999999999');
    console.log('   - Use Password: Admin@123');
    console.log('   - Login is case-sensitive\n');

    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdminUser();

