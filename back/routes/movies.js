const express = require('express');
const router = express.Router();
const { pool } = require('../pool');




router.get('/upcoming', async (req, res) => {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const query = `
      SELECT * FROM public."Movies"
      WHERE release_date > $1
      ORDER BY release_date ASC;
    `;
    const { rows } = await pool.query(query, [currentDate]);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching upcoming movies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all movies
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Movies" ORDER BY year DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching movies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// GET /api/movies/:movieId/awards
router.get('/:movieId/awards', async (req, res) => {
  const movieId = req.params.movieId;

  try {
    const query = `
      SELECT award_name, category, year, status
      FROM "MovieAwards"
      WHERE movie_id = $1
      ORDER BY year DESC, award_name
    `;
    const { rows } = await pool.query(query, [movieId]);

    const formatted = rows.map(row => {
      return `${row.status} for ${row.award_name} in ${row.year} (${row.category})`;
    });

    res.json({ awards: formatted });
  } catch (err) {
    console.error('Error fetching awards:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Add a new movie
router.post('/', async (req, res) => {
  const {
    title,
    year,
    release_date,
    plot,
    budget,
    boxoffice,
    rating,
    runtime,
    votes,
    poster_url,
    rating_label,
    trailer_link
  } = req.body;

  // Validation
  if (!title || !year) {
    return res.status(400).json({ error: 'Title and year are required' });
  }

  try {
    const insertQuery = `
      INSERT INTO "Movies" (
        title, year, release_date, plot, budget, boxoffice, 
        rating, runtime, votes, poster_url, rating_label, trailer_link
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      title,
      year,
      release_date || null,
      plot || null,
      budget || null,
      boxoffice || null,
      rating || 0,
      runtime || null,
      votes || 0,
      poster_url || null,
      rating_label || 'Not Rated',
      trailer_link || null
    ];

    const result = await pool.query(insertQuery, values);
    
    res.status(201).json({
      message: 'Movie added successfully',
      movie: result.rows[0]
    });
  } catch (err) {
    console.error('Error adding movie:', err);
    if (err.code === '23505') { // Duplicate key error
      res.status(409).json({ error: 'Movie with this title already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add movie' });
    }
  }
});

// PUT - Update a movie
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid movie ID' });
  }

  const {
    title,
    year,
    release_date,
    plot,
    budget,
    boxoffice,
    rating,
    runtime,
    votes,
    poster_url,
    rating_label,
    trailer_link
  } = req.body;

  try {
    const updateQuery = `
      UPDATE "Movies" 
      SET 
        title = COALESCE($1, title),
        year = COALESCE($2, year),
        release_date = COALESCE($3, release_date),
        plot = COALESCE($4, plot),
        budget = COALESCE($5, budget),
        boxoffice = COALESCE($6, boxoffice),
        rating = COALESCE($7, rating),
        runtime = COALESCE($8, runtime),
        votes = COALESCE($9, votes),
        poster_url = COALESCE($10, poster_url),
        rating_label = COALESCE($11, rating_label),
        trailer_link = COALESCE($12, trailer_link)
      WHERE id = $13
      RETURNING *
    `;
    
    const values = [
      title, year, release_date, plot, budget, boxoffice,
      rating, runtime, votes, poster_url, rating_label, trailer_link, id
    ];

    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json({
      message: 'Movie updated successfully',
      movie: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating movie:', err);
    res.status(500).json({ error: 'Failed to update movie' });
  }
});

// DELETE a movie
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid movie ID' });
  }

  try {
    const result = await pool.query('DELETE FROM "Movies" WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json({
      message: 'Movie deleted successfully',
      movie: result.rows[0]
    });
  } catch (err) {
    console.error('Error deleting movie:', err);
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});

// Advanced Search movies with searchType, filters, sorting and pagination
router.get('/search', async (req, res) => {
  const searchText = req.query.text || '';
  const searchType = req.query.type || 'movie'; // movie, actor, genre
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Advanced filters
  const startYear = parseInt(req.query.startYear) || null;
  const endYear = parseInt(req.query.endYear) || null;
  const minRating = parseFloat(req.query.minRating) || null;
  const maxRating = parseFloat(req.query.maxRating) || null;
  const genres = req.query.genres ? req.query.genres.split(',').map(g => g.trim()) : [];
  const actors = req.query.actors ? req.query.actors.split(',').map(a => a.trim()) : [];
  
  // Sorting options
  const sortBy = req.query.sortBy || 'rating'; // title, rating, votes, year, boxoffice
  const sortOrder = req.query.sortOrder || 'desc'; // asc, desc

  try {
    let baseQuery = '';
    let whereConditions = [];
    let havingConditions = [];
    let queryParams = [];
    let paramIndex = 0;

    const hasSearchText = searchText.trim().length > 0;

    // Use movie_persons for actor join
    if (hasSearchText) {
      paramIndex++;
      queryParams.push(searchText);

      switch (searchType.toLowerCase()) {
        case 'movie':
          baseQuery = `
            SELECT m.*,
                   STRING_AGG(DISTINCT g.genre_name, ', ' ORDER BY g.genre_name) as genre,
                   STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) as actors
            FROM "Movies" m
            LEFT JOIN "Genre" g ON m.id = g.movie_id
            LEFT JOIN movie_persons mp ON m.id = mp.movie_id
            LEFT JOIN persons p ON mp.person_id = p.id
          `;
          whereConditions.push(`LOWER(m.title) LIKE '%' || LOWER($${paramIndex}) || '%'`);
          break;

        case 'actor':
          baseQuery = `
            SELECT m.*,
                   STRING_AGG(DISTINCT g.genre_name, ', ' ORDER BY g.genre_name) as genre,
                   STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) as actors
            FROM "Movies" m
            LEFT JOIN "Genre" g ON m.id = g.movie_id
            INNER JOIN movie_persons mp ON m.id = mp.movie_id
            INNER JOIN persons p ON mp.person_id = p.id
          `;
          whereConditions.push(`LOWER(p.name) LIKE '%' || LOWER($${paramIndex}) || '%'`);
          break;

        case 'genre':
          baseQuery = `
            SELECT m.*,
                   STRING_AGG(DISTINCT g.genre_name, ', ' ORDER BY g.genre_name) as genre,
                   STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) as actors
            FROM "Movies" m
            INNER JOIN "Genre" g ON m.id = g.movie_id
            LEFT JOIN movie_persons mp ON m.id = mp.movie_id
            LEFT JOIN persons p ON mp.person_id = p.id
          `;
          whereConditions.push(`LOWER(g.genre_name) LIKE '%' || LOWER($${paramIndex}) || '%'`);
          break;

        default:
          return res.status(400).json({ 
            error: 'Invalid search type. Use: movie, actor, or genre',
            validTypes: ['movie', 'actor', 'genre']
          });
      }
    } else {
      // No search text - return all movies with filters
      baseQuery = `
        SELECT m.*,
               STRING_AGG(DISTINCT g.genre_name, ', ' ORDER BY g.genre_name) as genre,
               STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) as actors
        FROM "Movies" m
        LEFT JOIN "Genre" g ON m.id = g.movie_id
        LEFT JOIN movie_persons mp ON m.id = mp.movie_id
        LEFT JOIN persons p ON mp.person_id = p.id
      `;
    }

    // Add year filters
    if (startYear) {
      paramIndex++;
      whereConditions.push(`m.year >= $${paramIndex}`);
      queryParams.push(startYear);
    }
    if (endYear) {
      paramIndex++;
      whereConditions.push(`m.year <= $${paramIndex}`);
      queryParams.push(endYear);
    }

    // Add rating filters
    if (minRating !== null) {
      paramIndex++;
      whereConditions.push(`m.rating >= $${paramIndex}`);
      queryParams.push(minRating);
    }
    if (maxRating !== null) {
      paramIndex++;
      whereConditions.push(`m.rating <= $${paramIndex}`);
      queryParams.push(maxRating);
    }

    // Add genre filters
    if (genres.length > 0) {
      const genrePlaceholders = genres.map((_, index) => `$${paramIndex + index + 1}`).join(',');
      paramIndex += genres.length;
      havingConditions.push(`COUNT(DISTINCT CASE WHEN g.genre_name IN (${genrePlaceholders}) THEN g.genre_name END) > 0`);
      queryParams.push(...genres);
    }

    // Add multiple actors filter
    if (actors.length > 0) {
      const actorPlaceholders = actors.map((_, index) => `$${paramIndex + index + 1}`).join(',');
      paramIndex += actors.length;
      havingConditions.push(`COUNT(DISTINCT CASE WHEN LOWER(p.name) IN (${actorPlaceholders.split(',').map(p => `LOWER(${p})`).join(',')}) THEN p.name END) >= ${Math.min(actors.length, 1)}`);
      queryParams.push(...actors.map(actor => actor.toLowerCase()));
    }

    // Group by clause (must match all m.* fields)
    const groupByClause = `
      GROUP BY m.id, m.title, m.year, m.release_date, m.plot, m.budget, m.boxoffice, 
               m.rating, m.runtime, m.votes, m.poster_url, m.rating_label, m.trailer_link
    `;

    // Build ORDER BY clause
    let orderByClause = '';
    const validSortColumns = {
      'title': 'm.title',
      'rating': 'm.rating',
      'votes': 'm.votes',
      'year': 'm.year',
      'boxoffice': 'CAST(m.boxoffice AS BIGINT)',
      'runtime': 'm.runtime'
    };

    if (validSortColumns[sortBy]) {
      const direction = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const nullsHandling = 'NULLS LAST';
      
      orderByClause = `ORDER BY `;
      
      // Add exact match priority only if we have search text
      if (hasSearchText) {
        if (searchType === 'movie') {
          orderByClause += `CASE WHEN LOWER(m.title) = LOWER($1) THEN 1 ELSE 2 END, `;
        } else if (searchType === 'actor') {
          orderByClause += `CASE WHEN EXISTS(SELECT 1 FROM persons act WHERE act.id = m.id AND LOWER(act.name) = LOWER($1)) THEN 1 ELSE 2 END, `;
        } else if (searchType === 'genre') {
          orderByClause += `CASE WHEN EXISTS(SELECT 1 FROM "Genre" gen WHERE gen.id = m.id AND LOWER(gen.genre_name) = LOWER($1)) THEN 1 ELSE 2 END, `;
        }
      }
      
      orderByClause += `${validSortColumns[sortBy]} ${direction} ${nullsHandling}`;
      
      // Add secondary sorting
      if (sortBy !== 'rating') {
        orderByClause += ', m.rating DESC NULLS LAST';
      }
      if (sortBy !== 'votes') {
        orderByClause += ', m.votes DESC NULLS LAST';
      }
    } else {
      // Default sorting
      orderByClause = `ORDER BY m.rating DESC NULLS LAST, m.votes DESC NULLS LAST, m.title`;
    }

    // Build complete query
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const havingClause = havingConditions.length > 0 ? `HAVING ${havingConditions.join(' AND ')}` : '';
    
    paramIndex++;
    const limitParam = `$${paramIndex}`;
    queryParams.push(limit);
    
    paramIndex++;
    const offsetParam = `$${paramIndex}`;
    queryParams.push(offset);

    const completeQuery = `
      ${baseQuery}
      ${whereClause}
      ${groupByClause}
      ${havingClause}
      ${orderByClause}
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    // Build count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT subquery.id) as total
      FROM (
        ${baseQuery}
        ${whereClause}
        ${groupByClause}
        ${havingClause}
      ) subquery
    `;

   // console.log('Executing search query:', completeQuery);
    console.log('Query parameters:', queryParams);

    // Execute search query
    const searchResult = await pool.query(completeQuery, queryParams);
    
    // Execute count query for pagination (excluding limit and offset)
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    const countResult = await pool.query(countQuery, countParams);
    const totalResults = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalResults / limit);

    const searchDescription = hasSearchText 
      ? `Search "${searchText}" (${searchType})`
      : `All movies with filters`;
    
    console.log(`${searchDescription}: Found ${totalResults} total results, showing page ${page}`);

    res.json({
      searchQuery: {
        text: searchText,
        type: searchType,
        page: page,
        limit: limit,
        hasSearchText: hasSearchText
      },
      filters: {
        yearRange: startYear || endYear ? { start: startYear, end: endYear } : null,
        ratingRange: minRating !== null || maxRating !== null ? { min: minRating, max: maxRating } : null,
        genres: genres.length > 0 ? genres : null,
        actors: actors.length > 0 ? actors : null
      },
      sorting: {
        sortBy: sortBy,
        sortOrder: sortOrder
      },
      results: searchResult.rows,
      pagination: {
        page: page,
        limit: limit,
        total: totalResults,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null
      }
    });

  } catch (error) {
    console.error('Error in advanced search:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});


// Get top 10 movies based on rating and votes from Movies table
router.get('/top-rated', async (req, res) => {
  console.log('Fetching top rated movies');
  try {
    const result = await pool.query(
      `SELECT *
       FROM "Movies"
       WHERE rating IS NOT NULL AND rating > 0
       ORDER BY rating DESC, votes DESC, year DESC
       LIMIT 10`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching top rated movies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top 10 most voted movies from Movies table
router.get('/most-voted', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM "Movies"
       WHERE votes IS NOT NULL AND votes > 0
       ORDER BY votes DESC, rating DESC
       LIMIT 10`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching most voted movies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all movies with ratings (for testing)
router.get('/with-ratings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM "Movies"
       WHERE rating IS NOT NULL AND votes IS NOT NULL AND votes > 0
       ORDER BY rating DESC, votes DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching movies with ratings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Get top 10 highest grossing movies
router.get('/top-grossing', async (req, res) => {
  console.log('Fetching top grossing movies');
  try {
    const result = await pool.query(
      `SELECT *
       FROM "Movies"
       WHERE boxoffice IS NOT NULL 
       AND boxoffice > 0
       AND CAST(boxoffice AS BIGINT) > 1000000  -- At least $1M
       ORDER BY CAST(boxoffice AS BIGINT) DESC, rating DESC
       LIMIT 10`
    );

    console.log(`Found ${result.rows.length} top grossing movies`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching top grossing movies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Top 10 trending movies
router.get('/trending', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  try {
    const result = await pool.query(`
      SELECT m.*, t.visit_count
      FROM "Movies" m
      JOIN "Trending" t ON m.id = t.movie_id
      ORDER BY t.visit_count DESC
      LIMIT $1
    `, [limit]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching trending movies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single movie by ID and increment visit count
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid movie ID' });
  }

  const client = await pool.connect(); // Use a transaction for safety

  try {
    await client.query('BEGIN');

    // 1. Fetch the movie
    const movieResult = await client.query('SELECT * FROM "Movies" WHERE id = $1', [id]);
    if (movieResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Movie not found' });
    }

    // 2. Increment trending visit count
    await client.query(`
      INSERT INTO "Trending" (movie_id, visit_count)
      VALUES ($1, 1)
      ON CONFLICT (movie_id) DO UPDATE
      SET visit_count = "Trending".visit_count + 1;
    `, [id]);

    await client.query('COMMIT');
    res.status(200).json(movieResult.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error fetching/incrementing movie:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});





// Get similar movies by genre - highest match priority, limit 5
router.get('/similar/:id', async (req, res) => {
  const { id } = req.params;
  
  console.log('Fetching similar movies for movie ID:', id);
  
  try {
    // Get similar movies with genre match count for better ranking
    const result = await pool.query(
      `WITH current_movie_genres AS (
         SELECT genre_name 
         FROM "Genre" 
         WHERE movie_id = $1
       ),
       similar_movies_ranked AS (
         SELECT DISTINCT m.*,
                STRING_AGG(DISTINCT g1.genre_name, ', ' ORDER BY g1.genre_name) as genre,
                COUNT(DISTINCT cmg.genre_name) as genre_match_count
         FROM "Movies" m
         INNER JOIN "Genre" g1 ON m.id = g1.movie_id
         INNER JOIN "Genre" g2 ON g1.genre_name = g2.genre_name
         INNER JOIN current_movie_genres cmg ON g1.genre_name = cmg.genre_name
         WHERE g2.movie_id = $1 
         AND m.id != $1
         AND m.rating IS NOT NULL 
         AND m.votes IS NOT NULL
         GROUP BY m.id, m.title, m.year, m.release_date, m.plot, m.budget, m.boxoffice, 
                  m.rating, m.runtime, m.votes, m.poster_url, m.rating_label, m.trailer_link
       )
       SELECT *
       FROM similar_movies_ranked
       ORDER BY 
         genre_match_count DESC,  -- Highest genre matches first
         rating DESC,             -- Then by rating
         votes DESC               -- Then by votes
       LIMIT 5`,
      [id]
    );

    console.log(`Found ${result.rows.length} highest matching similar movies`);
    res.json(result.rows);
    
  } catch (err) {
    console.error('Error fetching similar movies:', err);
    res.status(500).json({ error: 'Internal bus server error' });
  }
});


router.get('/:id/insights', async (req, res) => {
  const movieId = parseInt(req.params.id);

  try {
    // 1. Fetch movie
    const movieResult = await pool.query('SELECT * FROM "Movies" WHERE id = $1', [movieId]);
    if (movieResult.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    const movie = movieResult.rows[0];

    // 2. Review count
    const reviewCountResult = await pool.query('SELECT COUNT(*) FROM "Reviews" WHERE movie_id = $1', [movieId]);
    const reviewCount = parseInt(reviewCountResult.rows[0].count, 10);

    // 3. List count
    const listCountResult = await pool.query('SELECT COUNT(*) FROM "watchlist_movies" WHERE movie_id = $1', [movieId]);
    const listCount = parseInt(listCountResult.rows[0].count, 10);

    // 4. Visit count
    const visitCountResult = await pool.query('SELECT visit_count FROM "Trending" WHERE movie_id = $1', [movieId]);
    const visitCount = visitCountResult.rows.length ? visitCountResult.rows[0].visit_count : 0;

    // 5. Genres
    const genresResult = await pool.query('SELECT genre_name FROM "Genre" WHERE movie_id = $1', [movieId]);
    const genres = genresResult.rows.map(r => r.genre_name);

    // 6. Get all movies with rating, boxoffice, runtime for ranking
    const allMoviesResult = await pool.query('SELECT id, rating, boxoffice, runtime FROM "Movies"');
    const allMovies = allMoviesResult.rows;

    // Filter valid movies for ranking
    const validMovies = allMovies.filter(m => m.rating !== null && m.boxoffice !== null && m.runtime !== null);

function calculateRank(sortedArray, movieId) {
  const idx = sortedArray.findIndex(m => Number(m.id) === movieId);
  return idx === -1 ? 0 : idx + 1;



}

const validMoviesForRating = allMovies.filter(m => m.rating !== null);
const validMoviesForBoxOffice = allMovies.filter(m => m.boxoffice !== null);
const validMoviesForRuntime = allMovies.filter(m => m.runtime !== null);

const ratingRank = calculateRank([...validMoviesForRating].sort((a,b) => b.rating - a.rating), movieId);
const boxOfficeRank = calculateRank([...validMoviesForBoxOffice].sort((a,b) => b.boxoffice - a.boxoffice), movieId);
const runtimeRank = calculateRank([...validMoviesForRuntime].sort((a,b) => b.runtime - a.runtime), movieId);

    // Compose response
    res.json({
      movie,
      genreList: genres,
      reviewCount,
      listCount,
      visitCount,
      ranking: {
        ratingRank,
        boxOfficeRank,
        runtimeRank
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});




module.exports = router;
