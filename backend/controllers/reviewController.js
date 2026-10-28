const mongoose = require('mongoose');
const Review = require('../models/Review');
const Website = require('../models/Website');
const EvaluationParameter = require('../models/EvaluationParameter');
const { findDefaultParametersForCategory } = require('./evaluationParameterController');

// Helper to get parameters for a category
const getCategoryParameters = async (category) => {
  if (!category) return findDefaultParametersForCategory('Other').parameters;

  try {
    const escaped = category.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const record = await EvaluationParameter.findOne({
      category: new RegExp(`^${escaped}$`, 'i')
    });

    if (record && record.parameters && record.parameters.length > 0) {
      return record.parameters;
    }
  } catch (err) {
    console.error('[Get Category Parameters Error]:', err.message);
  }

  return findDefaultParametersForCategory(category).parameters;
};

// Shared: Recalculate website parameterRatings & totalReviews (approved reviews only)
const recalculateWebsiteRatings = async (websiteId) => {
  const website = await Website.findById(websiteId);
  if (!website) return null;

  const categoryParams = await getCategoryParameters(website.category);
  const approvedReviews = await Review.find({ website: websiteId, status: { $in: ['approved'] } });

  const updatedParameterRatings = {};
  const allParamKeys = new Set([...categoryParams]);
  approvedReviews.forEach((r) => {
    if (r.ratings) {
      if (r.ratings instanceof Map) {
        for (const key of r.ratings.keys()) allParamKeys.add(key);
      } else if (typeof r.ratings === 'object') {
        for (const key of Object.keys(r.ratings)) allParamKeys.add(key);
      }
    }
  });

  allParamKeys.forEach((param) => {
    let sum = 0;
    let count = 0;
    approvedReviews.forEach((r) => {
      let val = 0;
      if (r.ratings instanceof Map) {
        val = r.ratings.get(param) || 0;
      } else if (r.ratings && typeof r.ratings === 'object') {
        val = r.ratings[param] || 0;
      }
      if (val >= 1) {
        sum += val;
        count += 1;
      }
    });

    updatedParameterRatings[param] = count > 0 ? Number((sum / count).toFixed(1)) : 0;
  });

  // Normalize to 0-100 trust score from parameter averages (if any rated)
  const ratedParams = Object.values(updatedParameterRatings).filter((v) => v > 0);
  if (ratedParams.length > 0) {
    const avgParamScore = ratedParams.reduce((s, v) => s + v, 0) / ratedParams.length; // 1-5
    website.trustScore = Number(((avgParamScore / 5) * 100).toFixed(0));
    if (website.trustScore >= 80) website.trustCategory = 'Trusted';
    else if (website.trustScore >= 50) website.trustCategory = 'Moderately Trusted';
    else if (website.trustScore >= 1) website.trustCategory = 'Risky';
    else website.trustCategory = 'Not Rated Yet';
  } else {
    website.trustScore = 0;
    website.trustCategory = 'Not Rated Yet';
  }

  website.parameterRatings = updatedParameterRatings;
  website.totalReviews = approvedReviews.length;
  await website.save();
  return website;
};

// @desc    Submit or update a review for a website
// @route   POST /api/reviews
// @access  Private (Requires JWT)
const createReview = async (req, res, next) => {
  try {
    const { websiteId, ratings: incomingRatings, comment, review: commentAlias } = req.body;
    const userId = req.user._id;

    // 1. Validate Website ID
    if (!websiteId || !mongoose.Types.ObjectId.isValid(websiteId)) {
      return res.status(400).json({ success: false, message: 'Valid Website ID is required' });
    }

    const website = await Website.findById(websiteId);
    if (!website) {
      return res.status(404).json({ success: false, message: 'Target website not found' });
    }

    // 2. Fetch Dynamic Parameters for Website Category
    const categoryParams = await getCategoryParameters(website.category);

    // Normalize ratings from incoming ratings object or top-level fields
    const normalizedRatings = {};
    const unratedParams = [];

    // Check each expected dynamic parameter
    categoryParams.forEach((param) => {
      let score = 0;

      if (incomingRatings && typeof incomingRatings === 'object') {
        if (incomingRatings[param] !== undefined) {
          score = Number(incomingRatings[param]);
        } else {
          // Check lowerCamelCase or stripped alias
          const altKey = param.replace(/[^a-zA-Z0-9]/g, '');
          for (const key of Object.keys(incomingRatings)) {
            if (key.toLowerCase() === param.toLowerCase() || key.toLowerCase() === altKey.toLowerCase()) {
              score = Number(incomingRatings[key]);
              break;
            }
          }
        }
      }

      if (score === 0 && req.body[param] !== undefined) {
        score = Number(req.body[param]);
      }

      if (!score || isNaN(score) || score < 1 || score > 5) {
        unratedParams.push(param);
      } else {
        normalizedRatings[param] = score;
      }
    });

    // Also preserve any extra rated parameters if provided in incomingRatings
    if (incomingRatings && typeof incomingRatings === 'object') {
      Object.keys(incomingRatings).forEach((key) => {
        if (normalizedRatings[key] === undefined && !isNaN(incomingRatings[key]) && Number(incomingRatings[key]) >= 1) {
          normalizedRatings[key] = Number(incomingRatings[key]);
        }
      });
    }

    // 3. Validate that all dynamic category parameters are rated
    if (unratedParams.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please provide a rating (1-5) for: ${unratedParams.join(', ')}`
      });
    }

    // 4. Calculate dynamic overall rating from the rated category parameters
    const ratingValues = Object.values(normalizedRatings);
    const overallRating = Number(
      (ratingValues.reduce((sum, val) => sum + val, 0) / (ratingValues.length || 1)).toFixed(1)
    );

    const finalComment = (comment || commentAlias || '').trim();

    // 5. Check if user has already reviewed this website
    let review = await Review.findOne({ website: websiteId, user: userId });

    if (review) {
      // Update existing review - reset moderation status for re-review
      review.ratings = normalizedRatings;
      review.overallRating = overallRating;
      review.comment = finalComment;
      review.status = 'approved';
      review.moderationNote = '';
      review.moderatedBy = null;
      review.moderatedAt = null;
      await review.save();
    } else {
      // Create new review
      review = await Review.create({
        user: userId,
        website: websiteId,
        ratings: normalizedRatings,
        overallRating,
        comment: finalComment,
        status: 'approved'
      });
    }

    // 6. Recalculate website parameter ratings from approved reviews only
    await recalculateWebsiteRatings(websiteId);

    // Populate user name in returned review object
    await review.populate('user', 'name');

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
      review
    });

  } catch (error) {
    console.error('[Create Review Error]:', error.message);
    next(error);
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Requires JWT token, user owner or admin)
const deleteReview = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user._id;

    // 1. Validate Review ID
    if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ success: false, message: 'Valid Review ID is required' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // 2. Authorization Check: Must be the review's author or an admin
    const isOwner = review.user.toString() === userId.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    const websiteId = review.website;

    // 3. Delete the review from MongoDB
    await Review.findByIdAndDelete(reviewId);

    // 4. Recalculate website averages from approved reviews only
    await recalculateWebsiteRatings(websiteId);

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully.'
    });

  } catch (error) {
    console.error('[Delete Review Error]:', error.message);
    next(error);
  }
};

module.exports = { createReview, deleteReview, recalculateWebsiteRatings };