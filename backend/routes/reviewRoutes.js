const express = require('express');
const router = express.Router();
const { createReview, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/reviews (Protected endpoint requiring valid JWT token)
router.post('/', protect, createReview);

// DELETE /api/reviews/:id (Protected endpoint - owner or admin)
router.delete('/:id', protect, deleteReview);

module.exports = router;
