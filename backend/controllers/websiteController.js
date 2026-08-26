const mongoose = require('mongoose');
const Website = require('../models/Website');
const Review = require('../models/Review');

// @desc    Search and list websites by name/domain and/or category
// @route   GET /api/websites
// @access  Public
const getWebsites = async (req, res, next) => {
  try {
    const { query, category } = req.query;
    let filter = {};

    // Search filter by website name or domain (case-insensitive regex)
    if (query && query.trim() !== '') {
      const searchRegex = new RegExp(query.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { domain: searchRegex }
      ];
    }

    // Category filter
    if (category && category.trim() !== '' && category.trim() !== 'All') {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    const websites = await Website.find(filter).sort({ trustScore: -1, name: 1 });

    return res.status(200).json({
      success: true,
      count: websites.length,
      websites
    });

  } catch (error) {
    console.error('[Get Websites Error]:', error.message);
    next(error); 
  }
};

// @desc    Get single website by ID with associated reviews
// @route   GET /api/websites/:id
// @access  Public
const getWebsiteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Invalid website ID' });
    }

    const website = await Website.findById(id);
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found' });
    }

    // Retrieve associated user reviews
    const reviews = await Review.find({ website: id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      website,
      reviews
    });

  } catch (error) {
    console.error('[Get Website By ID Error]:', error.message);
    next(error);
  }
};

// @desc    Get list of unique categories available in database
// @route   GET /api/websites/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Website.distinct('category');
    return res.status(200).json({
      success: true,
      categories: categories.sort()
    });
  } catch (error) {
    console.error('[Get Categories Error]:', error.message);
    next(error);
  }
};

module.exports = { getWebsites, getWebsiteById, getCategories };
