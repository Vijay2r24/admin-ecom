import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { INACTIVITY_NOTIFICATION } from '../contants/constants';
import { useTranslation } from 'react-i18next';

const InactivityNotification = ({ isVisible, onLogout, timeRemaining = 10, isUserInactive = false }) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(timeRemaining);

  useEffect(() => {
    if (isVisible && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isVisible, countdown, onLogout]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isUserInactive ? t(INACTIVITY_NOTIFICATION.TITLES.ACCOUNT_INACTIVE.labelKey) : t(INACTIVITY_NOTIFICATION.TITLES.SESSION_TIMEOUT_WARNING.labelKey)}
          </h3>
          <button
            onClick={() => onLogout()}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="text-center">
          <p className="text-gray-700 mb-4">
            {isUserInactive 
              ? t(INACTIVITY_NOTIFICATION.MESSAGES.ACCOUNT_INACTIVE.labelKey)
              : t(INACTIVITY_NOTIFICATION.MESSAGES.SESSION_TIMEOUT.labelKey)
            }
          </p>
          
          <div className="text-3xl font-bold text-red-600 mb-2">
            {countdown}
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            {t(INACTIVITY_NOTIFICATION.SECOND_LABEL.labelKey)}
          </p>
          
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onLogout()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
            >
              {t(INACTIVITY_NOTIFICATION.BUTTONS.LOGOUT_NOW.labelKey)}
            </button>
            {!isUserInactive && (
              <button
                onClick={() => setCountdown(timeRemaining)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md transition-colors"
              >
                {t(INACTIVITY_NOTIFICATION.BUTTONS.CONTINUE_SESSION.labelKey)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InactivityNotification;
