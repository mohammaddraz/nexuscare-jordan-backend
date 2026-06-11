const express = require('express');
const router = express.Router();
const { loginUser, getProfile } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// POST /api/auth/login
router.post('/login', loginUser);

// GET /api/auth/profile
router.get('/profile', protect, getProfile);

module.exports = router;
