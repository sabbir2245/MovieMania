import React, { useEffect, useState } from 'react';
import MovieCard from './shared/MovieCard'; // Reuse your existing MovieCard
import LoadingComponent from './shared/LoadingComponent'; // Optional loading spinner
import { API_URL } from '../config';

function UpcomingMovies() {
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const res = await fetch(`${API_URL}/api/movies/upcoming`);
        const data = await res.json();

         console.log('Fetched upcoming movies:', data);
        setUpcomingMovies(data);
      } catch (err) {
        console.error('Error fetching upcoming movies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcoming();
  }, []);

  if (loading) return <LoadingComponent />;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Upcoming Movies</h2>
      {upcomingMovies.length === 0 ? (
        <p>No such upcoming movies found.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {upcomingMovies.map(movie => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}

export default UpcomingMovies;
