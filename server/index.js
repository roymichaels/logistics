const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

// Import route handlers
const { verifyInit } = require('./routes/verify-init');
const { bootstrap } = require('./routes/bootstrap');
const { setUserMode } = require('./routes/user-mode');
const { seedDemo } = require('./routes/seed-demo');
const { authenticateJWT } = require('./middleware/auth');
const { createRateLimit } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
      connectSrc: ["'self'", "https://api.telegram.org"],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  crossOriginEmbedderPolicy: { policy: "credentialless" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://app.localhost', 'https://your-app.com']
    : ['http://localhost:3000', 'https://app.localhost'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rate limiting for auth endpoints
const authRateLimit = createRateLimit(15 * 60 * 1000, 10); // 10 requests per 15 minutes
const mutationRateLimit = createRateLimit(60 * 1000, 30); // 30 requests per minute

// Public routes
app.post('/api/verify-init', authRateLimit, verifyInit);

// Protected routes
app.get('/api/bootstrap', authenticateJWT, bootstrap);
app.post('/api/user-mode', authenticateJWT, mutationRateLimit, setUserMode);
app.post('/api/seed-demo', authenticateJWT, mutationRateLimit, seedDemo);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;