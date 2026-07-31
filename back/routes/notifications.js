const express = require('express');
const router = express.Router();
const { pool } = require('../pool');
const notificationService = require('../services/notificationService');

// Get live notifications from service
router.get('/live', (req, res) => {
  try {
    const notifications = notificationService.getNotifications();
    
    // Check if getNotificationCount method exists
    let count = 0;
    if (typeof notificationService.getNotificationCount === 'function') {
      count = notificationService.getNotificationCount();
    } else {
      // Manual count if method not available
      count = notifications.filter(n => !n.read).length;
     
    }
    
    res.json({
      notifications: notifications,
      unread_count: count,
      total_count: notifications.length
    });
  } catch (error) {
    console.error('Error fetching live notifications:', error);
    res.status(500).json({ error: 'Failed to fetch live notifications' });
  }
});

// Mark notification as read
router.put('/mark-read/:id', (req, res) => {
  try {
    const notificationId = parseFloat(req.params.id);
    notificationService.markAsRead(notificationId);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Clear all notifications
router.delete('/clear', (req, res) => {
  try {
    notificationService.clearNotifications();
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Get notifications for upcoming releases (within next 7 days)
router.get('/upcoming-releases', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        title,
        release_date,
        poster_url,
        EXTRACT(DAY FROM (release_date::timestamp - NOW())) as days_until_release
      FROM "Movies" 
      WHERE release_date >= NOW()  
        AND release_date <= NOW() + INTERVAL '7 days'
      ORDER BY release_date ASC
    `;
    
    const result = await pool.query(query);
    
    const notifications = result.rows.map(movie => ({
      id: movie.id,
      title: movie.title,
      message: `"${movie.title}" releases in ${Math.ceil(movie.days_until_release)} days`,
      release_date: movie.release_date,
      poster_url: movie.poster_url,
      type: 'upcoming_release',
      days_until: Math.ceil(movie.days_until_release)
    }));

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching upcoming releases:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get notifications for releases today
router.get('/today-releases', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        title,
        release_date,
        poster_url
      FROM "Movies" 
      WHERE DATE(release_date) = CURRENT_DATE
      ORDER BY release_date ASC
    `;
    
    const result = await pool.query(query);
    
    const notifications = result.rows.map(movie => ({
      id: movie.id,
      title: movie.title,
      message: `"${movie.title}" is released today!`,
      release_date: movie.release_date,
      poster_url: movie.poster_url,
      type: 'today_release'
    }));

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching today releases:', error);
    res.status(500).json({ error: 'Failed to fetch today notifications' });
  }
});

// Get all notifications (upcoming + today)
router.get('/all', async (req, res) => {
  try {
    // Get all upcoming releases (no time limit - all future movies)
    const upcomingQuery = `
      SELECT 
        id,
        title,
        release_date,
        poster_url,
        EXTRACT(DAY FROM (release_date::timestamp - NOW())) as days_until_release
      FROM "Movies" 
      WHERE release_date > CURRENT_DATE 
      ORDER BY release_date ASC
    `;

    // Get today's releases
    const todayQuery = `
      SELECT 
        id,
        title,
        release_date,
        poster_url
      FROM "Movies" 
      WHERE DATE(release_date) = CURRENT_DATE
      ORDER BY release_date ASC
    `;

    const [upcomingResult, todayResult] = await Promise.all([
      pool.query(upcomingQuery),
      pool.query(todayQuery)
    ]);

    const todayNotifications = todayResult.rows.map(movie => ({
      id: movie.id,
      title: movie.title,
      message: `"${movie.title}" is released today! 🎬`,
      release_date: movie.release_date,
      poster_url: movie.poster_url,
      type: 'today_release',
      priority: 1
    }));

    const upcomingNotifications = upcomingResult.rows.map(movie => ({
      id: movie.id,
      title: movie.title,
      message: `"${movie.title}" releases in ${Math.ceil(movie.days_until_release)} days`,
      release_date: movie.release_date,
      poster_url: movie.poster_url,
      type: 'upcoming_release',
      days_until: Math.ceil(movie.days_until_release),
      priority: 2
    }));

    // Combine and sort by priority (today first, then upcoming)
    const allNotifications = [...todayNotifications, ...upcomingNotifications]
      .sort((a, b) => a.priority - b.priority);

    res.json(allNotifications);
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get notifications count (all upcoming movies)
router.get('/count', async (req, res) => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM "Movies" 
      WHERE release_date >= CURRENT_DATE
    `;
    
    const result = await pool.query(query);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({ error: 'Failed to fetch notification count' });
  }
});

// Debug route - console এ print করবে
router.get('/debug', (req, res) => {
  try {
    
    const notifications = notificationService.getNotifications();
    res.json({
      availableMethods: Object.getOwnPropertyNames(notificationService),
      notifications: notifications,
      total_count: notifications.length
    });
  } catch (error) {
    console.error('Error in debug route:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

module.exports = router;