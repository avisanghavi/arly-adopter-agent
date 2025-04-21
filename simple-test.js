require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  // Create a test account
  console.log('Creating test configuration...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GOOGLE_USER_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  try {
    // Verify connection configuration
    await transporter.verify();
    console.log('Server is ready to take our messages');

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: process.env.GOOGLE_USER_EMAIL,
      to: process.env.GOOGLE_USER_EMAIL,
      subject: 'Simple Test Email',
      text: 'If you see this, the email configuration is working!',
      html: '<b>If you see this, the email configuration is working!</b>'
    });

    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

testEmail(); 