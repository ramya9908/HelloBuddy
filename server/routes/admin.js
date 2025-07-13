const express = require('express');
const { pool } = require('../db/database');
const { sessionMiddleware, adminMiddleware, verifiedUserMiddleware } = require('../middleware/auth');
const winston = require('winston');

const router = express.Router();
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

router.use(sessionMiddleware);
router.use(verifiedUserMiddleware);
router.use(adminMiddleware);

router.get('/analytics', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [totalUsersResult] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE is_verified = TRUE');
    const [totalPostsResult] = await connection.execute('SELECT COUNT(*) as count FROM posts');
    const [totalClicksResult] = await connection.execute('SELECT COUNT(*) as count FROM user_clicks');
    const [totalEarningsResult] = await connection.execute('SELECT COALESCE(SUM(earnings), 0) as total FROM users');

    const [usersByBatch] = await connection.execute(`
      SELECT batch_letter as batchLetter, COUNT(*) as count 
      FROM users WHERE is_verified = TRUE 
      GROUP BY batch_letter 
      ORDER BY batch_letter
    `);

    const [recentPosts] = await connection.execute(`
      SELECT p.id, p.title, p.engagement_type as engagementType, 
             COALESCE(p.click_count, 0) as clickCount
      FROM posts p 
      ORDER BY p.created_at DESC 
      LIMIT 10
    `);

    const [engagementStats] = await connection.execute(`
      SELECT 
        p.engagement_type,
        COUNT(*) as post_count,
        SUM(COALESCE(p.click_count, 0)) as total_clicks
      FROM posts p
      GROUP BY p.engagement_type
    `);

    const analyticsData = {
      totalUsers: parseInt(totalUsersResult[0].count) || 0,
      totalPosts: parseInt(totalPostsResult[0].count) || 0,
      totalClicks: parseInt(totalClicksResult[0].count) || 0,
      totalEarnings: parseFloat(totalEarningsResult[0].total) || 0,
      usersByBatch: usersByBatch || [],
      recentPosts: recentPosts || [],
      engagementStats: engagementStats || []
    };

    res.json(analyticsData);

  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to load analytics', details: error.message });
  } finally {
    connection.release();
  }
});

router.get('/users', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [users] = await connection.execute(`
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.instagram_id,
        u.batch_letter,
        u.earnings,
        u.is_verified,
        u.created_at,
        (SELECT COUNT(*) FROM user_clicks WHERE user_id = u.id) as total_clicks,
        (SELECT COUNT(*) FROM user_clicks uc JOIN posts p ON uc.post_id = p.id 
         WHERE uc.user_id = u.id AND p.engagement_type = 'like') as like_clicks,
        (SELECT COUNT(*) FROM user_clicks uc JOIN posts p ON uc.post_id = p.id 
         WHERE uc.user_id = u.id AND p.engagement_type = 'like_comment') as like_comment_clicks,
        (SELECT COUNT(*) FROM user_clicks uc JOIN posts p ON uc.post_id = p.id 
         WHERE uc.user_id = u.id AND p.engagement_type = 'like_comment_share') as like_comment_share_clicks,
        (SELECT COUNT(*) FROM user_clicks uc JOIN posts p ON uc.post_id = p.id 
         WHERE uc.user_id = u.id AND p.engagement_type = 'vip') as vip_clicks,
        (SELECT COUNT(*) FROM withdrawals WHERE user_id = u.id) as total_withdrawals
      FROM users u
      WHERE (u.is_admin = FALSE OR u.is_admin IS NULL OR u.is_admin = 0)
      ORDER BY u.created_at DESC
    `);

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      instagramId: user.instagram_id,
      batchLetter: user.batch_letter,
      earnings: parseFloat(user.earnings) || 0,
      isVerified: Boolean(user.is_verified),
      createdAt: user.created_at,
      totalClicks: user.total_clicks || 0,
      likeClicks: user.like_clicks || 0,
      likeCommentClicks: user.like_comment_clicks || 0,
      likeCommentShareClicks: user.like_comment_share_clicks || 0,
      vipClicks: user.vip_clicks || 0,
      totalWithdrawals: user.total_withdrawals || 0
    }));

    res.json({
      success: true,
      users: formattedUsers
    });

  } catch (error) {
    logger.error('Admin users fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch users',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

router.put('/users/:userId/toggle-verification', async (req, res) => {
  const { userId } = req.params;
  const { isVerified } = req.body;

  if (typeof isVerified !== 'boolean') {
    return res.status(400).json({ 
      success: false, 
      message: 'isVerified must be a boolean' 
    });
  }

  const connection = await pool.getConnection();
  
  try {
    const [users] = await connection.execute(
      'SELECT id, full_name FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const [result] = await connection.execute(
      'UPDATE users SET is_verified = ? WHERE id = ?',
      [isVerified, userId]
    );

    res.json({
      success: true,
      message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
      userId: parseInt(userId),
      isVerified
    });

  } catch (error) {
    logger.error('Admin verification update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update verification status',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

router.put('/users/:userId/update', async (req, res) => {
  const { userId } = req.params;
  const { 
    email, 
    fullName, 
    phone, 
    instagramId, 
    batchLetter, 
    earnings,
    isVerified 
  } = req.body;

  if (!email || !fullName || !phone || !instagramId || !batchLetter) {
    return res.status(400).json({ 
      success: false, 
      message: 'All fields except earnings are required',
      received: { email: !!email, fullName: !!fullName, phone: !!phone, instagramId: !!instagramId, batchLetter: !!batchLetter }
    });
  }

  if (earnings !== undefined && (isNaN(parseFloat(earnings)) || parseFloat(earnings) < 0)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Earnings must be a valid positive number' 
    });
  }

  const connection = await pool.getConnection();
  
  try {
    const [existingUsers] = await connection.execute(
      'SELECT id, email, full_name FROM users WHERE id = ?',
      [userId]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (email !== existingUsers[0].email) {
      const [emailCheck] = await connection.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (emailCheck.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email is already taken by another user' 
        });
      }
    }

    let query = `UPDATE users SET email = ?, full_name = ?, phone = ?, instagram_id = ?, batch_letter = ?`;
    let params = [email, fullName, phone, instagramId, batchLetter];

    if (earnings !== undefined) {
      query += ', earnings = ?';
      params.push(parseFloat(earnings));
    }

    if (isVerified !== undefined) {
      query += ', is_verified = ?';
      params.push(isVerified);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    const [result] = await connection.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'No rows were updated. User may not exist.'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      userId: parseInt(userId),
      updatedFields: {
        email, fullName, phone, instagramId, batchLetter,
        ...(earnings !== undefined && { earnings: parseFloat(earnings) }),
        ...(isVerified !== undefined && { isVerified })
      }
    });

  } catch (error) {
    logger.error('Admin user update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    connection.release();
  }
});

router.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const [users] = await connection.execute(
      'SELECT id, full_name, email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const [clicksResult] = await connection.execute('DELETE FROM user_clicks WHERE user_id = ?', [userId]);
    const [withdrawalsResult] = await connection.execute('DELETE FROM withdrawals WHERE user_id = ?', [userId]);
    
    const [userResult] = await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

    await connection.commit();

    res.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        id: parseInt(userId),
        name: users[0].full_name,
        email: users[0].email
      }
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Admin user delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete user',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

router.get('/posts', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [posts] = await connection.execute(`
      SELECT p.id, p.title, p.social_link, p.engagement_type, 
             p.reward_amount, p.target_batches, p.is_active, 
             COALESCE(p.click_count, 0) as click_count, 
             p.click_limit, p.auto_delete_enabled, p.post_message, p.created_at
      FROM posts p 
      ORDER BY p.created_at DESC
    `);

    const formattedPosts = posts.map(post => {
      let targetBatches = [];
      try {
        targetBatches = post.target_batches ? JSON.parse(post.target_batches) : [];
      } catch (e) {
        logger.error('Error parsing target_batches for post', post.id, e);
        targetBatches = [];
      }

      return {
        id: post.id,
        title: post.title,
        socialLink: post.social_link,
        engagementType: post.engagement_type,
        rewardAmount: parseFloat(post.reward_amount),
        targetBatches: targetBatches,
        isActive: Boolean(post.is_active),
        clickCount: parseInt(post.click_count) || 0,
        clickLimit: post.click_limit ? parseInt(post.click_limit) : null,
        autoDeleteEnabled: Boolean(post.auto_delete_enabled),
        postMessage: post.post_message,
        createdAt: post.created_at
      };
    });

    res.json({ posts: formattedPosts });

  } catch (error) {
    logger.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to load posts', details: error.message });
  } finally {
    connection.release();
  }
});

router.post('/posts/bulk', async (req, res) => {
  const { posts } = req.body;

  if (!Array.isArray(posts) || posts.length === 0) {
    return res.status(400).json({ error: 'Posts array is required and must not be empty' });
  }

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const { title, socialLink, engagementType, rewardAmount, targetBatches, clickLimit, autoDeleteEnabled } = post;

    if (!title || !socialLink || !engagementType || !rewardAmount || !targetBatches) {
      return res.status(400).json({ 
        error: `Post ${i + 1}: All required fields must be provided`,
        postIndex: i,
        missingFields: {
          title: !title,
          socialLink: !socialLink,
          engagementType: !engagementType,
          rewardAmount: !rewardAmount,
          targetBatches: !targetBatches
        }
      });
    }

    if (!Array.isArray(targetBatches) || targetBatches.length === 0) {
      return res.status(400).json({ 
        error: `Post ${i + 1}: At least one target batch is required`,
        postIndex: i
      });
    }

    if (autoDeleteEnabled && (!clickLimit || clickLimit < 1)) {
      return res.status(400).json({ 
        error: `Post ${i + 1}: Valid click limit required when auto-delete is enabled`,
        postIndex: i
      });
    }

    if (isNaN(parseFloat(rewardAmount)) || parseFloat(rewardAmount) <= 0) {
      return res.status(400).json({ 
        error: `Post ${i + 1}: Valid reward amount is required`,
        postIndex: i
      });
    }

    if (!['like', 'like_comment', 'like_comment_share', 'vip'].includes(engagementType)) {
      return res.status(400).json({ 
        error: `Post ${i + 1}: Invalid engagement type`,
        postIndex: i
      });
    }
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const createdPosts = [];
    const errors = [];

    for (let i = 0; i < posts.length; i++) {
      try {
        const post = posts[i];
        const { 
          title, 
          socialLink, 
          engagementType, 
          rewardAmount, 
          targetBatches, 
          clickLimit, 
          autoDeleteEnabled,
          postMessage 
        } = post;

        const [result] = await connection.execute(`
          INSERT INTO posts (
            title, social_link, engagement_type, reward_amount, target_batches, 
            is_active, click_count, click_limit, auto_delete_enabled, post_message, created_at
          ) VALUES (?, ?, ?, ?, ?, TRUE, 0, ?, ?, ?, NOW())
        `, [
          title.trim(), 
          socialLink.trim(), 
          engagementType, 
          parseFloat(rewardAmount), 
          JSON.stringify(targetBatches),
          autoDeleteEnabled ? parseInt(clickLimit) : null,
          Boolean(autoDeleteEnabled),
          postMessage || null
        ]);

        createdPosts.push({
          id: result.insertId,
          title: title.trim(),
          socialLink: socialLink.trim(),
          engagementType,
          rewardAmount: parseFloat(rewardAmount),
          targetBatches,
          autoDeleteEnabled: Boolean(autoDeleteEnabled),
          clickLimit: autoDeleteEnabled ? parseInt(clickLimit) : null,
          postMessage: postMessage || null
        });

      } catch (postError) {
        logger.error(`Error creating post ${i + 1}:`, postError);
        errors.push({
          postIndex: i,
          title: posts[i].title,
          error: postError.message
        });
      }
    }

    if (errors.length > 0 && createdPosts.length === 0) {
      await connection.rollback();
      return res.status(500).json({ 
        error: 'Failed to create any posts',
        errors,
        created: 0,
        total: posts.length
      });
    } else if (errors.length > 0) {
      await connection.commit();
      return res.status(207).json({
        message: `Partially successful: ${createdPosts.length}/${posts.length} posts created`,
        created: createdPosts.length,
        failed: errors.length,
        total: posts.length,
        createdPosts,
        errors
      });
    } else {
      await connection.commit();

      res.json({ 
        message: `Successfully created ${createdPosts.length} posts!`,
        created: createdPosts.length,
        total: posts.length,
        createdPosts
      });
    }

  } catch (error) {
    await connection.rollback();
    logger.error('Bulk create posts error:', error);
    res.status(500).json({ 
      error: 'Failed to create posts', 
      details: error.message,
      created: 0,
      total: posts.length
    });
  } finally {
    connection.release();
  }
});

router.post('/posts', async (req, res) => {
  const { 
    title, 
    socialLink, 
    engagementType, 
    rewardAmount, 
    targetBatches, 
    clickLimit, 
    autoDeleteEnabled,
    postMessage 
  } = req.body;

  if (!title || !socialLink || !engagementType || !rewardAmount || !targetBatches) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }

  if (!Array.isArray(targetBatches) || targetBatches.length === 0) {
    return res.status(400).json({ error: 'At least one target batch is required' });
  }

  if (autoDeleteEnabled && (!clickLimit || clickLimit < 1)) {
    return res.status(400).json({ error: 'Valid click limit required when auto-delete is enabled' });
  }

  if (!['like', 'like_comment', 'like_comment_share', 'vip'].includes(engagementType)) {
    return res.status(400).json({ error: 'Invalid engagement type' });
  }

  const connection = await pool.getConnection();
  
  try {
    const [result] = await connection.execute(`
      INSERT INTO posts (
        title, social_link, engagement_type, reward_amount, target_batches, 
        is_active, click_count, click_limit, auto_delete_enabled, post_message, created_at
      ) VALUES (?, ?, ?, ?, ?, TRUE, 0, ?, ?, ?, NOW())
    `, [
      title, 
      socialLink, 
      engagementType, 
      rewardAmount, 
      JSON.stringify(targetBatches),
      autoDeleteEnabled ? clickLimit : null,
      Boolean(autoDeleteEnabled),
      postMessage || null
    ]);

    res.json({ 
      message: autoDeleteEnabled 
        ? `Post created with ${clickLimit} click limit!`
        : 'Post created successfully!',
      postId: result.insertId 
    });

  } catch (error) {
    logger.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post', details: error.message });
  } finally {
    connection.release();
  }
});

router.put('/posts/:postId/toggle-status', async (req, res) => {
  const { postId } = req.params;
  const { isActive } = req.body;

  const connection = await pool.getConnection();
  
  try {
    const [result] = await connection.execute(
      'UPDATE posts SET is_active = ? WHERE id = ?',
      [isActive, postId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ message: 'Post status updated successfully' });

  } catch (error) {
    logger.error('Toggle post status error:', error);
    res.status(500).json({ error: 'Failed to update post status', details: error.message });
  } finally {
    connection.release();
  }
});

router.delete('/posts/:postId', async (req, res) => {
  const { postId } = req.params;

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    await connection.execute('DELETE FROM user_clicks WHERE post_id = ?', [postId]);
    
    const [result] = await connection.execute('DELETE FROM posts WHERE id = ?', [postId]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Post not found' });
    }

    await connection.commit();
    res.json({ message: 'Post deleted successfully' });

  } catch (error) {
    await connection.rollback();
    logger.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post', details: error.message });
  } finally {
    connection.release();
  }
});

router.get('/batches', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [usersByBatch] = await connection.execute(`
      SELECT 
        batch_letter as letter,
        COUNT(*) as user_count,
        1 as is_active
      FROM users 
      WHERE is_verified = TRUE AND batch_letter IS NOT NULL
      GROUP BY batch_letter
      ORDER BY batch_letter
    `);

    const allBatches = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => {
      const existingBatch = usersByBatch.find(b => b.letter === letter);
      return {
        letter: letter,
        userCount: existingBatch ? parseInt(existingBatch.user_count) : 0,
        isActive: true
      };
    });

    res.json({ batches: allBatches });

  } catch (error) {
    logger.error('Get batches error:', error);
    res.status(500).json({ error: 'Failed to load batches', details: error.message });
  } finally {
    connection.release();
  }
});

router.get('/withdrawals', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [withdrawals] = await connection.execute(`
      SELECT 
        w.id,
        w.user_id,
        w.amount,
        w.method,
        w.account_details,
        w.status,
        w.created_at,
        w.processed_at,
        u.full_name as user_name,
        u.email as user_email,
        u.batch_letter as user_batch
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `);

    const formattedWithdrawals = withdrawals.map(withdrawal => ({
      id: withdrawal.id,
      userId: withdrawal.user_id,
      amount: parseFloat(withdrawal.amount),
      method: withdrawal.method,
      accountDetails: withdrawal.account_details,
      status: withdrawal.status,
      createdAt: withdrawal.created_at,
      processedAt: withdrawal.processed_at,
      user: {
        name: withdrawal.user_name,
        email: withdrawal.user_email,
        batch: withdrawal.user_batch
      }
    }));

    res.json({
      success: true,
      withdrawals: formattedWithdrawals
    });

  } catch (error) {
    logger.error('Admin withdrawals fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch withdrawals' 
    });
  } finally {
    connection.release();
  }
});

router.put('/withdrawals/:id/process', async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!['approved', 'declined'].includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Status must be either "approved" or "declined"' 
    });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const [withdrawals] = await connection.execute(
      `SELECT w.*, u.full_name, u.email 
       FROM withdrawals w 
       JOIN users u ON w.user_id = u.id 
       WHERE w.id = ? AND w.status = 'pending'`,
      [id]
    );

    if (withdrawals.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Withdrawal not found or already processed' 
      });
    }

    const withdrawal = withdrawals[0];

    if (status === 'declined') {
      await connection.execute(
        'UPDATE users SET earnings = earnings + ? WHERE id = ?',
        [withdrawal.amount, withdrawal.user_id]
      );
    }

    await connection.execute(
      `UPDATE withdrawals 
       SET status = ?, processed_at = NOW(), admin_notes = ? 
       WHERE id = ?`,
      [status, notes || null, id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      withdrawal: {
        id: parseInt(id),
        status,
        amount: parseFloat(withdrawal.amount),
        user: withdrawal.full_name,
        refunded: status === 'declined'
      }
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Admin withdrawal process error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process withdrawal',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

module.exports = router;