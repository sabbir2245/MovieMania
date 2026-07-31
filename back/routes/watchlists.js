const express = require('express');
const router = express.Router();
const { pool } = require('../pool'); // adjust path if needed

router.post('/add-movie', async (req, res) => {
  const { watchlist_id, movie_id } = req.body;

  if (!watchlist_id || !movie_id) {
    return res.status(400).json({ error: 'watchlist_id and movie_id are required' });
  }

  try {
    const existsQuery = `
      SELECT * FROM watchlist_movies
      WHERE watchlist_id = $1 AND movie_id = $2
    `;
    const exists = await pool.query(existsQuery, [watchlist_id, movie_id]);

    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'Movie already in watchlist' });
    }

    const insertQuery = `
      INSERT INTO watchlist_movies (watchlist_id, movie_id)
      VALUES ($1, $2)
    `;
    await pool.query(insertQuery, [watchlist_id, movie_id]);

    res.status(201).json({ message: 'Movie added to watchlist successfully' });
  } catch (error) {
    console.error('Error adding movie to watchlist:', error); // 🛠️ Logs actual error
    res.status(500).json({ error: 'Internal server error' });
  }
});



// GET /api/watchlists/search?text=someText
router.get('/search', async (req, res) => {
  const searchText = req.query.text || '';

  if (!searchText) {
    return res.status(400).json({ error: 'search text is required' });
  }

  try {
    const query = `
      SELECT id, username, listname, privacy
      FROM watchlists
      WHERE listname ILIKE '%' || $1 || '%'
        AND privacy = 'public'
    `;
    const result = await pool.query(query, [searchText]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error searching watchlists:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET all watchlists for a specific user
router.get('/user/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM watchlists WHERE username = $1',
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching watchlists for user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ✅ GET all movies in a specific watchlist
router.get('/:watchlistId/movies', async (req, res) => {
  const { watchlistId } = req.params;

  try {
    const result = await pool.query(`
      SELECT m.*
      FROM "Movies" m
      JOIN watchlist_movies wm ON m.id = wm.movie_id
      WHERE wm.watchlist_id = $1
    `, [watchlistId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching movies from watchlist:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// POST /api/watchlists/add
router.post('/add', async (req, res) => {
  const { username, listname } = req.body;

  if (!username || !listname) {
    return res.status(400).json({ error: 'username and listname are required' });
  }

  try {
    // Check if list with same name exists for user
    const checkQuery = `SELECT * FROM watchlists WHERE username = $1 AND listname = $2`;
    const checkResult = await pool.query(checkQuery, [username, listname]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Watchlist with this name already exists' });
    }

    // Insert new watchlist
    const insertQuery = `INSERT INTO watchlists (username, listname) VALUES ($1, $2) RETURNING *`;
    const insertResult = await pool.query(insertQuery, [username, listname]);

    res.json({
      message: 'Watchlist added successfully',
      watchlist: insertResult.rows[0],
    });
  } catch (error) {
    console.error('Error adding watchlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE movie from watchlist
router.delete('/:watchlistId/movies/:movieId', async (req, res) => {
  const watchlistId = parseInt(req.params.watchlistId, 10);
  const movieId = parseInt(req.params.movieId, 10);

  if (isNaN(watchlistId) || isNaN(movieId)) {
    return res.status(400).json({ error: 'Invalid watchlistId or movieId' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM watchlist_movies WHERE watchlist_id = $1 AND movie_id = $2',
      [watchlistId, movieId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Movie not found in watchlist' });
    }

    res.json({ message: 'Movie removed from watchlist successfully' });
  } catch (err) {
    console.error('Error deleting movie from watchlist:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ✅ GET single watchlist by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM watchlists WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching watchlist by ID:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE a specific watchlist by ID (for a given user)
router.delete('/user/:username/watchlist/:id', async (req, res) => {
  const { username, id } = req.params;

  try {
    // Check if the watchlist belongs to the user
    const check = await pool.query(
      'SELECT * FROM watchlists WHERE id = $1 AND username = $2',
      [id, username]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Watchlist not found for this user' });
    }

    // First delete all related entries from watchlist_movies (foreign key constraint)
    await pool.query(
      'DELETE FROM watchlist_movies WHERE watchlist_id = $1',
      [id]
    );

    // Then delete the watchlist itself
    await pool.query(
      'DELETE FROM watchlists WHERE id = $1 AND username = $2',
      [id, username]
    );

    res.json({ message: 'Watchlist and its movies deleted successfully' });
  } catch (error) {
    console.error('Error deleting watchlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




module.exports = router;
