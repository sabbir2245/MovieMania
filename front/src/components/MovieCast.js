// src/components/MovieCast.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/MovieCast.css'; // optional styling
import { API_URL } from '../config';

function MovieCast({ movieId }) {
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCast() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/movie-persons/movies/${movieId}/cast`)
;
        if (!res.ok) throw new Error('Failed to fetch cast');
        const data = await res.json();
        setCast(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCast();
  }, [movieId]);

  if (loading) return <p>Loading cast...</p>;
  if (error) return <p>Error loading cast: {error}</p>;
  if (cast.length === 0) return <p>No cast information available.</p>;

  return (
    <div className="movie-cast-container">
      <h3>Full Cast</h3>
      <div className="cast-grid">
        {cast.map((person) => (
          <div key={person.person_id} className="cast-member">
            <Link to={`/persons/${person.person_id}`}>
              <img
                src={
                  person.photo_url ||
                  'https://static.vecteezy.com/system/resources/thumbnails/009/292/244/small_2x/default-avatar-icon-of-social-media-user-vector.jpg'
                }
                alt={person.name}
                style={{ width: '100px', height: 'auto' }}
              />
              <p className="cast-name">{person.name}</p>
            </Link>
            <p className="cast-role">{person.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MovieCast;
