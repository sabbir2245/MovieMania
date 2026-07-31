import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/PersonPage.css'; // You can create styling separately
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

function calculateAge(birthdate) {
  if (!birthdate) return 'Unknown';
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function PersonPage() {
  const { personId } = useParams();
  const [person, setPerson] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPersonDetails() {
      try {
        const res = await fetch(`${API_URL}/api/movie-persons/person/${personId}`)
;
        const data = await res.json();
        setPerson(data.person);
        setMovies(data.movies);
      } catch (err) {
        console.error('Failed to fetch person details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPersonDetails();
  }, [personId]);

  if (loading) return <p>Loading...</p>;
  if (!person) return <p>Person not found.</p>;
 const birthdateString = person.birthdate ? person.birthdate.split('T')[0] : 'N/A';
  return (
    <div className="person-page">
      <h1>{person.name}</h1>
      {person.photo_url && (
        <img
          src={person.photo_url}
          alt={person.name}
          className="person-photo"
        />
      )}
      <p><strong>Gender:</strong> {person.gender}</p>
      <p><strong>Role:</strong> {person.role}</p>
    


<p>Birthdate: {birthdateString}</p> <p><strong>Age:</strong> {calculateAge(person.birthdate)}</p>

      <h2>🎬 Movies</h2>
      {movies.length === 0 ? (
        <p>No movies found.</p>
      ) : (
         <ul className="person-movie-list">
    {movies.map(movie => (
      <li key={movie.id}>
        <strong>
          <Link to={`/movies/${movie.id}`}>{movie.title}</Link>
        </strong> ({movie.year})
        <br />
        <em>{movie.role_description}</em>
      </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PersonPage;
