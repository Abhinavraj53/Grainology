import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

// Demo users data - covering all roles
const demoUsers = [
  // Farmers (Individual)
  {
    email: 'ramesh.kumar@demo.com',
    password: 'password123',
    name: 'Ramesh Kumar',
    mobile_number: '9876543210',
    preferred_language: 'Hindi',
    address_line1: 'Village: Bakrauli',
    address_line2: 'Post: Bakrauli',
    district: 'Buxar',
    state: 'Bihar',
    country: 'India',
    pincode: '802101',
    role: 'farmer',
    entity_type: 'individual',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-01-15')
  },
  {
    email: 'sita.devi@demo.com',
    password: 'password123',
    name: 'Sita Devi',
    mobile_number: '9876543211',
    preferred_language: 'Hindi',
    address_line1: 'Village: Gopalpur',
    district: 'Rohtas',
    state: 'Bihar',
    country: 'India',
    pincode: '802122',
    role: 'farmer',
    entity_type: 'individual',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-02-10')
  },
  {
    email: 'rajesh.yadav@demo.com',
    password: 'password123',
    name: 'Rajesh Yadav',
    mobile_number: '9876543212',
    preferred_language: 'Hindi',
    address_line1: 'Village: Gulabbagh',
    district: 'Buxar',
    state: 'Bihar',
    country: 'India',
    pincode: '802105',
    role: 'farmer',
    entity_type: 'individual',
    kyc_status: 'pending'
  },
  {
    email: 'priya.sharma@demo.com',
    password: 'password123',
    name: 'Priya Sharma',
    mobile_number: '9876543213',
    preferred_language: 'English',
    address_line1: 'Village: Parsauni',
    district: 'Rohtas',
    state: 'Bihar',
    country: 'India',
    pincode: '802118',
    role: 'farmer',
    entity_type: 'individual',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-03-05')
  },
  {
    email: 'amit.singh@demo.com',
    password: 'password123',
    name: 'Amit Singh',
    mobile_number: '9876543214',
    preferred_language: 'Hindi',
    address_line1: 'Village: Mohania',
    district: 'Kaimur',
    state: 'Bihar',
    country: 'India',
    pincode: '821109',
    role: 'farmer',
    entity_type: 'individual',
    kyc_status: 'not_started'
  },
  
  // Traders
  {
    email: 'mohammed.trader@demo.com',
    password: 'password123',
    name: 'Mohammed Ali',
    mobile_number: '9876543220',
    preferred_language: 'Urdu',
    address_line1: 'Shop No. 45, Grain Market',
    address_line2: 'Near Railway Station',
    district: 'Buxar',
    state: 'Bihar',
    country: 'India',
    pincode: '802101',
    role: 'trader',
    entity_type: 'individual',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-01-20')
  },
  {
    email: 'suresh.trading@demo.com',
    password: 'password123',
    name: 'Suresh Trading Company',
    mobile_number: '9876543221',
    preferred_language: 'Hindi',
    address_line1: 'Market Road, Shop No. 12-15',
    district: 'Rohtas',
    state: 'Bihar',
    country: 'India',
    pincode: '802122',
    role: 'trader',
    entity_type: 'company',
    business_name: 'Suresh Trading Company',
    business_type: 'proprietorship',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-02-15')
  },
  {
    email: 'kumar.agri@demo.com',
    password: 'password123',
    name: 'Kumar Agri Traders',
    mobile_number: '9876543222',
    preferred_language: 'Hindi',
    address_line1: 'APMC Market, Stall No. 8',
    district: 'Buxar',
    state: 'Bihar',
    country: 'India',
    pincode: '802101',
    role: 'trader',
    entity_type: 'company',
    business_name: 'Kumar Agri Traders',
    business_type: 'partnership',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-01-25')
  },
  
  // FPOs (Farmer Producer Organizations)
  {
    email: 'buxar.fpo@demo.com',
    password: 'password123',
    name: 'Buxar Farmer Producer Organization',
    mobile_number: '9876543230',
    preferred_language: 'Hindi',
    address_line1: 'FPO Office, Village: Bakrauli',
    district: 'Buxar',
    state: 'Bihar',
    country: 'India',
    pincode: '802101',
    role: 'fpo',
    entity_type: 'company',
    business_name: 'Buxar Farmer Producer Organization',
    business_type: 'llp',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-01-10')
  },
  {
    email: 'rohtas.fpo@demo.com',
    password: 'password123',
    name: 'Rohtas FPO Ltd.',
    mobile_number: '9876543231',
    preferred_language: 'Hindi',
    address_line1: 'FPO Complex, Main Road',
    district: 'Rohtas',
    state: 'Bihar',
    country: 'India',
    pincode: '802122',
    role: 'fpo',
    entity_type: 'company',
    business_name: 'Rohtas FPO Ltd.',
    business_type: 'private_limited',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-02-01')
  },
  {
    email: 'kaimur.fpo@demo.com',
    password: 'password123',
    name: 'Kaimur District FPO',
    mobile_number: '9876543232',
    preferred_language: 'Hindi',
    address_line1: 'FPO Building, Mohania',
    district: 'Kaimur',
    state: 'Bihar',
    country: 'India',
    pincode: '821109',
    role: 'fpo',
    entity_type: 'company',
    business_name: 'Kaimur District FPO',
    business_type: 'llp',
    kyc_status: 'pending'
  },
  
  // Corporate
  {
    email: 'agri.corp@demo.com',
    password: 'password123',
    name: 'AgriCorp India Pvt. Ltd.',
    mobile_number: '9876543240',
    preferred_language: 'English',
    address_line1: 'Corporate Tower, Sector 12',
    address_line2: 'Industrial Area',
    district: 'Patna',
    state: 'Bihar',
    country: 'India',
    pincode: '800012',
    role: 'corporate',
    entity_type: 'company',
    business_name: 'AgriCorp India Pvt. Ltd.',
    business_type: 'private_limited',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-01-05')
  },
  {
    email: 'grain.masters@demo.com',
    password: 'password123',
    name: 'Grain Masters Corporation',
    mobile_number: '9876543241',
    preferred_language: 'English',
    address_line1: 'Business Park, Block A',
    district: 'Patna',
    state: 'Bihar',
    country: 'India',
    pincode: '800013',
    role: 'corporate',
    entity_type: 'company',
    business_name: 'Grain Masters Corporation',
    business_type: 'private_limited',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-01-12')
  },
  {
    email: 'food.ventures@demo.com',
    password: 'password123',
    name: 'Food Ventures India Ltd.',
    mobile_number: '9876543242',
    preferred_language: 'English',
    address_line1: 'Corporate Office, 5th Floor',
    address_line2: 'Business District',
    district: 'Patna',
    state: 'Bihar',
    country: 'India',
    pincode: '800014',
    role: 'corporate',
    entity_type: 'company',
    business_name: 'Food Ventures India Ltd.',
    business_type: 'private_limited',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-02-20')
  },
  
  // Millers/Processors
  {
    email: 'bihar.mills@demo.com',
    password: 'password123',
    name: 'Bihar Rice Mills',
    mobile_number: '9876543250',
    preferred_language: 'Hindi',
    address_line1: 'Industrial Area, Unit No. 15',
    district: 'Buxar',
    state: 'Bihar',
    country: 'India',
    pincode: '802101',
    role: 'miller',
    entity_type: 'company',
    business_name: 'Bihar Rice Mills',
    business_type: 'private_limited',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-01-18')
  },
  {
    email: 'grain.processor@demo.com',
    password: 'password123',
    name: 'Grain Processing Unit',
    mobile_number: '9876543251',
    preferred_language: 'Hindi',
    address_line1: 'Factory: Processing Zone',
    district: 'Rohtas',
    state: 'Bihar',
    country: 'India',
    pincode: '802122',
    role: 'miller',
    entity_type: 'company',
    business_name: 'Grain Processing Unit',
    business_type: 'proprietorship',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-02-05')
  },
  {
    email: 'agro.mills@demo.com',
    password: 'password123',
    name: 'Agro Mills & Processing',
    mobile_number: '9876543252',
    preferred_language: 'Hindi',
    address_line1: 'Milling Complex, Plot No. 22',
    district: 'Kaimur',
    state: 'Bihar',
    country: 'India',
    pincode: '821109',
    role: 'miller',
    entity_type: 'company',
    business_name: 'Agro Mills & Processing',
    business_type: 'partnership',
    kyc_status: 'pending'
  },
  
  // Financers
  {
    email: 'agri.finance@demo.com',
    password: 'password123',
    name: 'Agri Finance Solutions',
    mobile_number: '9876543260',
    preferred_language: 'English',
    address_line1: 'Finance Office, Main Street',
    address_line2: 'Near Bank',
    district: 'Buxar',
    state: 'Bihar',
    country: 'India',
    pincode: '802101',
    role: 'financer',
    entity_type: 'company',
    business_name: 'Agri Finance Solutions',
    business_type: 'private_limited',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-01-22')
  },
  {
    email: 'rural.credit@demo.com',
    password: 'password123',
    name: 'Rural Credit Cooperative',
    mobile_number: '9876543261',
    preferred_language: 'Hindi',
    address_line1: 'Cooperative Building',
    district: 'Rohtas',
    state: 'Bihar',
    country: 'India',
    pincode: '802122',
    role: 'financer',
    entity_type: 'company',
    business_name: 'Rural Credit Cooperative',
    business_type: 'llp',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-02-08')
  },
  {
    email: 'kisan.finance@demo.com',
    password: 'password123',
    name: 'Kisan Finance Ltd.',
    mobile_number: '9876543262',
    preferred_language: 'Hindi',
    address_line1: 'Finance Hub, 3rd Floor',
    district: 'Patna',
    state: 'Bihar',
    country: 'India',
    pincode: '800012',
    role: 'financer',
    entity_type: 'company',
    business_name: 'Kisan Finance Ltd.',
    business_type: 'private_limited',
    kyc_status: 'verified',
    kyc_verified_at: new Date('2024-01-30')
  }
];

async function seedUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology');
    console.log('✅ Connected to MongoDB');

    // Check existing users
    const existingCount = await User.countDocuments();
    console.log(`📊 Found ${existingCount} existing users in database`);

    // Hash passwords
    const hashedUsers = await Promise.all(
      demoUsers.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return {
          ...user,
          password: hashedPassword
        };
      })
    );

    // Insert users (skip duplicates based on email)
    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of hashedUsers) {
      try {
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          console.log(`⏭️  Skipped: ${userData.email} (already exists)`);
          skippedCount++;
        } else {
          const user = new User(userData);
          await user.save();
          console.log(`✅ Created: ${userData.name} (${userData.role}) - ${userData.email}`);
          createdCount++;
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⏭️  Skipped: ${userData.email} (duplicate)`);
          skippedCount++;
        } else {
          console.error(`❌ Error creating ${userData.email}:`, error.message);
        }
      }
    }

    // Summary by role
    console.log('\n📋 Summary by Role:');
    const roleCounts = {};
    for (const user of demoUsers) {
      roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
    }
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role.charAt(0).toUpperCase() + role.slice(1)}: ${count} users`);
    });

    // Final summary
    console.log('\n✅ Seed Complete!');
    console.log(`   Created: ${createdCount} new users`);
    console.log(`   Skipped: ${skippedCount} existing users`);
    console.log(`   Total in DB: ${existingCount + createdCount} users`);
    
    console.log('\n🔑 All demo users have password: password123');
    console.log('💡 You can use any email from the list above to login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();

