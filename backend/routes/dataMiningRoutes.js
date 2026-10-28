const express = require('express');
const router = express.Router();
const {
  getAllDataMining,
  getClassification,
  getClustering,
  getApriori
} = require('../controllers/dataMiningController');

// All Data Mining modules overview
router.get('/', getAllDataMining);
router.get('/all', getAllDataMining);

// 1. Classification Module
router.get('/classification', getClassification);
router.post('/classification/run', getClassification);

// 2. Clustering (K-Means) Module
router.get('/clustering', getClustering);
router.post('/clustering/run', getClustering);

// 3. Association Rule Mining (Apriori) Module
router.get('/apriori', getApriori);
router.post('/apriori/run', getApriori);

module.exports = router;
