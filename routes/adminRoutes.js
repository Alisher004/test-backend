const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  adminLogin,
  getDashboardStats,
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getTestHistory,
  getAllUsers,
  getAllResults,
  getTestSettings,
  updateTestSettings,
} = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Admin login
router.post('/login', adminLogin);

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Questions
router.get('/questions', getAllQuestions);
router.post('/questions', upload.single('image'), createQuestion);
router.put('/questions/:id', upload.single('image'), updateQuestion);
router.delete('/questions/:id', deleteQuestion);

// Test History
router.get('/history', getTestHistory);

// Users
router.get('/users', getAllUsers);

// Results
router.get('/results', getAllResults);

// Test Settings
router.get('/settings', getTestSettings);
router.put('/settings', updateTestSettings);

module.exports = router;