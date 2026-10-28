const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// All user management routes require valid token and admin privileges
router.use(protect, admin);

// GET /api/users - List all registered users
router.get('/', getUsers);

// GET /api/users/:id - Get single user details & activity stats
router.get('/:id', getUserById);

// PATCH /api/users/:id/status - Activate or Deactivate user account
router.patch('/:id/status', updateUserStatus);

// DELETE /api/users/:id - Delete user account and cleanup records
router.delete('/:id', deleteUser);

module.exports = router;
