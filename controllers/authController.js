const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Validate required environment variables at startup
const validateEnv = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is not set!');
  }
};

// Run validation immediately
try {
  validateEnv();
} catch (err) {
  console.error('❌ Environment validation failed:', err.message);
  process.exit(1);
}

const register = async (req, res) => {
  try {
    const { full_name, phone_number, age } = req.body;

    // ===== VALIDATION =====
    if (!full_name || full_name.trim() === '') {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (!phone_number || phone_number.trim() === '') {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (age === undefined || age === null || age === '') {
      return res.status(400).json({ error: 'Age is required' });
    }

    // Validate age is a number
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
      return res.status(400).json({ error: 'Age must be a valid number between 1 and 150' });
    }

    console.log('📝 Registration attempt:', { full_name: full_name.trim(), phone_number: phone_number.trim() });

    // Check if user exists
    const userCheck = await db.query(
      'SELECT * FROM users WHERE phone_number = $1',
      [phone_number.trim()]
    );

    if (userCheck.rows.length > 0) {
      console.log('⚠️ Registration failed: User already exists', { phone_number: phone_number.trim() });
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    // Create user
    const result = await db.query(
      'INSERT INTO users (full_name, phone_number, age) VALUES ($1, $2, $3) RETURNING id, full_name, phone_number, age',
      [full_name.trim(), phone_number.trim(), ageNum]
    );

    console.log('✅ User created successfully:', { id: result.rows[0].id, phone_number: phone_number.trim() });

    // Generate token
    const token = jwt.sign(
      { id: result.rows[0].id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      user: result.rows[0],
      token
    });
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    console.error('Stack:', error.stack);
    
    // Handle specific database errors
    if (error.code === '23505') {
      // PostgreSQL unique violation
      return res.status(400).json({ error: 'Пользователь с таким номером телефона уже существует' });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === '57P03') {
      // Database connection issues
      console.error('❌ Database connection error during registration');
      return res.status(503).json({ error: 'Database connection error. Please try again later.' });
    }
    
    res.status(500).json({ error: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { phone_number } = req.body;

    // ===== VALIDATION =====
    if (!phone_number || phone_number.trim() === '') {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    console.log('🔐 Login attempt:', { phone_number: phone_number.trim() });

    // Find user
    const result = await db.query(
      'SELECT * FROM users WHERE phone_number = $1',
      [phone_number.trim()]
    );

    if (result.rows.length === 0) {
      console.log('⚠️ Login failed: User not found', { phone_number: phone_number.trim() });
      return res.status(400).json({ error: 'Неверные учетные данные' });
    }

    const user = result.rows[0];
    console.log('✅ Login successful:', { id: user.id, phone_number: phone_number.trim() });

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        // full_name: user.full_name,
        phone_number: user.phone_number,
        age: user.age
      },
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.error('Stack:', error.stack);
    
    // Handle database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === '57P03') {
      console.error('❌ Database connection error during login');
      return res.status(503).json({ error: 'Database connection error. Please try again later.' });
    }
    
    res.status(500).json({ error: 'Server error during login' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await db.query(
        'SELECT id, email FROM admins WHERE id = $1',
        [req.user.id]
      );
      if (result.rows.length > 0) {
        res.json({ ...result.rows[0], role: 'admin' });
      } else {
        res.status(404).json({ error: 'Admin not found' });
      }
    } else {
      result = await db.query(
        'SELECT id, full_name, phone_number, age FROM users WHERE id = $1',
        [req.user.id]
      );
      if (result.rows.length > 0) {
        res.json({ ...result.rows[0], role: 'user' });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    }
  } catch (error) {
    console.error('❌ GetCurrentUser error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login, getCurrentUser };

