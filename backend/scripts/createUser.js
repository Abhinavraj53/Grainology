// Script to create a user (admin, customer, farmer, trader, etc.)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createUser = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology');
    console.log('✅ Connected to MongoDB');

    // Get user details from command line arguments or use defaults
    const email = process.argv[2] || process.env.USER_EMAIL || 'user@grainology.com';
    const password = process.argv[3] || process.env.USER_PASSWORD || 'password123';
    const name = process.argv[4] || process.env.USER_NAME || 'User';
    const role = process.argv[5] || process.env.USER_ROLE || 'farmer';
    const entityType = process.argv[6] || process.env.USER_ENTITY_TYPE || 'individual';

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('⚠️  User already exists!');
      console.log(`   Email: ${email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Name: ${existingUser.name}`);
      
      // Update password if provided
      if (process.argv[3] || process.env.USER_PASSWORD) {
        existingUser.password = password; // Will be hashed by pre-save hook
        await existingUser.save();
        console.log('✅ User password updated');
      }
      
      await mongoose.disconnect();
      return;
    }

    // Create user
    // Note: Don't hash password manually - User model's pre-save hook will hash it
    const user = new User({
      email,
      password, // Will be hashed by pre-save hook
      name,
      role,
      entity_type: entityType,
      kyc_status: 'not_started'
    });

    await user.save();
    console.log('✅ User created successfully!');
    console.log('');
    console.log('📧 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: ${role}`);
    console.log(`   Entity Type: ${entityType}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  }
};

createUser();

