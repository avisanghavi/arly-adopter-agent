require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const logger = require('../utils/logger');
const { google } = require('googleapis');

// Debug logging
console.log('Loading Passport config with:');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('Redirect URI:', process.env.GOOGLE_REDIRECT_URI);

try {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Ensure we have required environment variables
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not set in environment variables');
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_SECRET is not set in environment variables');
  }
  if (!process.env.GOOGLE_REDIRECT_URI) {
    throw new Error('GOOGLE_REDIRECT_URI is not set in environment variables');
  }

  // Create OAuth2 client for token management
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
      scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://mail.google.com/'
      ],
      accessType: 'offline',
      prompt: 'consent',
      includeGrantedScopes: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        logger.info('Google OAuth callback received:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          profileId: profile.id,
          scopes: profile._json.scope
        });

        // Check if user exists
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
          // If user exists but no new refresh token, revoke access and return error
          if (!refreshToken && !user.emailCredentials?.refreshToken) {
            logger.error('No refresh token available for existing user');
            try {
              // Revoke existing access
              if (user.emailCredentials?.accessToken) {
                await oauth2Client.revokeToken(user.emailCredentials.accessToken);
              }
              // Clear credentials
              user.emailCredentials = undefined;
              await user.save();
            } catch (revokeError) {
              logger.error('Error revoking token:', revokeError);
            }
            return done(new Error('No refresh token available. Please try logging in again.'));
          }

          // Update email credentials
          user.emailCredentials = {
            accessToken,
            refreshToken: refreshToken || user.emailCredentials?.refreshToken,
            expiryDate: new Date(Date.now() + 3600000) // 1 hour from now
          };
          await user.save();
          logger.info('Updated existing user credentials:', {
            userId: user._id,
            hasRefreshToken: !!user.emailCredentials.refreshToken
          });
        } else {
          // Create new user
          if (!refreshToken) {
            logger.error('No refresh token received for new user');
            return done(new Error('No refresh token received from Google'));
          }
          
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos[0].value,
            emailCredentials: {
              accessToken,
              refreshToken,
              expiryDate: new Date(Date.now() + 3600000)
            }
          });
          logger.info('Created new user:', {
            userId: user._id,
            hasRefreshToken: !!user.emailCredentials.refreshToken
          });
        }
        
        return done(null, user);
      } catch (error) {
        logger.error('Error in Google OAuth callback:', {
          error: error.message,
          stack: error.stack
        });
        return done(error);
      }
    }
  ));

  console.log('Passport configuration completed successfully');
} catch (error) {
  console.error('Error configuring passport:', error);
  throw error;
}

module.exports = passport; 