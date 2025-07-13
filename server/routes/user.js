// routes/user.js - Updated with session-based auth and profile management
const express = require('express');
const { pool } = require('../db/database');
const winston = require('winston');

const router = express.Router();
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

const isDevelopment = process.env.NODE_ENV === 'development';

// Session-based authentication middleware
const sessionAuth = async (req, res, next) => {
  const sessionId = req.cookies.sessionId || 
                   (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
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
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Attach user data to request
    req.user = {
      id: sessions[0].user_id,
      email: sessions[0].email,
      fullName: sessions[0].full_name,
      phone: sessions[0].phone,
      instagramId: sessions[0].instagram_id,
      facebookId: sessions[0].facebook_id,
      twitterId: sessions[0].twitter_id,
      linkedinId: sessions[0].linkedin_id,
      city: sessions[0].city,
      dateOfBirth: sessions[0].date_of_birth,
      website: sessions[0].website,
      batchLetter: sessions[0].batch_letter,
      earnings: parseFloat(sessions[0].earnings),
      isVerified: sessions[0].is_verified,
      isAdmin: sessions[0].is_admin
    };

    next();

  } catch (error) {
    logger.error('Session auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  } finally {
    connection.release();
  }
};

// Dashboard endpoint - Get posts and user clicks with analytics
router.get('/dashboard', sessionAuth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userBatch = req.user.batchLetter;
    
    // Get available posts for user's batch including VIP posts and post messages
    const [posts] = await connection.execute(`
      SELECT p.id, p.title, p.social_link, p.engagement_type, p.reward_amount, p.post_message 
      FROM posts p 
      WHERE p.is_active = 1
      ORDER BY p.created_at DESC
    `);

    // Get user's clicks
    const [userClicks] = await connection.execute(`
      SELECT post_id, clicked_at
      FROM user_clicks 
      WHERE user_id = ?
      ORDER BY clicked_at DESC
    `, [req.user.id]);

    // Get user's click analytics by engagement type including VIP
    const [clickAnalytics] = await connection.execute(`
      SELECT 
        p.engagement_type,
        COUNT(*) as click_count
      FROM user_clicks uc
      JOIN posts p ON uc.post_id = p.id
      WHERE uc.user_id = ?
      GROUP BY p.engagement_type
    `, [req.user.id]);

    // Process click analytics
    const analytics = {
      like: 0,
      like_comment: 0,
      like_comment_share: 0,
      vip: 0
    };

    clickAnalytics.forEach(item => {
      analytics[item.engagement_type] = item.click_count;
    });

    // Filter posts based on user's batch
    let availablePosts = [];
    
    for (const post of posts) {
      try {
        availablePosts.push({
          id: post.id,
          title: post.title,
          socialLink: post.social_link,
          engagementType: post.engagement_type,
          rewardAmount: parseFloat(post.reward_amount),
          postMessage: post.post_message
        });
      } catch (parseError) {
        logger.error(`Error processing post ${post.id}:`, parseError);
        continue;
      }
    }

    res.json({
      success: true,
      posts: availablePosts,
      userClicks: userClicks.map(click => ({
        postId: click.post_id,
        clickedAt: click.clicked_at
      })),
      clickAnalytics: analytics
    });

  } catch (error) {
    logger.error('Dashboard database error:', error);
    
    res.status(503).json({ 
      error: 'Database is currently under maintenance. Please try again later.',
      posts: [],
      userClicks: [],
      clickAnalytics: { like: 0, like_comment: 0, like_comment_share: 0, vip: 0 },
      maintenance: true
    });
  } finally {
    connection.release();
  }
});

// Submit click with instant approval and auto-delete functionality
router.post('/submit-click', sessionAuth, async (req, res) => {
  const { postId, socialLink, autoApprove } = req.body;
  const userId = req.user.id;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Post ID is required' 
    });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get post details including auto-delete settings
    const [posts] = await connection.execute(
      'SELECT id, title, reward_amount, is_active, click_count, click_limit, auto_delete_enabled, engagement_type FROM posts WHERE id = ?',
      [postId]
    );

    if (posts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    const post = posts[0];
    if (!post.is_active) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'This post is no longer active' 
      });
    }

    // Check if user already clicked this post
    const [existingClicks] = await connection.execute(
      'SELECT id FROM user_clicks WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    if (existingClicks.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted this task' 
      });
    }

    // Insert the click record (instant approval)
    const [result] = await connection.execute(
      'INSERT INTO user_clicks (user_id, post_id, reward_amount, clicked_at) VALUES (?, ?, ?, NOW())',
      [userId, postId, post.reward_amount]
    );

    // Instantly add to user's earnings
    await connection.execute(
      'UPDATE users SET earnings = earnings + ? WHERE id = ?',
      [post.reward_amount, userId]
    );

    // Update post click count
    const newClickCount = (post.click_count || 0) + 1;
    await connection.execute(
      'UPDATE posts SET click_count = ? WHERE id = ?',
      [newClickCount, postId]
    );

    // AUTO-DELETE LOGIC - Check if post should be auto-deleted
    let autoDeleted = false;
    if (post.auto_delete_enabled && post.click_limit) {
      if (newClickCount >= post.click_limit) {
        if (isDevelopment) {
          console.log(`🗑️ Post ${postId} reached click limit (${newClickCount}/${post.click_limit}), auto-deleting...`);
        }
        
        // Delete the post and related data
        await connection.execute('DELETE FROM user_clicks WHERE post_id = ?', [postId]);
        await connection.execute('DELETE FROM posts WHERE id = ?', [postId]);
        
        autoDeleted = true;
        logger.info(`Post ${postId} auto-deleted after reaching click limit`);
      }
    }

    await connection.commit();

    // Create custom message based on engagement type
    let engagementMessage = '';
    switch (post.engagement_type) {
      case 'vip':
        engagementMessage = '👑 VIP Task Completed! ';
        break;
      case 'like_comment_share':
        engagementMessage = '🎉 Premium Task Completed! ';
        break;
      case 'like_comment':
        engagementMessage = '💬 Engagement Task Completed! ';
        break;
      default:
        engagementMessage = '✅ Task Completed! ';
        break;
    }

    const message = autoDeleted 
      ? `${engagementMessage}₹${parseFloat(post.reward_amount).toFixed(2)} added to your wallet! Post limit reached and removed.`
      : `${engagementMessage}₹${parseFloat(post.reward_amount).toFixed(2)} added to your wallet!`;

    if (isDevelopment) {
      console.log(`User ${userId} earned ₹${post.reward_amount} for post ${postId}, click ID: ${result.insertId}`);
    }

    res.json({ 
      success: true, 
      message: message,
      clickId: result.insertId,
      earnings: parseFloat(post.reward_amount),
      autoDeleted: autoDeleted,
      engagementType: post.engagement_type
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Submit click error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit task' 
    });
  } finally {
    connection.release();
  }
});

// Get user profile with all details including new fields
router.get('/profile', sessionAuth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // Get user data with recent activity and all profile fields
    const [users] = await connection.execute(`
      SELECT u.*, 
             (SELECT COUNT(*) FROM user_clicks WHERE user_id = u.id) as total_clicks,
             (SELECT COUNT(*) FROM withdrawals WHERE user_id = u.id) as total_withdrawals
      FROM users u WHERE u.id = ?
    `, [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get click analytics by engagement type including VIP
    const [clickAnalytics] = await connection.execute(`
      SELECT 
        p.engagement_type,
        COUNT(*) as click_count
      FROM user_clicks uc
      JOIN posts p ON uc.post_id = p.id
      WHERE uc.user_id = ?
      GROUP BY p.engagement_type
    `, [req.user.id]);

    // Process analytics data
    const analytics = {
      like: 0,
      like_comment: 0,
      like_comment_share: 0,
      vip: 0
    };

    clickAnalytics.forEach(item => {
      analytics[item.engagement_type] = item.click_count;
    });

    const user = users[0];

    res.json({
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
        totalClicks: user.total_clicks,
        totalWithdrawals: user.total_withdrawals,
        createdAt: user.created_at,
        clickAnalytics: analytics
      }
    });

  } catch (error) {
    logger.error('Profile error:', error);
    res.status(500).json({ 
      error: 'Failed to load profile. Please try again later.',
      maintenance: true
    });
  } finally {
    connection.release();
  }
});

// Update user profile
router.put('/profile', sessionAuth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.id;
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

    // Validate required fields
    if (!email || !fullName || !phone || !instagramId) {
      return res.status(400).json({
        success: false,
        message: 'Email, full name, phone, and Instagram ID are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate social media usernames (if provided)
    const usernameRegex = /^[a-zA-Z0-9._]*$/;
    
    if (facebookId && !usernameRegex.test(facebookId)) {
      return res.status(400).json({
        success: false,
        message: 'Facebook username can only contain letters, numbers, dots, and underscores'
      });
    }

    if (twitterId && !usernameRegex.test(twitterId)) {
      return res.status(400).json({
        success: false,
        message: 'Twitter username can only contain letters, numbers, dots, and underscores'
      });
    }

    if (linkedinId && !usernameRegex.test(linkedinId)) {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn username can only contain letters, numbers, dots, and underscores'
      });
    }

    // Validate website URL (if provided)
    if (website && !/^https?:\/\/.+/.test(website)) {
      return res.status(400).json({
        success: false,
        message: 'Website must be a valid URL starting with http:// or https://'
      });
    }

    await connection.beginTransaction();

    // Check if email is already taken by another user
    const [emailCheck] = await connection.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );

    if (emailCheck.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Email is already taken by another user'
      });
    }

    // Check if Instagram ID is already taken by another user
    const [instagramCheck] = await connection.execute(
      'SELECT id FROM users WHERE instagram_id = ? AND id != ?',
      [instagramId, userId]
    );

    if (instagramCheck.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Instagram username is already taken by another user'
      });
    }

    // Update user profile with updated_at timestamp
    const [result] = await connection.execute(`
      UPDATE users SET 
        email = ?,
        full_name = ?,
        phone = ?,
        instagram_id = ?,
        facebook_id = ?,
        twitter_id = ?,
        linkedin_id = ?,
        city = ?,
        date_of_birth = ?,
        website = ?,
        updated_at = NOW()
      WHERE id = ?
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
      userId
    ]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await connection.commit();

    // Get updated user data
    const [updatedUsers] = await connection.execute(`
      SELECT u.*, 
             (SELECT COUNT(*) FROM user_clicks WHERE user_id = u.id) as total_clicks,
             (SELECT COUNT(*) FROM withdrawals WHERE user_id = u.id) as total_withdrawals
      FROM users u WHERE u.id = ?
    `, [userId]);

    const updatedUser = updatedUsers[0];

    if (isDevelopment) {
      console.log(`✅ User ${userId} updated profile successfully`);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        phone: updatedUser.phone,
        instagramId: updatedUser.instagram_id,
        facebookId: updatedUser.facebook_id,
        twitterId: updatedUser.twitter_id,
        linkedinId: updatedUser.linkedin_id,
        city: updatedUser.city,
        dateOfBirth: updatedUser.date_of_birth,
        website: updatedUser.website,
        batchLetter: updatedUser.batch_letter,
        earnings: parseFloat(updatedUser.earnings),
        totalClicks: updatedUser.total_clicks,
        totalWithdrawals: updatedUser.total_withdrawals,
        createdAt: updatedUser.created_at
      }
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile. Please try again later.'
    });
  } finally {
    connection.release();
  }
});

// Get user earnings history
router.get('/earnings-history', sessionAuth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.id;
    
    const [history] = await connection.execute(`
      SELECT 
        uc.reward_amount,
        uc.clicked_at,
        p.title as post_title,
        p.engagement_type
      FROM user_clicks uc
      JOIN posts p ON uc.post_id = p.id
      WHERE uc.user_id = ?
      ORDER BY uc.clicked_at DESC
      LIMIT 50
    `, [userId]);

    res.json({
      success: true,
      history: history.map(item => ({
        amount: parseFloat(item.reward_amount),
        earnedAt: item.clicked_at,
        postTitle: item.post_title,
        engagementType: item.engagement_type
      }))
    });

  } catch (error) {
    logger.error('Earnings history error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load earnings history' 
    });
  } finally {
    connection.release();
  }
});

// Withdrawal endpoint
router.post('/withdraw', sessionAuth, async (req, res) => {
  const { method, amount, accountDetails } = req.body;

  if (!method || !amount || !accountDetails) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const withdrawalAmount = parseFloat(amount);
  
  if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  // Check minimum amounts
  const minAmounts = { amazon: 100, phonepe: 500 };
  if (withdrawalAmount < minAmounts[method]) {
    return res.status(400).json({ 
      error: `Minimum withdrawal amount for ${method} is ₹${minAmounts[method]}` 
    });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get current user earnings
    const [users] = await connection.execute(
      'SELECT earnings FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const currentEarnings = parseFloat(users[0].earnings);
    
    if (withdrawalAmount > currentEarnings) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create withdrawal request
    await connection.execute(`
      INSERT INTO withdrawals (user_id, amount, method, account_details, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', NOW())
    `, [req.user.id, withdrawalAmount, method, accountDetails]);

    // Deduct amount from user earnings
    await connection.execute(
      'UPDATE users SET earnings = earnings - ? WHERE id = ?',
      [withdrawalAmount, req.user.id]
    );

    await connection.commit();

    res.json({ 
      message: 'Withdrawal request submitted successfully',
      amount: withdrawalAmount,
      method 
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Withdrawal error:', error);
    res.status(500).json({ 
      error: 'Withdrawal request failed. Please try again later.',
      maintenance: true
    });
  } finally {
    connection.release();
  }
});

// Get user's withdrawal history
router.get('/withdrawals', sessionAuth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.id;
    
    // Get user's withdrawals
    const [withdrawals] = await connection.execute(`
      SELECT 
        id,
        amount,
        method,
        account_details,
        status,
        created_at,
        processed_at,
        admin_notes
      FROM withdrawals 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    const formattedWithdrawals = withdrawals.map(withdrawal => ({
      id: withdrawal.id,
      amount: parseFloat(withdrawal.amount),
      method: withdrawal.method,
      accountDetails: withdrawal.account_details,
      status: withdrawal.status,
      createdAt: withdrawal.created_at,
      processedAt: withdrawal.processed_at,
      adminNotes: withdrawal.admin_notes
    }));

    res.json({
      success: true,
      withdrawals: formattedWithdrawals
    });

  } catch (error) {
    logger.error('User withdrawals fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch withdrawal history' 
    });
  } finally {
    connection.release();
  }
});

module.exports = router;