const express = require('express');
const router = express.Router();
const { 
  loginUser, 
  getProfile,
  registerConsumer,
  registerProvider
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// POST /api/auth/login
router.post('/login', loginUser);

// POST /api/auth/register/consumer
router.post('/register/consumer', registerConsumer);

// POST /api/auth/register/provider
router.post('/register/provider', registerProvider);

// GET /api/auth/profile
router.get('/profile', protect, getProfile);

module.exports = router;
