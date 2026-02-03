const mongoose = require('mongoose');
require('dotenv').config();

// ===== CRITICAL: Validate required environment variables =====
const requiredEnvVars = ['MONGO_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('Please set these variables in your .env file or environment');
  if (process.env.NODE_ENV === 'production') {
    console.error('🚫 Exiting due to missing environment variables in production');
    process.exit(1);
  }
}

// Log configuration (mask password for security)
console.log('🔧 MongoDB Database Configuration:');
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/okurmen_test';
const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
console.log('  URI:', maskedUri);
console.log('  Database:', mongoUri.split('/').pop() || 'okurmen_test');
console.log('  Environment:', process.env.NODE_ENV || 'development');

// Connection options
const options = {
  maxPoolSize: 10, // Maximum number of connections in the pool
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout
  // SSL/TLS options for MongoDB Atlas
  ssl: true,
};

// Track connection status
let isConnected = false;

// Connect to MongoDB with retry logic
const connectDB = async (retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Connecting to MongoDB (attempt ${attempt}/${retries})...`);
      
      const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/okurmen_test', options);
      
      console.log('✅ MongoDB Connected successfully');
      console.log('  Database name:', conn.connection.name);
      console.log('  Host:', conn.connection.host);
      isConnected = true;
      
      return true;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, err.message);
      
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

// Connection events
mongoose.connection.on('connected', () => {
  console.log('📦 Mongoose connected to MongoDB');
  isConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('📦 Mongoose disconnected from MongoDB');
  isConnected = false;
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('📦 MongoDB connection closed due to app termination');
  process.exit(0);
});

// Test connection on module load
if (process.env.NODE_ENV === 'production') {
  connectDB(5, 3000).then(success => {
    if (!success) {
      console.error('🚫 Failed to connect to database. Server cannot start.');
      process.exit(1);
    }
  });
} else {
  connectDB(3, 1000);
}

module.exports = {
  mongoose,
  connectDB,
  isConnected: () => isConnected
};

