const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const Handlebars = require('handlebars');
const logger = require('../utils/logger');
const EmailTracking = require('../models/email-tracking');
const cheerio = require('cheerio');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.emailQueue = [];
    this.isProcessing = false;
    this.templateCache = new Map();
    
    // Rate limiting configuration
    this.rateLimitWindow = 1000; // 1 second
    this.maxEmailsPerWindow = 5;
    this.emailsSentInWindow = 0;
    this.lastWindowReset = Date.now();
  }

  async createTransporter(user) {
    try {
      if (!user || !user.emailCredentials) {
        throw new Error('User email credentials not found');
      }

      logger.info('Creating email transporter for user:', {
        userId: user._id,
        email: user.email,
        hasAccessToken: !!user.emailCredentials.accessToken,
        hasRefreshToken: !!user.emailCredentials.refreshToken,
        tokenExpiry: user.emailCredentials.expiryDate
      });

      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials
      oauth2Client.setCredentials({
        access_token: user.emailCredentials.accessToken,
        refresh_token: user.emailCredentials.refreshToken,
        expiry_date: user.emailCredentials.expiryDate
      });

      // Get a new access token if needed
      if (user.needsTokenRefresh()) {
        logger.info('Token needs refresh, attempting to refresh...');
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          logger.info('Token refreshed successfully');
          
          // Update user's credentials
          user.emailCredentials = {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || user.emailCredentials.refreshToken,
            expiryDate: new Date(credentials.expiry_date || Date.now() + 3600000)
          };
          await user.save();
          
          // Update oauth2Client with new credentials
          oauth2Client.setCredentials({
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token || user.emailCredentials.refreshToken,
            expiry_date: credentials.expiry_date
          });
        } catch (refreshError) {
          logger.error('Failed to refresh token:', {
            error: refreshError.message,
            stack: refreshError.stack,
            userId: user._id
          });
          throw new Error(`Token refresh failed: ${refreshError.message}`);
        }
      }

      logger.info('Creating nodemailer transport with OAuth2 configuration');
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          type: 'OAuth2',
          user: user.email,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: user.emailCredentials.refreshToken,
          accessToken: user.emailCredentials.accessToken,
          expires: user.emailCredentials.expiryDate?.getTime(),
          oauth2: oauth2Client
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100
      });

      // Verify transporter configuration
      logger.info('Verifying transporter configuration...');
      await transporter.verify();
      logger.info('Transporter verified successfully');
      
      return transporter;
    } catch (error) {
      logger.error('Error creating transporter:', {
        error: error.message,
        stack: error.stack,
        userId: user?._id,
        email: user?.email
      });
      throw new Error(`Failed to create email transporter: ${error.message}`);
    }
  }

  async loadTemplate(templateName) {
    try {
      // Input validation
      if (!templateName || typeof templateName !== 'string') {
        throw new Error('Invalid template name provided');
      }

      if (this.templateCache.has(templateName)) {
        return this.templateCache.get(templateName);
      }

      const templatePath = path.join(__dirname, '../../config/email-templates', templateName, 'template.html');
      
      try {
        await fs.access(templatePath);
      } catch (error) {
        throw new Error(`Template '${templateName}' not found`);
      }

      const templateContent = await fs.readFile(templatePath, 'utf-8');
      
      try {
        const template = Handlebars.compile(templateContent);
        this.templateCache.set(templateName, template);
        return template;
      } catch (error) {
        throw new Error(`Invalid template syntax in '${templateName}': ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error loading email template ${templateName}:`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async renderEmail(templateName, data) {
    try {
      const template = await this.loadTemplate(templateName);
      return template(data);
    } catch (error) {
      logger.error(`Error rendering email template ${templateName}:`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  validateEmailParams(to, subject, html) {
    if (!to || !subject || !html) {
      throw new Error('Missing required email parameters');
    }
    
    if (typeof to !== 'string' || !to.includes('@')) {
      throw new Error('Invalid recipient email address');
    }
  }

  async checkRateLimit() {
    const now = Date.now();
    if (now - this.lastWindowReset > this.rateLimitWindow) {
      this.emailsSentInWindow = 0;
      this.lastWindowReset = now;
    }
    
    if (this.emailsSentInWindow >= this.maxEmailsPerWindow) {
      throw new Error('Rate limit exceeded');
    }
    
    this.emailsSentInWindow++;
  }

  addTracking(html, messageId, baseUrl) {
    const $ = cheerio.load(html);
    
    // Add tracking pixel
    const pixelUrl = `${baseUrl}/api/email-tracking/pixel/${messageId}`;
    $('body').append(`<img src="${pixelUrl}" width="1" height="1" style="display:none" />`);
    
    // Add click tracking to all links
    $('a').each((i, el) => {
      const $link = $(el);
      const originalUrl = $link.attr('href');
      if (originalUrl && !originalUrl.startsWith('#')) {
        const utmParams = {
          utm_source: 'email',
          utm_medium: 'cta_button',
          utm_campaign: 'product_updates',
          ...($link.data('utm') || {})  // Allow custom UTM params via data attributes
        };
        
        // Build query string for UTM parameters
        const utmString = Object.entries(utmParams)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
        
        // Create tracking URL with properly encoded parameters
        const trackingUrl = `${baseUrl}/api/email-tracking/click/${messageId}?` + 
          `url=${encodeURIComponent(originalUrl)}&${utmString}`;
        
        $link.attr('href', trackingUrl);
      }
    });
    
    return $.html();
  }

  async sendEmail(user, to, subject, html, options = {}) {
    try {
      // Validate input parameters
      this.validateEmailParams(to, subject, html);
      
      // Check rate limit
      await this.checkRateLimit();

      // Check if user can send more emails today
      if (!user.canSendEmail()) {
        throw new Error('Daily email quota exceeded');
      }

      const transporter = await this.createTransporter(user);
      
      // Create a unique message ID
      const messageId = crypto.randomBytes(12).toString('hex');
      
      // Add tracking to HTML content if present
      if (html) {
        html = this.addTracking(html, messageId, process.env.APP_URL || 'http://localhost:3001');
      }
      
      const mailOptions = {
        from: user.email,
        to,
        subject,
        html: html,
        messageId,
        ...options
      };

      const info = await transporter.sendMail(mailOptions);
      
      // Track the email
      await EmailTracking.create({
        userId: user._id,
        recipient: to,
        subject,
        content: html,
        status: 'sent',
        messageId,
        metadata: {
          template: options.template,
          recipientName: options.recipientName,
          campaignPurpose: options.campaignPurpose,
          utmSource: options.utmSource,
          utmMedium: options.utmMedium,
          utmCampaign: options.utmCampaign,
          utmTerm: options.utmTerm,
          utmContent: options.utmContent
        }
      });
      
      // Increment user's daily email count
      await user.incrementEmailCount();

      logger.info('Email sent successfully:', {
        messageId: info.messageId,
        from: user.email,
        to,
        subject
      });
      
      return info;
    } catch (error) {
      // Track failed email
      if (user && user._id) {
        await EmailTracking.create({
          userId: user._id,
          recipient: to,
          subject,
          content: html,
          status: 'failed',
          messageId: Date.now().toString(),
          metadata: {
            template: options.template,
            recipientName: options.recipientName,
            campaignPurpose: options.campaignPurpose,
            error: error.message
          }
        });
      }

      logger.error('Error sending email:', {
        error: error.message,
        stack: error.stack,
        user: user.email,
        to,
        subject
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendTemplatedEmail(templateName, to, subject, data, options = {}) {
    try {
      // Input validation
      if (!templateName || !to || !subject || !data) {
        throw new Error('Missing required parameters for templated email');
      }

      const html = await this.renderEmail(templateName, data);
      return await this.sendEmail(to, subject, html, options);
    } catch (error) {
      logger.error(`Error sending templated email ${templateName}:`, {
        error: error.message,
        stack: error.stack,
        to,
        subject
      });
      throw error;
    }
  }

  validateQueueData(emailData) {
    if (!emailData || typeof emailData !== 'object') {
      throw new Error('Invalid email data object');
    }
    if (!emailData.templateName || !emailData.to || !emailData.subject || !emailData.data) {
      throw new Error('Missing required fields in queue data');
    }
  }

  addToQueue(emailData) {
    try {
      this.validateQueueData(emailData);
      this.emailQueue.push(emailData);
      this.processQueue();
    } catch (error) {
      logger.error('Error adding email to queue:', {
        error: error.message,
        emailData
      });
      throw error;
    }
  }

  async processQueue() {
    if (this.isProcessing || this.emailQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second

    try {
      while (this.emailQueue.length > 0) {
        const batch = this.emailQueue.splice(0, BATCH_SIZE);
        await Promise.all(
          batch.map(async (emailData) => {
            try {
              await this.sendTemplatedEmail(
                emailData.templateName,
                emailData.to,
                emailData.subject,
                emailData.data,
                emailData.options
              );
            } catch (error) {
              logger.error('Error processing queued email:', {
                error: error.message,
                stack: error.stack,
                emailData
              });
              
              // Requeue failed emails with exponential backoff
              if (!emailData.retries || emailData.retries < 3) {
                emailData.retries = (emailData.retries || 0) + 1;
                emailData.nextRetry = Date.now() + (Math.pow(2, emailData.retries) * 1000);
                this.addToQueue(emailData);
              } else {
                logger.error('Max retries exceeded for queued email:', {
                  emailData
                });
              }
            }
          })
        );

        if (this.emailQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }
    } catch (error) {
      logger.error('Error in queue processing:', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.isProcessing = false;
    }
  }

  // Utility methods for common email types
  async sendOnboardingEmail(user, feature) {
    if (!user || !user.email || !user.name || !feature) {
      throw new Error('Missing required user or feature data for onboarding email');
    }

    return this.sendTemplatedEmail(
      'onboarding',
      user.email,
      `Discover: ${feature.name}`,
      {
        name: user.name,
        feature
      }
    );
  }

  async sendFeedbackRequestEmail(user, feedbackUrl) {
    if (!user || !user.email || !user.name || !feedbackUrl) {
      throw new Error('Missing required user or feedback URL data');
    }

    return this.sendTemplatedEmail(
      'feedback',
      user.email,
      'We Value Your Feedback',
      {
        name: user.name,
        feedbackUrl,
        preferencesUrl: `${process.env.APP_URL}/preferences`
      }
    );
  }

  async sendEngagementDigest(user, highlights) {
    if (!user || !user.email || !user.name || !highlights) {
      throw new Error('Missing required user or highlights data for digest email');
    }

    return this.sendTemplatedEmail(
      'digest',
      user.email,
      'Your Weekly Activity Summary',
      {
        name: user.name,
        highlights,
        preferencesUrl: `${process.env.APP_URL}/preferences`
      }
    );
  }
}

// Create and export a singleton instance
const emailService = new EmailService();
module.exports = emailService; 