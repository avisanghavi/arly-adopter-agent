const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Admin access required' });
};

const hasValidEmailCredentials = (req, res, next) => {
  if (!req.user.emailCredentials || !req.user.emailCredentials.accessToken) {
    return res.status(403).json({ 
      error: 'Gmail authentication required',
      needsGmailAuth: true
    });
  }
  
  if (req.user.needsTokenRefresh()) {
    return res.status(403).json({ 
      error: 'Gmail token expired',
      needsTokenRefresh: true
    });
  }
  
  next();
};

const checkEmailQuota = async (req, res, next) => {
  try {
    if (!req.user.canSendEmail()) {
      return res.status(429).json({ 
        error: 'Daily email quota exceeded',
        dailySent: req.user.rateLimits.dailyEmailsSent,
        maxDaily: req.user.rateLimits.maxDailyEmails
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  isAuthenticated,
  isAdmin,
  hasValidEmailCredentials,
  checkEmailQuota
}; 