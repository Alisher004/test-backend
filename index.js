// backend/index.js
const express = require('express');
const dotenv = require('dotenv');
const db = require('./config/db');
const cors = require('cors');

// Load environment variables
dotenv.config();

// ===== CRITICAL: Validate required environment variables on startup =====
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('Please set these variables in your .env file before starting the server');
  process.exit(1);
}

console.log('🔧 Server Configuration:');
console.log('  Port:', process.env.PORT || 5001);
console.log('  Environment:', process.env.NODE_ENV || 'development');
console.log('  JWT Secret:', process.env.JWT_SECRET ? '✓ Set (' + process.env.JWT_SECRET.length + ' chars)' : '✗ Not set');
console.log('  Database:', `${process.env.DB_HOST}/${process.env.DB_NAME}`);

const app = express();
const PORT = process.env.PORT || 5001;

// CORS middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  credentials: true,
}));

app.use((req, res, next) => {
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const origin = req.headers.origin;
  
  if (!allowedOriginsEnv || allowedOriginsEnv.trim() === '*' || allowedOriginsEnv.trim() === 'all') {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  } else {
    const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim());
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  const requestHeaders = req.headers['access-control-request-headers'];
  if (requestHeaders) {
    res.setHeader('Access-Control-Allow-Headers', requestHeaders);
  } else {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS preflight request from:', origin);
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📦 [${timestamp}] ${req.method} ${req.url}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('  Body:', JSON.stringify(req.body).substring(0, 200));
  }
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(503).json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/test', require('./routes/testRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!31', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get question image
app.get('/api/questions/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Getting image for question:', id);
    const result = await db.query('SELECT image_file, image_filename FROM questions WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      console.log('Question not found');
      return res.status(404).json({ error: 'Question not found' });
    }
    
    if (!result.rows[0].image_file) {
      console.log('No image file');
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const { image_file, image_filename } = result.rows[0];
    console.log('Image found, size:', image_file.length, 'filename:', image_filename);
    
    // Determine content type based on file extension
    let contentType = 'image/jpeg';
    if (image_filename) {
      const ext = image_filename.toLowerCase().split('.').pop();
      if (ext === 'png') contentType = 'image/png';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'webp') contentType = 'image/webp';
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(image_filename)}`);
    
    // Send the buffer directly
    res.end(image_file);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.url });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  console.error('Stack:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database pool
    console.log('🔄 Closing database connections...');
    await db.pool.end();
    console.log('✅ Database connections closed');
    
    // Close server
    console.log('🔄 Shutting down server...');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  // console.log(`📡 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('─'.repeat(50));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});