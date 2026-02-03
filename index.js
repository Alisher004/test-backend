// index.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load env
dotenv.config();

// Models
const Admin = require('./models/adminModel');
const User = require('./models/userModel'); // Эгер колдонуучу керек болсо

// Config
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI || !JWT_SECRET) {
  console.error('❌ Missing MONGO_URI or JWT_SECRET in .env');
  process.exit(1);
}

// ===== Connect MongoDB =====
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ===== Express App =====
const app = express();
app.use(express.json());

// ===== CORS =====
const cors = require('cors');

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim());

app.use(cors({
  origin: function(origin, callback) {
    // origin жок болсо (Postman, curl) өтсүн
    if (!origin) return callback(null, true);

    // ALLOWED_ORIGINS ичинде болсо өтсүн
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // башкача болсо токтот
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Preflight requests (OPTIONS)
app.options('*', cors());

// ===== Routes =====
// Health check
app.get('/health', (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  res.json({
    status: mongoConnected ? 'ok' : 'unhealthy',
    database: mongoConnected ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ error: 'Неверные учетные данные' });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(400).json({ error: 'Неверные учетные данные' });

    // Token example
    const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: '1d' });

    res.json({ message: 'Login successful', email: admin.email, token });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== 404 =====
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});