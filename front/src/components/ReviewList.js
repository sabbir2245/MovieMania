import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import '../styles/ReviewList.css';
import { API_URL } from '../config';

function ReviewList() {
  const { id } = useParams();
  const currentUser = useUser();
  const currentUsername = currentUser?.username || null;

  const [reviews, setReviews] = useState([]);
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reactionLoading, setReactionLoading] = useState({});

  // New states for sorting and filtering
  const [sortBy, setSortBy] = useState('rating'); // 'rating' | 'likes' | 'dislikes'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [minRating, setMinRating] = useState(1);
  const [maxRating, setMaxRating] = useState(10);

  useEffect(() => {
    async function fetchMovieAndReviews() {
      try {
        const movieRes = await fetch(`${API_URL}/api/movies/${id}`);
        const movieData = await movieRes.json();
        setMovie(movieData);

        const reviewRes = await fetch(`${API_URL}/api/reviews/movie/${id}`);
        const reviewData = await reviewRes.json();
        setReviews(reviewData);
      } catch (err) {
        console.error('Error fetching reviews or movie:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMovieAndReviews();
  }, [id]);

  if (loading) return <p>Loading reviews...</p>;
  if (!movie) return <p>Movie not found.</p>;

  // Calculate rating distribution
  const distribution = Array(10).fill(0);
  reviews.forEach(({ rating }) => {
    if (rating >= 1 && rating <= 10) distribution[rating - 1]++;
  });

  const totalReviews = reviews.length;
  const distributionPercent = distribution.map(count => (count / totalReviews) * 100);

  // Handle reaction like/dislike
  async function handleReact(reviewId, action) {
    if (!currentUsername) return alert('Please login to react.');

    setReactionLoading(prev => ({ ...prev, [reviewId]: true }));

    try {
      const res = await fetch(`${API_URL}/api/reviews/${reviewId}/react`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, username: currentUsername }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Error reacting to review');
      } else {
        setReviews(prevReviews =>
          prevReviews.map(r => (r.id === reviewId ? data.review : r))
        );
      }
    } catch (err) {
      console.error(err);
      alert('Error reacting to review');
    } finally {
      setReactionLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  }

  // Filter reviews based on min/max rating
  const filteredReviews = reviews.filter(
    r => r.rating >= minRating && r.rating <= maxRating
  );

  // Sort filtered reviews
  const sortedReviews = filteredReviews.sort((a, b) => {
    let comp = 0;
    if (sortBy === 'rating') {
      comp = a.rating - b.rating;
    } else if (sortBy === 'likes') {
      comp = (a.likes || 0) - (b.likes || 0);
    } else if (sortBy === 'dislikes') {
      comp = (a.dislikes || 0) - (b.dislikes || 0);
    }

    return sortOrder === 'asc' ? comp : -comp;
  });

  return (
    <div className="review-list-container">
      {movie.poster_url && (
        <img src={movie.poster_url} alt={movie.title} className="review-movie-poster" />
      )}

      <h2 className="review-title">User Reviews of "{movie.title}"</h2>

      {/* Rating Distribution Bar Graph */}
      <div className="rating-distribution-graph">
        <h3>Rating Distribution</h3>
        <div className="bars">
          {distributionPercent.map((percent, index) => (
            <div key={index} className="bar-wrapper">
              <div className="bar-label-top">{percent > 0 ? `${percent.toFixed(1)}%` : '0%'}</div>
              <div
                className="bar"
                style={{ height: percent > 0 ? `${percent}%` : '2px' }}
                title={`${index + 1} stars: ${distribution[index]} reviews (${percent.toFixed(1)}%)`}
              />
              <div className="bar-label">{index + 1}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sort & Filter Controls */}
     <div className="review-sort-filter">
  <h3>Sort & Filter Reviews</h3>

  <div className="filter-group">
    <label>
      Sort by:{' '}
      <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
        <option value="rating">Rating</option>
        <option value="likes">Likes</option>
        <option value="dislikes">Dislikes</option>
      </select>
    </label>

    <label>
      Order:{' '}
      <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
    </label>

    <label>
      Min Rating:{' '}
      <input
        type="number"
        min="1"
        max="10"
        value={minRating}
        onChange={e => {
          const value = e.target.value;
          if (value === '') {
            setMinRating('');
          } else {
            const num = Number(value);
            if (!isNaN(num)) setMinRating(num);
          }
        }}
        onBlur={() => {
          if (minRating !== '') {
            let val = Math.min(10, Math.max(1, Number(minRating)));
            if (val > maxRating) val = maxRating;
            setMinRating(val);
          }
        }}
      />
    </label>

    <label>
      Max Rating:{' '}
      <input
        type="number"
        min="1"
        max="10"
        value={maxRating}
        onChange={e => {
          const value = e.target.value;
          if (value === '') {
            setMaxRating('');
          } else {
            const num = Number(value);
            if (!isNaN(num)) setMaxRating(num);
          }
        }}
        onBlur={() => {
          if (maxRating !== '') {
            let val = Math.min(10, Math.max(1, Number(maxRating)));
            if (val < minRating) val = minRating;
            setMaxRating(val);
          }
        }}
      />
    </label>
  </div>
</div>


      {/* Reviews List */}
      <div className="reviews">
        {sortedReviews.length === 0 ? (
          <p>No reviews match your filter criteria.</p>
        ) : (
          sortedReviews.map(review => {
            const liked = review.liked_by?.includes(currentUsername);
            const disliked = review.disliked_by?.includes(currentUsername);

            return (
              <div className="review-card" key={review.id}>
                <div className="stars">
                  <strong>{review.rating}/10</strong>{' '}
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <span key={i}>⭐</span>
                  ))}
                </div>

                <h3 className="review-username">
                  <strong className="username">{review.username}</strong>
                  <span className="says-text"> says about </span>
                  <span className="movie-title">{movie.title}</span>
                </h3>

                <p className="review-text">{review.text_review}</p>

                {/* Like/Dislike buttons */}
                <div className="reaction-buttons">
                  <button
                    disabled={!currentUsername || reactionLoading[review.id]}
                    onClick={() => handleReact(review.id, 'like')}
                    className={`like-button ${liked ? 'active' : ''}`}
                    title={currentUsername ? "Like" : "Login to like"}
                  >
                    👍 {review.likes || 0}
                  </button>

                  <button
                    disabled={!currentUsername || reactionLoading[review.id]}
                    onClick={() => handleReact(review.id, 'dislike')}
                    className={`dislike-button ${disliked ? 'active' : ''}`}
                    title={currentUsername ? "Dislike" : "Login to dislike"}
                  >
                    👎 {review.dislikes || 0}
                  </button>

                  {/* See details button */}
                  <button
                    className="see-details-button"
                    onClick={() => {
                      alert(
                        `Liked by: ${review.liked_by?.join(', ') || 'No one'}\n` +
                        `Disliked by: ${review.disliked_by?.join(', ') || 'No one'}`
                      );
                    }}
                  >
                    See Details
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ReviewList;
