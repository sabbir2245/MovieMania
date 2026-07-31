import React, { useEffect, useState } from 'react';
import "../styles/TopUsers.css";
import { API_URL } from '../config';


function TopUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/reviews/top-users`)
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center space-x-2">
          <div className="w-4 h-4 bg-orange-400 rounded-full animate-pulse"></div>
          <span className="text-gray-300 text-sm">Loading top users...</span>
        </div>
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className="text-center py-4">
        <div className="text-3xl mb-2 opacity-60">👥</div>
        <p className="text-gray-400 text-sm">No top users found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      <div className="space-y-2  overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {users.slice(0, 10).map(({ username, review_count }, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors duration-200 border border-gray-600/30"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {index < 3 ? (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500 text-yellow-900' :
                    index === 1 ? 'bg-gray-400 text-gray-900' :
                    'bg-amber-600 text-amber-100'
                  }`}>
                    {index + 1}
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-300">
                    {index + 1}
                  </div>
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {username}
                </p>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-800/30 text-blue-400">
                {review_count} reviews
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {users.length > 10 && (
        <div className="text-center">
          <span className="text-xs text-gray-400">
            Showing top 10 of {users.length} users
          </span>
        </div>
      )}
    </div>
  );
}

export default TopUsers;
