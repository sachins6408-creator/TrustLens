const mongoose = require('mongoose');

const websiteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Website name is required'],
      trim: true
    },
    domain: {
      type: String,
      required: [true, 'Website domain is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Website category is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    trustCategory: {
      type: String,
      enum: ['Trusted', 'Moderately Trusted', 'Risky', 'Not Rated Yet'],
      default: 'Not Rated Yet'
    },
    // Parameter ratings breakdown (1 to 5 scale, average of submitted reviews)
    parameterRatings: {
      productQuality: { type: Number, default: 0 },
      deliveryPerformance: { type: Number, default: 0 },
      customerSupport: { type: Number, default: 0 },
      paymentSecurity: { type: Number, default: 0 },
      refundProcess: { type: Number, default: 0 },
      websiteUsability: { type: Number, default: 0 },
      pricingTransparency: { type: Number, default: 0 },
      informationAccuracy: { type: Number, default: 0 },
      privacyDataHandling: { type: Number, default: 0 }
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const Website = mongoose.model('Website', websiteSchema);
module.exports = Website;
