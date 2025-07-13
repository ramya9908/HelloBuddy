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
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No session found' });
    }

    const connection = await pool.getConnection();
    
    try {
      const [sessions] = await connection.execute(`
        SELECT s.*, u.id as user_id, u.email, u.full_name, u.phone, u.instagram_id, 
               u.batch_letter, u.earnings, u.is_verified, u.is_admin
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > NOW()
      `, [sessionId]);

      if (sessions.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      const session = sessions[0];
      
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
    logger.error('Session middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const verifiedUserMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isVerified) {
    return res.status(403).json({ error: 'Email verification required' });
  }
  next();
};

module.exports = {
  sessionMiddleware,
  adminMiddleware,
  verifiedUserMiddleware
};