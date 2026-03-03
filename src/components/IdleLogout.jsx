import { useState, useEffect } from 'react';
import { AlertCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const IdleLogout = ({ 
  isLoggedIn, 
  onLogout
}) => {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Listen for API calls
    const handleApiCall = (event) => {
      setShowWarning(true);
    };
    window.addEventListener('triggerIdleLogout', handleApiCall);

    // Hide when logged out
    return () => {
      window.removeEventListener('triggerIdleLogout', handleApiCall);
    };
  }, [isLoggedIn]);

  // Show when logged in and API call detected
  if (!isLoggedIn || !showWarning) return null;

  return (
    <div 
      data-idle-logout="true"
      className="flex items-center gap-2 px-2 py-1 bg-orange-500 text-white rounded-md border border-orange-600"
    >
      <div className="flex items-center gap-1.5">
        <AlertCircle className="w-4 h-4 text-yellow-300 animate-pulse" />
        <span className="text-xs font-medium whitespace-nowrap">
          Your permissions is updated please logout
        </span>
      </div>
      
      <button
        onClick={() => {
          onLogout();
          navigate("/");
        }}
        className="flex items-center px-2 py-0.5 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors duration-200"
      >
        <LogOut className="w-3 h-3" />
      </button>
    </div>
  );
};

export default IdleLogout;
