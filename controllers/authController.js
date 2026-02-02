const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Admin = require('../models/adminModel');

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
    const existingUser = await User.findOne({ phone_number: phone_number.trim() });

    if (existingUser) {
      console.log('⚠️ Registration failed: User already exists', { phone_number: phone_number.trim() });
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    // Create user
    const user = await User.create({
      full_name: full_name.trim(),
      phone_number: phone_number.trim(),
      age: ageNum
    });

    console.log('✅ User created successfully:', { id: user.id, phone_number: phone_number.trim() });

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    console.error('Stack:', error.stack);
    
    // Handle specific database errors
    if (error.code === 11000) {
      // MongoDB duplicate key error
      return res.status(400).json({ error: 'Пользователь с таким номером телефона уже существует' });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
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
    const user = await User.findOne({ phone_number: phone_number.trim() });

    if (!user) {
      console.log('⚠️ Login failed: User not found', { phone_number: phone_number.trim() });
      return res.status(400).json({ error: 'Неверные учетные данные' });
    }

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
        phone_number: user.phone_number,
        age: user.age
      },
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ error: 'Server error during login' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const admin = await Admin.findById(req.user.id).select('-password');
      if (admin) {
        res.json({ ...admin.toJSON(), role: 'admin' });
      } else {
        res.status(404).json({ error: 'Admin not found' });
      }
    } else {
      const user = await User.findById(req.user.id);
      if (user) {
        res.json({ ...user.toJSON(), role: 'user' });
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

