const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema(
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
    searchedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Upsert strategy index per user and website
searchHistorySchema.index({ user: 1, website: 1 }, { unique: true });

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);
module.exports = SearchHistory;
