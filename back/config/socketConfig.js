require('dotenv').config();

const socketConfig = {
  // CORS Configuration
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:5001",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  
  // Socket.IO Options
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  
  // Connection Options
  connectionStateRecovery: {
    // the backup duration of the sessions and the packets
    maxDisconnectionDuration: 2 * 60 * 1000,
    // whether to skip middlewares upon successful recovery
    skipMiddlewares: true,
  }
};

module.exports = socketConfig;