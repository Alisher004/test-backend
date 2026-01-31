# 🚀 Deployment Checklist for Server

## ✅ Pre-Deployment Checklist

### 1. Environment Variables (CRITICAL!)
Create a `.env` file on your server with these values:

```bash
# Server Configuration
PORT=5001
NODE_ENV=production

# Database Configuration (ADJUST FOR YOUR SERVER!)
DB_HOST=localhost          # Change from 'postgres' to 'localhost' or your DB IP
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=okurmen_test
DB_PORT=5432

# JWT Configuration (MUST BE SET!)
JWT_SECRET=your-long-random-string-at-least-32-characters

# CORS Configuration
ALLOWED_ORIGINS=*
```

### 2. Database Setup
Make sure the database exists and the `users` table is created:

```sql
CREATE DATABASE okurmen_test;

-- Connect to the database and run:
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    age INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Server Requirements
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Port 5001 open in firewall

## 🔧 Server Setup Commands

```bash
# 1. Navigate to your project directory
cd /path/to/your/project

# 2. Install dependencies
npm install

# 3. Create .env file
nano .env
# Paste the environment variables from above

# 4. Test database connection
node -e "require('./config/db').testConnection().then(r => process.exit(r ? 0 : 1))"

# 5. Start the server
npm start

# Or use PM2 for production
npm install -g pm2
pm2 start index.js --name okurmen-api
```

## 🐳 Docker Deployment (if using Docker)

```bash
# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f
```

## 🔍 Debug Commands

```bash
# Check if server is running
curl http://45.10.41.250:5000/health

# Check environment variables
node -e "console.log('JWT_SECRET:', !!process.env.JWT_SECRET)"
node -e "console.log('DB_HOST:', process.env.DB_HOST)"

# Test database connection
psql -h localhost -U postgres -d okurmen_test -c "SELECT 1"

# Check server logs
tail -f /var/log/your-app.log  # Adjust path based on your setup
```

## ❗ Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 500 Error on register | Check `JWT_SECRET` is set in `.env` |
| DB Connection Refused | Verify PostgreSQL is running and `DB_HOST` is correct |
| ECONNREFUSED | Firewall blocking port 5432 or wrong DB_HOST |
| Module not found | Run `npm install` on the server |
| Permission denied | Check file permissions on .env file |

## 📋 Quick Validation Script

Run this on your server to validate the setup:

```bash
#!/bin/bash
echo "=== Environment Validation ==="
echo "JWT_SECRET: ${JWT_SECRET:-NOT SET}"
echo "DB_HOST: ${DB_HOST:-localhost}"
echo "NODE_ENV: ${NODE_ENV:-not set}"

echo ""
echo "=== Testing Node.js ==="
node -e "console.log('Node.js version:', process.version)"

echo ""
echo "=== Testing Database ==="
node -e "
const db = require('./config/db');
db.testConnection()
  .then(ok => {
    console.log(ok ? '✅ Database connected' : '❌ Database failed');
    process.exit(ok ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Database error:', err.message);
    process.exit(1);
  });
"

echo ""
echo "=== Testing API ==="
curl -s http://localhost:5000/health || echo "❌ Server not responding"
```

## 🎯 Why This Fixes the 500 Error

The main issue was that `process.env.JWT_SECRET` was undefined on the server. Now:

1. **Server won't start** if `JWT_SECRET` is missing (fail fast)
2. **Input validation** prevents crashes from missing fields
3. **Better error logging** helps diagnose issues quickly
4. **Database connection validation** ensures DB is accessible before accepting requests
5. **Graceful error responses** return meaningful messages instead of 500

