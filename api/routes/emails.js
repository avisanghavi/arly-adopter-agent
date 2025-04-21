const express = require('express');
const router = express.Router();
const emailService = require('../../src/services/email-service');
const logger = require('../../src/utils/logger');
const OpenAI = require('openai');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Preview email template
router.post('/preview', async (req, res) => {
  try {
    const { template, data } = req.body;
    const html = await emailService.renderEmail(template, data);
    res.json({ html });
  } catch (error) {
    logger.error('Error previewing email:', error);
    res.status(500).json({ error: 'Failed to preview email' });
  }
});

// Analyze product description
router.post('/analyze-product', async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Product description is required' });
    }

    // Analyze the content using OpenAI
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a product analysis expert. Analyze the provided product description and extract key information that would be valuable for personalized email outreach. Focus on unique features, benefits, and compelling aspects of the product."
        },
        {
          role: "user",
          content: `Please analyze this product description and provide a concise summary of the key points that would be valuable for personalized email outreach:\n\n${description}`
        }
      ],
      model: "gpt-3.5-turbo",
    });

    const analysis = completion.choices[0].message.content;
    res.json({ analysis });
  } catch (error) {
    console.error('Error analyzing product:', error);
    res.status(500).json({ error: 'Failed to analyze product description' });
  }
});

// Analyze LinkedIn profile
async function analyzeLinkedInProfile(url) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing LinkedIn profiles and extracting relevant information for personalized outreach. Focus on professional achievements, interests, and potential connection points."
        },
        {
          role: "user",
          content: `Please analyze this LinkedIn profile URL and provide key insights that would be valuable for personalized outreach: ${url}`
        }
      ],
      model: "gpt-3.5-turbo",
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing LinkedIn profile:', error);
    return null;
  }
}

// Get tone guidelines based on relationship level
function getToneGuidelines(relationshipLevel) {
  switch (relationshipLevel) {
    case 'cold':
      return "Use a professional and respectful tone. Focus on establishing credibility and mutual value. Avoid assumptions of familiarity.";
    case 'warm':
      return "Use a friendly yet professional tone. Reference mutual connections or past interactions if applicable. Show understanding of their work context.";
    case 'close':
      return "Use a familiar and conversational tone. Feel free to reference shared experiences or inside context. Be direct while maintaining professionalism.";
    default:
      return "Use a balanced professional tone.";
  }
}

// Generate email content using OpenAI
router.post('/generate', async (req, res) => {
  try {
    const { template, recipient, productAnalysis } = req.body;
    
    // Get LinkedIn insights if URL is provided
    let linkedInInsights = '';
    if (recipient.linkedinUrl) {
      linkedInInsights = await analyzeLinkedInProfile(recipient.linkedinUrl);
    }

    // Get tone guidelines based on relationship level
    const toneGuidelines = getToneGuidelines(recipient.relationshipLevel);

    // Construct the prompt based on template and product analysis
    let prompt = `Write a brief, impactful email to introduce VideoFusion to this potential customer.\n\n`;
    
    if (productAnalysis) {
      prompt += `Product Analysis:\n${productAnalysis}\n\n`;
    }

    prompt += `Recipient Information:\n`;
    prompt += `- Name: ${recipient.name}\n`;
    prompt += `- Email: ${recipient.email}\n`;
    if (recipient.company) prompt += `- Company: ${recipient.company}\n`;
    if (recipient.role) prompt += `- Role: ${recipient.role}\n`;
    if (recipient.interests) prompt += `- Interests/Notes: ${recipient.interests}\n`;
    
    if (linkedInInsights) {
      prompt += `\nLinkedIn Profile Insights:\n${linkedInInsights}\n`;
    }

    prompt += `\nRelationship Context: ${recipient.relationshipLevel}\n`;
    prompt += `Tone Guidelines: ${toneGuidelines}\n`;
    
    prompt += `\nTemplate Type: ${template}\n`;
    prompt += `\nWrite a detailed, high-impact email that includes:\n`;
    prompt += `1. A clear subject line starting with "Subject: " that includes an appropriate emoji\n`;
    prompt += `2. A personalized greeting that reflects our relationship level\n`;
    prompt += `3. An engaging opening paragraph that establishes context and relevance\n`;
    prompt += `4. 3-4 concise paragraphs focusing on:\n`;
    prompt += `   • The recipient's specific challenges or goals (based on their role/company)\n`;
    prompt += `   • How VideoFusion addresses these challenges\n`;
    prompt += `   • Key benefits and unique value propositions\n`;
    prompt += `   • Social proof or relevant success stories\n`;
    prompt += `5. A bullet-point list of 2-3 most relevant features for their use case\n`;
    prompt += `6. A clear, action-oriented CTA appropriate for the relationship level\n`;
    prompt += `7. A professional sign-off that matches the tone\n\n`;
    prompt += `Use appropriate emojis to highlight key points and make the email more engaging. Format the content with proper spacing and bullet points for better readability.\n`;
    prompt += `Make specific references to their background and LinkedIn insights where relevant. Adjust language and familiarity based on the relationship level.`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert email writer who specializes in relationship-based personalization. You excel at crafting messages that match the appropriate level of familiarity while remaining professional. You analyze recipient information deeply to create truly personalized connections. 

Key guidelines:
• Start with a clear subject line prefixed with 'Subject: ' and include a relevant emoji
• Use appropriate emojis throughout the email to highlight key points (but don't overuse them)
• Format content with proper spacing and bullet points for better readability
• Keep paragraphs concise but informative
• Ensure the tone matches the relationship level: ${recipient.relationshipLevel}
${toneGuidelines}`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-3.5-turbo",
    });

    const generatedContent = completion.choices[0].message.content;
    res.json({ content: generatedContent });
  } catch (error) {
    console.error('Error generating email:', error);
    res.status(500).json({ error: 'Failed to generate email content' });
  }
});

// Send test email
router.post('/send-test', async (req, res) => {
  try {
    const { recipientName, testEmail, generatedContent, campaignPurpose } = req.body;
    
    if (!testEmail || !generatedContent) {
      return res.status(400).json({ error: 'Email and content are required' });
    }

    // Extract the subject line from the generated content
    const contentLines = generatedContent.split('\n');
    let subject = '';
    let body = generatedContent;

    // Look for "Subject:" line
    const subjectLineIndex = contentLines.findIndex(line => 
      line.toLowerCase().trim().startsWith('subject:')
    );

    if (subjectLineIndex !== -1) {
      subject = contentLines[subjectLineIndex].substring('subject:'.length).trim();
      // Remove the subject line from the body
      body = contentLines.slice(subjectLineIndex + 1).join('\n').trim();
    } else {
      // Fallback subject if none found in content
      subject = campaignPurpose || 'Important Information About VideoFusion';
    }

    // Create HTML email body with proper formatting
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .content {
            padding: 20px 0;
          }
          p {
            margin-bottom: 1em;
          }
        </style>
      </head>
      <body>
        <div class="content">
          ${body.split('\n\n').map(paragraph => 
            `<p>${paragraph.trim()}</p>`
          ).join('\n')}
        </div>
      </body>
      </html>
    `;

    // Send the email using the email service
    await emailService.sendEmail(
      req.user,
      testEmail,
      subject,
      htmlBody,
      {
        template: 'custom',
        recipientName,
        campaignPurpose
      }
    );

    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: `Failed to send email: ${error.message}` });
  }
});

// Get email queue status
router.get('/queue/status', (req, res) => {
  const queueStatus = {
    length: emailService.emailQueue.length,
    isProcessing: emailService.isProcessing
  };
  res.json(queueStatus);
});

// Clear email queue
router.post('/queue/clear', (req, res) => {
  emailService.emailQueue = [];
  res.json({ message: 'Email queue cleared' });
});

module.exports = router; 