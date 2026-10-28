const mongoose = require('mongoose');
const User = require('../models/User');
const Review = require('../models/Review');
const Website = require('../models/Website');
const SearchHistory = require('../models/SearchHistory');

// @desc    Get all registered users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('[Get Users Error]:', error.message);
    next(error);
  }
};

// @desc    Get single user details with stats (Admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [totalReviews, totalWebsitesSubmitted] = await Promise.all([
      Review.countDocuments({ user: id }),
      Website.countDocuments({ createdBy: id })
    ]);

    return res.status(200).json({
      success: true,
      user,
      stats: {
        totalReviews,
        totalWebsitesSubmitted
      }
    });
  } catch (error) {
    console.error('[Get User By ID Error]:', error.message);
    next(error);
  }
};

// @desc    Update user account status (Activate / Deactivate) (Admin only)
// @route   PATCH /api/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!status || !['active', 'inactive'].includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'active' or 'inactive'"
      });
    }

    const normalizedStatus = status.toLowerCase();

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === id.toString() && normalizedStatus === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own admin account.'
      });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = normalizedStatus;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User account successfully ${normalizedStatus === 'active' ? 'activated' : 'deactivated'}.`,
      user
    });
  } catch (error) {
    console.error('[Update User Status Error]:', error.message);
    next(error);
  }
};

// @desc    Delete user account (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account.'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndDelete(id);

    // Clean up user's reviews and search history
    await Promise.all([
      Review.deleteMany({ user: id }),
      SearchHistory.deleteMany({ user: id })
    ]);

    return res.status(200).json({
      success: true,
      message: 'User account and associated records deleted successfully.'
    });
  } catch (error) {
    console.error('[Delete User Error]:', error.message);
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser
};
