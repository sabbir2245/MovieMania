import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import TopUsers from './TopUsers';
import TopGrossingMovies from './TopGrossingMovies';
import MovieCard from './shared/MovieCard.js';
import LoadingComponent from './shared/LoadingComponent';
import ErrorComponent from './shared/ErrorComponent';
import EmptyState from './shared/EmptyState';
import { API_URL } from '../config';

const HomePage = () => {
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [mostVotedMovies, setMostVotedMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('top-rated');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTopUsers, setShowTopUsers] = useState(false);

  const SERVER_BASE_URL = API_URL;
  
  useEffect(() => {
    fetchTopMovies();
  }, []);

  const fetchTopMovies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching top rated movies...');
      const topRatedResponse = await fetch(`${SERVER_BASE_URL}/api/movies/top-rated`);
      if (!topRatedResponse.ok) {
        throw new Error(`Top rated API error! status: ${topRatedResponse.status}`);
      }
      const topRatedData = await topRatedResponse.json();
      setTopRatedMovies(topRatedData);

      console.log('Fetching most voted movies...');
      const mostVotedResponse = await fetch(`${SERVER_BASE_URL}/api/movies/most-voted`);
      if (!mostVotedResponse.ok) {
        throw new Error(`Most voted API error! status: ${mostVotedResponse.status}`);
      }
      const mostVotedData = await mostVotedResponse.json();
      setMostVotedMovies(mostVotedData);

    } catch (error) {
      console.error('Error fetching top movies:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const toggleTopUsers = () => {
    setShowTopUsers(!showTopUsers);
  };

  const getCurrentMovies = () => {
    return activeTab === 'top-rated' ? topRatedMovies : mostVotedMovies;
  };

  if (loading) {
    return <LoadingComponent type="page" message="Finding the best movies for you" />;
  }

  if (error) {
    return (
      <ErrorComponent 
        type="page"
        title="Oops! Something went wrong"
        message={error}
        onRetry={fetchTopMovies}
        retryText="Try Again"
      />
    );
  }

  const currentMovies = getCurrentMovies();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white relative">
      {/* Sticky Right Sidebar Toggle Button */}
      {!showTopUsers && (
        <button
          onClick={toggleTopUsers}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white p-3 rounded-l-lg shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">👥</span>
            <span className="text-xs font-medium writing-mode-vertical">Top Users</span>
          </div>
        </button>
      )}

      {/* Animated Right Sidebar */}
      <div className={`fixed right-0 top-0 h-full w-80 backdrop-blur-xl border-l z-50 transform transition-transform duration-500 ease-out ${
        showTopUsers ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <h3 className="text-lg font-bold text-orange-400 flex items-center gap-2">
            <span>🏆</span>
            Top Users
          </h3>
          <button
            onClick={toggleTopUsers}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>
        <div className="p-4 h-full overflow-y-auto sidebar-scroll">
          <TopUsers />
        </div>
      </div>

      {/* Backdrop Overlay */}
      {showTopUsers && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity duration-300"
          onClick={toggleTopUsers}
        ></div>
      )}

      {/* Main Content */}
      <div>
        {/* Intro Section */}
        <section className="text-center pt-8 backdrop-blur-sm">
          <h2 className="text-2xl md:text-3xl font-bold text-orange-400 mb-3">
            Your source for everything movies
          </h2>
          <p className="text-base text-gray-300 max-w-2xl mx-auto px-4">
            Discover reviews, trailers, and ratings for your favorite films.
            <br />
            <a 
              href="https://donate.example.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
             
            </a>
          </p>
        </section>

        {/* Center Link */}
        <div className="text-center py-4">
          <Link 
            to="/allmovies"
            className="inline-block bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-2 rounded-full font-semibold transition-all duration-200 hover:shadow-lg hover:transform hover:-translate-y-1"
          >
            View All Movies →
          </Link>
        </div>

        {/* Hero Section */}
        <section className="text-center pt-8">
          <h1 className="mb-4">
            <span className="block text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-red-500 via-orange-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              🎬 MovieMania
            </span>
            <span className="block text-lg md:text-xl text-gray-300 mt-2">
              Your Ultimate Movie Destination
            </span>
          </h1>
        </section>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <TopGrossingMovies />
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Featured Collections</h2>
            <div className="flex justify-center space-x-3 flex-wrap gap-2">
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeTab === 'top-rated' 
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg transform -translate-y-1' 
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white border border-gray-600/50'
                }`}
                onClick={() => handleTabChange('top-rated')}
              >
                <span>🏆</span>
                <span>Top Rated</span>
              </button>
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeTab === 'most-voted' 
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg transform -translate-y-1' 
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white border border-gray-600/50'
                }`}
                onClick={() => handleTabChange('most-voted')}
              >
                <span>🔥</span>
                <span>Most Voted</span>
              </button>
            </div>
          </div>

          {/* Movies Grid */}
          <div className="mb-6">
            {currentMovies.length === 0 ? (
              <EmptyState 
                type={activeTab === 'top-rated' ? 'rating' : 'voting'}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {currentMovies.map((movie, index) => (
                  <MovieCard 
                    key={movie.id}
                    movie={movie}
                    index={index}
                    rankStyle="default"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;


