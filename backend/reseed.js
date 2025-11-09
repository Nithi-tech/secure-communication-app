/**
 * Reseed database with hashed passwords
 */

require('dotenv').config();
const mongoose = require('mongoose');
const {seedContacts} = require('./src/utils/seedContacts');

async function reseed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-police-messaging');
    console.log('✅ Connected to MongoDB');

    // Delete all existing users
    const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}));
    const deleted = await User.deleteMany({});
    console.log(`✅ Deleted ${deleted.deletedCount} users`);

    // Reseed with hashed passwords
    await seedContacts();
    
    console.log('✅ Database reseeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

reseed();
