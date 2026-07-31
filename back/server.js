require('dotenv').config();

const http = require('http');
const socketIo = require('socket.io');
const { createApp } = require('./app');

// Import Socket configuration and handler
const socketConfig = require('./config/socketConfig');
const SocketHandler = require('./socket/socketHandler');

const server = http.createServer();

// Socket.IO setup with configuration from .env
const io = socketIo(server, socketConfig);

// Initialize notification service
const notificationService = require('./services/notificationService');

// Make io globally available
global.io = io;

// Initialize Socket Handler
const socketHandler = new SocketHandler(io, notificationService);

// Build the Express app and register Socket.IO/notification-dependent routes
const app = createApp((expressApp) => {

  // API endpoint to send notification to specific user
  expressApp.post('/api/notifications/send-to-user', (req, res) => {
    const { username, notification } = req.body;
    const result = socketHandler.sendNotificationToUser(username, notification);
    res.json(result);
  });

  // Send ALL future notifications to specific user
  expressApp.post('/api/notifications/send-all-future', async (req, res) => {
    const { username } = req.body;

    if (!username) {
      return res.json({ success: false, error: 'Username required' });
    }

    try {
      const result = await notificationService.sendAllFutureNotifications(username);
      res.json(result);
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  });

  // Check all upcoming releases manually
  expressApp.post('/api/notifications/check-all-future', async (req, res) => {
    try {
      await notificationService.checkAllUpcomingReleases();
      res.json({ success: true, message: 'All future releases checked and notifications sent' });
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  });

  // Health check endpoint
  expressApp.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date(),
      connectedUsers: socketHandler.getConnectedUsers().size
    });
  });
});

// Attach the Express app as the HTTP request handler
server.on('request', app);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server with Socket.IO listening on port ${PORT}`);
  console.log(`🔔 Auto notification system is running`);
  console.log(`👥 User-based notifications enabled`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`📡 Socket CORS Origin: ${process.env.SOCKET_CORS_ORIGIN}`);
});
