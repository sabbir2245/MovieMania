import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../config';

const useNotifications = (user) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Use ref to prevent multiple connections
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Show custom toast notification
  const showToast = useCallback((notification) => {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.movie-notification-toast');
    existingToasts.forEach(toast => toast.remove());

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'movie-notification-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-left">
          <div class="toast-icon">${notification.type === 'today_release' ? '🎉' : '📅'}</div>
          ${notification.posterUrl ? `<img src="${notification.posterUrl}" alt="${notification.title}" class="toast-poster" />` : ''}
        </div>
        <div class="toast-text">
          <div class="toast-title">${notification.title}</div>
          <div class="toast-message">${notification.message}</div>
          <div class="toast-user">For: ${user?.username || 'You'}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add styles
    const styles = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 16px;
      padding: 0;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      max-width: 400px;
      min-width: 320px;
      animation: slideInRight 0.4s ease-out;
      overflow: hidden;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.2);
    `;
    
    toast.style.cssText = styles;
    document.body.appendChild(toast);

    // Auto remove after 6 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideOutRight 0.4s ease-in';
        setTimeout(() => {
          if (toast.parentElement) {
            document.body.removeChild(toast);
          }
        }, 400);
      }
    }, 6000);
  }, [user]);

  // Manual reconnect function
  const reconnectSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.connect();
      }
    }, 2000);
  }, []);

  useEffect(() => {
    if (!user) {
      setIsConnected(false);
      setConnectionStatus('User not authenticated');
      return;
    }

    // Clean up previous socket if exists
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
      socketRef.current = null;
    }


    // Get server URL from environment variables
    const serverUrl = API_URL;

    // Socket.IO connection with configuration
    const newSocket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: true
    });

    socketRef.current = newSocket;

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('Connected');
      setReconnectAttempts(0);
      
      // Clear any pending reconnect timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Authenticate user
      newSocket.emit('authenticate', {
        userId: user.username, // Use username as userId
        username: user.username,
        token: localStorage.getItem('token')
      });
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      setConnectionStatus(`Disconnected: ${reason}`);
      
      // Only attempt reconnection for certain disconnect reasons
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
        reconnectSocket();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      setIsConnected(false);
      setConnectionStatus(`Connection failed: ${error.message}`);
      setReconnectAttempts(prev => prev + 1);
      
      // Attempt reconnection
      reconnectSocket();
    });

    newSocket.on('reconnect', (attemptNumber) => {
      setConnectionStatus('Reconnected');
      setReconnectAttempts(0);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      setConnectionStatus(`Reconnecting... (${attemptNumber})`);
      setReconnectAttempts(attemptNumber);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect after all attempts');
      setConnectionStatus('Connection failed - manual refresh required');
    });

    // Connection status response
    newSocket.on('connection-status', (data) => {
      setConnectionStatus(data.message);
      setIsConnected(data.connected);
      
      if (!data.connected) {
        setTimeout(() => {
          if (newSocket.connected) {
            newSocket.emit('authenticate', {
              userId: user.username,
              username: user.username,
              token: localStorage.getItem('token')
            });
          }
        }, 1000);
      }
    });

    // Receive current notifications
    newSocket.on('current-notifications', (data) => {
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      setConnectionStatus('Notifications loaded');
    });

    // Receive new notification (only for this user)
    newSocket.on('new-notification', (data) => {
      
      // Check if this notification is for current user (using username)
      if (!data.targetUsername || data.targetUsername === user.username) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
        
        // Show toast notification
        showToast(data.notification);
        
        // Show browser notification (if permission granted)
        if (Notification.permission === 'granted') {
          const browserNotif = new Notification(`🎬 ${data.notification.title}`, {
            body: `${data.notification.message}\nFor: ${user.username}`,
            icon: data.notification.posterUrl || '/logo192.png',
            tag: data.notification.id,
            requireInteraction: false,
            silent: false
          });

          // Auto close after 5 seconds
          setTimeout(() => {
            browserNotif.close();
          }, 5000);
        }
      }
    });

    // Notifications updated
    newSocket.on('notifications-updated', (data) => {
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    });

    // User status updates
    newSocket.on('user-status-update', (data) => {
      setConnectedUsers(data.connectedUsers || []);
    });

    setSocket(newSocket);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
      });
    }

    // Send user activity ping every 30 seconds
    const activityInterval = setInterval(() => {
      if (newSocket && newSocket.connected) {
        newSocket.emit('user-activity');
      }
    }, 30000);

    // Cleanup function
    return () => {

      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      clearInterval(activityInterval);
      
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.close();
      }
      
      socketRef.current = null;
    };
  }, [user?.username, showToast, reconnectSocket]);

  const markAsRead = useCallback((notificationId) => {
    if (socket && socket.connected) {
      socket.emit('mark-notification-read', notificationId);
    } else {
    }
  }, [socket]);

  const clearAllNotifications = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('clear-all-notifications');
    } else {
    }
  }, [socket]);

  const deleteNotification = useCallback((notificationId) => {
    if (socket && socket.connected) {
      socket.emit('delete-notification', notificationId);
    } else {
    }
  }, [socket]);

  const getConnectionStatusColor = () => {
    if (isConnected) return '#2ed573';
    if (reconnectAttempts > 0) return '#ffa502';
    return '#ff4757';
  };

  const getConnectionStatusText = () => {
    if (!user) return 'Not authenticated';
    if (isConnected) return `Connected as ${user.username}`;
    return connectionStatus;
  };

  // Manual reconnect function for UI
  const manualReconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.connect();
        }
      }, 1000);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    connectionStatus: getConnectionStatusText(),
    connectionStatusColor: getConnectionStatusColor(),
    connectedUsers,
    reconnectAttempts,
    markAsRead,
    clearAllNotifications,
    deleteNotification,
    manualReconnect
  };
};

// Add CSS animations to document with user-specific styles
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('notification-toast-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'notification-toast-styles';
    style.textContent = `
      @keyframes slideInRight {
        from { 
          transform: translateX(100%) scale(0.9); 
          opacity: 0; 
        }
        to { 
          transform: translateX(0) scale(1); 
          opacity: 1; 
        }
      }
      
      @keyframes slideOutRight {
        from { 
          transform: translateX(0) scale(1); 
          opacity: 1; 
        }
        to { 
          transform: translateX(100%) scale(0.9); 
          opacity: 0; 
        }
      }
      
      .toast-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
      }
      
      .toast-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .toast-icon {
        font-size: 28px;
        flex-shrink: 0;
      }
      
      .toast-poster {
        width: 50px;
        height: 75px;
        border-radius: 8px;
        object-fit: cover;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }
      
      .toast-text {
        flex: 1;
        min-width: 0;
      }
      
      .toast-title {
        font-weight: 600;
        margin-bottom: 4px;
        font-size: 16px;
      }
      
      .toast-message {
        font-size: 14px;
        opacity: 0.9;
        line-height: 1.4;
        margin-bottom: 4px;
      }
      
      .toast-user {
        font-size: 12px;
        opacity: 0.8;
        font-style: italic;
      }
      
      .toast-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.3s ease;
        flex-shrink: 0;
      }
      
      .toast-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    `;
    document.head.appendChild(style);
  }
}

export default useNotifications;