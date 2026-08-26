const mongoose = require('mongoose');

// @desc    Get API & DB status
// @route   GET /api/health
// @access  Public
const getHealthStatus = async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };

  res.status(200).json({
    success: true,
    message: 'TrustLens API Server is running',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatusMap[dbState] || 'Unknown',
      readyState: dbState
    }
  });
};

module.exports = { getHealthStatus };
