const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transports only if not running on Vercel
if (!process.env.VERCEL) {
  logger.add(new winston.transports.File({ 
    filename: path.join(__dirname, '../../logs/error.log'), 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: path.join(__dirname, '../../logs/combined.log') 
  }));
}

module.exports = logger; 