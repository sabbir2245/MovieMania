import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MovieList from './MovieList'; // reuse your movie grid display component
import { API_URL } from '../config';



function WatchlistMovies() {
  const { watchlistId } = useParams();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listname, setListname] = useState('');

  useEffect(() => {
    async function fetchMovies() {
      try {
        const res = await fetch(`${API_URL}/api/watchlists/${watchlistId}/movies`);
        const data = await res.json();
        setMovies(data);
      } catch (err) {
        console.error('Error fetching watchlist movies:', err);
      } finally {
        setLoading(false);
      }
    }

  async function fetchListName() {
  try {
    const res = await fetch(`${API_URL}/api/watchlists/${watchlistId}`);
    const data = await res.json();
    setListname(data.listname || '');
  } catch (err) {
    console.error('Failed to get watchlist name');
  }
}

    fetchMovies();
    fetchListName();
  }, [watchlistId]);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2 style={{ textAlign: 'center', marginTop: '1rem' }}>
        🎞️ Movies in {listname} 
      </h2>
      <MovieList movies={movies} />
    </div>
  );
}

export default WatchlistMovies;
