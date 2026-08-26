const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Website = require('./models/Website');
const User = require('./models/User');

dotenv.config();

const sampleWebsites = [
  {
    name: 'Amazon India',
    domain: 'amazon.in',
    category: 'E-Commerce',
    description: 'Popular online marketplace for electronics, books, fashion, and home essentials.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet'
  },
  {
    name: 'Flipkart',
    domain: 'flipkart.com',
    category: 'E-Commerce',
    description: 'Major Indian e-commerce platform specializing in consumer electronics and apparel.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet'
  },
  {
    name: 'Myntra',
    domain: 'myntra.com',
    category: 'E-Commerce',
    description: 'Premier online fashion, lifestyle, and beauty shopping destination in India.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet'
  },
  {
    name: 'MakeMyTrip',
    domain: 'makemytrip.com',
    category: 'Travel & Booking',
    description: 'Online travel platform providing flight, hotel, train, and bus ticket reservations.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet'
  },
  {
    name: 'Paytm',
    domain: 'paytm.com',
    category: 'Financial Services',
    description: 'Digital payments, wallet, and financial services platform in India.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet'
  },
  {
    name: 'BookMyShow',
    domain: 'bookmyshow.com',
    category: 'Entertainment',
    description: 'Online ticketing portal for movies, theater plays, sports events, and live concerts.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet'
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trustlens');
    console.log('[Seed]: Connected to MongoDB');

    // 1. Seed Websites
    for (const site of sampleWebsites) {
      await Website.findOneAndUpdate(
        { domain: site.domain },
        { $setOnInsert: site },
        { upsert: true, new: true }
      );
    }
    console.log('[Seed]: Sample websites seeded successfully');

    // 2. Ensure Seed User Exists
    await User.deleteOne({ email: 'saravanavel@example.com' });
    await User.create({
      name: 'Saravanavel P',
      email: 'saravanavel@example.com',
      password: 'password123',
      role: 'user'
    });
    console.log('[Seed]: Created demo account Saravanavel P');

    console.log('[Seed]: Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error.message);
    process.exit(1);
  }
};

seedDB();
