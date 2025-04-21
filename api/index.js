const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const logger = require('../src/utils/logger');
const MongoStore = require('connect-mongo');

// Import routes
const authRoutes = require('./routes/auth');
const emailTrackingRoutes = require('./routes/email-tracking');
const emailsRoutes = require('./routes/emails');
const feedbackRoutes = require('./routes/feedback');
const highlightsRoutes = require('./routes/highlights');
const usersRoutes = require('./routes/users');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://the-agenttoend-agents-e8jd4q70-avisanghavis-projects.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Import and configure passport
require('../src/config/passport');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/email-tracking', emailTrackingRoutes);
app.use('/api/emails', emailsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/highlights', highlightsRoutes);
app.use('/api/users', usersRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'VideoFusion Email Tracking API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app; 