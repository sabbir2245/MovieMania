import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/trending.css'; // Import your CSS for styling




function TrendingMovies() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/movies/trending')
      .then((res) => res.json())
      .then((data) => {
        setTrending(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch trending movies:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="center-text">Loading trending movies...</p>;

  if (trending.length === 0) return <p className="center-text">No trending movies found.</p>;

  return (
    <div className="trending-container">
      <h2 className="trending-heading">🔥 Trending Movies</h2>
      <ul className="trending-grid">
        {trending.map((movie) => (
          <li key={movie.id} className="trending-card">
            <Link to={`/movies/${movie.id}`} className="trending-link">
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="trending-image"
              />
              <div className="trending-content">
                <h3 className="trending-title">{movie.title}</h3>
                <p className="trending-meta">Visits: <strong>{movie.visit_count/2}</strong></p>
                <p className="trending-meta">Rating: <strong>{movie.rating}</strong></p>
                <p className="trending-meta">{movie.year}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TrendingMovies;
