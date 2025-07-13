const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
require('dotenv').config();

const { initializeDatabase } = require('./db/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const { sessionMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// FIXED: Trust proxy for Render deployment
app.set('trust proxy', 1);

// Minimal logging configuration - only essential messages
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// ✅ UPDATED: CORS configuration with your frontend domains
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://your-netlify-app.netlify.app', // Replace with your actual Netlify URL
        'https://hellobuiddy.netlify.app',      // Custom domain if you get one
        'https://hellobuiddy-frontend.netlify.app', // Alternative naming
        'https://your-frontend-domain.com'      // Add your actual frontend domain here
      ]
    : [
        'http://localhost:5173',
        'http://localhost:3000', 
        'http://127.0.0.1:5173',
        'http://localhost:4173'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/api/status' || req.path === '/'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many authentication attempts' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoint with server health message
app.get('/health', (req, res) => {
  console.log('Server health ✓');
  res.json({
    status: 'healthy',
    message: 'Server health ✓',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    api: 'Social Engagement Platform',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      user: '/api/user/*',
      admin: '/api/admin/*'
    }
  });
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', sessionMiddleware, userRoutes);
app.use('/api/admin', sessionMiddleware, adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Social Engagement Platform API',
    status: 'running',
    endpoints: {
      health: '/health',
      api_status: '/api/status',
      auth: '/api/auth/*',
      user: '/api/user/*',
      admin: '/api/admin/*'
    },
    frontend_url: process.env.NODE_ENV === 'production' 
      ? 'https://your-netlify-app.netlify.app'
      : 'http://localhost:5173'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  try {
    console.log('🔄 Starting server...');
    console.log('📍 Environment:', process.env.NODE_ENV || 'development');
    console.log('🔌 Database working...');
    await initializeDatabase();
    console.log('✅ Database working ✓');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Frontend URL: ${process.env.NODE_ENV === 'production' ? 'Production URLs' : 'http://localhost:5173'}`);
      console.log('✅ Server working ✓');
    });

    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          console.error(`❌ Port ${PORT} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`❌ Port ${PORT} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Critical error:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Critical error:', reason);
  process.exit(1);
});

startServer();