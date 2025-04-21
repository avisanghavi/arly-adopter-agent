const express = require('express');
const router = express.Router();
const passport = require('passport');
const logger = require('../../src/utils/logger');
const { google } = require('googleapis');
const axios = require('axios');

// Google OAuth login route
router.get('/google',
  (req, res, next) => {
    // Store email tracking ID if present
    if (req.query.email_track) {
      logger.info('Storing email tracking ID in session:', {
        emailTrackId: req.query.email_track,
        query: req.query
      });
      req.session.emailTrackId = req.query.email_track;
    }
    
    // Force removal of existing session to ensure fresh OAuth flow
    req.logout((err) => {
      if (err) {
        logger.error('Error during logout:', err);
        return next(err);
      }
      next();
    });
  },
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://mail.google.com/'
    ],
    accessType: 'offline',
    prompt: 'consent'
  })
);

// Google OAuth callback route
router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
      if (err) {
        logger.error('Passport authentication error:', {
          error: err.message,
          stack: err.stack
        });
        return res.redirect('/login?error=' + encodeURIComponent(err.message));
      }
      
      if (!user) {
        logger.error('Authentication failed:', { info });
        return res.redirect('/login?error=auth_failed');
      }
      
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          logger.error('Login error:', loginErr);
          return res.redirect('/login?error=login_failed');
        }
        
        try {
          // Track conversion if user came from email link
          const emailTrackId = req.session.emailTrackId || req.query.email_track;
          
          if (emailTrackId) {
            try {
              const conversionUrl = `${process.env.APP_URL}/api/email-tracking/conversion/${emailTrackId}`;
              await axios.post(conversionUrl, {
                userId: user._id,
                confirmedSignupUrl: process.env.CLIENT_URL
              });
              
              // Clear the tracking ID from session
              delete req.session.emailTrackId;
              await req.session.save();
            } catch (trackingError) {
              logger.error('Error tracking signup conversion:', {
                error: trackingError.message,
                emailTrackId,
                userId: user._id
              });
            }
          }
          
          // Redirect to the client URL after successful signup
          res.redirect(process.env.CLIENT_URL);
        } catch (error) {
          logger.error('Error in callback processing:', error);
          res.redirect('/login?error=callback_error');
        }
      });
    })(req, res, next);
  }
);

// Check authentication status
router.get('/status', (req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated(),
    user: req.user ? {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture
    } : null
  });
});

// Logout route
router.post('/logout', async (req, res) => {
  try {
    // If user has email credentials, revoke the access token
    if (req.user?.emailCredentials?.accessToken) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      try {
        await oauth2Client.revokeToken(req.user.emailCredentials.accessToken);
        logger.info('Successfully revoked Google access token');
      } catch (revokeError) {
        logger.error('Error revoking token:', revokeError);
      }
    }

    req.logout((err) => {
      if (err) {
        logger.error('Error during logout:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    logger.error('Error during logout:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router; 