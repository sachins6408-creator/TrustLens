const mongoose = require('mongoose');
const SearchHistory = require('../models/SearchHistory');
const Website = require('../models/Website');

// @desc    Get logged in user's search history
// @route   GET /api/history
// @access  Private (Requires JWT)
const getHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const history = await SearchHistory.find({ user: userId })
      .populate('website', 'name domain category trustScore trustCategory description')
      .sort({ searchedAt: -1 });

    return res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('[Get History Error]:', error.message);
    next(error);
  }
};

// @desc    Add or update a search history entry for the logged-in user
// @route   POST /api/history
// @access  Private (Requires JWT)
const addHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { websiteId } = req.body;

    if (!websiteId || !mongoose.Types.ObjectId.isValid(websiteId)) {
      return res.status(400).json({ success: false, message: 'Valid Website ID is required' });
    }

    const website = await Website.findById(websiteId);
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found' });
    }

    // Upsert entry: if user already accessed website, update searchedAt timestamp
    const historyItem = await SearchHistory.findOneAndUpdate(
      { user: userId, website: websiteId },
      { searchedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('website', 'name domain category trustScore trustCategory description');

    return res.status(200).json({
      success: true,
      message: 'Search history recorded.',
      historyItem
    });
  } catch (error) {
    console.error('[Add History Error]:', error.message);
    next(error);
  }
};

// @desc    Delete a search history entry by ID
// @route   DELETE /api/history/:id
// @access  Private (Requires JWT)
const deleteHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Valid History ID is required' });
    }

    const historyItem = await SearchHistory.findOne({ _id: id, user: userId });
    if (!historyItem) {
      return res.status(404).json({ success: false, message: 'History record not found' });
    }

    await SearchHistory.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Search history record removed.'
    });
  } catch (error) {
    console.error('[Delete History Error]:', error.message);
    next(error);
  }
};

module.exports = {
  getHistory,
  addHistory,
  deleteHistory
};
