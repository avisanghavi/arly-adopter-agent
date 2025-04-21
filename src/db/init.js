const mongoose = require('mongoose');
const logger = require('../utils/logger');

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'early_adopter'], default: 'early_adopter' },
  engagement: {
    score: { type: Number, default: 0 },
    segment: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    lastActivity: { type: Date, default: Date.now },
    highlightCount: { type: Number, default: 0 },
    feedbackCount: { type: Number, default: 0 }
  },
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    feedbackFrequency: { type: Number, default: 7 } // days
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Highlight Schema
const highlightSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['feature_usage', 'feedback', 'achievement'], required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['feature', 'bug', 'suggestion', 'general'], required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ['new', 'in_progress', 'resolved', 'closed'], default: 'new' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  responses: [{
    responderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'engagement.score': -1 });
userSchema.index({ 'engagement.lastActivity': -1 });

highlightSchema.index({ userId: 1, createdAt: -1 });
highlightSchema.index({ type: 1, createdAt: -1 });

feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, status: 1 });
feedbackSchema.index({ status: 1, priority: 1 });

// Create models
const User = mongoose.model('User', userSchema);
const Highlight = mongoose.model('Highlight', highlightSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Initialize database
async function initializeDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('Connected to MongoDB');

    // Create collections if they don't exist
    await Promise.all([
      User.createCollection(),
      Highlight.createCollection(),
      Feedback.createCollection()
    ]);

    logger.info('Collections created successfully');

    // Create indexes
    await Promise.all([
      User.syncIndexes(),
      Highlight.syncIndexes(),
      Feedback.syncIndexes()
    ]);

    logger.info('Indexes created successfully');

    // Create admin user if it doesn't exist
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@videofusion.io',
        role: 'admin',
        preferences: {
          emailNotifications: true,
          feedbackFrequency: 1
        }
      });
      logger.info('Admin user created');
    }

    logger.info('Database initialization completed');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  User,
  Highlight,
  Feedback
}; 