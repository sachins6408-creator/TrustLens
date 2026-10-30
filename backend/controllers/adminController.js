const mongoose = require('mongoose');
const User = require('../models/User');
const Website = require('../models/Website');
const Review = require('../models/Review');
const SearchHistory = require('../models/SearchHistory');
const EvaluationParameter = require('../models/EvaluationParameter');
const { recalculateWebsiteRatings } = require('./reviewController');

// ============================================================
// ADMIN: USERS MANAGEMENT
// ============================================================

// @desc    Get all registered users (with search/filter/role/status)
// @route   GET /api/admin/users
// @access  Private/Admin
const adminGetUsers = async (req, res, next) => {
  try {
    const { search, role, status } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }
    if (role && ['user', 'admin'].includes(role.toLowerCase())) {
      filter.role = role.toLowerCase();
    }
    if (status && ['active', 'inactive'].includes(status.toLowerCase())) {
      filter.status = status.toLowerCase();
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    // Attach activity stats for each user
    const userIds = users.map((u) => u._id);
    const [reviewCounts, websiteCounts, historyCounts] = await Promise.all([
      Review.aggregate([
        { $match: { user: { $in: userIds } } },
        { $group: { _id: '$user', count: { $sum: 1 } } }
      ]),
      Website.aggregate([
        { $match: { createdBy: { $in: userIds } } },
        { $group: { _id: '$createdBy', count: { $sum: 1 } } }
      ]),
      SearchHistory.aggregate([
        { $match: { user: { $in: userIds } } },
        { $group: { _id: '$user', count: { $sum: 1 } } }
      ])
    ]);

    const reviewMap = Object.fromEntries(reviewCounts.map((r) => [r._id.toString(), r.count]));
    const websiteMap = Object.fromEntries(websiteCounts.map((w) => [w._id.toString(), w.count]));
    const historyMap = Object.fromEntries(historyCounts.map((h) => [h._id.toString(), h.count]));

    const enrichedUsers = users.map((u) => ({
      ...u.toObject(),
      activityStats: {
        totalReviews: reviewMap[u._id.toString()] || 0,
        totalWebsitesSubmitted: websiteMap[u._id.toString()] || 0,
        totalSearches: historyMap[u._id.toString()] || 0
      }
    }));

    return res.status(200).json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers
    });
  } catch (error) {
    console.error('[Admin Get Users Error]:', error.message);
    next(error);
  }
};

// @desc    Get single user detail with activity stats
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const adminGetUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [totalReviews, totalWebsitesSubmitted, totalSearches, recentReviews, recentSearches] = await Promise.all([
      Review.countDocuments({ user: id }),
      Website.countDocuments({ createdBy: id }),
      SearchHistory.countDocuments({ user: id }),
      Review.find({ user: id })
        .populate('website', 'name domain category')
        .sort({ createdAt: -1 })
        .limit(10),
      SearchHistory.find({ user: id })
        .populate('website', 'name domain category')
        .sort({ searchedAt: -1 })
        .limit(10)
    ]);

    return res.status(200).json({
      success: true,
      user,
      stats: {
        totalReviews,
        totalWebsitesSubmitted,
        totalSearches
      },
      recentReviews,
      recentSearches
    });
  } catch (error) {
    console.error('[Admin Get User By ID Error]:', error.message);
    next(error);
  }
};

// @desc    Update user account status (Activate / Deactivate)
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
const adminUpdateUserStatus = async (req, res, next) => {
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
    console.error('[Admin Update User Status Error]:', error.message);
    next(error);
  }
};

// @desc    Delete user account and cleanup records
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const adminDeleteUser = async (req, res, next) => {
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

    // Collect websites this user created (to fix their createdBy)
    const userWebsites = await Website.find({ createdBy: id });

    // Capture distinct website IDs from user reviews BEFORE deleting them
    const reviewsDeletedForWebsites = await Review.distinct('website', { user: id });

    await User.findByIdAndDelete(id);

    // Clean up user's reviews and search history
    await Promise.all([
      Review.deleteMany({ user: id }),
      SearchHistory.deleteMany({ user: id })
    ]);

    // Recalculate affected websites after review removal
    const affectedWebsiteIds = new Set(userWebsites.map((w) => w._id.toString()));
    reviewsDeletedForWebsites.forEach((wid) => affectedWebsiteIds.add(wid.toString()));

    for (const wid of affectedWebsiteIds) {
      await recalculateWebsiteRatings(wid).catch(() => {});
    }

    // Nullify createdBy references
    await Website.updateMany({ createdBy: id }, { $set: { createdBy: null } });

    return res.status(200).json({
      success: true,
      message: 'User account and associated records deleted successfully.'
    });
  } catch (error) {
    console.error('[Admin Delete User Error]:', error.message);
    next(error);
  }
};

// ============================================================
// ADMIN: WEBSITES MANAGEMENT
// ============================================================

// @desc    Get all websites with extended admin info
// @route   GET /api/admin/websites
// @access  Private/Admin
const adminGetWebsites = async (req, res, next) => {
  try {
    const { query, category, status, sortBy } = req.query;
    const filter = {};

    if (query && query.trim()) {
      const searchRegex = new RegExp(query.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { domain: searchRegex }];
    }
    if (category && category.trim() && category.trim() !== 'All') {
      filter.category = new RegExp(`^${category.trim()}$`, 'i');
    }
    if (status && status.trim() && status.trim() !== 'all') {
      const lowerStatus = status.toLowerCase();
      if (lowerStatus === 'suspicious' || lowerStatus === 'pending' || lowerStatus === 'new_request' || lowerStatus === 'new website request') {
        filter.status = { $in: ['suspicious', 'Suspicious', 'pending', 'Pending', 'new_request', 'New Website Request'] };
      } else if (lowerStatus === 'flagged') {
        filter.status = { $in: ['flagged', 'Flagged'] };
      } else if (lowerStatus === 'rejected') {
        filter.status = { $in: ['rejected', 'Rejected'] };
      } else if (lowerStatus === 'active') {
        filter.status = { $in: ['active', 'Active'] };
      } else if (lowerStatus === 'inactive') {
        filter.status = { $in: ['inactive', 'Inactive'] };
      } else {
        filter.status = new RegExp(`^${status}$`, 'i');
      }
    }

    const sortOptions = {};
    switch ((sortBy || 'newest').toLowerCase()) {
      case 'oldest': sortOptions.createdAt = 1; break;
      case 'name': sortOptions.name = 1; break;
      case 'trustscore-desc': sortOptions.trustScore = -1; break;
      case 'trustscore-asc': sortOptions.trustScore = 1; break;
      case 'reviews': sortOptions.totalReviews = -1; break;
      default: sortOptions.createdAt = -1;
    }

    const websites = await Website.find(filter)
      .populate('createdBy', 'name email')
      .sort(sortOptions);

    // Attach review counts by status for each website
    const websiteIds = websites.map((w) => w._id);
    const reviewAgg = await Review.aggregate([
      { $match: { website: { $in: websiteIds } } },
      { $group: { _id: '$website', statuses: { $push: '$status' }, count: { $sum: 1 } } }
    ]);
    const reviewMap = {};
    reviewAgg.forEach((r) => {
      reviewMap[r._id.toString()] = {
        total: r.count,
        approved: r.statuses.filter((s) => s === 'approved').length,
        pending: r.statuses.filter((s) => s === 'pending').length,
        rejected: r.statuses.filter((s) => s === 'rejected').length,
        flagged: r.statuses.filter((s) => s === 'flagged').length
      };
    });

    const enrichedWebsites = websites.map((w) => ({
      ...w.toObject(),
      reviewStats: reviewMap[w._id.toString()] || {
        total: 0, approved: 0, pending: 0, rejected: 0, flagged: 0
      }
    }));

    return res.status(200).json({
      success: true,
      count: enrichedWebsites.length,
      websites: enrichedWebsites
    });
  } catch (error) {
    console.error('[Admin Get Websites Error]:', error.message);
    next(error);
  }
};

// @desc    Update website status
// @route   PATCH /api/admin/websites/:id/status
// @access  Private/Admin
const adminUpdateWebsiteStatus = async (req, res, next) => {
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
    if (normalizedStatus === 'active') actionLabel = 'verified and is now active in directory';
    else if (normalizedStatus === 'rejected') actionLabel = 'rejected';
    else if (normalizedStatus === 'flagged') actionLabel = 'flagged';
    else if (normalizedStatus === 'inactive') actionLabel = 'marked inactive';
    else if (normalizedStatus === 'pending' || normalizedStatus === 'new_request' || normalizedStatus === 'suspicious') actionLabel = 'moved to suspicious requests';

    return res.status(200).json({
      success: true,
      message: `Website "${website.name}" has been ${actionLabel}.`,
      website
    });
  } catch (error) {
    console.error('[Admin Update Website Status Error]:', error.message);
    next(error);
  }
};

// @desc    Delete website and associated data
// @route   DELETE /api/admin/websites/:id
// @access  Private/Admin
const adminDeleteWebsite = async (req, res, next) => {
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
    console.error('[Admin Delete Website Error]:', error.message);
    next(error);
  }
};

// ============================================================
// ADMIN: REVIEW MODERATION
// ============================================================

// @desc    Get all reviews and new website requests with moderation info & filters
// @route   GET /api/admin/reviews
// @access  Private/Admin
const adminGetReviews = async (req, res, next) => {
  try {
    const { status, search, websiteId, sortBy } = req.query;
    const filter = {};
    const normalizedStatus = (status || 'all').trim().toLowerCase();

    // Check if status is specifically for website requests
    const isNewRequestFilter = normalizedStatus === 'new_request' || normalizedStatus === 'new_requests' || normalizedStatus === 'new-website-requests' || normalizedStatus === 'suspicious';

    // 1. Filter Reviews
    if (isNewRequestFilter) {
      // Don't fetch reviews when user specifically filters for website requests
      filter._id = null; // matches nothing
    } else if (normalizedStatus !== 'all') {
      filter.status = normalizedStatus;
    }

    // Website filter for reviews
    if (websiteId && mongoose.Types.ObjectId.isValid(websiteId)) {
      filter.website = websiteId;
    }

    // Search: match review comment OR user name via lookup
    let reviewsQuery = Review.find(filter)
      .populate('user', 'name email')
      .populate('website', 'name domain category')
      .populate('moderatedBy', 'name email');

    const sortOptions = {};
    switch ((sortBy || 'newest').toLowerCase()) {
      case 'oldest': sortOptions.createdAt = 1; break;
      case 'rating-desc': sortOptions.overallRating = -1; break;
      case 'rating-asc': sortOptions.overallRating = 1; break;
      default: sortOptions.createdAt = -1;
    }
    reviewsQuery = reviewsQuery.sort(sortOptions);

    let reviews = await reviewsQuery;

    // If search term, filter reviews after populate
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      reviews = reviews.filter(
        (r) =>
          (r.comment || '').toLowerCase().includes(term) ||
          (r.user && r.user.name && r.user.name.toLowerCase().includes(term)) ||
          (r.user && r.user.email && r.user.email.toLowerCase().includes(term)) ||
          (r.website && r.website.name && r.website.name.toLowerCase().includes(term)) ||
          (r.website && r.website.domain && r.website.domain.toLowerCase().includes(term))
      );
    }

    // 2. Fetch New Website Requests (included when filter is 'all', 'pending', or 'suspicious' / 'new_requests')
    let websiteRequests = [];
    if (normalizedStatus === 'all' || normalizedStatus === 'pending' || isNewRequestFilter) {
      let webReqQuery = Website.find({
        status: { $in: ['suspicious', 'Suspicious', 'new_request', 'New Website Request', 'pending', 'Pending'] }
      })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

      websiteRequests = await webReqQuery;

      if (search && search.trim()) {
        const term = search.trim().toLowerCase();
        websiteRequests = websiteRequests.filter(
          (w) =>
            (w.name || '').toLowerCase().includes(term) ||
            (w.domain || '').toLowerCase().includes(term) ||
            (w.category || '').toLowerCase().includes(term) ||
            (w.createdBy && w.createdBy.name && w.createdBy.name.toLowerCase().includes(term)) ||
            (w.createdBy && w.createdBy.email && w.createdBy.email.toLowerCase().includes(term))
        );
      }
    }

    // 3. Compute summary counts
    const [reviewSummaryAgg, newRequestsCount] = await Promise.all([
      Review.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Website.countDocuments({
        status: { $in: ['suspicious', 'Suspicious', 'new_request', 'New Website Request', 'pending', 'Pending'] }
      })
    ]);

    const summaryObj = { pending: 0, approved: 0, rejected: 0, flagged: 0, new_requests: newRequestsCount, suspicious: newRequestsCount };
    reviewSummaryAgg.forEach((s) => {
      if (summaryObj[s._id] !== undefined) summaryObj[s._id] = s.count;
    });
    summaryObj.total = summaryObj.pending + summaryObj.approved + summaryObj.rejected + summaryObj.flagged + newRequestsCount;

    return res.status(200).json({
      success: true,
      count: reviews.length + websiteRequests.length,
      summary: summaryObj,
      reviews,
      websiteRequests
    });
  } catch (error) {
    console.error('[Admin Get Reviews Error]:', error.message);
    next(error);
  }
};

// @desc    Update review moderation status (approve/reject/flag)
// @route   PATCH /api/admin/reviews/:id/status
// @access  Private/Admin
const adminUpdateReviewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, moderationNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid review ID' });
    }
    if (!status || !['pending', 'approved', 'rejected', 'flagged'].includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'pending', 'approved', 'rejected', or 'flagged'"
      });
    }

    const normalizedStatus = status.toLowerCase();
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.status = normalizedStatus;
    review.moderationNote = moderationNote && moderationNote.trim() ? moderationNote.trim() : '';
    review.moderatedBy = req.user._id;
    review.moderatedAt = new Date();
    await review.save();

    // Recalculate website trust scores from approved reviews only
    if (review.website) {
      await recalculateWebsiteRatings(review.website).catch((err) => {
        console.error('[Moderation Recalc Error]:', err.message);
      });
    }

    let actionLabel = 'updated';
    if (normalizedStatus === 'approved') actionLabel = 'approved';
    else if (normalizedStatus === 'rejected') actionLabel = 'rejected';
    else if (normalizedStatus === 'flagged') actionLabel = 'flagged';
    else if (normalizedStatus === 'pending') actionLabel = 'moved to pending';

    return res.status(200).json({
      success: true,
      message: `Review has been ${actionLabel}.`,
      review
    });
  } catch (error) {
    console.error('[Admin Update Review Status Error]:', error.message);
    next(error);
  }
};

// @desc    Delete a review (admin moderation)
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin
const adminDeleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid review ID' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const websiteId = review.website;
    await Review.findByIdAndDelete(id);

    // Recalculate website trust scores
    await recalculateWebsiteRatings(websiteId).catch((err) => {
      console.error('[Admin Delete Review Recalc Error]:', err.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully.'
    });
  } catch (error) {
    console.error('[Admin Delete Review Error]:', error.message);
    next(error);
  }
};

// ============================================================
// ADMIN: ANALYTICS DASHBOARD
// ============================================================

// @desc    Get platform-wide analytics dashboard data
// @route   GET /api/admin/analytics
// @access  Private/Admin
const adminGetAnalytics = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalWebsites, activeWebsites, pendingWebsites, totalReviews,
      approvedReviews, avgTrustScore, categoryStats, reviewStatusDist, weeklyActivity,
      topReviewedWebsites, topRatedWebsites, mostReviewedCategories, evalParamCount, searchCount] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        Website.countDocuments(),
        Website.countDocuments({ status: { $in: ['active', 'Active'] } }),
        Website.countDocuments({ status: { $in: ['pending', 'Pending'] } }),
        Review.countDocuments(),
        Review.countDocuments({ status: 'approved' }),
        Website.aggregate([
          { $match: { trustScore: { $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: '$trustScore' } } }
        ]),
        Website.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Review.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Review.aggregate([
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          { $limit: 30 }
        ]),
        Review.aggregate([
          { $group: { _id: '$website', reviewCount: { $sum: 1 } } },
          { $sort: { reviewCount: -1 } },
          { $limit: 5 }
        ]),
        Website.find({ trustScore: { $gt: 0 } })
          .sort({ trustScore: -1 })
          .select('name domain trustScore trustCategory category')
          .limit(5),
        Review.aggregate([
          { $group: { _id: '$website', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        EvaluationParameter.countDocuments(),
        SearchHistory.countDocuments()
      ]);

    // Resolve website IDs for top-reviewed
    const topReviewedIds = topReviewedWebsites.map((w) => w._id);
    const topReviewedSites = await Website.find({ _id: { $in: topReviewedIds } })
      .select('name domain category trustScore')
      .lean();
    const topReviewedMap = Object.fromEntries(topReviewedSites.map((w) => [w._id.toString(), w]));
    const topReviewedWithInfo = topReviewedWebsites.map((w) => ({
      ...(topReviewedMap[w._id.toString()] || {}),
      reviewCount: w.reviewCount
    }));

    // Resolve review distribution with actual website names
    const mostReviewedCatEntities = await Promise.all(
      mostReviewedCategories.map(async (c) => {
        const site = await Website.findById(c._id).select('name domain category').lean();
        return { website: site || { _id: c._id }, reviewCount: c.count };
      })
    );

    // Trust score distribution buckets
    const trustBuckets = {
      trusted: await Website.countDocuments({ trustCategory: 'Trusted' }),
      moderatelyTrusted: await Website.countDocuments({ trustCategory: 'Moderately Trusted' }),
      risky: await Website.countDocuments({ trustCategory: 'Risky' }),
      notRated: await Website.countDocuments({ trustCategory: 'Not Rated Yet' })
    };

    const reviewStatusObj = { pending: 0, approved: 0, rejected: 0, flagged: 0 };
    reviewStatusDist.forEach((s) => {
      if (reviewStatusObj[s._id] !== undefined) reviewStatusObj[s._id] = s.count;
    });
    reviewStatusObj.total = Object.values(reviewStatusObj).reduce((a, b) => a + b, 0);

    return res.status(200).json({
      success: true,
      metrics: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalWebsites,
        activeWebsites,
        pendingWebsites,
        rejectedWebsites: await Website.countDocuments({ status: { $in: ['rejected', 'Rejected'] } }),
        totalReviews,
        approvedReviews,
        pendingReviews: reviewStatusObj.pending,
        rejectedReviews: reviewStatusObj.rejected,
        flaggedReviews: reviewStatusObj.flagged,
        avgTrustScore: avgTrustScore.length ? Number(avgTrustScore[0].avg.toFixed(1)) : 0,
        totalCategories: evalParamCount,
        totalSearches: searchCount
      },
      categoryStats,
      reviewStatus: reviewStatusObj,
      weeklyActivity,
      topReviewedWebsites: topReviewedWithInfo,
      topRatedWebsites: topRatedWebsites.map((w) => ({
        name: w.name,
        domain: w.domain,
        trustScore: w.trustScore,
        trustCategory: w.trustCategory,
        category: w.category
      })),
      mostReviewedCategories: mostReviewedCatEntities,
      trustBuckets
    });
  } catch (error) {
    console.error('[Admin Get Analytics Error]:', error.message);
    next(error);
  }
};

// ============================================================
// ADMIN: REPORTS
// ============================================================

// @desc    Generate report data
// @route   GET /api/admin/reports/:type
// @access  Private/Admin
const adminGenerateReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    const validTypes = ['users', 'websites', 'reviews', 'trust-scores'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Report type must be one of: ${validTypes.join(', ')}`
      });
    }

    const generatedAt = new Date().toISOString();

    switch (type) {
      case 'users': {
        const users = await User.find().select('-password -__v').lean().sort({ createdAt: -1 });
        return res.status(200).json({
          success: true,
          reportType: type,
          generatedAt,
          count: users.length,
          title: 'User Report',
          data: users.map((u) => ({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            createdAt: u.createdAt
          }))
        });
      }
      case 'websites': {
        const websites = await Website.find()
          .populate('createdBy', 'name email')
          .lean()
          .sort({ createdAt: -1 });
        return res.status(200).json({
          success: true,
          reportType: type,
          generatedAt,
          count: websites.length,
          title: 'Website Report',
          data: websites.map((w) => ({
            id: w._id.toString(),
            name: w.name,
            domain: w.domain,
            category: w.category,
            status: w.status,
            trustScore: w.trustScore,
            trustCategory: w.trustCategory,
            totalReviews: w.totalReviews,
            submittedBy: w.createdBy ? (w.createdBy.name || w.createdBy.email) : 'System',
            createdAt: w.createdAt
          }))
        });
      }
      case 'reviews': {
        const reviews = await Review.find()
          .populate('user', 'name email')
          .populate('website', 'name domain')
          .lean()
          .sort({ createdAt: -1 });
        return res.status(200).json({
          success: true,
          reportType: type,
          generatedAt,
          count: reviews.length,
          title: 'Review Report',
          data: reviews.map((r) => ({
            id: r._id.toString(),
            user: r.user ? r.user.name || r.user.email : 'Deleted User',
            website: r.website ? r.website.name : 'Deleted Website',
            domain: r.website ? r.website.domain : '',
            overallRating: r.overallRating,
            comment: r.comment,
            status: r.status,
            createdAt: r.createdAt
          }))
        });
      }
      case 'trust-scores': {
        const websites = await Website.find().lean().sort({ trustScore: -1 });
        const rated = websites.filter((w) => w.trustScore > 0);
        const avg = rated.length
          ? Number((rated.reduce((s, w) => s + w.trustScore, 0) / rated.length).toFixed(1))
          : 0;

        return res.status(200).json({
          success: true,
          reportType: type,
          generatedAt,
          count: websites.length,
          title: 'Trust Score Report',
          summary: {
            averageTrustScore: avg,
            ratedWebsites: rated.length,
            trusted: websites.filter((w) => w.trustCategory === 'Trusted').length,
            moderatelyTrusted: websites.filter((w) => w.trustCategory === 'Moderately Trusted').length,
            risky: websites.filter((w) => w.trustCategory === 'Risky').length,
            notRated: websites.filter((w) => w.trustCategory === 'Not Rated Yet').length
          },
          data: websites.map((w) => ({
            id: w._id.toString(),
            name: w.name,
            domain: w.domain,
            category: w.category,
            trustScore: w.trustScore,
            trustCategory: w.trustCategory,
            totalReviews: w.totalReviews
          }))
        });
      }
      default:
        return res.status(400).json({ success: false, message: 'Invalid report type' });
    }
  } catch (error) {
    console.error('[Admin Generate Report Error]:', error.message);
    next(error);
  }
};

module.exports = {
  adminGetUsers,
  adminGetUserById,
  adminUpdateUserStatus,
  adminDeleteUser,
  adminGetWebsites,
  adminUpdateWebsiteStatus,
  adminDeleteWebsite,
  adminGetReviews,
  adminUpdateReviewStatus,
  adminDeleteReview,
  adminGetAnalytics,
  adminGenerateReport
};