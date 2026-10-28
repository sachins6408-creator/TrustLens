const express = require('express');
const router = express.Router();
const {
  getParametersByCategory,
  getAllEvaluationParameters,
  createOrUpdateParameters,
  updateParametersById,
  deleteParameters
} = require('../controllers/evaluationParameterController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', (req, res, next) => {
  if (req.query.category) {
    return getParametersByCategory(req, res, next);
  }
  return getAllEvaluationParameters(req, res, next);
});

// GET /api/evaluation-parameters/:category (supports slashes like Banking / Finance)
router.get('/:category(*)', getParametersByCategory);

// Admin routes: Add, edit, remove evaluation parameters & categories
router.post('/', protect, admin, createOrUpdateParameters);
router.put('/:id', protect, admin, updateParametersById);
router.delete('/:id', protect, admin, deleteParameters);

module.exports = router;
