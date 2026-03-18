import { toast } from "react-toastify";

// localStorage key for notifications
const NOTIFICATIONS_STORAGE_KEY = 'app_notifications';

// Helper functions for localStorage with user-specific storage
const getStoredNotifications = () => {
  try {
    // Try to get user-specific notifications first
    const userId = localStorage.getItem('userId');
    const userKey = userId ? `${NOTIFICATIONS_STORAGE_KEY}_${userId}` : NOTIFICATIONS_STORAGE_KEY;
    
    const stored = localStorage.getItem(userKey);
    const notifications = stored ? JSON.parse(stored) : [];
    
    // Also get global notifications (for non-authenticated state)
    const globalStored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
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

const saveNotificationsToStorage = (notifications) => {
  try {
    const userId = localStorage.getItem('userId');
    const userKey = userId ? `${NOTIFICATIONS_STORAGE_KEY}_${userId}` : NOTIFICATIONS_STORAGE_KEY;
    
    // Save only the latest 50 notifications
    const latestNotifications = notifications.slice(0, 50);
    localStorage.setItem(userKey, JSON.stringify(latestNotifications));
    
    // Also save to global key for persistence across sessions
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(latestNotifications));
  } catch {
    // Silently fail if localStorage is full
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

// Function to add notification directly to localStorage
const addNotificationToStorage = (message, type = 'info') => {
  const newNotification = {
    id: Date.now() + Math.random(),
    title: message,
    type: type,
    time: 'Just now',
    timestamp: new Date().toISOString()
  };

  const currentNotifications = getStoredNotifications();
  const updatedNotifications = [newNotification, ...currentNotifications.slice(0, 49)];
  
  // Update time formats
  const finalNotifications = updatedNotifications.map((notif, index) => ({
    ...notif,
    time: index === 0 ? 'Just now' : formatTimeAgo(notif.timestamp)
  }));

  saveNotificationsToStorage(finalNotifications);
  
  // Dispatch custom event to notify components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notificationAdded', { 
      detail: { notification: newNotification, all: finalNotifications } 
    }));
  }

  // Removed auto-dismiss functionality - notifications now stay until manually dismissed
};

const removeNotificationFromStorage = (id) => {
  const currentNotifications = getStoredNotifications();
  const updatedNotifications = currentNotifications.filter(notif => notif.id !== id);
  saveNotificationsToStorage(updatedNotifications);
  
  // Dispatch custom event to notify components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notificationRemoved', { 
      detail: { removedId: id, all: updatedNotifications } 
    }));
  }
};

export const showEmsg = (
  message,
  type = "info",
  duration = 1400,
  onCloseCallback = null
) => {
  // Add to localStorage notifications with timestamp
  let notificationType = 'info';
  if (type === 'success' || type === 'SUCCESS') notificationType = 'success';
  else if (type === 'error' || type === 'ERROR') notificationType = 'error';
  else if (type === 'warning' || type === 'WARNING') notificationType = 'warning';
  
  addNotificationToStorage(message, notificationType);

  const safeDuration =
    typeof duration === "number" && duration > 0 ? duration : 3000;

  const options = {
    position: "top-right",
    autoClose: safeDuration,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    onClose: onCloseCallback || undefined,
  };

  switch (type) {
    case "success":
      return toast.success(message, options);
    case "error":
      return toast.error(message, options);
    case "info":
      return toast.info(message, options);
    case "warning":
      return toast.warn(message, options);
    default:
      return toast(message, options);
  }
};

// Export utility functions for direct use
export const getNotifications = getStoredNotifications;
export const clearNotifications = () => {
  const userId = localStorage.getItem('userId');
  const userKey = userId ? `${NOTIFICATIONS_STORAGE_KEY}_${userId}` : NOTIFICATIONS_STORAGE_KEY;
  localStorage.removeItem(userKey);
  localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
  
  // Dispatch custom event to notify components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notificationsCleared'));
  }
};
