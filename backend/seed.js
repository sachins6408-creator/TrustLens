const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Website = require('./models/Website');
const User = require('./models/User');
const EvaluationParameter = require('./models/EvaluationParameter');

dotenv.config();

const sampleParameters = [
  {
    category: 'E-Commerce',
    parameters: [
      'Product Quality',
      'Delivery Experience',
      'Payment Security',
      'Refund & Return Process',
      'Pricing Transparency',
      'Customer Support',
      'Product Information Accuracy'
    ]
  },
  {
    category: 'Travel & Booking',
    parameters: [
      'Booking Experience',
      'Price Transparency',
      'Cancellation Policy',
      'Service Quality',
      'Accommodation/Travel Experience',
      'Customer Support',
      'Payment Reliability'
    ]
  },
  {
    category: 'Travel / Booking',
    parameters: [
      'Booking Experience',
      'Price Transparency',
      'Cancellation Policy',
      'Service Quality',
      'Accommodation/Travel Experience',
      'Customer Support',
      'Payment Reliability'
    ]
  },
  {
    category: 'Financial Services',
    parameters: [
      'Security',
      'Privacy Protection',
      'Transaction Reliability',
      'Fraud Protection',
      'Service Availability',
      'Customer Support',
      'User Experience'
    ]
  },
  {
    category: 'Banking / Finance',
    parameters: [
      'Security',
      'Privacy Protection',
      'Transaction Reliability',
      'Fraud Protection',
      'Service Availability',
      'Customer Support',
      'User Experience'
    ]
  },
  {
    category: 'Entertainment',
    parameters: [
      'Content Quality',
      'Streaming/Service Performance',
      'User Experience',
      'Subscription Management',
      'Content Variety',
      'Application Stability',
      'Customer Support'
    ]
  },
  {
    category: 'Education',
    parameters: [
      'Course Quality',
      'Learning Materials',
      'Instructor Quality',
      'Certification Value',
      'Platform Usability',
      'Student Support',
      'Pricing'
    ]
  },
  {
    category: 'Healthcare',
    parameters: [
      'Service Quality',
      'Data Privacy',
      'Appointment Experience',
      'Professional Reliability',
      'Information Accuracy',
      'Customer Support',
      'Accessibility'
    ]
  },
  {
    category: 'Technology',
    parameters: [
      'Product/Service Reliability',
      'Performance',
      'Security',
      'Compatibility',
      'Innovation',
      'User Experience',
      'Technical Support'
    ]
  },
  {
    category: 'Food & Dining',
    parameters: [
      'Food Quality',
      'Delivery Experience',
      'Order Accuracy',
      'Pricing',
      'Hygiene Standards',
      'Customer Service',
      'App/Website Experience'
    ]
  },
  {
    category: 'Social Media',
    parameters: [
      'Privacy Protection',
      'Security',
      'Content Quality',
      'User Experience',
      'Community Management',
      'Account Control',
      'Platform Reliability'
    ]
  },
  {
    category: 'Other',
    parameters: [
      'Reliability',
      'User Experience',
      'Service Quality',
      'Security',
      'Customer Support',
      'Transparency',
      'Overall Satisfaction'
    ]
  }
];

const sampleWebsites = [
  {
    name: 'Amazon India',
    domain: 'amazon.in',
    category: 'E-Commerce',
    description: 'Popular online marketplace for electronics, books, fashion, and home essentials.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet',
    parameterRatings: {}
  },
  {
    name: 'Flipkart',
    domain: 'flipkart.com',
    category: 'E-Commerce',
    description: 'Major Indian e-commerce platform specializing in consumer electronics and apparel.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet',
    parameterRatings: {}
  },
  {
    name: 'Myntra',
    domain: 'myntra.com',
    category: 'E-Commerce',
    description: 'Premier online fashion, lifestyle, and beauty shopping destination in India.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet',
    parameterRatings: {}
  },
  {
    name: 'MakeMyTrip',
    domain: 'makemytrip.com',
    category: 'Travel & Booking',
    description: 'Online travel platform providing flight, hotel, train, and bus ticket reservations.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet',
    parameterRatings: {}
  },
  {
    name: 'Paytm',
    domain: 'paytm.com',
    category: 'Financial Services',
    description: 'Digital payments, wallet, and financial services platform in India.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet',
    parameterRatings: {}
  },
  {
    name: 'BookMyShow',
    domain: 'bookmyshow.com',
    category: 'Entertainment',
    description: 'Online ticketing portal for movies, theater plays, sports events, and live concerts.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet',
    parameterRatings: {}
  },
  {
    name: 'Coursera',
    domain: 'coursera.org',
    category: 'Education',
    description: 'Global online learning platform offering courses and certifications from top universities.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet',
    parameterRatings: {}
  },
  {
    name: 'Practo',
    domain: 'practo.com',
    category: 'Healthcare',
    description: 'Healthcare platform for online doctor appointments, consultations, and health records.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet',
    parameterRatings: {}
  },
  {
    name: 'Instagram',
    domain: 'instagram.com',
    category: 'Social Media',
    description: 'Photo and video sharing social networking service.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet',
    parameterRatings: {}
  },
  {
    name: 'Swiggy',
    domain: 'swiggy.com',
    category: 'Food & Dining',
    description: 'Online food ordering, restaurant discovery, and delivery platform.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet',
    parameterRatings: {}
  },
  {
    name: 'GitHub',
    domain: 'github.com',
    category: 'Technology',
    description: 'Cloud-based platform for software development and version control using Git.',
    trustScore: 0,
    trustCategory: 'Not Rated Yet',
    parameterRatings: {}
  },
  {
    name: 'Stanford University',
    domain: 'stanford.edu',
    category: 'Education',
    description: 'Leading global research university renowned for academic excellence, innovative research, and world-class faculty.',
    trustScore: 94,
    trustCategory: 'Trusted',
    parameterRatings: {}
  },
  {
    name: 'PSG College of Technology',
    domain: 'psgtech.edu',
    category: 'Education',
    description: 'Premier government-aided autonomous engineering and technology institution in Coimbatore, India, established in 1951.',
    trustScore: 90,
    trustCategory: 'Trusted',
    parameterRatings: {}
  },
  {
    name: 'University of Oxford',
    domain: 'ox.ac.uk',
    category: 'Education',
    description: 'Collegiate research university in Oxford, England, offering world-leading education and academic scholarship.',
    trustScore: 95,
    trustCategory: 'Trusted',
    parameterRatings: {}
  },
  {
    name: 'Global Virtual College',
    domain: 'globalvirtualcollege.com',
    category: 'Education',
    description: 'Online degree and diploma provider with questionable academic accreditation and high student dissatisfaction.',
    trustScore: 42,
    trustCategory: 'Risky',
    parameterRatings: {}
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trustlens');
    console.log('[Seed]: Connected to MongoDB');

    // 1. Seed Dynamic Evaluation Parameters
    // Clear and re-populate EvaluationParameter to remove any stale lists
    await EvaluationParameter.deleteMany({});
    for (const paramConfig of sampleParameters) {
      await EvaluationParameter.create(paramConfig);
    }
    console.log('[Seed]: Category evaluation parameters seeded successfully');

    // 2. Seed Websites
    for (const site of sampleWebsites) {
      await Website.findOneAndUpdate(
        { domain: site.domain },
        {
          $set: {
            ...site,
            status: 'active',
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true, new: true }
      );
    }
    await Website.updateMany(
      { createdAt: { $exists: false } },
      { $set: { createdAt: new Date(), updatedAt: new Date() } }
    );
    console.log('[Seed]: Sample websites seeded successfully');

    // 3. Ensure Seed User and Admin Exist
    await User.deleteOne({ email: 'saravanavel@example.com' });
    await User.create({
      name: 'Saravanavel P',
      email: 'saravanavel@example.com',
      password: 'password123',
      role: 'user'
    });
    console.log('[Seed]: Created demo account Saravanavel P');

    await User.deleteOne({ email: 'admin@trustlens.com' });
    await User.create({
      name: 'System Admin',
      email: 'admin@trustlens.com',
      password: 'adminpassword123',
      role: 'admin'
    });
    console.log('[Seed]: Created demo admin account admin@trustlens.com');

    console.log('[Seed]: Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error.message);
    process.exit(1);
  }
};

seedDB();
