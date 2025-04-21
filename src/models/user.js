const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  picture: String,
  emailCredentials: {
    accessToken: String,
    refreshToken: String,
    expiryDate: Date
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
  rateLimits: {
    dailyEmailsSent: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    },
    maxDailyEmails: {
      type: Number,
      default: 50
    }
  },
  engagement: {
    score: {
      type: Number,
      default: 0
    },
    segment: {
      type: String,
      enum: ['high_engagement', 'medium_engagement', 'low_engagement'],
      default: 'low_engagement'
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    highlightCount: {
      type: Number,
      default: 0
    },
    feedbackCount: {
      type: Number,
      default: 0
    }
  },
  preferences: {
    emailFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    featureHighlights: {
      type: Boolean,
      default: true
    },
    feedbackRequests: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    signupDate: {
      type: Date,
      default: Date.now
    },
    lastLogin: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ 'metadata.lastLogin': 1 });

// Method to check if user can send more emails today
userSchema.methods.canSendEmail = function() {
  const now = new Date();
  const lastReset = this.rateLimits.lastResetDate;
  
  // Reset counter if it's a new day
  if (now.getDate() !== lastReset.getDate() || 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear()) {
    this.rateLimits.dailyEmailsSent = 0;
    this.rateLimits.lastResetDate = now;
    return true;
  }
  
  return this.rateLimits.dailyEmailsSent < this.rateLimits.maxDailyEmails;
};

// Method to increment daily email count
userSchema.methods.incrementEmailCount = function() {
  this.rateLimits.dailyEmailsSent += 1;
  return this.save();
};

// Method to check if OAuth tokens need refresh
userSchema.methods.needsTokenRefresh = function() {
  if (!this.emailCredentials?.accessToken || !this.emailCredentials?.refreshToken) {
    return true;
  }
  
  if (!this.emailCredentials.expiryDate) {
    return true;
  }

  // Add 5 minute buffer before expiry
  const expiryWithBuffer = new Date(this.emailCredentials.expiryDate.getTime() - (5 * 60 * 1000));
  return new Date() >= expiryWithBuffer;
};

// Methods
userSchema.methods.updateEngagement = async function() {
  const engagementScore = this.calculateEngagementScore();
  this.engagement.score = engagementScore;
  this.engagement.segment = this.determineEngagementSegment(engagementScore);
  return this.save();
};

userSchema.methods.calculateEngagementScore = function() {
  const weights = {
    highlightCount: 0.4,
    feedbackCount: 0.3,
    lastActivity: 0.3
  };

  const daysSinceLastActivity = (Date.now() - this.engagement.lastActivity) / (1000 * 60 * 60 * 24);
  const activityScore = Math.max(0, 1 - (daysSinceLastActivity / 30)); // 30 days max

  return (
    (this.engagement.highlightCount / 10) * weights.highlightCount +
    (this.engagement.feedbackCount / 5) * weights.feedbackCount +
    activityScore * weights.lastActivity
  );
};

userSchema.methods.determineEngagementSegment = function(score) {
  if (score >= 0.7) return 'high_engagement';
  if (score <= 0.3) return 'low_engagement';
  return 'medium_engagement';
};

const User = mongoose.model('User', userSchema);

module.exports = User; 