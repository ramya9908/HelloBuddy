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

// Security middleware - relaxed for development
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false  // Disable CSP for easier development
}));

// ✅ FIXED: More permissive CORS configuration for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost on any port for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow your production domains
    const allowedOrigins = [
      'https://your-netlify-app.netlify.app',
      'https://hellobuiddy.netlify.app',
      'https://hellobuiddy-frontend.netlify.app'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Cookie',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Add OPTIONS handler for all routes
app.options('*', cors());

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
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' // Skip rate limiting in development
});

app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} from ${req.ip}`);
  if (req.path.includes('/auth/')) {
    console.log('🔐 Auth request:', {
      method: req.method,
      path: req.path,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent']?.substring(0, 50) + '...',
      cookies: req.headers.cookie ? 'present' : 'none'
    });
  }
  next();
});

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
    timestamp: new Date().toISOString(),
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
  console.error('💥 Server error:', err.message);
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
  console.log('❌ 404:', req.method, req.originalUrl);
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
      console.log(`🌐 CORS enabled for all localhost origins`);
      console.log(`🍪 Cookies enabled with credentials: true`);
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