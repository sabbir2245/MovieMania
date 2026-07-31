const cron = require('node-cron');
const { pool } = require('../pool');

class NotificationService {
  constructor() {
    // Store notifications by username (instead of userId)
    this.userNotifications = new Map(); // username -> notifications[]
    this.isDbConnected = false;
    this.dbRetryCount = 0;
    this.maxRetries = 5;
    this.init();
  }

  init() {
    // Test database connection
    this.testDatabaseConnection();
    
    // Check database connection every 5 minutes
    setInterval(() => {
      this.checkDatabaseHealth();
    }, 5 * 60 * 1000);
    
    // প্রতি ঘণ্টায় একবার check করবে (only if DB is connected)
    cron.schedule('0 * * * *', () => {
      if (this.isDbConnected) {
        this.checkUpcomingReleases();
      }
    });

    // প্রতিদিন সকাল ৯টায় check করবে (only if DB is connected)
    cron.schedule('0 9 * * *', () => {
      if (this.isDbConnected) {
        this.checkTodayReleases();
        this.checkAllUpcomingReleases();
      }
    });

    // প্রতি ১ মিনিটে check করবে (testing এর জন্য)
    cron.schedule('*/1 * * * *', () => {
      if (this.isDbConnected) {
        this.checkUpcomingReleases();
        this.checkAllUpcomingReleases();
      } else {
        this.testDatabaseConnection(); // Try to reconnect
      }
      this.checkNotifications();
    });
  }

  async checkDatabaseHealth() {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      if (!this.isDbConnected) {
        this.isDbConnected = true;
        this.dbRetryCount = 0;
      }
    } catch (error) {
      this.isDbConnected = false;
    }
  }

  async executeQuery(query, params = []) {
    let client;
    try {
      client = await pool.connect();
      const result = await client.query(query, params);
      return result;
    } catch (error) {
      this.isDbConnected = false;
      
      // Specific error handling
      if (error.code === 'XX000' || error.message.includes('termination')) {
        this.dbRetryCount++;
        
        if (this.dbRetryCount <= this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * this.dbRetryCount));
          return this.executeQuery(query, params);
        }
      }
      
      throw error;
    } finally {
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          // Silent error handling
        }
      }
    }
  }

  async testDatabaseConnection() {
    try {
      const result = await this.executeQuery('SELECT NOW() as current_time');
      this.isDbConnected = true;
      this.dbRetryCount = 0;
      
      // Test tables existence
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('Movies', 'Users')
      `;
      
      const tablesResult = await this.executeQuery(tablesQuery);
      
      // Check Movies table structure
      if (tablesResult.rows.some(row => row.table_name === 'Movies')) {
        const moviesStructure = await this.executeQuery(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'Movies'
        `);
        
        const testMovies = await this.executeQuery('SELECT COUNT(*) FROM "Movies"');
      }
      
      // Check Users table
      if (tablesResult.rows.some(row => row.table_name === 'Users')) {
        const usersStructure = await this.executeQuery(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'Users'
        `);
        
        const testUsers = await this.executeQuery('SELECT COUNT(*) FROM "Users"');
      }
      
    } catch (error) {
      this.isDbConnected = false;
    }
  }

  async checkUpcomingReleases() {
    if (!this.isDbConnected) {
      return;
    }

    try {
      const query = `
        SELECT 
          id, 
          title, 
          release_date, 
          poster_url,
          EXTRACT(DAY FROM (release_date::timestamp - NOW())) as days_until_release
        FROM "Movies" 
        WHERE release_date > NOW() 
          AND release_date <= NOW() + INTERVAL '7 days'
        ORDER BY release_date ASC
      `;
      
      const result = await this.executeQuery(query);
      
      if (result.rows.length === 0) {
        return;
      }
      
      // Get all users by username
      const usersQuery = 'SELECT username, "Name" FROM "Users"';
      const usersResult = await this.executeQuery(usersQuery);
      
      if (usersResult.rows.length === 0) {
        return;
      }
      
      result.rows.forEach(movie => {
        const daysUntil = Math.ceil(movie.days_until_release);
        
        // ৭, ৩, ১ দিন আগে notification পাঠাবে
        if ([7, 3, 1].includes(daysUntil)) {
          const notification = {
            movieId: movie.id,
            title: movie.title,
            message: `🎬 "${movie.title}" releases in ${daysUntil} day${daysUntil > 1 ? 's' : ''}!`,
            type: 'upcoming_release',
            daysUntil: daysUntil,
            releaseDate: movie.release_date,
            posterUrl: movie.poster_url
          };
          
          // Send to all users using username
          usersResult.rows.forEach(user => {
            this.addNotificationForUser(notification, user.username);
          });
        }
      });
    } catch (error) {
      this.isDbConnected = false;
    }
  }

  async checkAllUpcomingReleases() {
    if (!this.isDbConnected) {
      return;
    }

    try {
      // Get ALL future movies (no time limit)
      const query = `
        SELECT 
          id, 
          title, 
          release_date, 
          poster_url,
          EXTRACT(DAY FROM (release_date::timestamp - NOW())) as days_until_release
        FROM "Movies" 
        WHERE release_date > NOW()
        ORDER BY release_date ASC
      `;
      
      const result = await this.executeQuery(query);
      
      if (result.rows.length === 0) {
        return;
      }
      
      // Get all users
      const usersQuery = 'SELECT username, "Name" FROM "Users"';
      const usersResult = await this.executeQuery(usersQuery);
      
      if (usersResult.rows.length === 0) {
        return;
      }
      
      result.rows.forEach(movie => {
        const daysUntil = Math.ceil(movie.days_until_release);
        
        // Create notification for ALL future movies
        const notification = {
          movieId: movie.id,
          title: movie.title,
          message: `📅 "${movie.title}" will release in ${daysUntil} day${daysUntil > 1 ? 's' : ''}!`,
          type: 'future_release',
          daysUntil: daysUntil,
          releaseDate: movie.release_date,
          posterUrl: movie.poster_url
        };
        
        // Send to all users using username
        usersResult.rows.forEach(user => {
          this.addNotificationForUser(notification, user.username);
        });
      });
    } catch (error) {
      this.isDbConnected = false;
    }
  }

  async checkTodayReleases() {
    if (!this.isDbConnected) {
      return;
    }

    try {
      const query = `
        SELECT id, title, release_date, poster_url
        FROM "Movies" 
        WHERE DATE(release_date) = CURRENT_DATE
      `;
      
      const result = await this.executeQuery(query);
      
      if (result.rows.length === 0) {
        return;
      }
      
      // Get all users
      const usersQuery = 'SELECT username, "Name" FROM "Users"';
      const usersResult = await this.executeQuery(usersQuery);
      
      if (usersResult.rows.length === 0) {
        return;
      }
      
      result.rows.forEach(movie => {
        const notification = {
          movieId: movie.id,
          title: movie.title,
          message: `🎉 "${movie.title}" is now released!`,
          type: 'today_release',
          releaseDate: movie.release_date,
          posterUrl: movie.poster_url
        };
        
        // Send to all users using username
        usersResult.rows.forEach(user => {
          this.addNotificationForUser(notification, user.username);
        });
      });
    } catch (error) {
      this.isDbConnected = false;
    }
  }

  checkNotifications() {
    let totalNotifications = 0;
    this.userNotifications.forEach((notifications, username) => {
      totalNotifications += notifications.length;
    });
  }

  addNotificationForUser(notification, username) {
    if (!this.userNotifications.has(username)) {
      this.userNotifications.set(username, []);
    }
    
    const userNotifications = this.userNotifications.get(username);
    
    // Enhanced duplicate check for this user
    const exists = userNotifications.find(n => 
      n.movieId === notification.movieId && 
      n.type === notification.type &&
      (n.daysUntil === notification.daysUntil || (n.type === 'future_release' && notification.type === 'future_release'))
    );

    if (!exists) {
      const newNotification = {
        ...notification,
        id: Date.now() + Math.random() + username.hashCode(),
        timestamp: new Date(),
        read: false,
        username: username
      };

      userNotifications.push(newNotification);

      // Real-time Socket.IO broadcast to specific user
      if (global.io) {
        const unreadCount = this.getUserUnreadCount(username);
        
        // Send to specific user only
        global.io.emit('new-notification', {
          notification: newNotification,
          notifications: this.getUserNotifications(username),
          unread_count: unreadCount,
          total_count: userNotifications.length,
          targetUsername: username
        });
      }

      // Keep only last 200 notifications per user
      if (userNotifications.length > 200) {
        this.userNotifications.set(username, userNotifications.slice(-200));
      }
    }
  }

  deleteNotificationForUser(notificationId, username) {
    if (!this.userNotifications.has(username)) {
      return false;
    }
    
    const userNotifications = this.userNotifications.get(username);
    const initialLength = userNotifications.length;
    
    // Filter out the notification with matching ID
    const updatedNotifications = userNotifications.filter(n => n.id !== notificationId);
    
    if (updatedNotifications.length < initialLength) {
      this.userNotifications.set(username, updatedNotifications);
      return true;
    }
    
    return false;
  }

  getUserNotifications(username) {
    if (!this.userNotifications.has(username)) {
      return [];
    }
    
    const notifications = this.userNotifications.get(username)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100);
    
    return notifications;
  }

  getUserUnreadCount(username) {
    if (!this.userNotifications.has(username)) {
      return 0;
    }
    
    const unreadCount = this.userNotifications.get(username).filter(n => !n.read).length;
    return unreadCount;
  }

  markAsReadForUser(notificationId, username) {
    if (!this.userNotifications.has(username)) {
      return;
    }
    
    const userNotifications = this.userNotifications.get(username);
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.read = true;
    }
  }

  clearUserNotifications(username) {
    this.userNotifications.set(username, []);
  }

  createTestNotification(username) {
    const testNotification = {
      movieId: '37',
      title: 'Test Future Movie',
      message: '🎬 "Test Future Movie" releases in 15 days!',
      type: 'future_release',
      daysUntil: 15,
      releaseDate: '2025-08-05T18:00:00.000Z',
      posterUrl: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg'
    };
    
    this.addNotificationForUser(testNotification, username);
  }

  async sendAllFutureNotifications(username) {
    if (!this.isDbConnected) {
      return { success: false, error: 'Database not connected' };
    }

    try {
      const query = `
        SELECT 
          id, 
          title, 
          release_date, 
          poster_url,
          EXTRACT(DAY FROM (release_date::timestamp - NOW())) as days_until_release
        FROM "Movies" 
        WHERE release_date > NOW()
        ORDER BY release_date ASC
      `;
      
      const result = await this.executeQuery(query);
      
      if (result.rows.length === 0) {
        return { success: false, message: 'No future movies found' };
      }
      
      let notificationsSent = 0;
      
      result.rows.forEach(movie => {
        const daysUntil = Math.ceil(movie.days_until_release);
        
        const notification = {
          movieId: movie.id,
          title: movie.title,
          message: `📅 "${movie.title}" will release in ${daysUntil} day${daysUntil > 1 ? 's' : ''}!`,
          type: 'future_release',
          daysUntil: daysUntil,
          releaseDate: movie.release_date,
          posterUrl: movie.poster_url
        };
        
        this.addNotificationForUser(notification, username);
        notificationsSent++;
      });
      
      return { success: true, count: notificationsSent };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Legacy methods for backward compatibility
  getNotifications() {
    const allNotifications = [];
    this.userNotifications.forEach((notifications) => {
      allNotifications.push(...notifications);
    });
    return allNotifications.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
  }

  getNotificationCount() {
    let totalUnread = 0;
    this.userNotifications.forEach((notifications) => {
      totalUnread += notifications.filter(n => !n.read).length;
    });
    return totalUnread;
  }

  markAsRead(notificationId) {
    this.userNotifications.forEach((notifications, username) => {
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
    });
  }

  clearNotifications() {
    this.userNotifications.clear();
  }
}

// Helper function for string hashing
String.prototype.hashCode = function() {
  let hash = 0;
  if (this.length === 0) return hash;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

module.exports = new NotificationService();