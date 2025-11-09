/**
 * Database Seeder - Preload 15 Police Contacts
 * Run automatically on server start if User collection is empty
 */

const User = require('../models/User');

const policeContacts = [
  {
    userId: 'officer001',
    password: 'Police@123', // Will be hashed by model pre-save hook
    badgeNo: 'TN1001',
    name: 'Inspector Rajesh Kumar',
    rank: 'Inspector',
    department: 'Cyber Crime',
    policeStation: 'Chennai Central Police Station',
    posting: 'Cyber Crime Investigation Wing',
    phoneNumber: '+919876543201',
    role: 'officer',
    registrationId: 1001,
  },
  {
    userId: 'officer002',
    password: 'Police@123',
    badgeNo: 'TN1002',
    name: 'Sub-Inspector Priya Sharma',
    rank: 'Sub-Inspector',
    department: 'Traffic',
    policeStation: 'Chennai Traffic Police Headquarters',
    posting: 'Traffic Management Division',
    phoneNumber: '+919876543202',
    role: 'officer',
    registrationId: 1002,
  },
  {
    userId: 'officer003',
    password: 'Police@123',
    badgeNo: 'TN1003',
    name: 'Constable Arun Vijay',
    rank: 'Constable',
    department: 'Patrol',
    policeStation: 'Coimbatore City Police Station',
    posting: 'Night Patrol Unit',
    phoneNumber: '+919876543203',
    role: 'officer',
    registrationId: 1003,
  },
  {
    userId: 'officer004',
    password: 'Police@123',
    badgeNo: 'TN1004',
    name: 'Head Constable Meena Devi',
    rank: 'Head Constable',
    department: 'Women Safety',
    policeStation: 'Madurai District Police Station',
    posting: 'Women Protection Cell',
    phoneNumber: '+919876543204',
    role: 'officer',
    registrationId: 1004,
  },
  {
    userId: 'officer005',
    password: 'Police@123',
    badgeNo: 'TN1005',
    name: 'Inspector Suresh Babu',
    rank: 'Inspector',
    department: 'Crime Branch',
    policeStation: 'Trichy Junction Police Station',
    posting: 'Crime Investigation Division',
    phoneNumber: '+919876543205',
    role: 'officer',
    registrationId: 1005,
  },
  {
    userId: 'officer006',
    password: 'Police@123',
    badgeNo: 'TN1006',
    name: 'Sub-Inspector Lakshmi Iyer',
    rank: 'Sub-Inspector',
    department: 'Anti-Narcotics',
    policeStation: 'Salem Town Police Station',
    posting: 'Narcotics Control Bureau',
    phoneNumber: '+919876543206',
    role: 'officer',
    registrationId: 1006,
  },
  {
    userId: 'officer007',
    password: 'Police@123',
    badgeNo: 'TN1007',
    name: 'Constable Venkatesh Rao',
    rank: 'Constable',
    department: 'Control Room',
    policeStation: 'Tirunelveli Police Station',
    posting: 'Emergency Response Unit',
    phoneNumber: '+919876543207',
    role: 'officer',
    registrationId: 1007,
  },
  {
    userId: 'officer008',
    password: 'Police@123',
    badgeNo: 'TN1008',
    name: 'Inspector Deepa Menon',
    rank: 'Inspector',
    department: 'Special Branch',
    policeStation: 'Vellore Fort Police Station',
    posting: 'Intelligence and Surveillance',
    phoneNumber: '+919876543208',
    role: 'officer',
    registrationId: 1008,
  },
  {
    userId: 'officer009',
    password: 'Police@123',
    badgeNo: 'TN1009',
    name: 'Sub-Inspector Karthik Reddy',
    rank: 'Sub-Inspector',
    department: 'Economic Offences',
    policeStation: 'Erode Main Police Station',
    posting: 'Economic Offences Wing',
    phoneNumber: '+919876543209',
    role: 'officer',
    registrationId: 1009,
  },
  {
    userId: 'officer010',
    password: 'Police@123',
    badgeNo: 'TN1010',
    name: 'Constable Anjali Nair',
    rank: 'Constable',
    department: 'Law & Order',
    policeStation: 'Thanjavur Police Station',
    posting: 'Law and Order Division',
    phoneNumber: '+919876543210',
    role: 'officer',
    registrationId: 1010,
  },
  {
    userId: 'officer011',
    password: 'Police@123',
    badgeNo: 'TN1011',
    name: 'Inspector Mohammed Ali',
    rank: 'Inspector',
    department: 'Intelligence',
    policeStation: 'Kancheepuram Police Station',
    posting: 'Intelligence Bureau',
    phoneNumber: '+919876543211',
    role: 'officer',
    registrationId: 1011,
  },
  {
    userId: 'officer012',
    password: 'Police@123',
    badgeNo: 'TN1012',
    name: 'Sub-Inspector Kavitha Ramesh',
    rank: 'Sub-Inspector',
    department: 'Missing Persons',
    policeStation: 'Chennai T Nagar Police Station',
    posting: 'Missing Persons Bureau',
    phoneNumber: '+919876543212',
    role: 'officer',
    registrationId: 1012,
  },
  {
    userId: 'officer013',
    password: 'Police@123',
    badgeNo: 'TN1013',
    name: 'Constable Ramesh Kumar',
    rank: 'Constable',
    department: 'Traffic',
    policeStation: 'Coimbatore Gandhipuram Police Station',
    posting: 'Traffic Signal Management',
    phoneNumber: '+919876543213',
    role: 'officer',
    registrationId: 1013,
  },
  {
    userId: 'officer014',
    password: 'Police@123',
    badgeNo: 'TN1014',
    name: 'Head Constable Sunita Das',
    rank: 'Head Constable',
    department: 'Community Policing',
    policeStation: 'Madurai Anna Nagar Police Station',
    posting: 'Community Relations Division',
    phoneNumber: '+919876543214',
    role: 'officer',
    registrationId: 1014,
  },
  {
    userId: 'admin',
    password: 'Police@123',
    badgeNo: 'TN1015',
    name: 'Superintendent Arjun Singh',
    rank: 'Superintendent',
    department: 'Administration',
    policeStation: 'Tamil Nadu Police Headquarters',
    posting: 'Administrative Services',
    phoneNumber: '+919876543215',
    role: 'admin',
    registrationId: 1015,
  },
];

/**
 * Seed police contacts into database
 * Only runs if User collection is empty
 */
async function seedContacts() {
  try {
    // Check if users already exist
    const count = await User.countDocuments();
    if (count > 0) {
      console.log(`ℹ️  Database already has ${count} users. Skipping seed.`);
      return;
    }

    console.log('🌱 Seeding 15 police contacts...');

    // Insert contacts one by one to trigger pre-save hooks for password hashing
    for (const contact of policeContacts) {
      const user = new User(contact);
      await user.save(); // This triggers the pre-save hook
    }

    console.log('✅ Successfully seeded 15 police contacts');
    console.log('📋 Default credentials: userId="officer001" to "officer014" or "admin", password="Police@123"');
    console.log('👮 All passwords are bcrypt hashed');
  } catch (error) {
    console.error('❌ Error seeding contacts:', error);
    throw error;
  }
}

module.exports = { seedContacts };
