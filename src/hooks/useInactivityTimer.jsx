import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

export const useInactivityTimer = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const [showNotification, setShowNotification] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(10);

  // Check if user is logged in
  const isUserLoggedIn = useCallback(() => {
    return !!user; // Any logged-in user should be tracked
  }, [user]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Only set timer if user is logged in
    if (isUserLoggedIn()) {
      timeoutRef.current = setTimeout(() => {
        setShowNotification(true);
        setTimeRemaining(10);
        
        // Auto logout after 10 seconds of showing notification
        const logoutTimer = setTimeout(() => {
          dispatch(logout());
          window.location.href = '/login';
        }, 10000);
        
        timeoutRef.current = logoutTimer;
      }, INACTIVITY_TIMEOUT);
    }
  }, [dispatch, isUserLoggedIn]);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    resetTimer();
    setShowNotification(false);
  }, [resetTimer]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Tab is hidden, don't update activity
      return;
    }
    
    // Tab is visible again, update activity
    handleActivity();
  }, [handleActivity]);

  const handleLogoutNow = useCallback(() => {
    dispatch(logout());
    window.location.href = '/login';
    setShowNotification(false);
  }, [dispatch]);

  useEffect(() => {
    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click',
      'focus', 'blur', 'load'
    ];

    const handleUserActivity = (event) => {
      handleActivity();
    };

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Only initialize timer if user is logged in
    if (isUserLoggedIn()) {
      resetTimer();
    }

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleActivity, handleVisibilityChange, resetTimer, isUserLoggedIn]);

  // Return a function to manually reset the timer (useful for testing)
  return {
    resetTimer,
    handleActivity,
    showNotification,
    timeRemaining,
    handleLogoutNow,
    isUserLoggedIn: isUserLoggedIn()
  };
};
