const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const pgclient = require('../config/db');

/**
 * Generate JWT Token
 */
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

/**
 * @desc    Authenticate a user (login)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  // 1. Check if user exists
  const userResult = await pgclient.query('SELECT * FROM USERS WHERE email = $1', [email]);
  
  if (userResult.rows.length === 0) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  const user = userResult.rows[0];

  // 2. Check password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // 3. Get role-specific details
  let profileDetails = {};
  
  if (user.role === 'ADMIN') {
    const result = await pgclient.query('SELECT * FROM ADMINS WHERE user_id = $1', [user.id]);
    profileDetails = result.rows[0];
    
    // Update last login
    await pgclient.query('UPDATE ADMINS SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1', [user.id]);
  } 
  else if (user.role === 'PROVIDER') {
    const result = await pgclient.query('SELECT * FROM PROVIDERS WHERE user_id = $1', [user.id]);
    profileDetails = result.rows[0];
  } 
  else if (user.role === 'CONSUMER') {
    // For consumers, we fetch the primary patient record
    const result = await pgclient.query(
      'SELECT * FROM PATIENTS WHERE user_id = $1 AND relation = $2', 
      [user.id, 'Primary']
    );
    profileDetails = result.rows[0];
  }

  // 4. Send response
  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: profileDetails ? profileDetails.name : 'Unknown User',
      ...profileDetails
    },
    token: generateToken(user.id, user.role)
  });
});

/**
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  // req.user is set by the auth middleware
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role
  });
});

module.exports = {
  loginUser,
  getProfile
};
