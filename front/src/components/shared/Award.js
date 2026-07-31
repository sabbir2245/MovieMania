import React, { useEffect, useState } from 'react';
import { API_URL } from '../../config';

function MovieAwardsBox({ movieId }) {
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAwards() {
      try {
       const res = await fetch(`${API_URL}/api/movies/${movieId}/awards`);

        if (!res.ok) throw new Error('Failed to fetch awards');
        const data = await res.json();
        setAwards(data.awards);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAwards();
  }, [movieId]);

  if (loading) return <div className="awards-box">Loading awards...</div>;
  if (error) return <div className="awards-box error">Error: {error}</div>;
  if (awards.length === 0) return <div className="awards-box">No awards found.</div>;

  return (
    <div className="awards-box" style={styles.box}>
      <h3>Awards & Nominations</h3>
      <ul style={styles.list}>
        {awards.map((award, index) => {
  const capitalized = award.replace(/\b\w+/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1)
  );
  return <p key={index}>{capitalized}</p>;
})}

      </ul>
    </div>
  );
}

const styles = {
  box: {
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '1rem',
    maxWidth: '400px',
    backgroundColor: '#062d52ff',
  },
  list: {
    paddingLeft: '1.2rem',
    marginTop: '0.5rem',
  },
  item: {
    marginBottom: '0.4rem',
  },
};

export default MovieAwardsBox;
