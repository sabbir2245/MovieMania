const express = require('express');
const router = express.Router();
const { pool } = require('../pool'); // Adjust the path to your DB pool config

// POST: Add or update a review
router.post('/', async (req, res) => {
  const { movie_id, username, rating, text_review } = req.body;
  if (!movie_id || !username || !rating) {
    return res.status(400).json({ error: 'movie_id, username, and rating are required' });
  }

  try {
    const checkQuery = `SELECT * FROM "Reviews" WHERE movie_id = $1 AND username = $2`;
    const existing = await pool.query(checkQuery, [movie_id, username]);

    if (existing.rows.length > 0) {
      const updateQuery = `
        UPDATE "Reviews"
        SET rating = $1, text_review = $2
        WHERE movie_id = $3 AND username = $4
        RETURNING *
      `;
      const updated = await pool.query(updateQuery, [rating, text_review, movie_id, username]);
      return res.json({ message: 'Review updated successfully', review: updated.rows[0] });
    }

    const insertQuery = `
      INSERT INTO "Reviews" (movie_id, username, rating, text_review)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const inserted = await pool.query(insertQuery, [movie_id, username, rating, text_review]);
    res.status(201).json({ message: 'Review submitted successfully', review: inserted.rows[0] });
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Like or Dislike a review with prevention of multiple reactions by same user
router.put('/:reviewId/react', async (req, res) => {
  const { reviewId } = req.params;
  const { action, username } = req.body; // action = 'like' or 'dislike', plus username

  if (!['like', 'dislike'].includes(action) || !username) {
    return res.status(400).json({ error: 'Invalid action or username' });
  }

  const column = action === 'like' ? 'liked_by' : 'disliked_by';
  const oppositeColumn = action === 'like' ? 'disliked_by' : 'liked_by';
  const countColumn = action === 'like' ? 'likes' : 'dislikes';
  const oppositeCountColumn = action === 'like' ? 'dislikes' : 'likes';

  try {
    const { rows } = await pool.query(`SELECT * FROM "Reviews" WHERE id = $1`, [reviewId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Review not found' });

    const review = rows[0];
    const alreadyReacted = review[column]?.includes(username);
    const reactedOpposite = review[oppositeColumn]?.includes(username);

    if (alreadyReacted) {
      return res.status(400).json({ error: `You already ${action}d this review` });
    }

    const update = await pool.query(
      `
      UPDATE "Reviews"
      SET 
        ${column} = array_append(${column}, $1),
        ${countColumn} = ${countColumn} + 1,
        ${oppositeColumn} = array_remove(${oppositeColumn}, $1),
        ${oppositeCountColumn} = CASE WHEN $2 THEN ${oppositeCountColumn} - 1 ELSE ${oppositeCountColumn} END
      WHERE id = $3
      RETURNING *;
      `,
      [username, reactedOpposite, reviewId]
    );

    res.json({ message: `${action}d review`, review: update.rows[0] });
  } catch (err) {
    console.error('Error reacting to review:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: All reviews for a specific movie with complex filtering and sorting
router.get('/movie/:movieId', async (req, res) => {
  const { movieId } = req.params;

  // Parse query params for filtering and sorting
  const minRating = parseInt(req.query.minRating) || 1;
  const maxRating = parseInt(req.query.maxRating) || 10;
  const sortBy = req.query.sortBy || 'id'; // allowed: 'id', 'rating', 'likes', 'dislikes'
  const sortOrder = (req.query.sortOrder || 'desc').toUpperCase(); // 'ASC' or 'DESC'

  // Validate inputs and sanitize
  const allowedSortBy = ['id', 'rating', 'likes', 'dislikes'];
  const allowedSortOrder = ['ASC', 'DESC'];

  if (!allowedSortBy.includes(sortBy)) {
    return res.status(400).json({ error: `Invalid sortBy value: ${sortBy}` });
  }
  if (!allowedSortOrder.includes(sortOrder)) {
    return res.status(400).json({ error: `Invalid sortOrder value: ${sortOrder}` });
  }

  try {
    // Complex SQL with explicit CASE in ORDER BY for sorting
    const query = `
      SELECT
        r.id,
        r.movie_id,
        r.username,
        r.rating,
        r.text_review,
        r.likes,
        r.dislikes,
        u."Name" AS user_name
      FROM "Reviews" r
      JOIN "Users" u ON r.username = u.username
      WHERE r.movie_id = $1
        AND r.rating BETWEEN $2 AND $3
      ORDER BY
        CASE WHEN $4 = 'id' AND $5 = 'ASC' THEN r.id END ASC,
        CASE WHEN $4 = 'id' AND $5 = 'DESC' THEN r.id END DESC,
        CASE WHEN $4 = 'rating' AND $5 = 'ASC' THEN r.rating END ASC,
        CASE WHEN $4 = 'rating' AND $5 = 'DESC' THEN r.rating END DESC,
        CASE WHEN $4 = 'likes' AND $5 = 'ASC' THEN r.likes END ASC,
        CASE WHEN $4 = 'likes' AND $5 = 'DESC' THEN r.likes END DESC,
        CASE WHEN $4 = 'dislikes' AND $5 = 'ASC' THEN r.dislikes END ASC,
        CASE WHEN $4 = 'dislikes' AND $5 = 'DESC' THEN r.dislikes END DESC,
        r.id DESC -- fallback order
      ;
    `;

    const result = await pool.query(query, [
      movieId,
      minRating,
      maxRating,
      sortBy,
      sortOrder,
    ]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reviews for movie:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET: All reviews by a user (with movie title)
router.get('/user/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      `SELECT r.*, m.title 
       FROM "Reviews" r
       JOIN "Movies" m ON r.movie_id = m.id
       WHERE r.username = $1
       ORDER BY r.id DESC`,
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user reviews:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Total number of reviews by a user
router.get('/user/:username/count', async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS total_reviews FROM "Reviews" WHERE username = $1`,
      [username]
    );
    res.json({ username, totalReviews: parseInt(result.rows[0].total_reviews, 10) });
  } catch (err) {
    console.error('Error fetching reviews count:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Top reviewers by number of reviews
router.get('/top-users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT username, COUNT(*) AS review_count
      FROM "Reviews"
      GROUP BY username
      ORDER BY review_count DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching top users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Review by user and movie
router.get('/movie/:movieId/user/:username', async (req, res) => {
  const { movieId, username } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM "Reviews" WHERE movie_id = $1 AND username = $2`,
      [movieId, username]
    );
    if (result.rows.length > 0) res.json(result.rows[0]);
    else res.status(404).json(null);
  } catch (err) {
    console.error('Error fetching review:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Review by user and movie
router.delete('/movie/:movieId/user/:username', async (req, res) => {
  const { movieId, username } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM "Reviews" WHERE movie_id = $1 AND username = $2 RETURNING *`,
      [movieId, username]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Review not found' });
    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Rating distribution for a movie (percentage for ratings 1-10)
router.get('/distribution/:movieId', async (req, res) => {
  const movieId = parseInt(req.params.movieId);
  try {
    const totalResult = await pool.query(
      'SELECT COUNT(*) FROM "Reviews" WHERE movie_id = $1',
      [movieId]
    );
    const totalReviews = parseInt(totalResult.rows[0].count, 10);

    if (totalReviews === 0) {
      return res.json({ distribution: Array(10).fill(0) });
    }

    const distributionResult = await pool.query(
      `SELECT rating, COUNT(*) as count
       FROM "Reviews"
       WHERE movie_id = $1
       GROUP BY rating
       ORDER BY rating`,
      [movieId]
    );

    const distribution = Array(10).fill(0);
    distributionResult.rows.forEach(row => {
      distribution[row.rating - 1] = (row.count / totalReviews) * 100;
    });

    res.json({ distribution });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
