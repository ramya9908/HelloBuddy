const mysql = require('mysql2/promise');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

// Optimized connection pool for high load
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'social_platform',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionLimit: 50,
  waitForConnections: true,
  queueLimit: 0,
  charset: 'utf8mb4',
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Database schema
const createTables = async () => {
  const connection = await pool.getConnection();
  
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        instagram_id VARCHAR(100) NOT NULL,
        facebook_id VARCHAR(100) NULL,
        twitter_id VARCHAR(100) NULL,
        linkedin_id VARCHAR(100) NULL,
        city VARCHAR(100) NULL,
        date_of_birth DATE NULL,
        website VARCHAR(255) NULL,
        batch_letter VARCHAR(10) NOT NULL,
        earnings DECIMAL(10,2) DEFAULT 0,
        is_verified BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        permanent_login_code VARCHAR(6) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_batch_verified (batch_letter, is_verified),
        INDEX idx_email (email),
        INDEX idx_verified (is_verified),
        INDEX idx_permanent_code (permanent_login_code),
        INDEX idx_earnings (earnings),
        INDEX idx_created_at (created_at),
        INDEX idx_instagram (instagram_id),
        INDEX idx_facebook (facebook_id),
        INDEX idx_twitter (twitter_id),
        INDEX idx_linkedin (linkedin_id),
        INDEX idx_city (city),
        INDEX composite_user_lookup (email, is_verified, batch_letter)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPRESSED
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        type ENUM('register', 'login') NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_code_expires (email, code, expires_at),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPRESSED
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_expires_user (expires_at, user_id),
        INDEX idx_user_active (user_id, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPRESSED
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        social_link VARCHAR(500) NOT NULL,
        engagement_type ENUM('like', 'like_comment', 'like_comment_share', 'vip') NOT NULL,
        reward_amount DECIMAL(4,2) NOT NULL,
        target_batches TEXT NOT NULL,
        max_clicks INT DEFAULT NULL,
        expires_at TIMESTAMP DEFAULT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        click_count INT DEFAULT 0,
        click_limit INT DEFAULT NULL,
        auto_delete_enabled BOOLEAN DEFAULT FALSE,
        post_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_active_type (is_active, engagement_type),
        INDEX idx_active_created (is_active, created_at),
        INDEX idx_click_count (click_count),
        INDEX composite_dashboard (is_active, engagement_type, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPRESSED
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_clicks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        post_id INT NOT NULL,
        reward_amount DECIMAL(4,2) NOT NULL,
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        UNIQUE KEY unique_user_post (user_id, post_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        INDEX idx_user_clicked (user_id, clicked_at),
        INDEX idx_post_clicked (post_id, clicked_at),
        INDEX idx_clicked_at (clicked_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPRESSED
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        method ENUM('paytm', 'amazon', 'phonepe') NOT NULL,
        account_details TEXT NOT NULL,
        status ENUM('pending', 'approved', 'declined') DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_status_created (status, created_at),
        INDEX idx_user_status (user_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPRESSED
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id VARCHAR(255) PRIMARY KEY,
        count INT DEFAULT 1,
        reset_time TIMESTAMP NOT NULL,
        INDEX idx_reset (reset_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS batches (
        letter VARCHAR(10) PRIMARY KEY,
        user_count INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_active_count (is_active, user_count)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [batchExists] = await connection.execute(
      'SELECT letter FROM batches WHERE letter = ?',
      ['A']
    );

    if (batchExists.length === 0) {
      await connection.execute(
        'INSERT INTO batches (letter, user_count, is_active) VALUES (?, 0, TRUE)',
        ['A']
      );
    }

    const [adminExists] = await connection.execute(
      'SELECT id FROM users WHERE email = ? AND is_admin = TRUE',
      ['admin@socialplatform.com']
    );

    if (adminExists.length === 0) {
      await connection.execute(`
        INSERT INTO users (email, full_name, phone, instagram_id, batch_letter, is_verified, is_admin, permanent_login_code)
        VALUES ('admin@socialplatform.com', 'Admin User', '+1234567890', 'admin_user', 'ADMIN', TRUE, TRUE, '123456')
      `);
    }
  } catch (error) {
    logger.error('Error creating tables:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Add function to update existing tables with new columns
const addProfileFieldsToExistingTable = async () => {
  const connection = await pool.getConnection();
  
  try {
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
    `, [process.env.DB_NAME || 'social_platform']);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    const columnsToAdd = [
      { name: 'facebook_id', sql: 'ADD COLUMN facebook_id VARCHAR(100) NULL AFTER instagram_id' },
      { name: 'twitter_id', sql: 'ADD COLUMN twitter_id VARCHAR(100) NULL AFTER facebook_id' },
      { name: 'linkedin_id', sql: 'ADD COLUMN linkedin_id VARCHAR(100) NULL AFTER twitter_id' },
      { name: 'city', sql: 'ADD COLUMN city VARCHAR(100) NULL AFTER linkedin_id' },
      { name: 'date_of_birth', sql: 'ADD COLUMN date_of_birth DATE NULL AFTER city' },
      { name: 'website', sql: 'ADD COLUMN website VARCHAR(255) NULL AFTER date_of_birth' },
      { name: 'updated_at', sql: 'ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at' }
    ];

    let addedColumns = [];
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        try {
          await connection.execute(`ALTER TABLE users ${column.sql}`);
          addedColumns.push(column.name);
        } catch (error) {
          if (!error.message.includes('Duplicate column name')) {
            logger.error(`Error adding column ${column.name}:`, error.message);
          }
        }
      }
    }

    const indexesToAdd = [
      { column: 'facebook_id', exists: addedColumns.includes('facebook_id') },
      { column: 'twitter_id', exists: addedColumns.includes('twitter_id') },
      { column: 'linkedin_id', exists: addedColumns.includes('linkedin_id') },
      { column: 'city', exists: addedColumns.includes('city') }
    ];

    for (const index of indexesToAdd) {
      if (index.exists) {
        try {
          await connection.execute(`CREATE INDEX idx_users_${index.column} ON users(${index.column})`);
        } catch (error) {
          if (!error.message.includes('Duplicate key name')) {
            logger.error(`Error creating index for ${index.column}:`, error.message);
          }
        }
      }
    }

    if (addedColumns.length > 0) {
      // Silent operation - no logging for column additions
    }

  } catch (error) {
    logger.error('Error updating users table with profile fields:', error);
  } finally {
    connection.release();
  }
};

// Update posts table to support VIP and post messages
const updatePostsTable = async () => {
  const connection = await pool.getConnection();
  
  try {
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'posts'
    `, [process.env.DB_NAME || 'social_platform']);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    try {
      await connection.execute('ALTER TABLE posts ADD COLUMN post_message TEXT NULL AFTER auto_delete_enabled');
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        logger.error('Error adding post_message column:', error.message);
      }
    }

    try {
      await connection.execute(`ALTER TABLE posts MODIFY COLUMN engagement_type ENUM('like', 'like_comment', 'like_comment_share', 'vip') NOT NULL`);
    } catch (error) {
      if (!error.message.includes('Data truncated') && !error.message.includes('Invalid default value')) {
        logger.error('Error updating engagement_type enum:', error.message);
      }
    }

  } catch (error) {
    logger.error('Error updating posts table:', error);
  } finally {
    connection.release();
  }
};

const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    await createTables();
    await addProfileFieldsToExistingTable();
    await updatePostsTable();
    
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

// Optimized cleanup for high load
const cleanupExpiredData = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Use batch deletion for better performance
    await connection.execute('DELETE FROM sessions WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY) LIMIT 1000');
    await connection.execute('DELETE FROM verification_codes WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY) LIMIT 1000');
    await connection.execute('DELETE FROM rate_limits WHERE reset_time < DATE_SUB(NOW(), INTERVAL 1 DAY) LIMIT 1000');
    
    connection.release();
  } catch (error) {
    logger.error('Cleanup failed:', error);
  }
};

// Get current batch for new user assignment
const getCurrentBatch = async () => {
  try {
    const connection = await pool.getConnection();
    
    const [batches] = await connection.execute(`
      SELECT letter, user_count 
      FROM batches 
      WHERE is_active = TRUE AND user_count < 1000 
      ORDER BY letter ASC 
      LIMIT 1
    `);
    
    connection.release();
    
    if (batches.length > 0) {
      return batches[0].letter;
    }
    
    const nextBatch = await createNextBatch();
    return nextBatch;
  } catch (error) {
    logger.error('Error getting current batch:', error);
    return 'A';
  }
};

// Create next batch letter
const createNextBatch = async () => {
  try {
    const connection = await pool.getConnection();
    
    const [latestBatch] = await connection.execute(`
      SELECT letter FROM batches ORDER BY letter DESC LIMIT 1
    `);
    
    let nextLetter = 'A';
    if (latestBatch.length > 0) {
      const lastLetter = latestBatch[0].letter;
      if (lastLetter === 'Z') {
        nextLetter = 'AA';
      } else if (lastLetter.length === 1) {
        nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);
      } else {
        nextLetter = lastLetter.slice(0, -1) + String.fromCharCode(lastLetter.charCodeAt(lastLetter.length - 1) + 1);
      }
    }
    
    await connection.execute(
      'INSERT INTO batches (letter, user_count, is_active) VALUES (?, 0, TRUE)',
      [nextLetter]
    );
    
    connection.release();
    
    return nextLetter;
  } catch (error) {
    logger.error('Error creating next batch:', error);
    return 'A';
  }
};

// Increment batch user count
const incrementBatchCount = async (batchLetter) => {
  try {
    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE batches SET user_count = user_count + 1 WHERE letter = ?',
      [batchLetter]
    );
    connection.release();
  } catch (error) {
    logger.error('Error incrementing batch count:', error);
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT 1 as test');
    connection.release();
    return rows[0].test === 1;
  } catch (error) {
    logger.error('Connection test failed:', error);
    return false;
  }
};

// Run cleanup every 30 minutes for high load
setInterval(cleanupExpiredData, 30 * 60 * 1000);

process.on('SIGINT', async () => {
  try {
    await pool.end();
  } catch (error) {
    logger.error('Error closing pool:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    await pool.end();
  } catch (error) {
    logger.error('Error closing pool:', error);
  }
  process.exit(0);
});

module.exports = {
  pool,
  initializeDatabase,
  getCurrentBatch,
  incrementBatchCount,
  cleanupExpiredData,
  testConnection,
  addProfileFieldsToExistingTable,
  updatePostsTable
};