import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function SearchBox() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const initialText = params.get('text') || '';
  const initialType = params.get('searchType') || 'movie';

  const [searchTerm, setSearchTerm] = useState(initialText);
  const [searchType, setSearchType] = useState(initialType);

  useEffect(() => {
    setSearchTerm(params.get('text') || '');
    setSearchType(params.get('searchType') || 'movie');
    // eslint-disable-next-line
  }, [location.search]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search?text=${encodeURIComponent(searchTerm)}&searchType=${encodeURIComponent(searchType)}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="mx-auto my-6 flex w-full max-w-xl items-stretch gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-lg shadow-slate-900/10 transition-shadow duration-300 focus-within:border-indigo-400 focus-within:shadow-xl focus-within:ring-4 focus-within:ring-indigo-200"
    >
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search movies, actors, genres..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl bg-transparent py-2.5 pl-11 pr-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="relative">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="h-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-4 pr-9 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:border-indigo-400 hover:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200"
        >
          <option value="movie">Movie</option>
          <option value="actor">Actor</option>
          <option value="genre">Genre</option>
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <button
        type="submit"
        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 text-sm font-bold text-white shadow-md shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/40 hover:brightness-110 active:translate-y-0"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
        Search
      </button>
    </form>
  );
}

export default SearchBox;
