require('dotenv').config();
const emailService = require('./src/services/email-service');
const logger = require('./src/utils/logger');

async function testEmailService() {
  try {
    console.log('Testing email service...');
    
    console.log('Attempting to send test email...');
    const result = await emailService.sendEmail(
      process.env.GOOGLE_USER_EMAIL, // Send to ourselves
      'Test Email from VideoFusion',
      `
      <h1>Test Email</h1>
      <p>This is a test email sent at ${new Date().toLocaleString()}</p>
      <p>If you're seeing this, the email service is working correctly!</p>
      `
    );

    console.log('✓ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    
  } catch (error) {
    console.error('Error during email test:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

testEmailService(); 