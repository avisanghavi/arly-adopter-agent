const mongoose = require('mongoose');
const logger = require('../utils/logger');

let mongoConnection;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      logger.error('MONGODB_URI is not defined in environment variables');
      throw new Error('MONGODB_URI is not defined');
    }

    if (!mongoConnection) {
      logger.info('Attempting to connect to MongoDB...');
      mongoConnection = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      
      // Verify the connection
      const db = mongoose.connection;
      if (db.readyState === 1) {
        logger.info('MongoDB connected successfully');
        logger.info(`Connected to database: ${db.name}`);
        logger.info(`Host: ${db.host}`);
        logger.info(`Port: ${db.port}`);
      } else {
        throw new Error('MongoDB connection not established');
      }
    }
    return mongoConnection;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB');
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('Mongoose connection closed through app termination');
    process.exit(0);
  } catch (err) {
    logger.error('Error closing mongoose connection:', err);
    process.exit(1);
  }
});

module.exports = connectDB; 