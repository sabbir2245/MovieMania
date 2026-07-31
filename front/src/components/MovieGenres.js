import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; // for navigation
import { API_URL } from '../config';

function MovieGenres({ movieId }) {
  const [genres, setGenres] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/genres/movie/${movieId}`)
      .then(res => res.json())
      .then(data => setGenres(data.genres || []))
      .catch(err => {
        console.error('Error fetching genres:', err);
        setError('Failed to load genres');
      });
  }, [movieId]);

  if (error) return <p>{error}</p>;
  if (!genres.length) return <p>No genres found.</p>;

  return (
    <div className="genres-list">
      <strong>Genres:</strong>{' '}
      {genres.map((genre, index) => (
        <Link to={`/genres/${encodeURIComponent(genre)}`} key={index} className="genre-chip">
          {genre}
        </Link>
      ))}
    </div>
  );
}

export default MovieGenres;
