const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { 
      email, 
      password, 
      role, 
      student_id, 
      degree, 
      branch, 
      year,
      department,
      full_name
    } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Please provide email, password, and role' });
    }

    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Validate student-specific fields
    if (role === 'student' && (!student_id || !degree || !branch || !year)) {
      return res.status(400).json({ error: 'Students must provide student_id, degree, branch, and year' });
    }

    // Validate teacher-specific fields
    if (role === 'teacher' && !department) {
      return res.status(400).json({ error: 'Teachers must provide department' });
    }

    // Check if user exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Check if student_id exists (for students)
    if (role === 'student' && student_id) {
      const studentIdExists = await pool.query('SELECT * FROM users WHERE student_id = $1', [student_id]);
      if (studentIdExists.rows.length > 0) {
        return res.status(400).json({ error: 'Student ID already registered' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await pool.query(
      `INSERT INTO users 
       (email, password, full_name, role, student_id, degree, branch, year, department) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, email, full_name, role, student_id, degree, branch, year, department`,
      [
        email, 
        hashedPassword, 
        full_name || null,
        role, 
        student_id || null, 
        degree || null, 
        branch || null, 
        year || null, 
        department || null
      ]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        student_id: user.student_id,
        degree: user.degree,
        branch: user.branch,
        year: user.year,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Check for user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        student_id: user.student_id,
        degree: user.degree,
        branch: user.branch,
        year: user.year,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};
