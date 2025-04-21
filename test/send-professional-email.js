const emailService = require('../src/services/email-service');
require('dotenv').config();

async function sendProfessionalEmail() {
  try {
    // Create a mock user object since the email service requires user credentials
    const mockUser = {
      email: process.env.GOOGLE_USER_EMAIL,
      emailCredentials: {
        accessToken: process.env.GOOGLE_ACCESS_TOKEN,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        expiryDate: new Date(Date.now() + 3600000)
      },
      canSendEmail: () => true,
      needsTokenRefresh: () => false,
      incrementEmailCount: async () => {},
      save: async () => {}
    };

    const emailData = {
      recipientName: "Stephen",
      subject: "Introducing VideoFusion - Your AI Video Marketing Agent",
      mainContent: `
        <p>I hope all is well. Over the past year, we have been working with customers like you to understand how we can help them maximize their entire video content library (including what VideoFusion delivers).</p>
        <p>And here is what the majority have asked:</p>
      `,
      featureList: [
        "Can you help us get a Social Proof clip from UGC Content for product pages?",
        "Can we use Hooks from this AI Creative for our Website or Email?",
        "Can we get the CTA from UGC content and use it in our Social Shopping?"
      ],
      ctaButton: {
        text: "Claim 10 Free Minutes",
        url: "https://videofusion.ai/claim-offer"
      },
      companyLogo: "https://videofusion.ai/logo.png",
      senderName: "Sundeep Sanghavi",
      senderTitle: "Co-founder & CEO",
      phone: "+1 650-787-3588",
      email: "sundeep@videofusion.ai",
      socialLinks: [
        {
          platform: "LinkedIn",
          url: "https://linkedin.com/in/sundeepsanghavi"
        },
        {
          platform: "Let's Connect!",
          url: "https://videofusion.ai/connect"
        }
      ]
    };

    console.log('Sending professional email...');
    const result = await emailService.sendEmail(
      mockUser,
      process.env.GOOGLE_USER_EMAIL, // Send to ourselves for testing
      emailData.subject,
      await emailService.renderEmail('professional-announcement', emailData)
    );

    console.log('✓ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    
  } catch (error) {
    console.error('Error sending professional email:', error.message);
    console.error('\nStack trace:', error.stack);
  }
}

sendProfessionalEmail(); 