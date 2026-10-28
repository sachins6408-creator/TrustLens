const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// All admin routes require JWT + admin role
router.use(protect, admin);

// ===== Users =====
router.get('/users', adminGetUsers);
router.get('/users/:id', adminGetUserById);
router.patch('/users/:id/status', adminUpdateUserStatus);
router.delete('/users/:id', adminDeleteUser);

// ===== Websites =====
router.get('/websites', adminGetWebsites);
router.patch('/websites/:id/status', adminUpdateWebsiteStatus);
router.delete('/websites/:id', adminDeleteWebsite);

// ===== Reviews / Moderation =====
router.get('/reviews', adminGetReviews);
router.patch('/reviews/:id/status', adminUpdateReviewStatus);
router.delete('/reviews/:id', adminDeleteReview);

// ===== Analytics & Reports =====
router.get('/analytics', adminGetAnalytics);
router.get('/reports/:type', adminGenerateReport);

module.exports = router;