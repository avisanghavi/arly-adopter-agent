const express = require('express');
const router = express.Router();
const Feedback = require('../../src/models/feedback');
const logger = require('../../src/utils/logger');
const feedbackService = require('../../src/services/feedback-service');

// Get all feedback
router.get('/', async (req, res) => {
  try {
    const feedback = await Feedback.find({})
      .populate('userId', 'name email')
      .select('-__v');
    res.json(feedback);
  } catch (error) {
    logger.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get feedback by user
router.get('/user/:userId', async (req, res) => {
  try {
    const feedback = await Feedback.find({ userId: req.params.userId })
      .populate('userId', 'name email')
      .select('-__v');
    res.json(feedback);
  } catch (error) {
    logger.error('Error fetching user feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get feedback by ID
router.get('/:id', async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('userId', 'name email')
      .select('-__v');
    
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    res.json(feedback);
  } catch (error) {
    logger.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new feedback
router.post('/', async (req, res) => {
  try {
    const feedback = new Feedback(req.body);
    await feedback.save();
    
    // Process feedback through the feedback service
    const clusters = await feedbackService.processFeedback(feedback);
    
    res.status(201).json({
      feedback,
      clusters
    });
  } catch (error) {
    logger.error('Error creating feedback:', error);
    res.status(400).json({ error: 'Bad request' });
  }
});

// Update feedback status
router.patch('/:id/status', async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    await feedback.updateStatus(req.body.status);
    res.json(feedback);
  } catch (error) {
    logger.error('Error updating feedback status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add response to feedback
router.post('/:id/response', async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    await feedback.addResponse(req.body.responderId, req.body.content);
    res.json(feedback);
  } catch (error) {
    logger.error('Error adding feedback response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get feedback trends
router.get('/analytics/trends', async (req, res) => {
  try {
    const trends = await feedbackService.analyzeFeedbackTrends();
    res.json(trends);
  } catch (error) {
    logger.error('Error analyzing feedback trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 