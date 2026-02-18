import db from '../config/database.js';
import bcrypt from 'bcryptjs';

export const userService = {
  /**
   * List all users with filtering
   */
  getAllUsers(filters = {}) {
    let sql = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.is_admin,
        u.is_active,
        u.created_at,
        u.last_login,
        u.login_count,
        COUNT(DISTINCT l.id) as library_count
      FROM users u
      LEFT JOIN libraries l ON u.id = l.user_id
    `;

    const params = [];
    const conditions = [];

    if (filters.search) {
      conditions.push('(LOWER(u.username) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.isActive !== undefined) {
      conditions.push('u.is_active = ?');
      params.push(filters.isActive ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY u.id ORDER BY u.created_at DESC';

    return db.prepare(sql).all(...params);
  },

  /**
   * Get detailed user information
   */
  getUserById(userId) {
    return db.prepare(`
      SELECT
        u.*,
        COUNT(DISTINCT l.id) as library_count,
        COUNT(DISTINCT vc.id) as cached_videos
      FROM users u
      LEFT JOIN libraries l ON u.id = l.user_id
      LEFT JOIN video_cache vc ON l.id = vc.library_id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(userId);
  },

  /**
   * Create new user (admin function)
   */
  createUser(userData) {
    const { username, password, email, isAdmin = false } = userData;

    // Check if username already exists
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
    if (existing) {
      throw new Error('Username already exists');
    }

    const passwordHash = bcrypt.hashSync(password, 12);

    const result = db.prepare(`
      INSERT INTO users (username, password_hash, email, is_admin, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(username, passwordHash, email || null, isAdmin ? 1 : 0);

    return result.lastInsertRowid;
  },

  /**
   * Update user properties
   */
  updateUser(userId, updates) {
    const allowed = ['email', 'is_active', 'is_admin'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      // Ignore undefined keys so partial updates don't try to bind invalid values.
      if (allowed.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'is_active' || key === 'is_admin') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }

    if (fields.length === 0) return false;

    values.push(userId);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const result = db.prepare(sql).run(...values);

    return result.changes > 0;
  },

  /**
   * Delete user
   */
  deleteUser(userId) {
    // Don't allow deleting the last admin
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').get();
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.is_admin && adminCount.count <= 1) {
      throw new Error('Cannot delete the last admin user');
    }

    const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    return result.changes > 0;
  },

  /**
   * Reset user password
   */
  resetPassword(userId, newPassword) {
    const passwordHash = bcrypt.hashSync(newPassword, 12);
    const result = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(passwordHash, userId);
    return result.changes > 0;
  },

  /**
   * Log user activity
   */
  logActivity(userId, action, details = null, ipAddress = null) {
    try {
      db.prepare(`
        INSERT INTO user_activity (user_id, action, details, ip_address)
        VALUES (?, ?, ?, ?)
      `).run(userId, action, details, ipAddress);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  },

  /**
   * Get user activity log
   */
  getUserActivity(userId, limit = 50) {
    return db.prepare(`
      SELECT * FROM user_activity
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);
  },

  /**
   * Get system statistics
   */
  getStatistics() {
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
        (SELECT COUNT(*) FROM users WHERE is_admin = 1) as admin_users,
        (SELECT COUNT(*) FROM libraries) as total_libraries,
        (SELECT COUNT(*) FROM video_cache) as cached_videos
    `).get();

    return stats;
  }
};
