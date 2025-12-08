// Test MongoDB Connection
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔌 Testing MongoDB connection...');
    console.log('📍 Connection URI:', process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@') || 'Not set');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology');

    console.log('✅ Successfully connected to MongoDB!');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🖥️  Host:', mongoose.connection.host);
    console.log('🔌 Port:', mongoose.connection.port);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Collections in database:');
    if (collections.length > 0) {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    } else {
      console.log('   (No collections yet - database is empty)');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed!');
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check your MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for testing)');
    console.error('   2. Verify your connection string in backend/.env');
    console.error('   3. Ensure your MongoDB cluster is running');
    console.error('   4. Check your network connection');
    process.exit(1);
  }
};

testConnection();

