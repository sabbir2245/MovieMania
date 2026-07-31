require('dotenv').config();

class SocketHandler {
  constructor(io, notificationService) {
    this.io = io;
    this.notificationService = notificationService;
    this.connectedUsers = new Map();
    this.setupSocketEvents();
  }

  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      
      // User authentication via socket
      socket.on('authenticate', (data) => {
        this.handleAuthentication(socket, data);
      });
      
      // Handle mark as read for specific user
      socket.on('mark-notification-read', (notificationId) => {
        this.handleMarkAsRead(socket, notificationId);
      });
      
      // Handle clear all notifications for specific user
      socket.on('clear-all-notifications', () => {
        this.handleClearAllNotifications(socket);
      });
      
      // Delete single notification
      socket.on('delete-notification', (notificationId) => {
        this.handleDeleteNotification(socket, notificationId);
      });

      // Handle user activity ping
      socket.on('user-activity', () => {
        this.handleUserActivity(socket);
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  handleAuthentication(socket, data) {
    const { token, userId, username } = data;
    
    // userId হল আসলে username (আমাদের case এ)
    if (userId && username) {
      // Store user info
      socket.userId = userId; // This is actually username
      socket.username = username;
      
      // Add to connected users
      this.connectedUsers.set(userId, {
        socketId: socket.id,
        username: username,
        connectedAt: new Date(),
        lastActivity: new Date()
      });
    
      
      // Send current notifications for this user
      const userNotifications = this.notificationService.getUserNotifications(userId);
      const unreadCount = this.notificationService.getUserUnreadCount(userId);
      
      socket.emit('current-notifications', {
        notifications: userNotifications,
        unread_count: unreadCount,
        total_count: userNotifications.length,
        user: { id: userId, username: username }
      });
      
      // Broadcast user status to all clients
      this.io.emit('user-status-update', {
        userId: userId,
        username: username,
        status: 'online',
        connectedUsers: Array.from(this.connectedUsers.values()).map(user => ({
          username: user.username,
          connectedAt: user.connectedAt
        }))
      });
      
      // Send connection success
      socket.emit('connection-status', {
        connected: true,
        message: 'Successfully connected to notification system',
        timestamp: new Date()
      });
      
    } else {
      socket.emit('connection-status', {
        connected: false,
        message: 'Authentication required',
        timestamp: new Date()
      });
    }
  }

  handleMarkAsRead(socket, notificationId) {
    if (socket.userId) {
     this.notificationService.markAsReadForUser(notificationId, socket.userId);
      
      // Send updated notifications to this user only
      const userNotifications = this.notificationService.getUserNotifications(socket.userId);
      const unreadCount = this.notificationService.getUserUnreadCount(socket.userId);
      
      socket.emit('notifications-updated', {
        notifications: userNotifications,
        unread_count: unreadCount,
        total_count: userNotifications.length
      });
    }
  }

  handleClearAllNotifications(socket) {
    if (socket.userId) {
     this.notificationService.clearUserNotifications(socket.userId);
      
      socket.emit('notifications-updated', {
        notifications: [],
        unread_count: 0,
        total_count: 0
      });
    }
  }

  handleDeleteNotification(socket, notificationId) {
    if (socket.userId) {
     
      // Delete from notification service
      this.notificationService.deleteNotificationForUser(notificationId, socket.userId);
      
      // Send updated notifications
      socket.emit('notifications-updated', {
        notifications: this.notificationService.getUserNotifications(socket.userId),
        unread_count: this.notificationService.getUserUnreadCount(socket.userId)
      });
    }
  }

  handleUserActivity(socket) {
    if (socket.userId && this.connectedUsers.has(socket.userId)) {
      this.connectedUsers.get(socket.userId).lastActivity = new Date();
    }
  }

  handleDisconnect(socket) {
    if (socket.userId) {
     
      // Remove from connected users
      this.connectedUsers.delete(socket.userId);
      
      // Broadcast user status update
      this.io.emit('user-status-update', {
        userId: socket.userId,
        username: socket.username,
        status: 'offline',
        connectedUsers: Array.from(this.connectedUsers.values()).map(user => ({
          username: user.username,
          connectedAt: user.connectedAt
        }))
      });
    } else {
      console.log('📱 Anonymous client disconnected:', socket.id);
    }
  }

  // Get connected users (for API routes)
  getConnectedUsers() {
    return this.connectedUsers;
  }

  // Send notification to specific user
  sendNotificationToUser(username, notification) {
    if (this.connectedUsers.has(username)) {
      const userSocket = this.connectedUsers.get(username);
      this.notificationService.addNotificationForUser(notification, username);
      
      // Send to specific user
      this.io.to(userSocket.socketId).emit('new-notification', {
        notification: notification,
        notifications: this.notificationService.getUserNotifications(username),
        unread_count: this.notificationService.getUserUnreadCount(username)
      });
      
      return { success: true, message: 'Notification sent' };
    } else {
      return { success: false, message: 'User not connected' };
    }
  }
}

module.exports = SocketHandler;