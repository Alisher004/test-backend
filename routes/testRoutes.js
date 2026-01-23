const express = require('express');
const router = express.Router();
const { getQuestions, submitTest, getResults, getTestSettings } = require('../controllers/testController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Публичные маршруты
router.get('/settings', getTestSettings);

// Студенттер үчүн гана
router.get('/questions/:level', authMiddleware, (req, res, next) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Админ тест тапшыра албайт' });
  }
  next();
}, getQuestions);

router.post('/submit', authMiddleware, (req, res, next) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Админ тест тапшыра албайт' });
  }
  next();
}, submitTest);

router.get('/results/:userId', authMiddleware, getResults);

module.exports = router;