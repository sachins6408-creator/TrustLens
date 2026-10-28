const Website = require('../models/Website');

/**
 * @desc    Get recommended websites from the entire database, ranked by Trust Score
 * @route   GET /api/websites/recommendations?category=All&limit=12
 * @access  Private (Requires valid JWT)
 */
const getRecommendations = async (req, res, next) => {
  try {
    const { category, limit } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);

    // 1. Filter only valid, active websites from existing data model
    const filter = {
      status: { $in: ['active', 'Active'] }
    };

    let activeCategory = 'All Categories';

    // 2. Apply category filter if selected and not "All" / "All Categories"
    if (
      category &&
      category.trim() !== '' &&
      category.trim() !== 'All' &&
      category.trim() !== 'All Categories'
    ) {
      const trimmedCategory = category.trim();
      const escapedCategory = trimmedCategory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      filter.category = new RegExp(`^${escapedCategory}$`, 'i');
      activeCategory = trimmedCategory;
    }

    // 3. Rank eligible websites by existing Trust Scores in descending order (database-side sort)
    const websites = await Website.find(filter)
      .select('name domain url category trustScore trustCategory description totalReviews status createdAt')
      .sort({ trustScore: -1, totalReviews: -1, name: 1 })
      .limit(limitNum)
      .lean();

    // Map clean response items
    const recommendations = websites.map((site) => ({
      _id: site._id,
      name: site.name,
      domain: site.domain,
      url: site.url || (site.domain ? `https://${site.domain}` : ''),
      category: site.category,
      trustScore: typeof site.trustScore === 'number' ? site.trustScore : 0,
      trustCategory: site.trustCategory || 'Not Rated Yet',
      description: site.description || `Registered platform in ${site.category}.`,
      totalReviews: site.totalReviews || 0
    }));

    return res.status(200).json({
      success: true,
      category: activeCategory,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    console.error('[Get Recommendations Error]:', error.message);
    next(error);
  }
};

module.exports = {
  getRecommendations
};
