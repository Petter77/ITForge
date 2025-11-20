const express = require('express');
const authMiddleware = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/notifications
// @desc    Get all notifications for the current user (including read ones)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.findByUserId(
      req.user.id,
      true // Always include read notifications
    );
    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get count of unread notifications
// @access  Private
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.markAsRead(req.params.id, req.user.id);
    if (!notification) {
      return res.status(404).json({ message: 'Powiadomienie nie zostało znalezione' });
    }
    res.json({ message: 'Powiadomienie zostało oznaczone jako przeczytane', notification });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', async (req, res) => {
  try {
    const count = await Notification.markAllAsRead(req.user.id);
    res.json({ message: 'Wszystkie powiadomienia zostały oznaczone jako przeczytane', count });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

module.exports = router;

