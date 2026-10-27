const express = require('express');
const router = express.Router();
const {
  getAIInsights,
  getFinancialHealth,
  getCoachResponse,
  getMLPredictions,
  getChatHistory,
  clearChatHistory,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Protect all AI routes

router.get('/insights', getAIInsights);
router.get('/health-score', getFinancialHealth);
router.post('/coach', getCoachResponse);
router.get('/ml-predict', getMLPredictions);
router.get('/predictions', getMLPredictions);
router.get('/chat-history', getChatHistory);
router.delete('/chat-history', clearChatHistory);

module.exports = router;
