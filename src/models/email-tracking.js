const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const emailTrackingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed'],
    default: 'sent'
  },
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  openedAt: {
    type: Date
  },
  openCount: {
    type: Number,
    default: 0
  },
  clicks: [{
    url: String,
    timestamp: Date,
    utmParams: Object,
    userAgent: String,
    ip: String,
    converted: {
      type: Boolean,
      default: false
    },
    conversionTimestamp: Date,
    convertedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    confirmedSignupUrl: String,
    formEvents: [{
      eventType: String,  // e.g., 'continue_click', 'form_submit'
      formStep: String,   // e.g., 'initial_signup'
      success: Boolean,   // whether the action was successful
      timestamp: Date
    }]
  }],
  metadata: {
    template: String,
    recipientName: String,
    campaignPurpose: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String
  }
}, {
  timestamps: true
});

// Indexes
emailTrackingSchema.index({ userId: 1, sentAt: -1 });
emailTrackingSchema.index({ messageId: 1 });
emailTrackingSchema.index({ 'clicks.url': 1 });
emailTrackingSchema.index({ 'clicks.converted': 1 });
emailTrackingSchema.index({ 'clicks.convertedUserId': 1 });

const EmailTracking = mongoose.model('EmailTracking', emailTrackingSchema);
module.exports = EmailTracking; 