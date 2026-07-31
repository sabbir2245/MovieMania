import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import MovieCard from './shared/MovieCard';
import LoadingComponent from './shared/LoadingComponent';
import { API_URL } from '../config';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function SearchResults() {
  const query = useQuery();
  const searchTerm = query.get('text') || '';
  const searchType = query.get('searchType') || 'movie';

  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [genres, setGenres] = useState('');
  const [actors, setActors] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page] = useState(1);

  const [movies, setMovies] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1, limit: 120, total: 0, totalPages: 1,
    hasNext: false, hasPrevious: false, nextPage: null, previousPage: null
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allGenres, setAllGenres] = useState([]);
  const [persons, setPersons] = useState([]);
  const [moviePersons] = useState([]);

  const buildApiUrl = () => {
    const params = new URLSearchParams();
    params.append('text', searchTerm);
    params.append('searchType', searchType);
    if (startYear) params.append('startYear', startYear);
    if (endYear) params.append('endYear', endYear);
    if (minRating) params.append('minRating', minRating);
    if (maxRating) params.append('maxRating', maxRating);
    if (genres) params.append('genres', genres);
    if (actors) params.append('actors', actors);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    if (page !== 1) params.append('page', page);
    params.append('limit', 1200);

    return `${API_URL}/api/movies/search?${params.toString()}`;
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(buildApiUrl())
      .then(res => res.ok ? res.json() : Promise.reject('Failed'))
      .then(data => {
        setMovies(data.results || []);
        setPagination(data.pagination);
      })
      .catch(() => setError('Failed to load search results'))
      .finally(() => setLoading(false));
  }, [searchTerm, searchType, startYear, endYear, minRating, maxRating, genres, actors, sortBy, sortOrder, page]);

  useEffect(() => {
    fetch(`${API_URL}/api/genres`)
      .then(res => res.json())
      .then(data => setAllGenres(data.genres || []))
      .catch(() => setAllGenres([]));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/movie-persons/persons`)
      .then(res => res.json())
      .then(data => setPersons(data))
      .catch(() => setPersons([]));
  }, []);

  const selectedGenres = genres ? genres.split(',') : [];
  const selectedActors = actors ? actors.split(',') : [];
  const allActors = persons.filter(p => ['actor', 'actress'].includes(p.role?.toLowerCase()));

  const handleGenreChange = (e) => {
    const value = e.target.value;
    setStartYear(value);
  };

  const handleActorChange = (e) => {
    const value = e.target.value;
    setEndYear(value);
  };

  const getActorsForMovie = (movieId) => {
    const actorIds = moviePersons.filter(mp => mp.movie_id === movieId).map(mp => mp.person_id);
    return persons
      .filter(p => actorIds.includes(p.id) && p.role === 'actor')
      .map(p => p.name)
      .join(', ');
  };

  const filteredMovies = movies.filter(movie => {
    const movieActorNames = movie.actors ? movie.actors.split(',').map(a => a.trim()) : [];
    return selectedActors.every(actor => movieActorNames.includes(actor));
  });

  const clearAll = () => {
    setStartYear('');
    setEndYear('');
    setMinRating('');
    setMaxRating('');
    setGenres('');
    setActors('');
    setSortBy('rating');
    setSortOrder('desc');
  };

  // Shared Tailwind classes for a consistent, modern look.
  const fieldLabel = 'block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5';
  const fieldInput = 'w-full rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30';
  const chipButton = 'rounded-md px-2.5 py-1 text-xs font-medium transition';

  // Reusable multi-select checkbox panel (used for Genres and Actors).
  const CheckList = ({ label, items, selected, onToggle, accent, onSelectAll, onClear }) => (
    <div className="flex flex-col">
      <label className={fieldLabel}>{label}</label>
      <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-600/50 bg-slate-800/40 p-2 space-y-1">
        {items.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <label
              key={item}
              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer transition ${
                isSelected ? `${accent} text-white` : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(item)}
                className={`h-4 w-4 rounded ${accent.split(' ')[0]} checked:bg-indigo-600`}
              />
              <span className="truncate">{item}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onSelectAll} className={`${chipButton} bg-slate-700 text-slate-100 hover:bg-slate-600`}>
          Select all
        </button>
        <button type="button" onClick={onClear} className={`${chipButton} bg-slate-800 text-slate-400 border border-slate-600/60 hover:text-slate-200`}>
          Clear
        </button>
      </div>
    </div>
  );

  const filterBar = (
    <div className="mb-8 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between border-b border-slate-700/60 pb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-200">
          <svg className="h-4 w-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3 5a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm3 5a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          Filters &amp; Sort
        </h3>
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-600/60 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-500/50 hover:text-rose-300"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear all
        </button>
      </div>

      {/* Top row: years, ratings, sort */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label className={fieldLabel}>From Year</label>
          <input type="text" value={startYear} onChange={e => setStartYear(e.target.value)} placeholder="1990" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>To Year</label>
          <input type="text" value={endYear} onChange={e => setEndYear(e.target.value)} placeholder="2026" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Min Rating</label>
          <select value={minRating} onChange={e => setMinRating(e.target.value)} className={fieldInput}>
            <option value="" className="bg-slate-800">Any</option>
            {[...Array(11).keys()].map(r => <option key={r} value={r} className="bg-slate-800">{r}</option>)}
          </select>
        </div>
        <div>
          <label className={fieldLabel}>Max Rating</label>
          <select value={maxRating} onChange={e => setMaxRating(e.target.value)} className={fieldInput}>
            <option value="" className="bg-slate-800">Any</option>
            {[...Array(11).keys()].map(r => <option key={r} value={r} className="bg-slate-800">{r}</option>)}
          </select>
        </div>
        <div>
          <label className={fieldLabel}>Sort By</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={fieldInput}>
            <option value="rating" className="bg-slate-800">Rating</option>
            <option value="title" className="bg-slate-800">Title</option>
            <option value="votes" className="bg-slate-800">Votes</option>
            <option value="year" className="bg-slate-800">Year</option>
            <option value="boxoffice" className="bg-slate-800">Box Office</option>
          </select>
        </div>
        <div>
          <label className={fieldLabel}>Order</label>
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className={fieldInput}>
            <option value="desc" className="bg-slate-800">Descending</option>
            <option value="asc" className="bg-slate-800">Ascending</option>
          </select>
        </div>
      </div>

      {/* Bottom row: multi-select lists */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CheckList
          label="Genres"
          items={allGenres}
          selected={selectedGenres}
          accent="bg-emerald-600/80"
          onToggle={(genre) =>
            setGenres(
              selectedGenres.includes(genre)
                ? selectedGenres.filter((g) => g !== genre).join(',')
                : [...selectedGenres, genre].join(',')
            )
          }
          onSelectAll={() => setGenres(allGenres.join(','))}
          onClear={() => setGenres('')}
        />
        <CheckList
          label="Actors"
          items={allActors.map(a => a.name)}
          selected={selectedActors}
          accent="bg-indigo-600/80"
          onToggle={(name) =>
            setActors(
              selectedActors.includes(name)
                ? selectedActors.filter((a) => a !== name).join(',')
                : [...selectedActors, name].join(',')
            )
          }
          onSelectAll={() => setActors(allActors.map(a => a.name).join(','))}
          onClear={() => setActors('')}
        />
      </div>
    </div>
  );

  if (loading) return <LoadingComponent type="grid" title="Searching movies..." />;
  if (error) return <div className="text-center py-10 text-red-400">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4 text-white">
        Search Results for: <span className="text-yellow-400">"{searchTerm}"</span> <span className="text-sm text-gray-400">({searchType})</span>
      </h2>
      {filterBar}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredMovies.map(movie => (
          <MovieCard
            key={movie.id}
            movie={movie}
            extra={
              <div className="mt-2 text-xs text-gray-300">
                <div>Year: <span className="font-semibold">{movie.year || '-'}</span></div>
                <div>Rating: <span className="font-semibold">{movie.rating || '-'}</span></div>
                <div>Actors: <span className="font-semibold">{getActorsForMovie(movie.id) || '-'}</span></div>
                <div>Genres: <span className="font-semibold">{movie.genre || '-'}</span></div>
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}

export default SearchResults;
