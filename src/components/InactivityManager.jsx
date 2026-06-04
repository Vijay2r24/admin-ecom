import React from 'react';
import { useInactivityTimer } from '../hooks/useInactivityTimer';
import InactivityNotification from './InactivityNotification';

const InactivityManager = ({ children }) => {
  const {
    showNotification,
    timeRemaining,
    handleLogoutNow,
    handleContinueSession,
    isUserLoggedIn,
  } = useInactivityTimer();

  return (
    <>
      {children}
      <InactivityNotification
        isVisible={showNotification}
        onLogout={handleLogoutNow}
        onContinue={handleContinueSession}
        timeRemaining={timeRemaining}
        isUserInactive={false}
      />
    </>
  );
};

export default InactivityManager;
