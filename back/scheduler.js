const cron = require('node-cron');
const { pool } = require('./pool');

// Function to create upcoming movie notifications
const createUpcomingNotifications = async () => {
  try {
    
    // Get movies releasing in the next 7 days
    const upcomingMovies = await pool.query(
      `SELECT * FROM "Movies" 
       WHERE release_date >= CURRENT_DATE 
       AND release_date <= CURRENT_DATE + INTERVAL '7 days'`
    );

    // Get all users who want notifications
    const users = await pool.query(
      `SELECT user_id FROM "NotificationPreferences" 
       WHERE notify_upcoming_movies = TRUE`
    );

    let notificationCount = 0;

    for (const movie of upcomingMovies.rows) {
      for (const user of users.rows) {
        // Check if notification already exists
        const existingNotification = await pool.query(
          `SELECT id FROM "Notifications" 
           WHERE user_id = $1 AND movie_id = $2`,
          [user.user_id, movie.id]
        );

        if (existingNotification.rows.length === 0) {
          const message = `🎬 "${movie.title}" is releasing soon on ${new Date(movie.release_date).toLocaleDateString()}!`;
          
          await pool.query(
            `INSERT INTO "Notifications" (user_id, movie_id, message)
             VALUES ($1, $2, $3)`,
            [user.user_id, movie.id, message]
          );
          
          notificationCount++;
        }
      }
    }

  } catch (err) {
    console.error('Error creating notifications:', err);
  }
};

// Run every day at 9 AM
cron.schedule('0 9 * * *', createUpcomingNotifications);

// Export for manual testing
module.exports = { createUpcomingNotifications };