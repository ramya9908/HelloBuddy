const { pool } = require('../db/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

const sessionMiddleware = async (req, res, next) => {
  try {
    // ✅ FIXED: Check both cookie and Authorization header
    const sessionId = req.cookies.sessionId || 
                     (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));
    
    console.log('🔍 Session check:', {
      cookieSession: req.cookies.sessionId ? 'found' : 'missing',
      authHeader: req.headers.authorization ? 'found' : 'missing',
      finalSessionId: sessionId ? 'found' : 'missing'
    });
    
    if (!sessionId) {
      console.log('❌ No session found in cookies or headers');
      return res.status(401).json({ error: 'No session found' });
    }

    const connection = await pool.getConnection();
    
    try {
      const [sessions] = await connection.execute(`
        SELECT s.*, u.id as user_id, u.email, u.full_name, u.phone, u.instagram_id, 
               u.facebook_id, u.twitter_id, u.linkedin_id, u.city, u.date_of_birth, 
               u.website, u.batch_letter, u.earnings, u.is_verified, u.is_admin
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > NOW()
      `, [sessionId]);

      if (sessions.length === 0) {
        console.log('❌ Invalid or expired session:', sessionId.substring(0, 8) + '...');
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      const session = sessions[0];
      
      console.log('✅ Valid session found for user:', session.email);
      
      // Extend session by 7 days
      await connection.execute(
        'UPDATE sessions SET expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE id = ?',
        [sessionId]
      );

      req.user = {
        id: session.user_id,
        email: session.email,
        fullName: session.full_name,
        phone: session.phone,
        instagramId: session.instagram_id,
        facebookId: session.facebook_id,
        twitterId: session.twitter_id,
        linkedinId: session.linkedin_id,
        city: session.city,
        dateOfBirth: session.date_of_birth,
        website: session.website,
        batchLetter: session.batch_letter,
        earnings: parseFloat(session.earnings),
        isVerified: session.is_verified,
        isAdmin: session.is_admin
      };

      next();
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('💥 Session middleware error:', error);
    logger.error('Session middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    console.log('❌ Admin access denied for user:', req.user?.email || 'unknown');
    return res.status(403).json({ error: 'Admin access required' });
  }
  console.log('✅ Admin access granted for:', req.user.email);
  next();
};

const verifiedUserMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isVerified) {
    console.log('❌ Verification required for user:', req.user?.email || 'unknown');
    return res.status(403).json({ error: 'Email verification required' });
  }
  console.log('✅ Verified user access granted for:', req.user.email);
  next();
};

module.exports = {
  sessionMiddleware,
  adminMiddleware,
  verifiedUserMiddleware
};