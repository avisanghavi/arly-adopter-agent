const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const feedbackSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['feature_request', 'bug_report', 'general_feedback'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved', 'closed'],
    default: 'new'
  },
  metadata: {
    context: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      enum: ['email', 'web', 'api'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  response: {
    content: String,
    responderId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  }
}, {
  timestamps: true
});

// Indexes
feedbackSchema.index({ userId: 1 });
feedbackSchema.index({ type: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ 'metadata.createdAt': 1 });

// Methods
feedbackSchema.methods.updateStatus = async function(newStatus) {
  this.status = newStatus;
  this.metadata.updatedAt = new Date();
  return this.save();
};

feedbackSchema.methods.addResponse = async function(responderId, content) {
  this.response = {
    content,
    responderId,
    respondedAt: new Date()
  };
  return this.save();
};

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback; 