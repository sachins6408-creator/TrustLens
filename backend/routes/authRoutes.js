const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public Auth Endpoints
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected Auth Endpoint (Testing JWT Middleware)
router.get('/me', protect, getMe);

module.exports = router;
