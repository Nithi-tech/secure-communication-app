/**
 * Test login directly
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-police-messaging');
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}));
    
    const user = await User.findOne({userId: 'officer001'});
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('\nUser found:');
    console.log('  userId:', user.userId);
    console.log('  name:', user.name);
    console.log('  password hash:', user.password.substring(0, 20) + '...');

    // Test password comparison
    const testPassword = 'Police@123';
    console.log(`\nTesting password: "${testPassword}"`);
    
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`Password match: ${isMatch ? '✅ YES' : '❌ NO'}`);

    if (!isMatch) {
      // Try to verify the hash was created correctly
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('\nNew hash created:', newHash.substring(0, 20) + '...');
      const newMatch = await bcrypt.compare(testPassword, newHash);
      console.log('New hash matches:', newMatch ? '✅ YES' : '❌ NO');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();
