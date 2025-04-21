const agentSettings = require('../../config/agent-settings.json');
const logger = require('../utils/logger');

class DecisionEngine {
  constructor() {
    this.engagementThresholds = agentSettings.engagement.triggers;
    this.metrics = agentSettings.engagement.metrics;
  }

  async analyzeUserEngagement(userData) {
    try {
      const engagementScore = this.calculateEngagementScore(userData);
      const userSegment = this.determineUserSegment(engagementScore);
      
      return {
        score: engagementScore,
        segment: userSegment,
        actions: this.determineActions(userSegment, userData)
      };
    } catch (error) {
      logger.error('Error analyzing user engagement:', error);
      throw error;
    }
  }

  calculateEngagementScore(userData) {
    const weights = {
      highlightCount: 0.4,
      feedbackCount: 0.3,
      lastActivity: 0.3
    };

    const highlightScore = Math.min(
      userData.highlightCount / this.metrics.highlight_threshold,
      1
    );
    
    const feedbackScore = Math.min(
      userData.feedbackCount / this.metrics.feedback_threshold,
      1
    );
    
    const activityScore = this.calculateActivityScore(userData.lastActivity);
    
    return (
      highlightScore * weights.highlightCount +
      feedbackScore * weights.feedbackCount +
      activityScore * weights.lastActivity
    );
  }

  calculateActivityScore(lastActivity) {
    const inactivityPeriod = this.parseInactivityPeriod(this.metrics.inactivity_period);
    const daysSinceLastActivity = (Date.now() - new Date(lastActivity)) / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - (daysSinceLastActivity / inactivityPeriod));
  }

  parseInactivityPeriod(period) {
    const value = parseInt(period);
    if (period.includes('d')) return value;
    if (period.includes('w')) return value * 7;
    if (period.includes('m')) return value * 30;
    return 7; // Default to 7 days
  }

  determineUserSegment(engagementScore) {
    if (engagementScore >= this.engagementThresholds.high_engagement) {
      return 'high_engagement';
    } else if (engagementScore <= this.engagementThresholds.low_engagement) {
      return 'low_engagement';
    }
    return 'medium_engagement';
  }

  determineActions(segment, userData) {
    const actions = [];
    
    switch (segment) {
      case 'high_engagement':
        actions.push({
          type: 'feedback_request',
          priority: 'high',
          reason: 'User is highly engaged, good time to collect feedback'
        });
        break;
        
      case 'low_engagement':
        actions.push({
          type: 'reengagement_email',
          priority: 'high',
          reason: 'User engagement is below threshold'
        });
        break;
        
      case 'medium_engagement':
        if (userData.highlightCount < this.metrics.highlight_threshold) {
          actions.push({
            type: 'feature_highlight',
            priority: 'medium',
            reason: 'User has not created enough highlights'
          });
        }
        break;
    }
    
    return actions;
  }

  async clusterFeedback(feedbackData) {
    try {
      // Simple clustering based on keywords and sentiment
      const clusters = {
        feature_requests: [],
        bugs: [],
        general_feedback: []
      };

      feedbackData.forEach(feedback => {
        const text = feedback.text.toLowerCase();
        
        if (text.includes('bug') || text.includes('error') || text.includes('issue')) {
          clusters.bugs.push(feedback);
        } else if (text.includes('add') || text.includes('feature') || text.includes('would like')) {
          clusters.feature_requests.push(feedback);
        } else {
          clusters.general_feedback.push(feedback);
        }
      });

      return clusters;
    } catch (error) {
      logger.error('Error clustering feedback:', error);
      throw error;
    }
  }
}

module.exports = new DecisionEngine(); 