const express = require('express');
const router = express.Router();
const {
  getWebsites,
  getWebsiteById,
  getCategories,
  getDatabaseOverviewStats,
  addWebsite,
  updateWebsiteStatus,
  deleteWebsite
} = require('../controllers/websiteController');
const { getRecommendations } = require('../controllers/recommendationController');
const { protect, admin, optionalProtect } = require('../middleware/authMiddleware');

// GET /api/websites/overview-stats (Live platform statistics for dashboard)
router.get('/overview-stats', getDatabaseOverviewStats);

// GET /api/websites/categories
router.get('/categories', getCategories);

// GET /api/websites/recommendations (Recommendations from entire dataset, category filtered, sorted by Trust Score)
router.get('/recommendations', optionalProtect, getRecommendations);

// GET /api/websites (supports ?query=, ?category=, ?status=)
router.get('/', getWebsites);

// POST /api/websites (Authenticated users/guests can submit request, Admin adds active directly)
router.post('/', optionalProtect, addWebsite);

// PATCH /api/websites/:id/status (Admin only: Approve/Reject/Activate)
router.patch('/:id/status', protect, admin, updateWebsiteStatus);

// DELETE /api/websites/:id (Admin only: Delete website)
router.delete('/:id', protect, admin, deleteWebsite);

// GET /api/websites/:id
router.get('/:id', getWebsiteById);

module.exports = router;
