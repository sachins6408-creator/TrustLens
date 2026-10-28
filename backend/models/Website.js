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
    url: {
      type: String,
      trim: true,
      default: ''
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
    status: {
      type: String,
      enum: ['active', 'pending', 'rejected', 'inactive', 'Active', 'Inactive', 'Pending', 'Rejected', 'new_request', 'New Website Request', 'suspicious', 'Suspicious', 'flagged', 'Flagged'],
      default: 'active'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // Dynamic parameter ratings breakdown (1 to 5 scale, average of submitted reviews)
    parameterRatings: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
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
