const express = require('express');
const router = express.Router();
const {pool } = require('../pool'); // PostgreSQL pool (pg Pool or Client)

// 1. GET all genres of a particular movie by movie ID
router.get('/movie/:id', async (req, res) => {
  const movieId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT genre_name FROM "Genre" WHERE movie_id = $1',
      [movieId]
    );

    res.json({ movie_id: movieId, genres: result.rows.map(row => row.genre_name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET all movies that have a given genre
router.get('/genre/:name', async (req, res) => {
  const genre = req.params.name;

  try {
    const result = await pool.query(
      `SELECT m.*
       FROM "Movies" m
       JOIN "Genre" g ON m.id = g.movie_id
       WHERE g.genre_name ILIKE $1`,
      [genre]
    );

    res.json({ genre, movies: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. GET all unique genres
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT genre_name FROM "Genre" ORDER BY genre_name ASC'
    );
    res.json({ genres: result.rows.map(row => row.genre_name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
