require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Pool } = require('pg');
const logger = require('../utils/logger');
const { google } = require('googleapis');

// Debug logging
console.log('Loading Passport config with:');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('Redirect URI:', process.env.GOOGLE_REDIRECT_URI);

try {
  // Initialize database pool if DATABASE_URL is available
  let pool;
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    if (!pool) {
      logger.warn('Database not available for user deserialization');
      return done(null, null);
    }

    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      const user = result.rows[0];
      done(null, user);
    } catch (error) {
      logger.error('Error deserializing user:', error);
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
      if (!pool) {
        logger.error('Database not available for user authentication');
        return done(new Error('Database not available'));
      }

      try {
        logger.info('Google OAuth callback received:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          profileId: profile.id,
          scopes: profile._json.scope
        });

        // Check if user exists
        const userResult = await pool.query(
          'SELECT * FROM users WHERE google_id = $1',
          [profile.id]
        );
        let user = userResult.rows[0];
        
        if (user) {
          // If user exists but no new refresh token, revoke access and return error
          if (!refreshToken && !user.email_credentials?.refresh_token) {
            logger.error('No refresh token available for existing user');
            try {
              // Revoke existing access
              if (user.email_credentials?.access_token) {
                await oauth2Client.revokeToken(user.email_credentials.access_token);
              }
              // Clear credentials
              await pool.query(
                'UPDATE users SET email_credentials = NULL WHERE id = $1',
                [user.id]
              );
            } catch (revokeError) {
              logger.error('Error revoking token:', revokeError);
            }
            return done(new Error('No refresh token available. Please try logging in again.'));
          }

          // Update email credentials
          const emailCredentials = {
            access_token: accessToken,
            refresh_token: refreshToken || user.email_credentials?.refresh_token,
            expiry_date: new Date(Date.now() + 3600000) // 1 hour from now
          };

          await pool.query(
            'UPDATE users SET email_credentials = $1 WHERE id = $2',
            [emailCredentials, user.id]
          );

          logger.info('Updated existing user credentials:', {
            userId: user.id,
            hasRefreshToken: !!emailCredentials.refresh_token
          });
        } else {
          // Create new user
          if (!refreshToken) {
            logger.error('No refresh token received for new user');
            return done(new Error('No refresh token received from Google'));
          }
          
          const emailCredentials = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expiry_date: new Date(Date.now() + 3600000)
          };

          const newUserResult = await pool.query(
            `INSERT INTO users 
             (google_id, email, name, picture, email_credentials) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [
              profile.id,
              profile.emails[0].value,
              profile.displayName,
              profile.photos[0].value,
              emailCredentials
            ]
          );

          user = newUserResult.rows[0];
          logger.info('Created new user:', {
            userId: user.id,
            hasRefreshToken: !!user.email_credentials?.refresh_token
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