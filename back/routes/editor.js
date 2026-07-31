
const express = require('express');
const multer = require('multer');
const router = express.Router();
const {pool} = require('../pool'); // PostgreSQL connection
const { requireEditor } = require('../middleware/auth');
const storageService = require('../services/storageService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

router.post('/add', async (req, res) => {
  let {
    title,
    release_date,
    plot,
    budget,
    boxoffice,
    runtime,
    rating_label,
    poster_url,
    trailer_link
  } = req.body;

  // Only require title and release_date
  if (!title || !release_date) {
    return res.status(400).json({ error: 'Missing required fields: title, release_date' });
  }

  // Extract year from release_date
  const year = release_date.slice(0, 4);

  // Convert empty strings to null for numeric fields
  budget = budget === "" ? null : budget;
  boxoffice = boxoffice === "" ? null : boxoffice;
  runtime = runtime === "" ? null : runtime;
  poster_url = poster_url || null;
  trailer_link = trailer_link || null;

  try {
    const query = `
      INSERT INTO public."Movies"
        (title, year, release_date, plot, budget, boxoffice, runtime, rating_label, poster_url, trailer_link)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
      title, year, release_date, plot, budget, boxoffice, runtime, rating_label, poster_url, trailer_link
    ];
    const result = await pool.query(query, values);
    res.status(201).json({ message: 'Movie added successfully', movie: result.rows[0] });

  } catch (err) {
    console.error('🔴 Error adding movie:', err.message);
    res.status(500).json({ error: 'Failed to add movie' });
  }
});

// 🔹 Upload a movie poster image to Supabase Storage (admin only)
router.post('/upload-poster', requireEditor, (req, res) => {
  upload.single('poster')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large (max 5 MB)' });
      }
      return res.status(400).json({ error: 'Upload error: ' + err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    try {
      const filename = (req.file.originalname || 'poster').replace(/[^a-zA-Z0-9._-]/g, '_');
      const { path, url } = await storageService.uploadPoster(req.file.buffer, {
        filename,
        contentType: req.file.mimetype,
        upsert: true,
      });
      res.status(201).json({ message: 'Poster uploaded successfully', path, posterUrl: url });
    } catch (error) {
      console.error('🔴 Error uploading poster:', error.message);
      res.status(500).json({ error: 'Poster upload failed', details: error.message });
    }
  });
});

// 🔹 Delete a movie by ID
router.delete('/delete/:id', async (req, res) => {
  const movieId = parseInt(req.params.id);
  if (isNaN(movieId)) {
    return res.status(400).json({ error: 'Invalid movie ID' });
  }

  try {
    const result = await pool.query('DELETE FROM public."Movies" WHERE id = $1 RETURNING *', [movieId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    res.json({ message: 'Movie deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('🔴 Error deleting movie:', err.message);
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});

// 🔹 Edit/update a movie by ID
router.put('/edit/:id', async (req, res) => {
  const movieId = parseInt(req.params.id);
  if (isNaN(movieId)) {
    return res.status(400).json({ error: 'Invalid movie ID' });
  }

  const {
    title, year, release_date, plot, budget, boxoffice,
    rating, runtime, votes, poster_url, rating_label, trailer_link
  } = req.body;

  try {
    const query = `
      UPDATE public."Movies"
      SET title = $1,
          year = $2,
          release_date = $3,
          plot = $4,
          budget = $5,
          boxoffice = $6,
          rating = $7,
          runtime = $8,
          votes = $9,
          poster_url = $10,
          rating_label = $11,
          trailer_link = $12
      WHERE id = $13
      RETURNING *;
    `;
    const values = [
      title, year, release_date, plot, budget, boxoffice,
      rating, runtime, votes, poster_url, rating_label, trailer_link, movieId
    ];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    res.json({ message: 'Movie updated successfully', movie: result.rows[0] });
  } catch (err) {
    console.error('🔴 Error editing movie:', err.message);
    res.status(500).json({ error: 'Failed to edit movie' });
  }
});

// 🔹 Get all usernames and names from Users table
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT username, "Name" FROM public."Users"');
    res.json({ users: result.rows });
  } catch (err) {
    console.error('🔴 Error fetching users:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


// 🔹 Ban (delete) a user by username
router.delete('/ban/:username', async (req, res) => {
  const username = req.params.username;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  try {
    const result = await pool.query('DELETE FROM public."Users" WHERE username = $1 RETURNING *', [username]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User banned (deleted)', deleted: result.rows[0] });
  } catch (err) {
    console.error('🔴 Error banning user:', err.message);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});
module.exports = router;
