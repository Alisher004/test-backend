const { Pool } = require('pg');
require('dotenv').config();

// ===== CRITICAL: Validate required environment variables =====
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('Please set these variables in your .env file or environment');
  // Don't exit immediately in development, but log critical warning
  if (process.env.NODE_ENV === 'production') {
    console.error('🚫 Exiting due to missing environment variables in production');
    process.exit(1);
  }
}

// Log configuration (mask password for security)
console.log('🔧 Database Configuration:');
console.log('  Host:', process.env.DB_HOST || 'localhost');
console.log('  User:', process.env.DB_USER || 'postgres');
console.log('  Database:', process.env.DB_NAME || 'okurmen_test');
console.log('  Port:', process.env.DB_PORT || 5432);
console.log('  Environment:', process.env.NODE_ENV || 'development');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'okurmen_test',
  port: process.env.DB_PORT || 5432,
  // Connection pool settings for production
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection can't be established
});

// Track connection status
let isConnected = false;

// Test connection with retry logic
const testConnection = async (retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Testing database connection (attempt ${attempt}/${retries})...`);
      
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      
      console.log('✅ Connected to PostgreSQL database');
      console.log('  Database time:', result.rows[0].now);
      isConnected = true;
      
      // Release the client back to the pool
      client.release();
      return true;
    } catch (err) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, err.message);
      
      if (attempt === retries) {
        console.error('🚫 All connection attempts failed');
        isConnected = false;
        
        if (process.env.NODE_ENV === 'production') {
          console.error('🚫 Exiting due to database connection failure in production');
          process.exit(1);
        }
        return false;
      }
      
      console.log(`⏳ Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
};

// Test connection on module load
if (process.env.NODE_ENV === 'production') {
  // In production, exit if DB is not accessible
  testConnection(5, 3000).then(success => {
    if (!success) {
      console.error('🚫 Failed to connect to database. Server cannot start.');
      process.exit(1);
    }
  });
} else {
  // In development, just log but don't exit
  testConnection(3, 1000);
}

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected database pool error:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error('🚫 Could not connect to PostgreSQL server');
    isConnected = false;
  }
});

// Handle client errors
pool.on('clientError', (err, client) => {
  console.error('❌ Database client error:', err.message);
});

module.exports = {
  query: (text, params) => {
    // Log query for debugging (remove in production for security)
    if (process.env.NODE_ENV !== 'production') {
      console.log('DB Query:', text.substring(0, 100), params ? '...' : '');
    }
    
    // Check if pool is connected
    if (!isConnected && pool.totalCount === 0) {
      console.error('❌ Attempting query without active database connection');
      return Promise.reject(new Error('Database not connected'));
    }
    
    return pool.query(text, params);
  },
  pool,
  isConnected: () => isConnected,
  testConnection
};

