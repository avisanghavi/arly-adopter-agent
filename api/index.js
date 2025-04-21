const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const logger = require('../src/utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const emailTrackingRoutes = require('./routes/email-tracking');
const emailsRoutes = require('./routes/emails');
const feedbackRoutes = require('./routes/feedback');
const highlightsRoutes = require('./routes/highlights');
const usersRoutes = require('./routes/users');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

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