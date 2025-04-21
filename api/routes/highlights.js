const express = require('express');
const router = express.Router();
const Highlight = require('../../src/models/highlight');
const logger = require('../../src/utils/logger');
const analyticsService = require('../../src/services/analytics-service');

// Get all highlights
router.get('/', async (req, res) => {
  try {
    const highlights = await Highlight.find({})
      .populate('userId', 'name email')
      .select('-__v');
    res.json(highlights);
  } catch (error) {
    logger.error('Error fetching highlights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get highlights by user
router.get('/user/:userId', async (req, res) => {
  try {
    const highlights = await Highlight.find({ userId: req.params.userId })
      .populate('userId', 'name email')
      .select('-__v');
    res.json(highlights);
  } catch (error) {
    logger.error('Error fetching user highlights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get highlight by ID
router.get('/:id', async (req, res) => {
  try {
    const highlight = await Highlight.findById(req.params.id)
      .populate('userId', 'name email')
      .select('-__v');
    
    if (!highlight) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    res.json(highlight);
  } catch (error) {
    logger.error('Error fetching highlight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new highlight
router.post('/', async (req, res) => {
  try {
    const highlight = new Highlight(req.body);
    await highlight.save();
    
    // Track highlight creation in analytics
    await analyticsService.trackHighlightCreation(highlight.userId);
    
    res.status(201).json(highlight);
  } catch (error) {
    logger.error('Error creating highlight:', error);
    res.status(400).json({ error: 'Bad request' });
  }
});

// Update highlight
router.put('/:id', async (req, res) => {
  try {
    const highlight = await Highlight.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!highlight) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    res.json(highlight);
  } catch (error) {
    logger.error('Error updating highlight:', error);
    res.status(400).json({ error: 'Bad request' });
  }
});

// Track highlight view
router.post('/:id/view', async (req, res) => {
  try {
    const highlight = await Highlight.findById(req.params.id);
    if (!highlight) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    await highlight.incrementViews();
    res.json({ message: 'View tracked successfully' });
  } catch (error) {
    logger.error('Error tracking highlight view:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to highlight
router.post('/:id/comments', async (req, res) => {
  try {
    const highlight = await Highlight.findById(req.params.id);
    if (!highlight) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    await highlight.addComment(req.body.userId, req.body.content);
    res.json({ message: 'Comment added successfully' });
  } catch (error) {
    logger.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 