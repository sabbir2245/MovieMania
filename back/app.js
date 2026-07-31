const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const watchlistRoutes = require('./routes/watchlists');
const reviewRoutes = require('./routes/reviews');
const moviePersonsRoutes = require('./routes/moviePersons');
const upcomingRoutes = require('./routes/upcoming');
const genreRoutes = require('./routes/genres');
const notificationRoutes = require('./routes/notifications');
const editorRoutes = require('./routes/editor');
const premiumRoutes = require('./routes/premium');
const chatbotRoutes = require('./routes/chatbot');

function createApp(registerIoRoutes) {
  const app = express();

  // CORS — reflect the request origin so the multipart poster upload (which
  // triggers a preflight because of the Authorization header + file body) is
  // never blocked when the app is opened via localhost, 127.0.0.1, or a LAN IP.
  app.use(cors({
    origin: (origin, callback) => callback(null, origin || true),
    credentials: true,
  }));

  app.use(express.json());

  // Use routes
  app.use('/auth', authRoutes);
  app.use('/api/movies', movieRoutes);
  app.use('/api/watchlists', watchlistRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/movie-persons', moviePersonsRoutes);
  app.use('/api/upcoming', upcomingRoutes);
  app.use('/api/genres', genreRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/editor', editorRoutes);
  app.use('/api/premium', premiumRoutes);
  app.use('/api/chat', chatbotRoutes);

  // Optional: attach Socket.IO/notification-dependent routes from server.js
  if (typeof registerIoRoutes === 'function') {
    registerIoRoutes(app);
  }

  return app;
}

module.exports = { createApp };
