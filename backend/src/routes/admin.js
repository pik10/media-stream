import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { userService } from '../services/userService.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication + admin
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/users - List all users
 */
router.get('/users', async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const users = userService.getAllUsers({
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });
    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * GET /api/admin/users/:id - Get user details
 */
router.get('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent activity
    const activity = userService.getUserActivity(userId, 20);

    res.json({ user, activity });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /api/admin/users - Create user
 */
router.post('/users', async (req, res) => {
  try {
    const schema = Joi.object({
      username: Joi.string().min(3).max(50).required(),
      password: Joi.string().min(6).required(),
      email: Joi.string().email().optional().allow(''),
      isAdmin: Joi.boolean().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = userService.createUser(value);

    // Log activity
    userService.logActivity(
      req.user.userId,
      'user_created',
      `Created user: ${value.username}`,
      req.ip
    );

    res.status(201).json({
      message: 'User created successfully',
      userId
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

/**
 * PUT /api/admin/users/:id - Update user
 */
router.put('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { email, is_active, is_admin } = req.body;

    // Prevent self-demotion from admin
    if (userId === req.user.userId && is_admin === false) {
      return res.status(400).json({ error: 'Cannot remove your own admin privileges' });
    }

    const updated = userService.updateUser(userId, {
      email,
      is_active,
      is_admin
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    userService.logActivity(
      req.user.userId,
      'user_updated',
      `Updated user ID: ${userId}`,
      req.ip
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id - Delete user
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent self-deletion
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const deleted = userService.deleteUser(userId);

    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    userService.logActivity(
      req.user.userId,
      'user_deleted',
      `Deleted user ID: ${userId}`,
      req.ip
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password - Reset password
 */
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const reset = userService.resetPassword(userId, newPassword);

    if (!reset) {
      return res.status(404).json({ error: 'User not found' });
    }

    userService.logActivity(
      req.user.userId,
      'password_reset',
      `Reset password for user ID: ${userId}`,
      req.ip
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * GET /api/admin/statistics - Get system statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = userService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;
