const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/database');
const { generateCode, sendVerificationCode, sendPermanentLoginCode } = require('../utils/email');
const winston = require('winston');

const router = express.Router();
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

const emailQueue = [];
const processingEmails = new Set();
const userCache = new Map();

const processEmailQueue = async () => {
  if (emailQueue.length === 0 || processingEmails.size >= 5) return;
  
  const batch = emailQueue.splice(0, 5);
  
  for (const emailJob of batch) {
    if (processingEmails.has(emailJob.id)) continue;
    
    processingEmails.add(emailJob.id);
    
    setImmediate(async () => {
      try {
        if (emailJob.type === 'verification') {
          await sendVerificationCode(emailJob.email, emailJob.code, 'register');
        } else if (emailJob.type === 'permanent') {
          await sendPermanentLoginCode(emailJob.email, emailJob.permanentCode);
        } else if (emailJob.type === 'login') {
          await sendVerificationCode(emailJob.email, emailJob.code, 'login');
        }
      } catch (error) {
        logger.error(`Email failed: ${emailJob.type} to ${emailJob.email}`, error.message);
        
        if (emailJob.retries < 3) {
          emailJob.retries++;
          emailQueue.push(emailJob);
        }
      } finally {
        processingEmails.delete(emailJob.id);
      }
    });
  }
};

setInterval(processEmailQueue, 1000);

const cleanupOldCodes = async (connection, email, type) => {
  const [result] = await connection.execute(`
    DELETE FROM verification_codes 
    WHERE email = ? AND type = ? AND (expires_at < NOW() OR used = TRUE)
  `, [email, type]);
};

const generateUniquePermanentCode = () => {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return timestamp + random;
};

const getNextBatch = async (connection) => {
  const [batches] = await connection.execute(`
    SELECT letter FROM batches 
    WHERE is_active = TRUE AND user_count < 1000 
    ORDER BY letter ASC LIMIT 1
  `);

  if (batches.length > 0) {
    return batches[0].letter;
  }

  const [lastBatch] = await connection.execute(`
    SELECT letter FROM batches ORDER BY letter DESC LIMIT 1
  `);

  let nextLetter = 'A';
  if (lastBatch.length > 0) {
    const lastLetter = lastBatch[0].letter;
    nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);
  }

  await connection.execute(`
    INSERT IGNORE INTO batches (letter, user_count, is_active) VALUES (?, 0, TRUE)
  `, [nextLetter]);

  return nextLetter;
};

router.post('/register', async (req, res) => {
  const startTime = Date.now();
  const { 
    email, 
    fullName, 
    phone, 
    instagramId,
    facebookId,
    twitterId,
    linkedinId,
    city,
    dateOfBirth,
    website
  } = req.body;

  if (!email || !fullName || !phone || !instagramId) {
    return res.status(400).json({ error: 'Email, full name, phone, and Instagram ID are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  const usernameRegex = /^[a-zA-Z0-9._]+$/;
  if (!usernameRegex.test(instagramId)) {
    return res.status(400).json({ error: 'Instagram username can only contain letters, numbers, dots, and underscores' });
  }

  if (facebookId && !usernameRegex.test(facebookId)) {
    return res.status(400).json({ error: 'Facebook username can only contain letters, numbers, dots, and underscores' });
  }

  if (twitterId && !usernameRegex.test(twitterId)) {
    return res.status(400).json({ error: 'Twitter username can only contain letters, numbers, dots, and underscores' });
  }

  if (linkedinId && !usernameRegex.test(linkedinId)) {
    return res.status(400).json({ error: 'LinkedIn username can only contain letters, numbers, dots, and underscores' });
  }

  if (website && !/^https?:\/\/.+/.test(website)) {
    return res.status(400).json({ error: 'Website must be a valid URL starting with http:// or https://' });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    await cleanupOldCodes(connection, email, 'register');

    const [existing] = await connection.execute(`
      SELECT 
        COUNT(CASE WHEN email = ? AND is_verified = TRUE THEN 1 END) as verified_email_count,
        COUNT(CASE WHEN instagram_id = ? THEN 1 END) as instagram_count,
        MAX(CASE WHEN email = ? AND is_verified = FALSE THEN id END) as unverified_id
      FROM users 
      WHERE email = ? OR instagram_id = ?
    `, [email, instagramId, email, email, instagramId]);

    const { verified_email_count, instagram_count, unverified_id } = existing[0];

    if (verified_email_count > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Email address is already registered' });
    }

    if (instagram_count > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Instagram username is already taken' });
    }

    if (unverified_id) {
      await connection.execute('DELETE FROM users WHERE id = ?', [unverified_id]);
    }

    const batchLetter = await getNextBatch(connection);
    const verificationCode = generateCode();
    const permanentCode = generateUniquePermanentCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const [result] = await connection.execute(`
      INSERT INTO users (
        email, full_name, phone, instagram_id, facebook_id, twitter_id, 
        linkedin_id, city, date_of_birth, website, batch_letter, 
        is_verified, permanent_login_code, earnings, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, 0, NOW())
    `, [
      email, 
      fullName, 
      phone, 
      instagramId,
      facebookId || null,
      twitterId || null,
      linkedinId || null,
      city || null,
      dateOfBirth || null,
      website || null,
      batchLetter, 
      permanentCode
    ]);

    await Promise.all([
      connection.execute('UPDATE batches SET user_count = user_count + 1 WHERE letter = ?', [batchLetter]),
      connection.execute(`
        INSERT INTO verification_codes (email, code, type, expires_at)
        VALUES (?, ?, 'register', ?)
      `, [email, verificationCode, expiresAt])
    ]);

    await connection.commit();

    emailQueue.push({
      id: uuidv4(),
      type: 'verification',
      email,
      code: verificationCode,
      retries: 0,
      createdAt: Date.now()
    });

    const processingTime = Date.now() - startTime;

    res.json({ 
      message: 'Registration successful. Please check your email for verification code.',
      batchLetter,
      processingTime: `${processingTime}ms`,
      debug: {
        emailQueued: true,
        profileFields: {
          facebookId: facebookId || null,
          twitterId: twitterId || null,
          linkedinId: linkedinId || null,
          city: city || null,
          dateOfBirth: dateOfBirth || null,
          website: website || null
        }
      }
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Registration error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('email')) {
        res.status(400).json({ error: 'Email address is already registered' });
      } else if (error.message.includes('instagram_id')) {
        res.status(400).json({ error: 'Instagram username is already taken' });
      } else if (error.message.includes('permanent_login_code')) {
        res.status(500).json({ error: 'Registration conflict. Please try again.' });
      } else {
        res.status(400).json({ error: 'Account with this information already exists' });
      }
    } else {
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  } finally {
    connection.release();
  }
});

router.post('/verify-email', async (req, res) => {
  const startTime = Date.now();
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(`
      SELECT 
        vc.id as code_id,
        u.id as user_id,
        u.permanent_login_code
      FROM verification_codes vc
      JOIN users u ON vc.email = u.email
      WHERE vc.email = ? AND vc.code = ? AND vc.type = 'register' 
      AND vc.expires_at > NOW() AND vc.used = FALSE
      AND u.is_verified = FALSE
      LIMIT 1
    `, [email, code]);

    if (result.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const { code_id, user_id, permanent_login_code } = result[0];

    await Promise.all([
      connection.execute('UPDATE verification_codes SET used = TRUE WHERE id = ?', [code_id]),
      connection.execute('UPDATE users SET is_verified = TRUE WHERE id = ?', [user_id]),
      connection.execute(`
        DELETE FROM verification_codes 
        WHERE email = ? AND type = 'register' AND (expires_at < NOW() OR used = TRUE)
      `, [email])
    ]);

    await connection.commit();

    emailQueue.push({
      id: uuidv4(),
      type: 'permanent',
      email,
      permanentCode: permanent_login_code,
      retries: 0,
      createdAt: Date.now()
    });

    const processingTime = Date.now() - startTime;

    res.json({ 
      message: 'Email verified successfully! Your permanent login code has been sent to your email.',
      permanentCodeSent: true,
      processingTime: `${processingTime}ms`
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  } finally {
    connection.release();
  }
});

router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const [users] = await connection.execute(
      'SELECT id, is_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'User not found' });
    }

    if (users[0].is_verified) {
      await connection.rollback();
      return res.status(400).json({ error: 'Email is already verified' });
    }

    await cleanupOldCodes(connection, email, 'register');

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await connection.execute(`
      INSERT INTO verification_codes (email, code, type, expires_at)
      VALUES (?, ?, 'register', ?)
    `, [email, code, expiresAt]);

    await connection.commit();

    emailQueue.push({
      id: uuidv4(),
      type: 'verification',
      email,
      code,
      retries: 0,
      createdAt: Date.now()
    });

    res.json({ 
      message: 'New verification code sent to your email',
      emailSent: true
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification code' });
  } finally {
    connection.release();
  }
});

router.post('/login', async (req, res) => {
  const { email, permanentCode } = req.body;

  if (permanentCode) {
    return await handlePermanentCodeLoginOptimized(req, res, permanentCode);
  }

  if (!email) {
    return res.status(400).json({ error: 'Email or permanent code is required' });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    await cleanupOldCodes(connection, email, 'login');

    const [users] = await connection.execute(
      'SELECT id, is_verified, permanent_login_code FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'User not found' });
    }

    if (!users[0].is_verified) {
      await connection.rollback();
      return res.status(400).json({ error: 'Please verify your email first' });
    }

    if (users[0].permanent_login_code) {
      await connection.rollback();
      return res.json({ 
        message: 'Please use your 6-digit permanent login code',
        hasPermanentCode: true,
        hint: 'Check your email for the permanent login code sent after registration',
        permanentCodeHint: users[0].permanent_login_code.substring(0, 2) + '****'
      });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await connection.execute(`
      INSERT INTO verification_codes (email, code, type, expires_at)
      VALUES (?, ?, 'login', ?)
    `, [email, code, expiresAt]);

    await connection.commit();

    emailQueue.push({
      id: uuidv4(),
      type: 'login',
      email,
      code,
      retries: 0,
      createdAt: Date.now()
    });

    res.json({ 
      message: 'Login code sent to your email'
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    connection.release();
  }
});

// ✅ UPDATED: Permanent code login - sends sessionId in response body
const handlePermanentCodeLoginOptimized = async (req, res, permanentCode) => {
  const startTime = Date.now();
  console.log('🔑 Permanent code login attempt for code:', permanentCode.substring(0, 2) + '****');

  const cacheKey = `perm_${permanentCode}`;
  let user = userCache.get(cacheKey);

  if (!user) {
    const connection = await pool.getConnection();
    
    try {
      const [users] = await connection.execute(`
        SELECT id, email, full_name, phone, instagram_id, facebook_id, twitter_id,
               linkedin_id, city, date_of_birth, website, batch_letter, earnings, 
               is_verified, is_admin
        FROM users WHERE permanent_login_code = ? AND is_verified = TRUE
        LIMIT 1
      `, [permanentCode]);

      if (users.length === 0) {
        console.log('❌ Invalid permanent code');
        return res.status(400).json({ error: 'Invalid permanent login code' });
      }

      user = users[0];
      console.log('✅ User found:', user.email);
      
      userCache.set(cacheKey, user);
      setTimeout(() => userCache.delete(cacheKey), 5 * 60 * 1000);
      
    } finally {
      connection.release();
    }
  }

  const sessionId = uuidv4();
  const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  console.log('🆔 Creating session:', sessionId.substring(0, 8) + '...');

  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `, [sessionId, user.id, sessionExpiresAt, req.ip, req.get('User-Agent')]);
    
    console.log('✅ Session created in database');
  } finally {
    connection.release();
  }

  const processingTime = Date.now() - startTime;

  // ✅ THE FIX: Send sessionId in response body instead of cookie
  console.log('📤 Sending sessionId in response body instead of cookie');

  res.json({
    message: 'Login successful',
    sessionId: sessionId,  // ← Frontend will store this in localStorage
    processingTime: `${processingTime}ms`,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      instagramId: user.instagram_id,
      facebookId: user.facebook_id,
      twitterId: user.twitter_id,
      linkedinId: user.linkedin_id,
      city: user.city,
      dateOfBirth: user.date_of_birth,
      website: user.website,
      batchLetter: user.batch_letter,
      earnings: parseFloat(user.earnings),
      isVerified: user.is_verified,
      isAdmin: user.is_admin
    }
  });
};

// ✅ UPDATED: Email login verification - sends sessionId in response body
router.post('/verify-login', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const [codes] = await connection.execute(`
      SELECT id, expires_at FROM verification_codes 
      WHERE email = ? AND code = ? AND type = 'login' 
      AND expires_at > NOW() AND used = FALSE
    `, [email, code]);

    if (codes.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid or expired login code' });
    }

    const [users] = await connection.execute(`
      SELECT id, email, full_name, phone, instagram_id, facebook_id, twitter_id,
             linkedin_id, city, date_of_birth, website, batch_letter, earnings, 
             is_verified, is_admin
      FROM users WHERE email = ?
    `, [email]);

    if (users.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'User not found' });
    }

    const user = users[0];

    await connection.execute(
      'UPDATE verification_codes SET used = TRUE WHERE id = ?',
      [codes[0].id]
    );

    await cleanupOldCodes(connection, email, 'login');

    const sessionId = uuidv4();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await connection.execute(`
      INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `, [sessionId, user.id, sessionExpiresAt, req.ip, req.get('User-Agent')]);

    await connection.commit();

    console.log('📤 Sending sessionId in response body after email verification');

    // ✅ THE FIX: Send sessionId in response body instead of cookie
    res.json({
      message: 'Login successful',
      sessionId: sessionId,  // ← Frontend will store this in localStorage
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        instagramId: user.instagram_id,
        facebookId: user.facebook_id,
        twitterId: user.twitter_id,
        linkedinId: user.linkedin_id,
        city: user.city,
        dateOfBirth: user.date_of_birth,
        website: user.website,
        batchLetter: user.batch_letter,
        earnings: parseFloat(user.earnings),
        isVerified: user.is_verified,
        isAdmin: user.is_admin
      }
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Login verification error:', error);
    res.status(500).json({ error: 'Login verification failed' });
  } finally {
    connection.release();
  }
});

router.get('/me', async (req, res) => {
  const sessionId = req.cookies.sessionId || 
                   (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));
  
  console.log('🔍 Auth check - sessionId from cookie:', req.cookies.sessionId ? 'found' : 'missing');
  console.log('🔍 Auth check - sessionId from header:', req.headers.authorization ? 'found' : 'missing');
  
  if (!sessionId) {
    console.log('❌ No session found in request');
    return res.status(401).json({ error: 'No session found' });
  }

  console.log('🔍 Checking session:', sessionId.substring(0, 8) + '...');

  const connection = await pool.getConnection();
  
  try {
    const [sessions] = await connection.execute(`
      SELECT s.*, u.id as user_id, u.email, u.full_name, u.phone, u.instagram_id, 
             u.facebook_id, u.twitter_id, u.linkedin_id, u.city, u.date_of_birth, 
             u.website, u.batch_letter, u.earnings, u.is_verified, u.is_admin, 
             u.permanent_login_code
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > NOW()
    `, [sessionId]);

    if (sessions.length === 0) {
      console.log('❌ Invalid or expired session');
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const session = sessions[0];
    console.log('✅ Valid session found for:', session.email);

    res.json({
      user: {
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
        isAdmin: session.is_admin,
        permanentLoginCode: session.permanent_login_code
      }
    });

  } catch (error) {
    console.error('💥 Auth check error:', error);
    logger.error('Auth check error:', error);
    res.status(500).json({ error: 'Authentication check failed' });
  } finally {
    connection.release();
  }
});

router.post('/logout', async (req, res) => {
  const sessionId = req.cookies.sessionId || 
                   (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));
  
  if (sessionId) {
    console.log('🚪 Logging out session:', sessionId.substring(0, 8) + '...');
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
      console.log('✅ Session deleted from database');
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      connection.release();
    }
  }

  console.log('✅ Logout successful - session cleared from database');
  res.json({ message: 'Logged out successfully' });
});

router.get('/queue-status', (req, res) => {
  res.json({
    emailQueue: {
      pending: emailQueue.length,
      processing: processingEmails.size,
      totalProcessed: emailQueue.filter(e => e.retries > 0).length
    },
    userCache: {
      entries: userCache.size
    },
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
});

router.get('/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        emailQueue: `${emailQueue.length} pending`,
        userCache: `${userCache.size} entries`
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;