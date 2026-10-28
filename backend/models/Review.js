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
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {}
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
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'approved'
    },
    moderationNote: {
      type: String,
      trim: true,
      default: ''
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    moderatedAt: {
      type: Date,
      default: null
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