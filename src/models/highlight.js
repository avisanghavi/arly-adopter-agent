const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const highlightSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'url', 'image', 'code'],
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    source: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    }
  },
  engagement: {
    views: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    comments: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true
});

// Indexes
highlightSchema.index({ userId: 1 });
highlightSchema.index({ tags: 1 });
highlightSchema.index({ 'metadata.createdAt': 1 });

// Methods
highlightSchema.methods.incrementViews = async function() {
  this.engagement.views += 1;
  this.metadata.lastAccessed = new Date();
  return this.save();
};

highlightSchema.methods.addComment = async function(userId, content) {
  this.engagement.comments.push({
    userId,
    content
  });
  return this.save();
};

const Highlight = mongoose.model('Highlight', highlightSchema);

module.exports = Highlight; 