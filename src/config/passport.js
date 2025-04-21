require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const logger = require('../utils/logger');
const { google } = require('googleapis');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).lean();
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Ensure we have required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
  throw new Error('Missing required Google OAuth environment variables');
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
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send'],
    accessType: 'offline',
    prompt: 'consent'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists using lean() for faster query
      let user = await User.findOne({ googleId: profile.id }).lean();
      
      if (user) {
        // Update email credentials
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              'emailCredentials.accessToken': accessToken,
              'emailCredentials.refreshToken': refreshToken || user.emailCredentials?.refreshToken,
              'emailCredentials.expiryDate': new Date(Date.now() + 3600000)
            }
          }
        );
        user.emailCredentials = {
          accessToken,
          refreshToken: refreshToken || user.emailCredentials?.refreshToken,
          expiryDate: new Date(Date.now() + 3600000)
        };
      } else {
        // Create new user
        if (!refreshToken) {
          return done(new Error('No refresh token received from Google'));
        }
        
        const newUser = {
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          picture: profile.photos[0].value,
          emailCredentials: {
            accessToken,
            refreshToken,
            expiryDate: new Date(Date.now() + 3600000)
          }
        };
        
        const result = await User.create(newUser);
        user = result.toObject();
      }
      
      return done(null, user);
    } catch (error) {
      logger.error('Auth error:', error.message);
      return done(error);
    }
  }
));

module.exports = passport; 