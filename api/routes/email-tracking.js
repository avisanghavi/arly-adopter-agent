const express = require('express');
const router = express.Router();
const EmailTracking = require('../../src/models/email-tracking');
const logger = require('../../src/utils/logger');

// Public tracking endpoints - no auth required
router.get('/pixel/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Return a 1x1 transparent GIF immediately
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(pixel);
    
    // Track the open asynchronously
    try {
      const email = await EmailTracking.findOne({ messageId });
      if (email) {
        email.openedAt = email.openedAt || new Date();
        email.openCount = (email.openCount || 0) + 1;
        await email.save();
        logger.info('Email open tracked:', { messageId, recipient: email.recipient });
      }
    } catch (trackingError) {
      logger.error('Error tracking email open:', trackingError);
    }
  } catch (error) {
    logger.error('Error handling pixel request:', error);
    // Still return the pixel even if tracking fails
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, { 'Content-Type': 'image/gif' });
    res.end(pixel);
  }
});

router.get('/click/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const targetUrl = decodeURIComponent(req.query.url || '');
    const utmParams = {};
    
    logger.info('Processing click tracking:', {
      messageId,
      originalUrl: targetUrl,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'referer': req.headers['referer'],
        'host': req.headers['host']
      }
    });
    
    // Extract UTM parameters
    Object.keys(req.query).forEach(key => {
      if (key.startsWith('utm_')) {
        utmParams[key] = decodeURIComponent(req.query[key]);
      }
    });
    
    if (!targetUrl) {
      return res.status(400).send('Missing URL parameter');
    }

    // Add tracking parameter to target URL
    const urlObj = new URL(targetUrl);
    urlObj.searchParams.append('email_track', messageId);
    const finalUrl = urlObj.toString();
    
    logger.info('Generated tracking URL:', {
      messageId,
      originalUrl: targetUrl,
      finalUrl,
      utmParams,
      sessionId: req.sessionID
    });
    
    // Store emailTrackId in session
    req.session.emailTrackId = messageId;
    await req.session.save();
    
    logger.info('Stored emailTrackId in session:', {
      messageId,
      sessionId: req.sessionID,
      sessionData: req.session
    });
    
    // Redirect immediately to ensure good user experience
    res.redirect(finalUrl);
    
    // Track the click asynchronously
    try {
      const email = await EmailTracking.findOne({ messageId });
      if (email) {
        if (!email.clicks) {
          email.clicks = [];
        }
        email.clicks.push({
          url: targetUrl,
          timestamp: new Date(),
          utmParams,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          converted: false
        });
        await email.save();
        logger.info('Email click tracked successfully:', { 
          messageId, 
          url: targetUrl, 
          recipient: email.recipient,
          clickCount: email.clicks.length,
          sessionId: req.sessionID
        });
      } else {
        logger.warn('Email not found for click tracking:', {
          messageId,
          sessionId: req.sessionID
        });
      }
    } catch (trackingError) {
      logger.error('Error tracking click:', {
        error: trackingError.message,
        stack: trackingError.stack,
        messageId,
        sessionId: req.sessionID
      });
    }
  } catch (error) {
    logger.error('Error handling click:', {
      error: error.message,
      stack: error.stack,
      messageId: req.params.messageId,
      query: req.query,
      sessionId: req.sessionID
    });
    if (req.query.url) {
      res.redirect(decodeURIComponent(req.query.url));
    } else {
      res.status(400).send('Invalid URL parameter');
    }
  }
});

// Track signup conversion
router.post('/conversion/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, confirmedSignupUrl } = req.body;

    logger.info('Processing conversion tracking:', {
      messageId,
      userId,
      confirmedSignupUrl
    });

    const email = await EmailTracking.findOne({ messageId });
    if (email && email.clicks && email.clicks.length > 0) {
      // Update the most recent click to mark as converted
      const lastClick = email.clicks[email.clicks.length - 1];
      lastClick.converted = true;
      lastClick.conversionTimestamp = new Date();
      lastClick.convertedUserId = userId;
      lastClick.confirmedSignupUrl = confirmedSignupUrl;
      
      await email.save();
      
      logger.info('Signup conversion tracked successfully:', {
        recipient: email.recipient,
        userId,
        clickCount: email.clicks.length,
        conversionTimestamp: lastClick.conversionTimestamp,
        confirmedSignupUrl
      });

      res.json({ 
        success: true,
        conversionData: {
          messageId,
          timestamp: lastClick.conversionTimestamp,
          originalClick: lastClick.timestamp,
          confirmedSignupUrl
        }
      });
    } else {
      logger.warn('No clicks found for conversion:', {
        messageId,
        emailFound: !!email,
        clicksCount: email?.clicks?.length
      });
      res.status(404).json({ error: 'No click found to convert' });
    }
  } catch (error) {
    logger.error('Error tracking conversion:', {
      error: error.message,
      stack: error.stack,
      messageId: req.params.messageId,
      userId: req.body.userId
    });
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// Track signup form events
router.post('/form-event/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { eventType, formStep, success } = req.body;

    logger.info('Processing form event tracking:', {
      messageId,
      eventType,
      formStep,
      success
    });

    const email = await EmailTracking.findOne({ messageId });
    if (email && email.clicks && email.clicks.length > 0) {
      const lastClick = email.clicks[email.clicks.length - 1];
      
      // Add form interaction data
      lastClick.formEvents = lastClick.formEvents || [];
      lastClick.formEvents.push({
        eventType,
        formStep,
        success,
        timestamp: new Date()
      });
      
      await email.save();
      
      logger.info('Form event tracked successfully:', {
        messageId,
        eventType,
        formStep,
        success,
        clickCount: email.clicks.length
      });

      res.json({ 
        success: true,
        eventData: {
          messageId,
          timestamp: new Date(),
          eventType,
          formStep
        }
      });
    } else {
      logger.warn('No clicks found for form event:', {
        messageId,
        emailFound: !!email,
        clicksCount: email?.clicks?.length
      });
      res.status(404).json({ error: 'No click found to track form event' });
    }
  } catch (error) {
    logger.error('Error tracking form event:', {
      error: error.message,
      stack: error.stack,
      messageId: req.params.messageId
    });
    res.status(500).json({ error: 'Failed to track form event' });
  }
});

// Protected analytics endpoints - require auth
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

router.get('/history', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const emails = await EmailTracking.find({ userId: req.user._id })
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await EmailTracking.countDocuments({ userId: req.user._id });

    res.json({
      emails,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching email history:', error);
    res.status(500).json({ error: 'Failed to fetch email history' });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Get overall statistics by status
    const overallStats = await EmailTracking.aggregate([
      { 
        $match: { 
          userId: req.user._id 
        } 
      },
      {
        $group: {
          _id: '$status',
          sent: { $sum: 1 },
          opens: { $sum: { $cond: [{ $gt: ['$openCount', 0] }, 1, 0] } },
          totalOpens: { $sum: { $ifNull: ['$openCount', 0] } },
          clicks: { 
            $sum: { 
              $size: {
                $ifNull: ['$clicks', []]
              }
            } 
          },
          conversions: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$clicks', []] },
                  as: 'click',
                  cond: { $eq: ['$$click.converted', true] }
                }
              }
            }
          }
        }
      }
    ]);

    // Get today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await EmailTracking.aggregate([
      {
        $match: {
          userId: req.user._id,
          sentAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          sent: { $sum: 1 },
          opens: { $sum: { $cond: [{ $gt: ['$openCount', 0] }, 1, 0] } },
          clicks: { 
            $sum: { 
              $size: {
                $ifNull: ['$clicks', []]
              }
            } 
          },
          conversions: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$clicks', []] },
                  as: 'click',
                  cond: { $eq: ['$$click.converted', true] }
                }
              }
            }
          }
        }
      }
    ]);

    logger.info('Aggregated email statistics:', {
      overallStats,
      todayStats: todayStats[0]
    });

    // Format the response
    const response = {
      overall: overallStats.reduce((acc, stat) => {
        acc[stat._id] = {
          sent: stat.sent,
          opens: stat.opens,
          totalOpens: stat.totalOpens,
          clicks: stat.clicks,
          conversions: stat.conversions
        };
        return acc;
      }, {
        sent: { sent: 0, opens: 0, totalOpens: 0, clicks: 0, conversions: 0 },
        delivered: { sent: 0, opens: 0, totalOpens: 0, clicks: 0, conversions: 0 },
        failed: { sent: 0, opens: 0, totalOpens: 0, clicks: 0, conversions: 0 }
      }),
      today: todayStats[0] || { sent: 0, opens: 0, clicks: 0, conversions: 0 }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching email statistics:', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });
    res.status(500).json({ error: 'Failed to fetch email statistics' });
  }
});

module.exports = router; 