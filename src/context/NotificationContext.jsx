import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getNotifications, clearNotifications as clearStorageNotifications } from '../utils/ShowEmsg';

const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const diff = now - new Date(timestamp);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour ago`;
  return `${days} day ago`;
};

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [readNotificationIds, setReadNotificationIds] = useState(new Set());

  // Load notifications from localStorage on mount
  const loadNotifications = useCallback(() => {
    const storedNotifications = getNotifications();
    setNotifications(storedNotifications);
    // Load read notification IDs from localStorage
    try {
      const readIds = localStorage.getItem('read_notification_ids');
      if (readIds) {
        setReadNotificationIds(new Set(JSON.parse(readIds)));
      }
    } catch {
      setReadNotificationIds(new Set());
    }
  }, []);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Listen for custom events from ShowEmsg
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleNotificationAdded = (event) => {
        setNotifications(event.detail.all);
        // New notification is unread by default
      };

      const handleNotificationRemoved = (event) => {
        setNotifications(event.detail.all);
      };

      const handleNotificationsCleared = () => {
        setNotifications([]);
        setReadNotificationIds(new Set());
        localStorage.removeItem('read_notification_ids');
      };

      window.addEventListener('notificationAdded', handleNotificationAdded);
      window.addEventListener('notificationRemoved', handleNotificationRemoved);
      window.addEventListener('notificationsCleared', handleNotificationsCleared);

      return () => {
        window.removeEventListener('notificationAdded', handleNotificationAdded);
        window.removeEventListener('notificationRemoved', handleNotificationRemoved);
        window.removeEventListener('notificationsCleared', handleNotificationsCleared);
      };
    }
  }, []);

  // Function to mark notifications as read (when dropdown is opened)
  const markAsRead = useCallback(() => {
    const currentNotificationIds = notifications.map(n => n.id);
    const newReadIds = new Set([...readNotificationIds, ...currentNotificationIds]);
    setReadNotificationIds(newReadIds);
    
    // Save to localStorage
    try {
      localStorage.setItem('read_notification_ids', JSON.stringify([...newReadIds]));
    } catch {
      // Silently fail if localStorage is full
    }
  }, [notifications, readNotificationIds]);

  // Calculate unread notifications
  const unreadNotifications = notifications.filter(n => !readNotificationIds.has(n.id));
  const hasUnreadNotifications = unreadNotifications.length > 0;

  // Update time formats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => {
        const updated = prev.map(notif => ({
          ...notif,
          time: formatTimeAgo(notif.timestamp)
        }));
        return updated;
      });
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    // This will trigger the event system which updates localStorage and notifies other components
    const currentNotifications = getNotifications();
    const updatedNotifications = currentNotifications.filter(notif => notif.id !== id);
    
    // Save to localStorage and trigger event
    const userId = localStorage.getItem('userId');
    const NOTIFICATIONS_STORAGE_KEY = 'app_notifications';
    const userKey = userId ? `${NOTIFICATIONS_STORAGE_KEY}_${userId}` : NOTIFICATIONS_STORAGE_KEY;
    
    try {
      localStorage.setItem(userKey, JSON.stringify(updatedNotifications));
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedNotifications));
      
      // Dispatch event to notify components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notificationRemoved', { 
          detail: { removedId: id, all: updatedNotifications } 
        }));
      }
    } catch {
      // Silently fail if localStorage is full
    }
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    clearStorageNotifications();
  }, []);

  // Get notification count (unread count)
  const getUnreadCount = useCallback(() => {
    return unreadNotifications.length;
  }, [unreadNotifications]);

  const value = {
    notifications,
    removeNotification,
    clearNotifications,
    markAsRead,
    hasUnreadNotifications,
    unreadCount: getUnreadCount(),
    getUnreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
