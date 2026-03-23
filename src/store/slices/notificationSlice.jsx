import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notifications: [],
  readNotificationIds: [],
  hasUnreadNotifications: false,
  unreadCount: 0
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const newNotification = {
        id: Date.now() + Math.random(),
        title: action.payload.message,
        type: action.payload.type || 'info',
        time: 'Just now',
        timestamp: new Date().toISOString()
      };

      // Add to notifications
      state.notifications = [newNotification, ...state.notifications.slice(0, 49)];
      
      // New notification is unread by default
      state.hasUnreadNotifications = true;
      
      // Update unread count
      state.unreadCount = state.notifications.filter(n => !state.readNotificationIds.includes(n.id)).length;
      
      // Save to localStorage
      try {
        const userId = localStorage.getItem('userId');
        const userKey = userId ? `app_notifications_${userId}` : 'app_notifications';
        const latestNotifications = state.notifications.slice(0, 50);
        localStorage.setItem(userKey, JSON.stringify(latestNotifications));
        localStorage.setItem('app_notifications', JSON.stringify(latestNotifications));
      } catch {
        // Silently fail if localStorage is full
      }
    },
    
    removeNotification: (state, action) => {
      const notificationId = action.payload;
      state.notifications = state.notifications.filter(n => n.id !== notificationId);
      
      // Update unread count
      state.unreadCount = state.notifications.filter(n => !state.readNotificationIds.includes(n.id)).length;
      state.hasUnreadNotifications = state.unreadCount > 0;
      
      // Save to localStorage
      try {
        const userId = localStorage.getItem('userId');
        const userKey = userId ? `app_notifications_${userId}` : 'app_notifications';
        const latestNotifications = state.notifications.slice(0, 50);
        localStorage.setItem(userKey, JSON.stringify(latestNotifications));
        localStorage.setItem('app_notifications', JSON.stringify(latestNotifications));
      } catch {
        // Silently fail if localStorage is full
      }
    },
    
    markAsRead: (state) => {
      const currentNotificationIds = state.notifications.map(n => n.id);
      state.readNotificationIds = [...new Set([...state.readNotificationIds, ...currentNotificationIds])];
      state.hasUnreadNotifications = false;
      state.unreadCount = 0;
      
      // Save to localStorage
      try {
        localStorage.setItem('read_notification_ids', JSON.stringify(state.readNotificationIds));
      } catch {
        // Silently fail if localStorage is full
      }
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
      state.readNotificationIds = [];
      state.hasUnreadNotifications = false;
      state.unreadCount = 0;
      
      // Clear from localStorage
      try {
        const userId = localStorage.getItem('userId');
        const userKey = userId ? `app_notifications_${userId}` : 'app_notifications';
        localStorage.removeItem(userKey);
        localStorage.removeItem('app_notifications');
        localStorage.removeItem('read_notification_ids');
      } catch {
        // Silently fail if localStorage is full
      }
    },
    
    initializeNotifications: (state, action) => {
      const notifications = action.payload;
      state.notifications = notifications;
      
      // Load read notification IDs from localStorage
      try {
        const readIds = localStorage.getItem('read_notification_ids');
        if (readIds) {
          state.readNotificationIds = JSON.parse(readIds);
        }
      } catch {
        state.readNotificationIds = [];
      }
      
      // Calculate unread notifications
      state.unreadCount = state.notifications.filter(n => !state.readNotificationIds.includes(n.id)).length;
      state.hasUnreadNotifications = state.unreadCount > 0;
    }
  }
});

export const { addNotification, removeNotification, markAsRead, clearNotifications, initializeNotifications } = notificationSlice.actions;

export default notificationSlice.reducer;
