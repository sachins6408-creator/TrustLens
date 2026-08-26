const mongoose = require('mongoose');

const ratingFieldSchema = {
  type: Number,
  required: true,
  min: [1, 'Rating must be at least 1'],
  max: [5, 'Rating cannot exceed 5']
};

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    website: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Website ID is required']
    },
    ratings: {
      productQuality: ratingFieldSchema,
      deliveryPerformance: ratingFieldSchema,
      customerSupport: ratingFieldSchema,
      paymentSecurity: ratingFieldSchema,
      refundProcess: ratingFieldSchema,
      websiteUsability: ratingFieldSchema,
      pricingTransparency: ratingFieldSchema,
      informationAccuracy: ratingFieldSchema,
      privacyDataHandling: ratingFieldSchema
    },
    comment: {
      type: String,
      trim: true,
      default: ''
    },
    overallRating: {
      type: Number,
      min: [1, 'Overall rating must be at least 1'],
      max: [5, 'Overall rating cannot exceed 5']
    }
  },
  {
    timestamps: true
  }
);

// Prevent user from submitting multiple reviews for the same website
reviewSchema.index({ website: 1, user: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
