/**
 * Check database users
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-police-messaging');
    console.log('✅ Connected to MongoDB');
  
    const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}));
  
    const count = await User.countDocuments();
    console.log(`\nTotal users: ${count}`);
  
    if (count > 0) {
      const users = await User.find({}).select('userId name password').limit(5);
      console.log('\nSample users:');
      users.forEach(u => {
        console.log(`  - ${u.userId || 'NO_USERID'}: ${u.name} (password: ${u.password ? 'YES' : 'NO'})`);
      });
    }
  
    // Try to find officer001
    const officer = await User.findOne({userId: 'officer001'});
    if (officer) {
      console.log('\n✅ officer001 found:');
      console.log(`   Name: ${officer.name}`);
      console.log(`   Has password: ${!!officer.password}`);
      console.log(`   Has userId: ${!!officer.userId}`);
    } else {
      console.log('\n❌ officer001 NOT FOUND');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDB();
