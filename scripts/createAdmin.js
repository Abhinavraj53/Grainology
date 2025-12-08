// Script to create an admin user
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const createAdmin = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology');
    console.log('✅ Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@grainology.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Role: ${existingAdmin.role}`);
      
      // Update password if ADMIN_PASSWORD is set
      if (process.env.ADMIN_PASSWORD) {
        existingAdmin.password = adminPassword; // Will be hashed by pre-save hook
        await existingAdmin.save();
        console.log('✅ Admin password updated');
      }
      
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    // Note: Don't hash password manually - User model's pre-save hook will hash it
    const admin = new User({
      email: adminEmail,
      password: adminPassword, // Will be hashed by pre-save hook
      name: adminName,
      role: 'admin',
      entity_type: 'individual',
      kyc_status: 'verified',
      kyc_verified_at: new Date(),
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📧 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();

