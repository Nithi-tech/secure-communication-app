/**
 * Database Migration Script
 * Drops existing users and reseeds with updated schema
 * Run this once after updating the User model
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_police_messaging', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Drop users collection to reseed with new fields
    console.log('🗑️  Dropping existing users collection...');
    try {
      await mongoose.connection.db.dropCollection('users');
      console.log('✅ Users collection dropped');
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log('ℹ️  Users collection does not exist, skipping drop');
      } else {
        throw error;
      }
    }

    // Import and run seeder
    console.log('🌱 Seeding database with updated user data...');
    const { seedContacts } = require('./src/utils/seedContacts');
    await seedContacts();

    console.log('\n✅ Migration completed successfully!');
    console.log('📋 15 police officers seeded with policeStation and posting fields');
    console.log('🔐 Login credentials: userId="officer001" to "admin", password="Police@123"');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
