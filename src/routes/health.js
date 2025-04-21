const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbInfo = {
      status: dbState === 1 ? 'connected' : 'disconnected',
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      version: mongoose.version
    };

    logger.info('Health check performed:', dbInfo);
    
    res.status(200).json({
      status: 'ok',
      database: dbInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection check failed',
      error: error.message
    });
  }
});

module.exports = router; 