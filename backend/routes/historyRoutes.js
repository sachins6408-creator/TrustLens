const express = require('express');
const router = express.Router();
const { getHistory, addHistory, deleteHistory } = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getHistory);
router.post('/', protect, addHistory);
router.delete('/:id', protect, deleteHistory);

module.exports = router;
