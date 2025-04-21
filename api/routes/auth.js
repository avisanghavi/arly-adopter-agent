const express = require('express');
const router = express.Router();
const passport = require('passport');
const logger = require('../../src/utils/logger');
const { google } = require('googleapis');
const axios = require('axios');

// Google OAuth login route
router.get('/google', (req, res, next) => {
  try {
    passport.authenticate('google', {
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send'],
      accessType: 'offline',
      prompt: 'consent',
      session: true
    })(req, res, next);
  } catch (error) {
    logger.error('Auth error:', error.message);
    res.redirect('/login?error=auth_error');
  }
});

// Google OAuth callback route
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err || !user) {
      logger.error('Auth failed:', err?.message || 'No user returned');
      return res.redirect('/login?error=auth_failed');
    }
    
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        logger.error('Login error:', loginErr.message);
        return res.redirect('/login?error=login_failed');
      }
      
      res.redirect(process.env.CLIENT_URL);
    });
  })(req, res, next);
});

// Check authentication status
router.get('/status', (req, res) => {
  try {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture
      } : null
    });
  } catch (error) {
    logger.error('Status check error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  try {
    if (req.user?.emailCredentials?.accessToken) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      try {
        await oauth2Client.revokeToken(req.user.emailCredentials.accessToken);
      } catch (revokeError) {
        logger.error('Token revocation error:', revokeError.message);
      }
    }

    req.logout((err) => {
      if (err) {
        logger.error('Logout error:', err.message);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    logger.error('Logout error:', error.message);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router; 