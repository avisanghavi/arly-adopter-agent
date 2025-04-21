require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const session = require('express-session');
const PgSession = require('pg-session-store')(session);

console.log('Starting server initialization...');

// Debug: Log environment variables (excluding sensitive values)
console.log('Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);

try {
  console.log('Loading passport configuration...');
  const passport = require('../config/passport');
  console.log('Passport loaded successfully');

  const logger = require('../utils/logger');
  console.log('Logger initialized');

  const path = require('path');
  const cron = require('node-cron');
  const emailRoutes = require('../../api/routes/emails');
  const userRoutes = require('../../api/routes/users');
  const authRoutes = require('../../api/routes/auth');
  const { isAuthenticated } = require('../middleware/auth');
  const agentSettings = require('../../config/agent-settings.json');
  const emailTrackingRoutes = require('../../api/routes/email-tracking');

  console.log('All modules loaded successfully');

  // Validate required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_REDIRECT_URI',
    'SESSION_SECRET'
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingEnvVars.length > 0) {
    logger.error('Missing required environment variables:', missingEnvVars);
    process.exit(1);
  }

  // Debug logging for environment variables
  logger.info('Environment variables loaded:');
  logger.info('NODE_ENV:', process.env.NODE_ENV);
  logger.info('PORT:', process.env.PORT);
  logger.info('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  logger.info('CLIENT_URL:', process.env.CLIENT_URL);
  logger.info('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
  logger.info('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);

  const app = express();

  // Enable CORS for development
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body parser middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Create PostgreSQL pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Test database connection
  pool.connect((err, client, release) => {
    if (err) {
      logger.error('Error connecting to PostgreSQL:', err);
      process.exit(1);
    }
    logger.info('Successfully connected to PostgreSQL');
    release();
  });

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool: pool,
      tableName: 'sessions'
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined,
      httpOnly: true
    }
  }));

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../../build')));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', isAuthenticated, emailRoutes);
  app.use('/api/users', isAuthenticated, userRoutes);
  app.use('/api/highlights', require('../../api/routes/highlights'));
  app.use('/api/feedback', require('../../api/routes/feedback'));

  // Email tracking routes - public endpoints for tracking, protected endpoints for analytics
  app.use('/api/email-tracking', emailTrackingRoutes);

  // Initialize services
  const emailService = require('../services/email-service');
  const analyticsService = require('../services/analytics-service');
  const feedbackService = require('../services/feedback-service');

  // Schedule tasks
  cron.schedule('0 9 * * *', () => {
    logger.info('Running daily engagement check');
    analyticsService.checkEngagement();
  });

  cron.schedule('0 10 * * 1', () => {
    logger.info('Running weekly feedback collection');
    feedbackService.collectFeedback();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Serve React app for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../build/index.html'));
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start server
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info('Agent settings loaded:', agentSettings);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled promise rejection:', err);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    process.exit(1);
  });

  module.exports = app;
} catch (error) {
  console.error('Initialization error:', error);
  process.exit(1);
} 