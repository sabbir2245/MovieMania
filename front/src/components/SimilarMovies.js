import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

const SimilarMovies = ({ movieId }) => {
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const SERVER_BASE_URL = API_URL;

  useEffect(() => {
    if (movieId) {
      fetchSimilarMovies();
    }
  }, [movieId]);

  const fetchSimilarMovies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching similar movies for movie ID:', movieId);
      const response = await fetch(`${SERVER_BASE_URL}/api/movies/similar/${movieId}`);
      
      if (!response.ok) {
        throw new Error(`Similar movies API error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Similar movies:', data);
      setSimilarMovies(data);
      
    } catch (error) {
      console.error('Error fetching similar movies:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const normalizedRating = Math.min(Math.max(rating, 0), 10);
    const fullStars = Math.floor(normalizedRating / 2);
    const hasHalfStar = (normalizedRating % 2) >= 1;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-400 text-xs">★</span>);
    }

    if (hasHalfStar && fullStars < 5) {
      stars.push(<span key="half" className="text-yellow-400 opacity-60 text-xs">★</span>);
    }

    const emptyStars = 5 - Math.ceil(normalizedRating / 2);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="text-gray-600 text-xs">☆</span>);
    }

    return stars;
  };

  const renderMovieCard = (movie) => {
    const displayRating = movie.rating || movie.avg_rating || 0;
    const displayVotes = movie.votes || movie.total_votes || 0;

    return (
      <div key={movie.id} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-3 hover:transform hover:-translate-y-1 hover:shadow-xl hover:border-orange-400/30 transition-all duration-300 group overflow-hidden">
        
        {/* Movie Poster */}
        <Link to={`/movies/${movie.id}`} className="block">
          <div className="relative rounded-lg overflow-hidden aspect-[3/4] mb-2">
            <img 
              src={movie.poster_url || '/images/placeholder.jpg'} 
              alt={movie.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
              onError={(e) => {
                e.target.src = '/images/placeholder.jpg';
              }}
            />
            <div className="absolute top-1 right-1 flex flex-col gap-1">
              <span className="bg-black/70 backdrop-blur-sm px-1 py-0.5 rounded text-white text-xs font-medium">
                {movie.year}
              </span>
              {movie.runtime && (
                <span className="bg-black/70 backdrop-blur-sm px-1 py-0.5 rounded text-white text-xs font-medium">
                  {movie.runtime}m
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Movie Info */}
        <div className="space-y-2">
          {/* Movie Title */}
          <Link to={`/movies/${movie.id}`}>
            <h4 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-orange-400 transition-colors cursor-pointer hover:text-orange-300 leading-tight min-h-[2.5rem]">
              {movie.title}
            </h4>
          </Link>
          
          {/* Rating Section */}
          <div className="bg-gray-800/50 rounded-lg p-2 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-orange-400">{displayRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400 font-medium">/10</span>
                <div className="flex ml-1">
                  {renderStars(displayRating)}
                </div>
              </div>
              <span className="text-xs text-gray-400">{displayVotes} votes</span>
            </div>
            

          </div>

          {/* Movie Details - Rating Label & Budget */}
          {/* <div className="flex flex-wrap gap-1">
            {movie.rating_label && (
              <span className="px-1 py-0.5 bg-gray-700/50 rounded text-xs text-gray-300">
                {movie.rating_label}
              </span>
            )}
            {movie.budget && parseInt(movie.budget) > 0 && (
              <span className="px-1 py-0.5 bg-green-800/30 text-green-400 rounded text-xs">
                ${(parseInt(movie.budget) / 1000000).toFixed(1)}M
              </span>
            )}
            {movie.boxoffice && parseInt(movie.boxoffice) > 0 && (
              <span className="px-1 py-0.5 bg-blue-800/30 text-blue-400 rounded text-xs">
                Box: ${(parseInt(movie.boxoffice) / 1000000).toFixed(1)}M
              </span>
            )}
          </div> */}

                    {/* Movie Details */}
          <div className="flex flex-wrap gap-1">
            {movie.rating_label && (
              <span className="px-1 py-0.5 bg-gray-700/50 rounded text-xs text-gray-300">
                {movie.rating_label}
              </span>
            )}
            {movie.budget && (
              <span className="px-1 py-0.5 bg-green-800/30 text-green-400 rounded text-xs">
                ${(parseInt(movie.budget) / 1000000).toFixed(1)}M
              </span>
            )}
             {/* Rating Category */}
              <span className={` px-1 py-0.5 rounded text-xs   ${
                displayRating >= 8 ? 'bg-green-800/30 text-green-400' :
                displayRating >= 6 ? 'bg-yellow-800/30 text-yellow-400' :
                displayRating >= 4 ? 'bg-orange-800/30 text-orange-400' :
                'bg-red-800/30 text-red-400'
              }`}>
                {displayRating >= 8 ? 'Excellent' :
                 displayRating >= 6 ? 'Good' :
                 displayRating >= 4 ? 'Fair' : 'Poor'}
              </span>
          </div>

          {/* Genre Tags */}
          {movie.genre && (
            <div className="flex flex-wrap gap-1">
              {movie.genre.split(',').slice(0, 2).map((genre, index) => (
                <span key={index} className="px-1 py-0.5 bg-purple-800/30 text-purple-400 rounded text-xs">
                  {genre.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Plot */}
          {movie.plot && (
            <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
              {movie.plot.length > 80 
                ? `${movie.plot.substring(0, 80)}...` 
                : movie.plot
              }
            </p>
          )}

        
        </div>
      </div>
    );
  };

  // Check for movieId instead of currentMovie
  if (!movieId) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>🎭</span>
          Similar Movies
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-3 animate-pulse">
              <div className="aspect-[3/4] bg-gray-700/50 rounded-lg mb-2"></div>
              <div className="h-4 bg-gray-700/50 rounded mb-2"></div>
              <div className="h-3 bg-gray-700/50 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>🎭</span>
          Similar Movies
        </h3>
        <div className="text-center py-8 bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-600/50">
          <div className="text-3xl mb-2 opacity-60">😔</div>
          <p className="text-gray-400 text-sm">Unable to load similar movies</p>
          <button 
            onClick={fetchSimilarMovies}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🎭</span>
          Similar Movies
         
        </h3>
      </div>

      {similarMovies.length === 0 ? (
        <div className="text-center py-8 bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-600/50">
          <div className="text-3xl mb-2 opacity-60">🔍</div>
          <h4 className="text-lg font-semibold text-orange-400 mb-1">No Similar Movies Found</h4>
          <p className="text-gray-400 text-sm">
            We couldn't find movies with similar genres for this movie.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {similarMovies.map((movie) => renderMovieCard(movie))}
        </div>
      )}
    </div>
  );
};

export default SimilarMovies;