const mongoose = require('mongoose');
const logger = require('../utils/logger');

let mongoConnection;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      logger.error('MONGODB_URI is not defined in environment variables');
      throw new Error('MONGODB_URI is not defined');
    }

    // If we already have a connection and it's ready, reuse it
    if (mongoose.connection.readyState === 1) {
      logger.info('Reusing existing MongoDB connection');
      return mongoose.connection;
    }

    logger.info('Attempting to connect to MongoDB Atlas...');
    mongoConnection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      },
      // Adjust timeouts for serverless environment
      connectTimeoutMS: 5000, // 5 seconds
      socketTimeoutMS: 30000, // 30 seconds
      // Add connection pool settings for serverless
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 5000, // Close idle connections after 5 seconds
      serverSelectionTimeoutMS: 5000 // Fail fast if no server available
    });

    // Verify the connection
    const db = mongoose.connection;
    if (db.readyState === 1) {
      logger.info('MongoDB Atlas connected successfully');
      logger.info(`Connected to database: ${db.name}`);
    } else {
      throw new Error('MongoDB connection not established');
    }

    return mongoConnection;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    // Add more detailed error information
    if (error.name === 'MongoServerSelectionError') {
      logger.error('Could not connect to any MongoDB server');
    }
    throw error;
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB Atlas');
});

// Clean up connection on process termination
const cleanup = async () => {
  try {
    await mongoose.connection.close();
    logger.info('Mongoose connection closed through app termination');
    process.exit(0);
  } catch (err) {
    logger.error('Error closing mongoose connection:', err);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = connectDB; 