const express = require('express');
const router = express.Router();
const { getWebsites, getWebsiteById, getCategories } = require('../controllers/websiteController');

// GET /api/websites/categories
router.get('/categories', getCategories);

// GET /api/websites (supports ?query= &category=)
router.get('/', getWebsites);

// GET /api/websites/:id
router.get('/:id', getWebsiteById);

module.exports = router;
