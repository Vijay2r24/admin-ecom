import React from 'react';
import { useInactivityTimer } from '../hooks/useInactivityTimer';
import InactivityNotification from './InactivityNotification';

const InactivityManager = ({ children }) => {
  const { showNotification, timeRemaining, handleLogoutNow, isUserLoggedIn } = useInactivityTimer();

  return (
    <>
      {children}
      <InactivityNotification
        isVisible={showNotification}
        onLogout={handleLogoutNow}
        timeRemaining={timeRemaining}
        isUserInactive={false}
      />
    </>
  );
};

export default InactivityManager;
