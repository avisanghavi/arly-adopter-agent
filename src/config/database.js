const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: (msg) => logger.debug(msg),
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  });
} else {
  logger.warn('DATABASE_URL not set. Database features will be unavailable.');
  // Create a dummy sequelize instance for development
  sequelize = new Sequelize({
    dialect: 'postgres',
    logging: false
  });
}

module.exports = sequelize; 