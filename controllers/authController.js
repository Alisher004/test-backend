const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const register = async (req, res) => {
  try {
    const { full_name, phone_number, age } = req.body;

    // Check if user exists
    const userCheck = await db.query(
      'SELECT * FROM users WHERE phone_number = $1',
      [phone_number]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    // Create user
    const result = await db.query(
      'INSERT INTO users (full_name, phone_number, age) VALUES ($1, $2, $3) RETURNING id, full_name, phone_number, age',
      [full_name, phone_number, age]
    );

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
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { phone_number } = req.body;

    // Find user
    const result = await db.query(
      'SELECT * FROM users WHERE phone_number = $1',
      [phone_number]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Неверные учетные данные' });
    }

    const user = result.rows[0];

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
    console.error(error);
    res.status(500).json({ error: 'Server error' });
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
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login, getCurrentUser };