// Script to create or update a Super Admin user in the database
// Super Admin has same controls as Admin + additional features (to be added later)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createSuperAdminUser = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology');
    console.log('✅ Connected to MongoDB\n');

    const superAdminMobile = '8888888888';
    const superAdminPassword = 'SuperAdmin@123';
    const superAdminName = 'Super Admin User';
    const superAdminEmail = 'superadmin@grainology.com';

    let superAdmin = await User.findOne({
      $or: [
        { mobile_number: superAdminMobile },
        { role: 'super_admin' }
      ]
    });

    if (superAdmin) {
      console.log('⚠️  Super Admin user already exists!');
      console.log(`   Mobile Number: ${superAdmin.mobile_number}`);
      console.log(`   Name: ${superAdmin.name}`);
      console.log(`   Email: ${superAdmin.email || 'Not set'}\n`);

      superAdmin.password = superAdminPassword;
      superAdmin.role = 'super_admin';
      superAdmin.name = superAdminName;
      superAdmin.email = superAdminEmail;
      superAdmin.mobile_number = superAdminMobile;
      superAdmin.kyc_status = 'verified';
      superAdmin.kyc_verified_at = new Date();
      superAdmin.approval_status = 'approved';
      superAdmin.approved_at = new Date();

      await superAdmin.save();
      console.log('✅ Super Admin user updated successfully!\n');
    } else {
      superAdmin = new User({
        email: superAdminEmail,
        password: superAdminPassword,
        name: superAdminName,
        mobile_number: superAdminMobile,
        role: 'super_admin',
        entity_type: 'individual',
        preferred_language: 'English',
        country: 'India',
        kyc_status: 'verified',
        kyc_verified_at: new Date(),
        approval_status: 'approved',
        approved_at: new Date(),
      });

      await superAdmin.save();
      console.log('✅ Super Admin user created successfully!\n');
    }

    const isPasswordValid = await superAdmin.comparePassword(superAdminPassword);

    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 SUPER ADMIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Mobile Number: ${superAdminMobile}`);
    console.log(`   Password: ${superAdminPassword}`);
    console.log(`   Email: ${superAdminEmail}`);
    console.log(`   Name: ${superAdminName}`);
    console.log(`   Role: Super Admin`);
    console.log(`   User ID: ${superAdmin._id}`);
    console.log(`   Password Verified: ${isPasswordValid ? '✅ YES' : '❌ NO'}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n💡 Login: Use Mobile Number OR Email + Password');
    console.log('   - Mobile: 8888888888');
    console.log('   - Email: superadmin@grainology.com');
    console.log('   - Password: SuperAdmin@123\n');

    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createSuperAdminUser();
