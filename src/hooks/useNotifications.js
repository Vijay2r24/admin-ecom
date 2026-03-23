import { useSelector, useDispatch } from 'react-redux';
import { 
  addNotification, 
  removeNotification, 
  markAsRead, 
  clearNotifications, 
  initializeNotifications 
} from '../store/slices/notificationSlice';

// Helper functions for localStorage
const getStoredNotifications = () => {
  try {
    const userId = localStorage.getItem('userId');
    const userKey = userId ? `app_notifications_${userId}` : 'app_notifications';
    
    const stored = localStorage.getItem(userKey);
    const notifications = stored ? JSON.parse(stored) : [];
    
    // Also get global notifications (for non-authenticated state)
    const globalStored = localStorage.getItem('app_notifications');
    const globalNotifications = globalStored ? JSON.parse(globalStored) : [];
    
    // Merge both, remove duplicates, sort by timestamp
    const allNotifications = [...notifications, ...globalNotifications]
      .filter((notif, index, arr) => arr.findIndex(n => n.id === notif.id) === index)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return allNotifications;
  } catch {
    return [];
  }
};

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

export const useNotifications = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(state => state.notifications.notifications);
  const readNotificationIds = useSelector(state => state.notifications.readNotificationIds);
  const hasUnreadNotifications = useSelector(state => state.notifications.hasUnreadNotifications);
  const unreadCount = useSelector(state => state.notifications.unreadCount);

  // Initialize notifications from localStorage - only run once
  const initializeNotificationsOnce = () => {
    const storedNotifications = getStoredNotifications();
    // Update time formats for stored notifications
    const updatedNotifications = storedNotifications.map(notif => ({
      ...notif,
      time: formatTimeAgo(notif.timestamp)
    }));
    dispatch(initializeNotifications(updatedNotifications));
  };

  // Add notification to Redux and localStorage
  const addNotificationToStore = (message, type = 'info') => {
    dispatch(addNotification({ message, type }));
  };

  // Remove notification from Redux and localStorage
  const removeNotificationFromStore = (id) => {
    dispatch(removeNotification(id));
  };

  // Mark notifications as read
  const markAsReadInStore = () => {
    dispatch(markAsRead());
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    dispatch(clearNotifications());
  };

  // Update time formats periodically
  const updateNotificationTimes = () => {
    const updatedNotifications = notifications.map(notif => ({
      ...notif,
      time: formatTimeAgo(notif.timestamp)
    }));
    dispatch(initializeNotifications(updatedNotifications));
  };

  return {
    notifications,
    addNotification: addNotificationToStore,
    removeNotification: removeNotificationFromStore,
    markAsRead: markAsReadInStore,
    clearNotifications: clearAllNotifications,
    hasUnreadNotifications,
    unreadCount,
    initializeNotifications: initializeNotificationsOnce,
    updateNotificationTimes
  };
};
