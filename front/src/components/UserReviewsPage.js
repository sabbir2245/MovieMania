import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/UserReviewsPage.css';
import { API_URL } from '../config';

function UserReviewsPage() {
  const { username } = useParams();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch(`${API_URL}/api/reviews/user/${username}`);
        const data = await res.json();
        setReviews(data);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [username]);

  if (loading) return <p>Loading your reviews...</p>;
  if (reviews.length === 0) return <p>No reviews found.</p>;

  return (
    <div className="user-reviews-page">
      <h2 className="reviews-title">📝 Reviews by {username}</h2>

      <div className="reviews-list">
        {reviews.map((review) => (
          <div className="review-card" key={review.id}>
            <h3 className="review-header">
              <span className="review-username">{review.username}</span>{' '}
              <span className="review-about">says about</span>{' '}
              <span className="review-movie">{review.title}</span>
            </h3>

            <div className="review-rating">
              {Array.from({ length: review.rating }).map((_, i) => (
                <span key={i}>⭐</span>
              ))}
              <span className="rating-number">({review.rating}/10)</span>
            </div>

            <p className="review-text">{review.text_review}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserReviewsPage;
