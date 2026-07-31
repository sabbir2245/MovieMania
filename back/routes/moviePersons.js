const express = require('express');
const router = express.Router();
const { pool } = require('../pool');

// GET persons for a movie
router.get('/movies/:movieId/cast', async (req, res) => {

  const { movieId } = req.params;
  try {
    const result = await pool.query(`
      SELECT  p.id as person_id, p.name, p.birthdate, p.gender, p.role, p.photo_url, mp.role_description
      FROM movie_persons mp
      JOIN persons p ON mp.person_id = p.id
      WHERE mp.movie_id = $1
    `, [movieId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching movie cast/crew:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET movies for a person
router.get('/person/:personId', async (req, res) => {
  const { personId } = req.params;
  try {
    const personResult = await pool.query(`SELECT * FROM persons WHERE id = $1`, [personId]);
    if (personResult.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const moviesResult = await pool.query(`
      SELECT m.*, mp.role_description
      FROM "Movies" m
      JOIN movie_persons mp ON m.id = mp.movie_id
      WHERE mp.person_id = $1
    `, [personId]);

    res.json({ person: personResult.rows[0], movies: moviesResult.rows });
  } catch (err) {
    console.error('Error fetching person and movies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET all persons
router.get('/persons', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM persons ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all persons:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
