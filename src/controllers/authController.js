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

/**
 * @desc    Register a new Consumer (Family Pool)
 * @route   POST /api/auth/register/consumer
 * @access  Public
 */
const registerConsumer = asyncHandler(async (req, res) => {
  const { name, email, phone, plan_type, relation, password } = req.body;

  if (!name || !email || !password || !plan_type || !relation) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  // Check if user exists
  const userExists = await pgclient.query('SELECT id FROM USERS WHERE email = $1', [email]);
  if (userExists.rows.length > 0) {
    res.status(400);
    throw new Error('Email already registered');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    await pgclient.query('BEGIN');

    // 1. Insert User
    const userResult = await pgclient.query(
      'INSERT INTO USERS (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hashedPassword, 'CONSUMER']
    );
    const userId = userResult.rows[0].id;

    // 2. Insert Patient (Consumer Profile)
    // Note: Generating a random national_id for demo purposes if not provided, since it is required & unique.
    const nationalId = `NID-${Math.floor(Math.random() * 100000000)}`;
    
    await pgclient.query(
      `INSERT INTO PATIENTS (user_id, name, relation, national_id, plan_type, approval_status) 
       VALUES ($1, $2, $3, $4, $5, 'Pending')`,
      [userId, name, relation, nationalId, plan_type]
    );

    await pgclient.query('COMMIT');

    res.status(201).json({
      message: 'Consumer registration submitted successfully. Pending administrative review.',
    });
  } catch (error) {
    await pgclient.query('ROLLBACK');
    res.status(500);
    throw new Error('Failed to register consumer: ' + error.message);
  }
});

/**
 * @desc    Register a new Provider (Clinic/Doctor)
 * @route   POST /api/auth/register/provider
 * @access  Public
 */
const registerProvider = asyncHandler(async (req, res) => {
  const { name, email, phone, specialty, license_number, clinic, city, password } = req.body;

  if (!name || !email || !password || !license_number || !clinic) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  // Check if user exists
  const userExists = await pgclient.query('SELECT id FROM USERS WHERE email = $1', [email]);
  if (userExists.rows.length > 0) {
    res.status(400);
    throw new Error('Email already registered');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    await pgclient.query('BEGIN');

    // 1. Insert User
    const userResult = await pgclient.query(
      'INSERT INTO USERS (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hashedPassword, 'PROVIDER']
    );
    const userId = userResult.rows[0].id;

    // 2. Insert Provider
    await pgclient.query(
      `INSERT INTO PROVIDERS (user_id, name, specialty, clinic, city) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, name, specialty, clinic, city]
    );

    // 3. Insert Certification
    await pgclient.query(
      `INSERT INTO CERTIFICATIONS (provider_id, license_number, status) 
       VALUES ($1, $2, 'Pending Review')`,
      [userId, license_number]
    );

    await pgclient.query('COMMIT');

    res.status(201).json({
      message: 'Provider registration submitted successfully. Pending JMA verification.',
    });
  } catch (error) {
    await pgclient.query('ROLLBACK');
    res.status(500);
    throw new Error('Failed to register provider: ' + error.message);
  }
});

module.exports = {
  loginUser,
  getProfile,
  registerConsumer,
  registerProvider
};
