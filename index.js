// backend/index.js
const express = require('express');
const dotenv = require('dotenv');
const db = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use((req, res, next) => {
  // Получаем разрешенные origins из переменных окружения
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const origin = req.headers.origin;
  
  // Если ALLOWED_ORIGINS установлен в "*" или не установлен, разрешаем все origins
  // Если ALLOWED_ORIGINS не задан или стоит "*"/"all", эхо-ответим Origin (нужно для credentials)
  if (!allowedOriginsEnv || allowedOriginsEnv.trim() === '*' || allowedOriginsEnv.trim() === 'all') {
    if (origin) {
      // Для CORS с credentials нужно возвращать конкретный Origin, а не '*'
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // Нет Origin (вероятно запрос с сервера) — разрешаем все
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  } else {
    // Используем список разрешенных origins
    const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim());
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  // Reflect requested headers when present (helps with varied client headers),
  // otherwise use a safe default that includes Authorization.
  const requestHeaders = req.headers['access-control-request-headers'];
  if (requestHeaders) {
    res.setHeader('Access-Control-Allow-Headers', requestHeaders);
  } else {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  // Allow cookies / credentialed requests from the browser
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Preflight request
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS preflight request from:', origin);
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/test', require('./routes/testRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
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

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`📡 Test endpoint: http://localhost:${PORT}/api/test`);
});