const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { mongoose, isConnected } = require('./config/db');
const Question = require('./models/questionModel');

// Load environment variables
dotenv.config();

// ===== Check required environment variables =====
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('Please set these variables in your .env file before starting the server');
  process.exit(1);
}

const PORT = process.env.PORT || 5001;
console.log('🔧 Server config:', {
  port: PORT,
  environment: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET ? '✓ Set' : '✗ Not set',
  database: process.env.MONGO_URI ? 'MongoDB configured' : 'No URI'
});

const app = express();

// ===== CORS =====
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '*';
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // Postman, curl
    if (allowedOriginsEnv === '*' || allowedOriginsEnv.toLowerCase() === 'all') return callback(null, true);
    const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim());
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Access-Control-Allow-Headers'],
  optionsSuccessStatus: 200
}));

// Preflight requests
app.options('*', cors());

// ===== Middlewares =====
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📦 [${timestamp}] ${req.method} ${req.url}`);
  if (process.env.NODE_ENV !== 'production' && req.body) {
    console.log('  Body:', JSON.stringify(req.body).substring(0, 200));
  }
  next();
});

// ===== Health Check =====
app.get('/health', async (req, res) => {
  try {
    const mongoConnected = isConnected() && mongoose.connection.readyState === 1;
    if (mongoConnected) {
      return res.status(200).json({ status: 'ok', timestamp: new Date(), uptime: process.uptime(), database: 'connected', environment: process.env.NODE_ENV || 'development' });
    }
    res.status(503).json({ status: 'unhealthy', timestamp: new Date(), uptime: process.uptime(), database: 'disconnected', error: 'MongoDB not connected' });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({ status: 'unhealthy', timestamp: new Date(), uptime: process.uptime(), database: 'error', error: error.message });
  }
});

// ===== Routes =====
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/test', require('./routes/testRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Test endpoint
app.get('/api/test', (req, res) => res.json({ message: 'API is working!', timestamp: new Date(), environment: process.env.NODE_ENV || 'development' }));

// Get question image
app.get('/api/questions/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ error: 'Invalid question ID format' });
    const question = await Question.findById(id).select('image_file image_filename');
    if (!question || !question.image_file) return res.status(404).json({ error: 'Image not found' });

    let contentType = 'image/jpeg';
    if (question.image_filename) {
      const ext = question.image_filename.split('.').pop().toLowerCase();
      if (ext === 'png') contentType = 'image/png';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'webp') contentType = 'image/webp';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(question.image_filename)}`);
    res.end(question.image_file);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== 404 handler =====
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found', path: req.url }));

// ===== Global error handler =====
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ===== Graceful shutdown =====
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, shutting down...`);
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Shutdown error:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'Reason:', reason);
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});