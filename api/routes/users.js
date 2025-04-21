const express = require('express');
const router = express.Router();
const User = require('../../src/models/user');
const logger = require('../../src/utils/logger');
const analyticsService = require('../../src/services/analytics-service');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}).select('-__v');
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    
    // Track user creation in analytics
    await analyticsService.trackUserCreation(user._id);
    
    res.status(201).json(user);
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(400).json({ error: 'Bad request' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(400).json({ error: 'Bad request' });
  }
});

// Update user engagement
router.patch('/:id/engagement', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.updateEngagement();
    res.json(user);
  } catch (error) {
    logger.error('Error updating user engagement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user engagement metrics
router.get('/:id/engagement', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const engagement = {
      score: user.engagement.score,
      segment: user.engagement.segment,
      metrics: {
        highlightCount: user.engagement.highlightCount,
        feedbackCount: user.engagement.feedbackCount,
        lastActivity: user.engagement.lastActivity
      }
    };
    
    res.json(engagement);
  } catch (error) {
    logger.error('Error fetching user engagement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 