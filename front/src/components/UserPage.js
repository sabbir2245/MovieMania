import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/UserPage.css';
import { API_URL } from '../config';

function UserPage({ user, onLogout }) {
  const [watchlists, setWatchlists] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- New states for watchlist search ---
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    if (!user) return;

    fetch(`${API_URL}/api/watchlists/user/${user.username}`)
      .then(res => res.json())
      .then(data => setWatchlists(data))
      .catch(err => console.error('Failed to load watchlists:', err));
  }, [user]);

  const handleCreateWatchlist = async () => {
    if (!newListName.trim()) {
      alert('Please enter a valid list name.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/watchlists/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          listname: newListName.trim()
        }),
      });

      if (!response.ok) {
        alert('Failed to create watchlist');
        setLoading(false);
        return;
      }

      const result = await response.json();
      setWatchlists(prev => [...prev, result.watchlist]);
      setNewListName('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Create watchlist error:', err);
      alert('Error creating watchlist');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this watchlist?');
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/api/watchlists/user/${user.username}/watchlist/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (response.ok) {
        alert('Watchlist deleted successfully.');
        setWatchlists(prev => prev.filter(w => w.id !== id));
      } else {
        alert(result.error || 'Failed to delete watchlist');
      }
    } catch (error) {
      console.error('Error deleting watchlist:', error);
      alert('An error occurred while deleting.');
    }
  };

  // --- New handler for searching public watchlists ---
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (searchTerm.trim() === '') return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);

    try {
      const response = await fetch(`${API_URL}/api/watchlists/search?text=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      setSearchError(err.message || 'Something went wrong');
    } finally {
      setSearchLoading(false);
    }
  };

  if (!user) return <p>Loading user data...</p>;

  return (
    <div className="user-page">
      <div className="user-card">
        <h2>Welcome, {user.Name}!</h2>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Name:</strong> {user.Name}</p>
        <p><strong>Email:</strong> {user.Email}</p>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>

      <div className="user-links">
        <h3>📚 Your Watchlists</h3>

        <ul className="watchlist-links">
          {watchlists.length === 0 ? (
            <li className="empty-msg">No watchlists found.</li>
          ) : (
            watchlists.map(list => (
              <li key={list.id} className="watchlist-item">
                <Link to={`/watchlist/${list.id}`} className="watchlist-link">
                  {list.listname} {'->>'}
                </Link>
                <button
                  onClick={() => handleDelete(list.id)}
                  className="delete-watchlist-btn"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>

        {!showCreateForm && (
          <button className="create-watchlist-btn" onClick={() => setShowCreateForm(true)}>
            ➕ Create New Watchlist
          </button>
        )}

        {showCreateForm && (
          <div className="create-watchlist-form">
            <input
              type="text"
              placeholder="Enter watchlist name"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              disabled={loading}
            />
            <button onClick={handleCreateWatchlist} disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreateForm(false)} disabled={loading}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* === New Watchlist Search Section === */}
      <div className="watchlist-search">
        {!showSearchInput ? (
          <button onClick={() => setShowSearchInput(true)}>🔍 Search Public Watchlists</button>
        ) : (
          <form onSubmit={handleSearchSubmit} style={{ marginTop: '1rem' }}>
            <input
              type="text"
              placeholder="Enter watchlist name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              disabled={searchLoading}
            />
            <button type="submit" disabled={searchLoading}>
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
            <button type="button" onClick={() => {
              setShowSearchInput(false);
              setSearchTerm('');
              setSearchResults(null);
              setSearchError(null);
            }} disabled={searchLoading} style={{ marginLeft: '8px' }}>
              Cancel
            </button>

            {searchError && <p style={{ color: 'red' }}>{searchError}</p>}

            {searchResults && (
              <ul style={{ marginTop: '1rem' }}>
                {searchResults.length === 0 ? (
                  <li>No watchlists found.</li>
                ) : (
                  searchResults.map(watchlist => (
                    <li key={watchlist.id}>
                      <Link to={`/watchlist/${watchlist.id}`}>
                        {watchlist.listname} — by {watchlist.username} 
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            )}
          </form>
        )}
      </div>

      <div className="user-actions" style={{ marginTop: '2rem' }}>
        <Link to={`/user-reviews/${user.username}`}>
          <button className="reviews-btn">📝 Check Past Reviews</button>
        </Link>
      </div>

      {(user.iseditor === true || user.iseditor === "true" || user.iseditor === 1 || user.iseditor === "1") && (
        <div className="editor-entry">
          <Link to="/editor" className="editor-entry-btn">
            🛠️ Editor Panel — Add / Upload Movies
          </Link>
        </div>
      )}
    </div>
  );
}

export default UserPage;
