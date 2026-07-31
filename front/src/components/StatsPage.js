import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../styles/stats.css';
import { API_URL } from '../config';

function StatsPage() {
  const { id } = useParams();
  const [movieData, setMovieData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${API_URL}/api/movies/${id}/insights`);
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        setMovieData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [id]);

  if (loading) return <p className="loading">Loading stats...</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!movieData) return <p className="error">No data available.</p>;

  const { movie, genreList, reviewCount, listCount, visitCount, ranking } = movieData;

  const formatRank = (rank) => (rank > 0 ? rank : 'N/A');

  return (
    <div className="stats-container">
      <h1 className="stats-title">
        Stats for "{movie.title}" ({movie.year})
      </h1>

      {movie.poster_url && (
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="movie-poster"
        />
      )}

      <div className="info-grid">
        <div className="info-box">
          <h3>Plot</h3>
          <p>{movie.plot || 'N/A'}</p>
        </div>

        <div className="info-box">
          <h3>Genres</h3>
          <p>{genreList.length ? genreList.join(', ') : 'N/A'}</p>
        </div>

        <div className="info-box">
          <h3>Reviews</h3>
          <p>{reviewCount}</p>
        </div>

        <div className="info-box">
          <h3>Watchlists Included In</h3>
          <p>{listCount}</p>
        </div>

        <div className="info-box">
          <h3>Visit Count</h3>
          <p>{visitCount}</p>
        </div>

        <div className="info-box">
          <h3>Budget</h3>
          <p>{movie.budget ? `$${Number(movie.budget).toLocaleString()}` : 'N/A'}</p>
        </div>

        <div className="info-box">
          <h3>Box Office</h3>
          <p>{movie.boxoffice ? `$${Number(movie.boxoffice).toLocaleString()}` : 'N/A'}</p>
        </div>

        <div className="info-box">
          <h3>Runtime</h3>
          <p>{movie.runtime ? `${movie.runtime} minutes` : 'N/A'}</p>
        </div>

        <div className="info-box">
          <h3>Rating</h3>
          <p>{typeof movie.rating === 'number' ? movie.rating.toFixed(2) : 'N/A'}</p>
        </div>

        <div className="info-box">
          <h3>Votes</h3>
          <p>{movie.votes || 'N/A'}</p>
        </div>

        <div className="info-box ranking-box" style={{ gridColumn: '1 / -1' }}>
          <h3>Rankings</h3>
          <ul>
            <li>Rating Rank: {formatRank(ranking.ratingRank)}</li>
            <li>Box Office Rank: {formatRank(ranking.boxOfficeRank)}</li>
            <li>Runtime Rank: {formatRank(ranking.runtimeRank)}</li>
          </ul>
        </div>
      </div>

      <Link to={`/movies/${id}`} className="back-link">
        ← Back to Movie Details
      </Link>
    </div>
  );
}

export default StatsPage;
