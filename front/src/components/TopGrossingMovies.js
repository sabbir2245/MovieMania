import React, { useState, useEffect, useRef } from 'react';
import MovieCard from './shared/MovieCard';
import LoadingComponent from './shared/LoadingComponent';
import ErrorComponent from './shared/ErrorComponent';
import EmptyState from './shared/EmptyState';
import { API_URL } from '../config';

const TopGrossingMovies = () => {
  const [topGrossingMovies, setTopGrossingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef(null);
  const autoSlideRef = useRef(null);

  const SERVER_BASE_URL = API_URL;

  // Movies per slide based on screen size
  const getMoviesPerSlide = () => {
    if (typeof window === 'undefined') return 5;
    const width = window.innerWidth;
    if (width >= 1280) return 5; // xl
    if (width >= 1024) return 4; // lg
    if (width >= 768) return 3;  // md
    if (width >= 640) return 2;  // sm
    return 1; // mobile
  };

  const [moviesPerSlide, setMoviesPerSlide] = useState(getMoviesPerSlide());

  useEffect(() => {
    const handleResize = () => {
      setMoviesPerSlide(getMoviesPerSlide());
      setCurrentSlide(0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchTopGrossingMovies();
  }, []);

  // Auto slide functionality
  useEffect(() => {
    if (topGrossingMovies.length > moviesPerSlide) {
      startAutoSlide();
    }
    return () => stopAutoSlide();
  }, [topGrossingMovies, moviesPerSlide, currentSlide]);

  const fetchTopGrossingMovies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching top grossing movies');
      const response = await fetch(`${SERVER_BASE_URL}/api/movies/top-grossing`);
      
      if (!response.ok) {
        throw new Error(`Top grossing movies API error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Top grossing movies:', data);
      setTopGrossingMovies(data);
      
    } catch (error) {
      console.error('Error fetching top grossing movies:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalSlides = Math.max(Math.ceil(topGrossingMovies.length / moviesPerSlide), 1);

  const startAutoSlide = () => {
    stopAutoSlide();
    autoSlideRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = prev + 1;
        return nextSlide >= totalSlides ? 0 : nextSlide;
      });
    }, 4000); // 4 seconds auto slide
  };

  const stopAutoSlide = () => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
      autoSlideRef.current = null;
    }
  };

  const nextSlide = () => {
    stopAutoSlide();
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
    setTimeout(startAutoSlide, 6000); // Resume auto slide after 6 seconds
  };

  const prevSlide = () => {
    stopAutoSlide();
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    setTimeout(startAutoSlide, 6000); // Resume auto slide after 6 seconds
  };

  const goToSlide = (slideIndex) => {
    stopAutoSlide();
    setCurrentSlide(slideIndex);
    setTimeout(startAutoSlide, 6000); // Resume auto slide after 6 seconds
  };

  if (loading) {
    return <></> ;
  }

  if (error) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <span>💰</span>
          Top Grossing Movies
        </h2>
        <ErrorComponent 
          type="inline"
          message="Unable to load top grossing movies"
          onRetry={fetchTopGrossingMovies}
        />
      </div>
    );
  }

  if (topGrossingMovies.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <span>💰</span>
          Top Grossing Movies
        </h2>
        <EmptyState 
          icon="💸"
          title="No Box Office Data"
          message="No movies with box office information found."
        />
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>💰</span>
          Top Grossing Movies
        </h2>

        {/* Navigation Controls */}
        {totalSlides > 1 && (
          <div className="flex items-center gap-3">
            <button
              onClick={prevSlide}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-white transition-all duration-200 hover:scale-110"
            >
              <span className="text-lg">←</span>
            </button>
            
            <span className="text-sm text-gray-400 min-w-[3rem] text-center">
              {currentSlide + 1} / {totalSlides}
            </span>
            
            <button
              onClick={nextSlide}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-white transition-all duration-200 hover:scale-110"
            >
              <span className="text-lg">→</span>
            </button>
          </div>
        )}
      </div>

      {/* Slider Container */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-900/10 to-orange-900/10 p-2">
        <div 
          ref={sliderRef}
          className="flex transition-transform duration-700 ease-in-out"
          style={{
            transform: `translateX(-${currentSlide * (100 / totalSlides)}%)`,
            width: `${totalSlides * 100}%`
          }}
        >
          {Array.from({ length: totalSlides }, (_, slideIndex) => {
            const startIndex = slideIndex * moviesPerSlide;
            const endIndex = Math.min(startIndex + moviesPerSlide, topGrossingMovies.length);
            const slideMovies = topGrossingMovies.slice(startIndex, endIndex);
            
            return (
              <div 
                key={slideIndex}
                className="flex gap-4 px-2"
                style={{
                  width: `${100 / totalSlides}%`,
                  minWidth: `${100 / totalSlides}%`,
                  flexShrink: 0
                }}
              >
                {slideMovies.map((movie, index) => (
                  <div 
                    key={movie.id}
                    className="flex-1 min-w-0 relative"
                  >
                    
                    <MovieCard 
                      movie={movie}
                      index={startIndex + index}
                      rankStyle="grossing"
                    />
                  </div>
                ))}
                
                {/* Fill empty spaces */}
                {slideMovies.length < moviesPerSlide && 
                  Array.from({ length: moviesPerSlide - slideMovies.length }, (_, emptyIndex) => (
                    <div 
                      key={`empty-${slideIndex}-${emptyIndex}`} 
                      className="flex-1 min-w-0"
                    />
                  ))
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots Indicator */}
      {totalSlides > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          {Array.from({ length: totalSlides }, (_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-yellow-400 w-8' 
                  : 'bg-gray-600 hover:bg-gray-500 w-2'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TopGrossingMovies;