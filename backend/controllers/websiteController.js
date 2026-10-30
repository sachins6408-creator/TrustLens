const mongoose = require('mongoose');
const Website = require('../models/Website');
const Review = require('../models/Review');
const SearchHistory = require('../models/SearchHistory');

// @desc    Search and list websites by name/domain and/or category & status
// @route   GET /api/websites
// @access  Public (filtered by active) / Admin (supports ?status=all|pending|active|rejected)
const getWebsites = async (req, res, next) => {
  try {
    const { query, category, status } = req.query;
    let filter = {};

    // 1. Status Filter
    if (status) {
      const lowerStatus = status.toLowerCase();
      if (lowerStatus === 'all') {
        // No status filter applied, return all websites
      } else if (lowerStatus === 'suspicious' || lowerStatus === 'pending' || lowerStatus === 'new_request' || lowerStatus === 'new website request') {
        filter.status = { $in: ['suspicious', 'Suspicious', 'pending', 'Pending', 'new_request', 'New Website Request'] };
      } else if (lowerStatus === 'flagged') {
        filter.status = { $in: ['flagged', 'Flagged'] };
      } else if (lowerStatus === 'rejected') {
        filter.status = { $in: ['rejected', 'Rejected'] };
      } else if (lowerStatus === 'active') {
        filter.status = { $in: ['active', 'Active'] };
      } else {
        filter.status = new RegExp(`^${status}$`, 'i');
      }
    } else {
      // Default public search behavior: ONLY display active websites
      filter.status = { $in: ['active', 'Active'] };
    }

    // 2. Search filter by website name or domain (case-insensitive regex)
    if (query && query.trim() !== '') {
      const searchRegex = new RegExp(query.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { domain: searchRegex }
      ];
    }

    // 3. Category filter
    if (category && category.trim() !== '' && category.trim() !== 'All') {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    const websites = await Website.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1, trustScore: -1, name: 1 });

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

    const website = await Website.findById(id).populate('createdBy', 'name email');
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

// @desc    Get list of unique categories available in database (active websites)
// @route   GET /api/websites/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Website.distinct('category', {
      status: { $in: ['active', 'Active'] }
    });
    return res.status(200).json({
      success: true,
      categories: categories.sort()
    });
  } catch (error) {
    console.error('[Get Categories Error]:', error.message);
    next(error);
  }
};

// @desc    Add a new website / submit a new website request (User: status="suspicious", Admin: status="active")
// @route   POST /api/websites
// @access  Public / Authenticated
const addWebsite = async (req, res, next) => {
  try {
    const { name, url, domain: explicitDomain, category, description } = req.body;
    const userId = req.user ? req.user._id : null;
    const isAdmin = req.user && req.user.role === 'admin';

    // 1. Validate Website Name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Website name is required'
      });
    }

    // 2. Validate & Extract Domain from URL or Domain input
    const targetUrlInput = url || explicitDomain;
    if (!targetUrlInput || !targetUrlInput.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Website URL is required'
      });
    }

    let rawInput = targetUrlInput.trim().toLowerCase();
    let domain = null;

    try {
      const parsed = rawInput.startsWith('http://') || rawInput.startsWith('https://')
        ? new URL(rawInput)
        : new URL(`https://${rawInput}`);

      let hostname = parsed.hostname.replace(/^www\./, '');
      const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
      if (domainRegex.test(hostname)) {
        domain = hostname;
      }
    } catch (err) {
      domain = null;
    }

    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid website URL (e.g. https://example.com or example.com)'
      });
    }

    // 3. Validate Category
    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Website category is required'
      });
    }

    // 4. Duplicate Check
    const existingSite = await Website.findOne({ domain });
    if (existingSite) {
      const isExistingActive = ['active', 'Active'].includes(existingSite.status);
      return res.status(400).json({
        success: false,
        message: isExistingActive
          ? `Website with domain "${domain}" already exists in the active directory.`
          : `A request for domain "${domain}" has already been submitted and is awaiting admin verification.`
      });
    }

    // 5. Determine Initial Status
    const initialStatus = isAdmin ? 'active' : 'suspicious';

    // 6. Create new Website record
    const website = await Website.create({
      name: name.trim(),
      domain,
      url: targetUrlInput.trim().startsWith('http://') || targetUrlInput.trim().startsWith('https://')
        ? targetUrlInput.trim()
        : `https://${targetUrlInput.trim()}`,
      category: category.trim(),
      description: (description || '').trim() || `Platform request for ${name.trim()}`,
      status: initialStatus,
      createdBy: userId,
      trustScore: 0,
      trustCategory: 'Not Rated Yet',
      totalReviews: 0,
      parameterRatings: {}
    });

    const successMessage = isAdmin
      ? 'Website added and activated successfully.'
      : 'Website request submitted successfully. It has been marked as a new request for administrator verification.';

    return res.status(201).json({
      success: true,
      message: successMessage,
      website
    });

  } catch (error) {
    console.error('[Add Website Error]:', error.message);
    next(error);
  }
};

// @desc    Update website status (Approve: pending/suspicious/new_request -> active, Reject: -> rejected, Flag: -> flagged)
// @route   PATCH /api/websites/:id/status
// @access  Private/Admin
const updateWebsiteStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid website ID' });
    }

    if (!status || !['active', 'pending', 'rejected', 'inactive', 'new_request', 'suspicious', 'flagged'].includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active', 'pending', 'rejected', 'inactive', 'new_request', 'suspicious', or 'flagged'"
      });
    }

    const normalizedStatus = status.toLowerCase();
    const website = await Website.findById(id);

    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found' });
    }

    website.status = normalizedStatus;
    await website.save();

    let actionLabel = 'updated';
    if (normalizedStatus === 'active') actionLabel = 'verified and is now active in TrustLens directory';
    else if (normalizedStatus === 'rejected') actionLabel = 'rejected';
    else if (normalizedStatus === 'flagged') actionLabel = 'flagged';
    else if (normalizedStatus === 'suspicious') actionLabel = 'marked suspicious';

    return res.status(200).json({
      success: true,
      message: `Website "${website.name}" has been ${actionLabel}.`,
      website
    });

  } catch (error) {
    console.error('[Update Website Status Error]:', error.message);
    next(error);
  }
};

// @desc    Delete a website and associated data
// @route   DELETE /api/websites/:id
// @access  Private/Admin
const deleteWebsite = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid website ID' });
    }

    const website = await Website.findById(id);
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found' });
    }

    await Website.findByIdAndDelete(id);

    // Clean up related reviews and search history
    await Promise.all([
      Review.deleteMany({ website: id }),
      SearchHistory.deleteMany({ website: id })
    ]);

    return res.status(200).json({
      success: true,
      message: `Website "${website.name}" and all associated data deleted successfully.`
    });

  } catch (error) {
    console.error('[Delete Website Error]:', error.message);
    next(error);
  }
};

// @desc    Get live database overview statistics (for Database Overview dashboard banner)
// @route   GET /api/websites/overview-stats
// @access  Public
const getDatabaseOverviewStats = async (req, res, next) => {
  try {
    const [
      totalWebsites,
      totalReviews,
      categoryCounts,
      trustDistribution,
      reviewStatusDistribution
    ] = await Promise.all([
      Website.countDocuments(),
      Review.countDocuments(),
      Website.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Website.aggregate([
        { $group: { _id: '$trustCategory', count: { $sum: 1 } } }
      ]),
      Review.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const trustBuckets = {
      trusted: 0,
      moderatelyTrusted: 0,
      risky: 0,
      notRated: 0
    };
    trustDistribution.forEach((t) => {
      if (t._id === 'Trusted') trustBuckets.trusted = t.count;
      else if (t._id === 'Moderately Trusted') trustBuckets.moderatelyTrusted = t.count;
      else if (t._id === 'Risky') trustBuckets.risky = t.count;
      else trustBuckets.notRated += t.count;
    });

    const reviewStatus = {
      approved: 0,
      pending: 0,
      rejected: 0,
      flagged: 0
    };
    reviewStatusDistribution.forEach((r) => {
      if (r._id && reviewStatus[r._id] !== undefined) {
        reviewStatus[r._id] = r.count;
      }
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalWebsites,
        totalReviews,
        categoryStats: categoryCounts.map((c) => ({ category: c._id, count: c.count })),
        trustBuckets,
        reviewStatus
      }
    });
  } catch (error) {
    console.error('[Get Database Overview Stats Error]:', error.message);
    next(error);
  }
};

module.exports = {
  getWebsites,
  getWebsiteById,
  getCategories,
  getDatabaseOverviewStats,
  addWebsite,
  updateWebsiteStatus,
  deleteWebsite
};
