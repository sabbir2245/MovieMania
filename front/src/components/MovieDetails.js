import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/MovieDetails.css';
import '../styles/RateModal.css';
import { Link } from 'react-router-dom';
import MovieAwardsBox from './shared/Award';  
import MovieCast from './MovieCast';
import MovieGenres from './MovieGenres';

import { useUser } from '../contexts/UserContext';
import SimilarMovies from './SimilarMovies';

// Helper to extract video ID from YouTube URL
function getYouTubeVideoId(url) {
  const regExp = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url?.match(regExp);
  return match ? match[1] : null;
}

// Generate YouTube embed URL from trailer_link
function getYouTubeEmbedUrlFromLink(trailerLink) {
  const videoId = getYouTubeVideoId(trailerLink);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1&rel=0&showinfo=0&modestbranding=1`;
}

function MovieDetails() {
  const { id } = useParams();
  const  loggedInUser  = useUser();
  const [showRateForm, setShowRateForm] = useState(false);
  const [userReview, setUserReview] = useState(null);


  // State hooks - always at top level!
  const [movie, setMovie] = useState(null);
  const [watchlists, setWatchlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rating modal states
  // const [showRateForm, setShowRateForm] = useState(false);

  const [hoverRating, setHoverRating] = useState(0);

  const [selectedRating, setSelectedRating] = useState(0);

  const [textReview, setTextReview] = useState('');

  const [removingFromListId, setRemovingFromListId] = useState(null);

  // Compute trailer embed URL safely
  const trailerEmbedUrl = getYouTubeEmbedUrlFromLink(movie?.trailer_link);

  // Fetch movie details
  useEffect(() => {
    async function fetchMovie() {
      try {
        const res = await fetch(`http://localhost:3000/api/movies/${id}`);
        if (!res.ok) throw new Error('Movie not found');
        const data = await res.json();
        setMovie(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMovie();
  }, [id]);


  useEffect(() => {
    async function fetchUserReview() {
      if (!loggedInUser) return;

      try {
        const res = await fetch(`http://localhost:3000/api/reviews/movie/${id}/user/${loggedInUser.username}`);
        if (res.ok) {
          const data = await res.json();
          if (data) setUserReview(data); // If review exists
        }
      } catch (err) {
        console.error('Failed to load user review:', err);
      }
    }

    fetchUserReview();
  }, [loggedInUser, id]);


  // Fetch user watchlists
  useEffect(() => {
    async function fetchWatchlists() {
      if (!loggedInUser) return;
      try {
        const res = await fetch(`http://localhost:3000/api/watchlists/user/${loggedInUser.username}`);
        const data = await res.json();
        setWatchlists(data);
      } catch (err) {
        console.error('Failed to load watchlists:', err);
      }
    }
    fetchWatchlists();
  }, [loggedInUser]);

  const handleAdd = async (watchlistId, listname) => {
    if (!loggedInUser) return alert('Please sign in');
    try {
      const res = await fetch('http://localhost:3000/api/watchlists/add-movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist_id: watchlistId, movie_id: movie.id }),
      });
      const data = await res.json();
      alert(data.message || `Added to ${listname}`);
    } catch (err) {
      alert('Failed to add movie.');
    }
  };

  const handleRemove = async (watchlistId, listname) => {
    if (!loggedInUser) return alert('Please sign in');
    if (!window.confirm(`Remove this movie from ${listname}?`)) return;

    setRemovingFromListId(watchlistId);
    try {
      const res = await fetch(`http://localhost:3000/api/watchlists/${watchlistId}/movies/${movie.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message || `Removed from ${listname}`);
      } else {
        alert(data.error || `Current movie is not in ${listname}`);
      }
    } catch (err) {
      alert('Failed to remove movie.');
    } finally {
      setRemovingFromListId(null);
    }
  };


  const handleDeleteReview = async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;

    try {
      const res = await fetch(`http://localhost:3000/api/reviews/movie/${movie.id}/user/${loggedInUser.username}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Review deleted.');
        setUserReview(null);
        setSelectedRating(0);
        setTextReview('');
      } else {
        alert(data.error || 'Failed to delete review');
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      alert('Error deleting review');
    }
  };


  const handleSubmitReview = async () => {
    if (selectedRating === 0) return alert("Please select a rating.");

    try {
      const res = await fetch('http://localhost:3000/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movie.id,
          username: loggedInUser.username,
          rating: selectedRating,
          text_review: textReview
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Review submitted successfully!');
        setShowRateForm(false);
        setSelectedRating(0);
        setTextReview('');
        setUserReview(data.review);
      } else {
        alert(data.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Error submitting review');
    }
  };

  // Early returns to avoid rendering when data is loading or missing
  if (loading) return <p>Loading movie details...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!movie) return <p>No movie data found.</p>;


  return (
    <div className="mx-auto my-10 w-full max-w-6xl flex-col items-center gap-8 p-6 sm:p-8">
      <div className="flex w-full max-w-[1100px] flex-col items-center justify-center gap-6 md:flex-row md:items-start">
        {movie.poster_url && (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-[280px] shrink-0 rounded-xl object-contain shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:scale-105"
          />
        )}

        {trailerEmbedUrl ? (
          <iframe
            src={trailerEmbedUrl}
            title={`${movie.title} Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full shrink-0 rounded-xl border-0 shadow-[0_6px_20px_rgba(0,0,0,0.4)] md:w-[760px]"
          />
        ) : (
          <p className="text-slate-300">No trailer available</p>
        )}
      </div>

      <h1 className="mb-4 text-center text-3xl font-extrabold text-amber-400 sm:text-4xl">
        {movie.title} ({movie.year})
      </h1>

      <MovieGenres movieId={id} />
      <SimilarMovies movieId={movie.id} />

      {loggedInUser && watchlists.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="group relative">
            <button className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-blue-700 bg-blue-600 px-4 py-2 font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 active:translate-y-0">
              ➕ Add to Watchlist
            </button>
            <div className="pointer-events-none absolute left-0 top-[110%] z-50 min-w-[190px] rounded-xl bg-slate-100 p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
              {watchlists.map(watchlist => (
                <button
                  key={watchlist.id}
                  onClick={() => handleAdd(watchlist.id, watchlist.listname)}
                  className="block w-full cursor-pointer rounded-lg px-4 py-2 text-left text-sm font-medium text-blue-900 transition hover:bg-blue-100"
                >
                  📁 Add to {watchlist.listname}
                </button>
              ))}
            </div>
          </div>

          <div className="group relative">
            <button className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-red-700 bg-red-500 px-4 py-2 font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-600 active:translate-y-0">
              ➖ Remove from Watchlist
            </button>
            <div className="pointer-events-none absolute left-0 top-[110%] z-50 min-w-[190px] rounded-xl bg-slate-100 p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
              {watchlists.map(watchlist => (
                <button
                  key={watchlist.id}
                  onClick={() => handleRemove(watchlist.id, watchlist.listname)}
                  disabled={removingFromListId === watchlist.id}
                  className="block w-full cursor-pointer rounded-lg px-4 py-2 text-left text-sm font-medium text-blue-900 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {removingFromListId === watchlist.id ? 'Removing...' : `📁 Remove from ${watchlist.listname}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-xl bg-cyan-500 p-4 shadow-md">
          <strong className="mb-1 block text-xl font-bold text-slate-800">📖 Plot:</strong>
          <p className="text-slate-900">{movie.plot || 'No plot available.'}</p>
        </div>

        <div className="rounded-xl bg-cyan-500 p-4 shadow-md">
          <strong className="mb-1 block text-xl font-bold text-slate-800">⭐ Rating:</strong>
          <p className="text-slate-900">
            {typeof movie.rating === 'number'
              ? movie.rating.toFixed(2)
              : 'N/A'} / 10
          </p>
        </div>

        <div className="rounded-xl bg-cyan-500 p-4 shadow-md">
          <strong className="mb-1 block text-xl font-bold text-slate-800">🗳️ Votes:</strong>
          <p className="text-slate-900">{movie.votes || 'N/A'}</p>
        </div>

        <div className="rounded-xl bg-cyan-500 p-4 shadow-md">
          <strong className="mb-1 block text-xl font-bold text-slate-800">⏱️ Runtime:</strong>
          <p className="text-slate-900">{movie.runtime} minutes</p>
        </div>

        <div className="rounded-xl bg-cyan-500 p-4 shadow-md">
          <strong className="mb-1 block text-xl font-bold text-slate-800">💰 Budget:</strong>
          <p className="text-slate-900">{movie.budget ? `$${movie.budget.toLocaleString()}` : 'N/A'}</p>
        </div>

        <div className="rounded-xl bg-cyan-500 p-4 shadow-md">
          <strong className="mb-1 block text-xl font-bold text-slate-800">🏆 Box Office:</strong>
          <p className="text-slate-900">{movie.boxoffice ? `$${movie.boxoffice.toLocaleString()}` : 'N/A'}</p>
        </div>
      </div>


      <div className="mt-6 w-full rounded border-2 border-blue-800 bg-[#122b4d] p-5 shadow-[6px_6px_0_rgba(0,20,45,0.5)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-extrabold text-white">
            {userReview ? `⭐ Your review: ${userReview.rating || ''}/10` : '⭐ Rate & Review'}
          </h3>
          {loggedInUser ? (
            <button
              className="cursor-pointer rounded border-2 border-blue-800 bg-blue-600 px-5 py-2.5 font-bold text-white shadow-[4px_4px_0_rgba(13,90,200,0.35)] transition-all duration-150 hover:bg-blue-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_rgba(13,90,200,0.35)]"
              onClick={() => setShowRateForm(!showRateForm)}
            >
              {showRateForm ? 'Close' : userReview ? '✏️ Edit your review' : '✍️ Write a Review'}
            </button>
          ) : (
            <Link
              to="/signin"
              className="inline-block rounded border-2 border-blue-800 bg-blue-600 px-5 py-2.5 font-bold text-white shadow-[4px_4px_0_rgba(13,90,200,0.35)] transition-all duration-150 hover:bg-blue-500 active:translate-x-0.5 active:translate-y-0.5"
            >
              🔒 Sign in to write a review
            </Link>
          )}
        </div>

        {showRateForm && (
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-blue-200">Your rating (1-10)</label>
            <div className="my-3 flex gap-0.5 text-3xl">
              {Array.from({ length: 10 }, (_, i) => {
                const star = i + 1;
                const isFilled = hoverRating
                  ? star <= hoverRating
                  : star <= selectedRating;

                return (
                  <span
                    key={star}
                    className={`cursor-pointer select-none transition-all duration-150 hover:scale-125 ${isFilled ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(255,214,102,0.6)]' : 'text-slate-500'}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setSelectedRating(star)}
                  >
                    {isFilled ? '★' : '☆'}
                  </span>
                );
              })}
            </div>

            <textarea
              className="mb-4 min-h-[96px] w-full resize-y rounded border-2 border-blue-800 bg-[#0b1f3a] p-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/25"
              placeholder="Write your review... (optional)"
              value={textReview}
              onChange={(e) => setTextReview(e.target.value)}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="cursor-pointer rounded border-2 border-emerald-700 bg-emerald-600 px-5 py-3 font-bold text-white shadow-[4px_4px_0_rgba(27,143,88,0.35)] transition-all duration-150 hover:bg-emerald-500 active:translate-x-0.5 active:translate-y-0.5"
                onClick={handleSubmitReview}
              >
                Submit Review
              </button>
              {userReview && (
                <button
                  className="cursor-pointer rounded border-2 border-red-700 bg-red-500 px-4 py-3 font-bold text-white shadow-[4px_4px_0_rgba(185,28,28,0.35)] transition-all duration-150 hover:bg-red-600 active:translate-x-0.5 active:translate-y-0.5"
                  onClick={handleDeleteReview}
                >
                  🗑️ Delete My Review
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <MovieAwardsBox movieId={parseInt(id)} />
      {movie && <MovieCast movieId={movie.id} />}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link
          to={`/movies/${movie.id}/reviews`}
          className="inline-flex min-w-[120px] cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors duration-200 no-underline hover:bg-blue-500"
        >
          📝 Check Reviews
        </Link>

        <Link to={`/movies/${movie.id}/stats`} className="no-underline">
          <button className="min-w-[120px] cursor-pointer rounded-lg border-none bg-green-600 px-4 py-2 font-semibold text-white transition-colors duration-200 hover:bg-green-500">
            📊 Show Stats
          </button>
        </Link>
      </div>
    </div>
  )
};

export default MovieDetails;
