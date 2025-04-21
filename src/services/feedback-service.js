const mongoose = require('mongoose');
const logger = require('../utils/logger');
const agentSettings = require('../../config/agent-settings.json');
const emailService = require('./email-service');

class FeedbackService {
  constructor() {
    this.settings = agentSettings.feedback;
  }

  async processFeedback(feedback) {
    try {
      logger.info('Processing feedback:', feedback);
      // Basic feedback processing - can be enhanced later
      return {
        clusters: [],
        sentiment: 'neutral',
        priority: feedback.priority
      };
    } catch (error) {
      logger.error('Error processing feedback:', error);
      throw error;
    }
  }

  async collectFeedback() {
    try {
      logger.info('Running feedback collection');
      const User = mongoose.model('User');
      
      // Find users who haven't given feedback recently
      const users = await User.find({
        'preferences.emailNotifications': true,
        'engagement.lastFeedback': {
          $lt: new Date(Date.now() - this.settings.collectionInterval * 24 * 60 * 60 * 1000)
        }
      });

      // Queue feedback request emails
      for (const user of users) {
        const feedbackUrl = `${process.env.APP_URL}/feedback/${user._id}`;
        emailService.addToQueue({
          templateName: 'feedback',
          to: user.email,
          subject: 'We Value Your Feedback',
          data: {
            name: user.name,
            feedbackUrl,
            preferencesUrl: `${process.env.APP_URL}/preferences`
          }
        });
      }

      logger.info(`Queued feedback requests for ${users.length} users`);
    } catch (error) {
      logger.error('Error collecting feedback:', error);
    }
  }

  async analyzeFeedbackTrends() {
    try {
      const Feedback = mongoose.model('Feedback');
      
      // Get recent feedback
      const recentFeedback = await Feedback.find({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      // Basic trend analysis
      const trends = {
        totalCount: recentFeedback.length,
        byType: {},
        byPriority: {},
        byStatus: {}
      };

      recentFeedback.forEach(feedback => {
        // Count by type
        trends.byType[feedback.type] = (trends.byType[feedback.type] || 0) + 1;
        
        // Count by priority
        trends.byPriority[feedback.priority] = (trends.byPriority[feedback.priority] || 0) + 1;
        
        // Count by status
        trends.byStatus[feedback.status] = (trends.byStatus[feedback.status] || 0) + 1;
      });

      return trends;
    } catch (error) {
      logger.error('Error analyzing feedback trends:', error);
      return null;
    }
  }
}

// Create and export singleton instance
const feedbackService = new FeedbackService();
module.exports = feedbackService; 