import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_COUNTDOWN_SECONDS = 30;       // Countdown shown before auto-logout

export const useInactivityTimer = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  // Treat user as logged in if Redux user is set OR a token exists in localStorage.
  // This handles the case where the page is refreshed and Redux is not yet rehydrated
  // but the session token is still valid.
  const isLoggedIn = !!user || !!localStorage.getItem('token');

  // All mutable state lives in refs so callbacks never go stale
  const inactivityTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);
  const isLoggingOutRef = useRef(false);
  const showNotificationRef = useRef(false);
  const dispatchRef = useRef(dispatch);

  // Keep dispatchRef current without triggering re-renders
  dispatchRef.current = dispatch;

  const [showNotification, setShowNotification] = useState(false);

  // ── Helpers (stable — use only refs, no closure over changing values) ──

  const clearAllTimers = useCallback(() => {
    clearTimeout(inactivityTimeoutRef.current);
    clearTimeout(logoutTimeoutRef.current);
    inactivityTimeoutRef.current = null;
    logoutTimeoutRef.current = null;
  }, []);

  const performLogout = useCallback(() => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    clearAllTimers();
    showNotificationRef.current = false;
    setShowNotification(false);
    dispatchRef.current(logout());
    // Use replace so the browser back button doesn't return to a protected page
    window.location.replace('/');
  }, [clearAllTimers]);

  const resetTimer = useCallback(() => {
    if (isLoggingOutRef.current) return;
    if (!localStorage.getItem('token')) return; // Not logged in

    clearAllTimers();
    showNotificationRef.current = false;
    setShowNotification(false);

    inactivityTimeoutRef.current = setTimeout(() => {
      // 15 minutes idle — show warning
      showNotificationRef.current = true;
      setShowNotification(true);

      // Auto-logout after countdown expires
      logoutTimeoutRef.current = setTimeout(() => {
        performLogout();
      }, WARNING_COUNTDOWN_SECONDS * 1000);
    }, INACTIVITY_TIMEOUT);
  }, [clearAllTimers, performLogout]);

  // ── Public API ──────────────────────────────────────────────────────────

  const handleActivity = useCallback(() => {
    if (isLoggingOutRef.current) return;
    if (showNotificationRef.current) return; // Don't reset while warning is visible
    resetTimer();
  }, [resetTimer]);

  const handleContinueSession = useCallback(() => {
    if (isLoggingOutRef.current) return;
    resetTimer(); // Restarts the full 15-min idle timer
  }, [resetTimer]);

  const handleLogoutNow = useCallback(() => {
    performLogout();
  }, [performLogout]);

  // ── Effect: attach/detach listeners only when login state changes ───────

  useEffect(() => {
    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll',
      'touchstart', 'click', 'focus',
    ];

    const onActivity = () => {
      if (isLoggingOutRef.current) return;
      if (showNotificationRef.current) return;
      resetTimer();
    };

    const onVisibilityChange = () => {
      if (!document.hidden) onActivity();
    };

    events.forEach(e => document.addEventListener(e, onActivity, true));
    document.addEventListener('visibilitychange', onVisibilityChange);

    if (isLoggedIn) {
      // User is logged in (via Redux or token in localStorage after page refresh)
      isLoggingOutRef.current = false;
      resetTimer(); // Start the idle countdown
    } else {
      clearAllTimers(); // User logged out — stop timers
    }

    return () => {
      events.forEach(e => document.removeEventListener(e, onActivity, true));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearAllTimers();
    };
  }, [isLoggedIn]); // Re-run when login state changes (covers page refresh case too)
  // resetTimer and clearAllTimers are stable (no changing deps), safe to omit

  return {
    showNotification,
    timeRemaining: WARNING_COUNTDOWN_SECONDS,
    handleLogoutNow,
    handleContinueSession,
    handleActivity,
    resetTimer,
    isUserLoggedIn: isLoggedIn,
  };
};
