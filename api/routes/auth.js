const express = require('express');
const router = express.Router();
const passport = require('passport');
const logger = require('../../src/utils/logger');
const google = require('googleapis');
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
    } else {
      logger.info('No email tracking ID found in query:', {
        query: req.query,
        url: req.url
      });
    }
    
    // Force removal of existing session to ensure fresh OAuth flow
    req.logout((err) => {
      if (err) {
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
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: true
  }),
  async (req, res) => {
    try {
      // Check if we got the required tokens
      if (!req.user?.emailCredentials?.refreshToken) {
        logger.error('OAuth callback: Missing refresh token', {
          userId: req.user?._id,
          email: req.user?.email
        });
        return res.redirect('/login?error=missing_refresh_token');
      }

      // Track conversion if user came from email link
      const emailTrackId = req.session.emailTrackId || req.query.email_track;
      logger.info('Checking for email tracking ID in callback:', {
        emailTrackId,
        sessionEmailTrackId: req.session.emailTrackId,
        queryEmailTrackId: req.query.email_track,
        sessionData: req.session,
        hasUser: !!req.user,
        query: req.query
      });

      if (emailTrackId && req.user) {
        try {
          const conversionUrl = `${process.env.APP_URL || 'http://localhost:3001'}/api/email-tracking/conversion/${emailTrackId}`;
          logger.info('Attempting to track conversion:', {
            conversionUrl,
            userId: req.user._id,
            confirmedSignupUrl: 'https://app.videofusion.io/home',
            sessionId: req.sessionID,
            sessionData: req.session
          });

          const response = await axios.post(conversionUrl, {
            userId: req.user._id,
            confirmedSignupUrl: 'https://app.videofusion.io/home'
          });

          logger.info('Conversion tracking response:', {
            status: response.status,
            data: response.data,
            messageId: emailTrackId
          });

          // Clear the tracking ID from session
          delete req.session.emailTrackId;
          await req.session.save();
        } catch (trackingError) {
          logger.error('Error tracking signup conversion:', {
            error: trackingError.message,
            stack: trackingError.stack,
            emailTrackId,
            userId: req.user._id,
            response: trackingError.response?.data,
            sessionData: req.session
          });
        }
      } else {
        logger.warn('Missing required data for conversion tracking:', {
          hasEmailTrackId: !!emailTrackId,
          sessionEmailTrackId: !!req.session.emailTrackId,
          queryEmailTrackId: !!req.query.email_track,
          hasUser: !!req.user,
          sessionData: req.session,
          queryParams: req.query
        });
      }

      logger.info('User logged in successfully:', { 
        userId: req.user.id,
        hasRefreshToken: !!req.user.emailCredentials.refreshToken,
        fromEmailLink: !!emailTrackId
      });
      
      res.redirect('/');
    } catch (error) {
      logger.error('Error in OAuth callback:', error);
      res.redirect('/login?error=callback_error');
    }
  }
);

// Check authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture,
        role: req.user.role,
        emailQuota: {
          daily: req.user.rateLimits.maxDailyEmails,
          used: req.user.rateLimits.dailyEmailsSent
        }
      }
    });
  } else {
    res.json({ isAuthenticated: false });
  }
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
        // Continue with logout even if revocation fails
      }

      // Clear user's email credentials
      req.user.emailCredentials = undefined;
      await req.user.save();
    }

    // Perform logout
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

// Refresh Gmail token
router.post('/refresh-token', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials from user's refresh token
    oauth2Client.setCredentials({
      refresh_token: req.user.emailCredentials.refreshToken
    });

    // Get new access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update user's credentials in database
    req.user.emailCredentials = {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || req.user.emailCredentials.refreshToken,
      expiryDate: new Date(Date.now() + (credentials.expiry_date || 3600000))
    };
    await req.user.save();

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router; 