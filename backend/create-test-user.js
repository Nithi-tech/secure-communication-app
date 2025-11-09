/**
 * Create Test User
 * Run this script to create a test user for development
 */

const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  badgeNo: String,
  name: String,
  rank: String,
  department: String,
  phoneNumber: String,
  status: String,
  createdAt: Date,
});

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-police-messaging', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existing = await User.findOne({phoneNumber: '+1234567890'});
    if (existing) {
      console.log('✅ Test user already exists');
      console.log('Badge Number:', existing.badgeNo);
      console.log('Phone Number:', existing.phoneNumber);
      process.exit(0);
    }

    // Create test user
    const testUser = new User({
      badgeNo: 'P12345',
      name: 'Test Officer',
      rank: 'Inspector',
      department: 'Cyber Crime',
      phoneNumber: '+1234567890',
      status: 'active',
      createdAt: new Date(),
    });

    await testUser.save();
    console.log('✅ Test user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Badge Number: P12345');
    console.log('  Phone Number: +1234567890');
    console.log('');
    console.log('After requesting OTP, check the backend terminal for the code.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();
