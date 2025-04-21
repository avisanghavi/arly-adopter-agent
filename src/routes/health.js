const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbInfo = {
      status: dbState === 1 ? 'connected' : 'disconnected',
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      version: mongoose.version
    };

    // Check environment configuration
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      appUrl: process.env.APP_URL,
      clientUrl: process.env.CLIENT_URL,
      googleAuthConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
      mongoDbConfigured: !!process.env.MONGODB_URI,
      sessionConfigured: !!process.env.SESSION_SECRET
    };

    // Check server status
    const serverInfo = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    };

    logger.info('Health check performed:', { database: dbInfo, environment: envInfo });
    
    res.status(200).json({
      status: 'ok',
      database: dbInfo,
      environment: envInfo,
      server: serverInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 