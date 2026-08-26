const mongoose = require('mongoose');
const Review = require('../models/Review');
const Website = require('../models/Website');

const REQUIRED_PARAMETERS = [
  'productQuality',
  'deliveryPerformance',
  'customerSupport',
  'paymentSecurity',
  'refundProcess',
  'websiteUsability',
  'pricingTransparency',
  'informationAccuracy',
  'privacyDataHandling'
];

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

    // Normalize ratings from either nested ratings object or top-level fields
    const normalizedRatings = {};
    REQUIRED_PARAMETERS.forEach((param) => {
      // Check nested object first, then top-level param, then top-level param + 'Rating'
      if (incomingRatings && incomingRatings[param] !== undefined) {
        normalizedRatings[param] = Number(incomingRatings[param]);
      } else if (req.body[param] !== undefined) {
        normalizedRatings[param] = Number(req.body[param]);
      } else if (req.body[`${param}Rating`] !== undefined) {
        normalizedRatings[param] = Number(req.body[`${param}Rating`]);
      } else {
        normalizedRatings[param] = 0;
      }
    });

    // 2. Validate all 9 rating parameters (range 1 to 5)
    for (const param of REQUIRED_PARAMETERS) {
      const score = normalizedRatings[param];
      if (!score || isNaN(score) || score < 1 || score > 5) {
        return res.status(400).json({
          success: false,
          message: `Please provide a valid rating between 1 and 5 for ${param}`
        });
      }
    }

    // Calculate dynamic overall rating from the 9 parameters
    const ratingValues = REQUIRED_PARAMETERS.map((param) => normalizedRatings[param]);
    const overallRating = Number((ratingValues.reduce((sum, val) => sum + val, 0) / 9).toFixed(1));

    const finalComment = (comment || commentAlias || '').trim();

    // 3. Check if user has already reviewed this website
    let review = await Review.findOne({ website: websiteId, user: userId });

    if (review) {
      // Update existing review
      review.ratings = normalizedRatings;
      review.overallRating = overallRating;
      review.comment = finalComment;
      await review.save();
    } else {
      // Create new review
      review = await Review.create({
        user: userId,
        website: websiteId,
        ratings: normalizedRatings,
        overallRating,
        comment: finalComment
      });

      // Increment totalReviews count on Website
      website.totalReviews = (website.totalReviews || 0) + 1;
    }

    // 4. Recalculate average parameter ratings for this website
    const allReviews = await Review.find({ website: websiteId });
    const updatedParameterRatings = {};

    REQUIRED_PARAMETERS.forEach((param) => {
      const sum = allReviews.reduce((acc, r) => acc + (r.ratings?.[param] || 0), 0);
      updatedParameterRatings[param] = Number((sum / allReviews.length).toFixed(1));
    });

    website.parameterRatings = updatedParameterRatings;
    await website.save();

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

    // 4. Recalculate average parameter ratings and review count for the target website
    const remainingReviews = await Review.find({ website: websiteId });
    const website = await Website.findById(websiteId);

    if (website) {
      website.totalReviews = remainingReviews.length;

      const updatedParameterRatings = {};
      REQUIRED_PARAMETERS.forEach((param) => {
        if (remainingReviews.length > 0) {
          const sum = remainingReviews.reduce((acc, r) => acc + (r.ratings?.[param] || 0), 0);
          updatedParameterRatings[param] = Number((sum / remainingReviews.length).toFixed(1));
        } else {
          updatedParameterRatings[param] = 0;
        }
      });

      website.parameterRatings = updatedParameterRatings;
      await website.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully.'
    });

  } catch (error) {
    console.error('[Delete Review Error]:', error.message);
    next(error);
  }
};

module.exports = { createReview, deleteReview };
