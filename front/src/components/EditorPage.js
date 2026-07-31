import React, { useState, useEffect, useRef } from 'react';
const API_URL = 'http://localhost:3000/api/editor';

function getToken() {
  const token = localStorage.getItem('token');
  console.log('[DEBUG] getToken() ->', token ? token.slice(0, 20) + '...' : 'NO TOKEN');
  return token;
}

function EditorPage({ loggedInUser }) {
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState({
    title: '', release_date: '', plot: '', budget: '', boxoffice: '', runtime: '', poster_url: '', trailer_link: ''
  });
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchMovie, setSearchMovie] = useState('');
  const [users, setUsers] = useState([]);
  const [posterFile, setPosterFile] = useState(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const panelRef = useRef(null);

  const handleGlow = e => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  // Fetch users on mount and after ban
  const fetchUsers = () => {
    fetch('http://localhost:3000/api/editor/users')
      .then(res => res.json())
      .then(data => setUsers(Array.isArray(data) ? data : (data.users || [])));
  };
  useEffect(() => {
    fetchUsers();
  }, []);

  // Ban (delete) a user
  const handleBanUser = async username => {
    if (!window.confirm(`Are you sure you want to ban (delete) user '${username}'?`)) return;
    const res = await fetch(`${API_URL}/ban/${username}`, { method: 'DELETE' });
    const data = await res.json();
    setMessage(data.message || data.error);
    fetchUsers();
  };

  // Load movies on mount
  useEffect(() => {
    fetch('http://localhost:3000/api/movies')
      .then(res => res.json())
      .then(data => setMovies(Array.isArray(data) ? data : (data.movies || [])));
  }, []);
  // Reload movies after add/edit/delete
  const reloadMovies = () => {
    fetch('http://localhost:3000/api/movies')
      .then(res => res.json())
      .then(data => setMovies(Array.isArray(data) ? data : (data.movies || [])));
  };

  // Handle input changes
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Add or Edit movie
  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `${API_URL}/edit/${editId}` : `${API_URL}/add`;

    const payload = {
      title: form.title,
      release_date: form.release_date,
      plot: form.plot,
      budget: form.budget,
      boxoffice: form.boxoffice,
      runtime: form.runtime,
      poster_url: form.poster_url,
      trailer_link: form.trailer_link
    };
    console.log('[DEBUG] handleSubmit ->', method, url, '| payload:', payload);

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message || 'Success!');
      reloadMovies();
      setForm({
        title: '', release_date: '', plot: '', budget: '', boxoffice: '', runtime: '', poster_url: '', trailer_link: ''
      });
      setEditId(null);
      setShowForm(false);
    } else {
      setMessage(data.error || 'Error');
    }
  };

  // Delete movie
  const handleDelete = async id => {
    if (!window.confirm('Delete this movie?')) return;
    const res = await fetch(`${API_URL}/delete/${id}`, { method: 'DELETE' });
    const data = await res.json();
    setMessage(data.message || data.error);
    reloadMovies();
  };

  // Upload the selected poster image to Supabase Storage (admin endpoint)
  const handlePosterUpload = async () => {
    const token = getToken();
    if (!posterFile) {
      setUploadMessage('Please choose a poster image first.');
      return;
    }
    if (!token) {
      setUploadMessage('No auth token found. Please sign in as an editor.');
      return;
    }

    setUploadingPoster(true);
    setUploadMessage('');
    console.log('[DEBUG] Uploading poster file:', posterFile.name, '| type:', posterFile.type, '| size:', posterFile.size);

    try {
      const formData = new FormData();
      formData.append('poster', posterFile);

      const res = await fetch(`${API_URL}/upload-poster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      console.log('[DEBUG] upload-poster status:', res.status, '| body:', data);

      if (!res.ok) throw new Error(data.details || data.error || 'Upload failed');

      setForm(prev => ({ ...prev, poster_url: data.posterUrl }));
      setUploadMessage('Poster uploaded: ' + data.posterUrl);
    } catch (err) {
      console.error('[DEBUG] poster upload error:', err);
      setUploadMessage('Error: ' + err.message);
    } finally {
      setUploadingPoster(false);
    }
  };

  // Edit movie
  const handleEdit = movie => {
    setEditId(movie.id);
    setForm({
      title: movie.title || '',
      release_date: movie.release_date ? movie.release_date.slice(0, 10) : '',
      plot: movie.plot || '',
      budget: movie.budget || '',
      boxoffice: movie.boxoffice || '',
      runtime: movie.runtime || '',
      poster_url: movie.poster_url || '',
      trailer_link: movie.trailer_link || ''
    });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const resetForm = () => {
    setEditId(null);
    setShowForm(false);
    setForm({
      title: '', release_date: '', plot: '', budget: '', boxoffice: '', runtime: '', poster_url: '', trailer_link: ''
    });
    setUploadMessage('');
  };

  // Filter movies for search
  const filteredMovies = movies.filter(m =>
    m.title.toLowerCase().includes(searchMovie.toLowerCase())
  );

  // Filter users for search
  const filteredUsers = users.filter(
    u =>
      u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.Name && u.Name.toLowerCase().includes(searchUser.toLowerCase()))
  );

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-200';

  const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/40 hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60';

  const btnGhost =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-1 hover:bg-slate-300 hover:shadow-lg active:translate-y-0';

  const btnDanger =
    'inline-flex items-center justify-center rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-600 hover:shadow-md active:translate-y-0';

  const btnBlue =
    'inline-flex items-center justify-center rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-md active:translate-y-0';

  return (
    <div
      ref={panelRef}
      onMouseMove={handleGlow}
      className="relative mx-auto my-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-indigo-900/60 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-sm sm:p-8"
    >
      {/* mouse-following glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(560px circle at var(--mx, 50%) var(--my, 20%), rgba(99,102,241,0.18), transparent 45%)' }}
      />

      <div className="relative z-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
            Editor Panel
          </h2>

          {!showForm && !editId && (
            <button className={btnPrimary} onClick={() => setShowForm(true)}>
              + Add Movie
            </button>
          )}
        </div>

        {/* Movie Form */}
        {(showForm || editId) && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-indigo-900/50 bg-slate-800/70 p-5 shadow-inner sm:grid-cols-2"
          >
            <input className={inputCls} name="title" placeholder="Title" value={form.title} onChange={handleChange} required />
            <input className={inputCls} name="release_date" type="date" placeholder="Release Date" value={form.release_date} onChange={handleChange} required />
            <input className={inputCls} name="plot" placeholder="Plot" value={form.plot} onChange={handleChange} />
            <input className={inputCls} name="budget" placeholder="Budget" value={form.budget} onChange={handleChange} />
            <input className={inputCls} name="boxoffice" placeholder="Box Office" value={form.boxoffice} onChange={handleChange} />
            <input className={inputCls} name="runtime" placeholder="Runtime" value={form.runtime} onChange={handleChange} />

            <div className="flex flex-col gap-2 sm:col-span-2">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex-1 cursor-pointer rounded-xl border-2 border-dashed border-slate-500 bg-slate-900/60 px-4 py-3 text-sm text-slate-300 transition-all duration-300 hover:border-indigo-400 hover:text-white">
                  <span className="mr-2">{posterFile ? 'Change image' : 'Choose poster image'}</span>
                  {posterFile && <span className="text-indigo-300">{posterFile.name}</span>}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      console.log('[DEBUG] poster file selected:', e.target.files[0]?.name);
                      setPosterFile(e.target.files[0] || null);
                    }}
                  />
                </label>
                <button type="button" onClick={handlePosterUpload} disabled={uploadingPoster || !posterFile} className={btnGhost}>
                  {uploadingPoster ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                      Uploading...
                    </span>
                  ) : (
                    'Upload Poster'
                  )}
                </button>
              </div>
              {uploadMessage && (
                <p className={`text-sm font-medium ${uploadMessage.startsWith('Error') ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {uploadMessage}
                </p>
              )}
            </div>

            <input className={inputCls} name="poster_url" placeholder="Poster URL (auto-filled after upload)" value={form.poster_url} onChange={handleChange} />
            <input className={inputCls} name="trailer_link" placeholder="YouTube Trailer Link (https://www.youtube.com/watch?v=...)" value={form.trailer_link} onChange={handleChange} />

            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" className={btnPrimary}>
                {editId ? 'Update Movie' : 'Add Movie'}
              </button>
              <button type="button" onClick={resetForm} className={btnGhost}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {message && (
          <div
            className={`mb-6 rounded-xl border-2 px-4 py-3 text-sm font-semibold ${
              message.toLowerCase().includes('error')
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {message}
          </div>
        )}

        {/* Search User Box */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search user (for ban)..."
            value={searchUser}
            onChange={e => setSearchUser(e.target.value)}
            className={inputCls}
          />
          {searchUser && (
            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800/80 p-3">
              {filteredUsers.length === 0 && <p className="px-2 text-sm text-slate-400">No users found</p>}
              {filteredUsers.map(user => (
                <div
                  key={user.username}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/60 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-700/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{user.username}</p>
                    {user.Name && <p className="truncate text-xs text-slate-400">{user.Name}</p>}
                  </div>
                  <button onClick={() => handleBanUser(user.username)} className={btnDanger}>
                    Ban
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Movies Box */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search movies (for update/delete)..."
            value={searchMovie}
            onChange={e => setSearchMovie(e.target.value)}
            className={inputCls}
          />
          {searchMovie && (
            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800/80 p-3">
              {filteredMovies.length === 0 && <p className="px-2 text-sm text-slate-400">No movies found</p>}
              {filteredMovies.map(movie => (
                <div
                  key={movie.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/60 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-700/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{movie.title}</p>
                    {movie.year && <p className="text-xs text-slate-400">{movie.year}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => handleEdit(movie)} className={btnBlue}>
                      Update
                    </button>
                    <button onClick={() => handleDelete(movie.id)} className={btnDanger}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <h3 className="mb-4 text-xl font-bold text-slate-100">All Movies</h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-800/60">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-5 py-4 font-semibold">Title</th>
                <th className="px-5 py-4 font-semibold">Year</th>
                <th className="hidden px-5 py-4 font-semibold sm:table-cell">Release</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {movies.map(movie => (
                <tr key={movie.id} className="transition-colors duration-200 hover:bg-slate-700/40">
                  <td className="px-5 py-4 font-semibold text-white">{movie.title}</td>
                  <td className="px-5 py-4 text-slate-300">{movie.year}</td>
                  <td className="hidden px-5 py-4 text-slate-300 sm:table-cell">
                    {movie.release_date ? movie.release_date.slice(0, 10) : ''}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(movie)} className={btnBlue}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(movie.id)} className={btnDanger}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
