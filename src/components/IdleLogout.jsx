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
    console.log("IdleLogout useEffect - isLoggedIn:", isLoggedIn);
    
    // Listen for API calls
    const handleApiCall = (event) => {
      console.log("=== IDLE LOGOUT EVENT RECEIVED ===");
      console.log("Event:", event);
      console.log("Event type:", event.type);
      console.log("Event detail:", event.detail);
      console.log("About to setShowWarning(true)");
      setShowWarning(true);
    };

    // Listen for custom event from API
    console.log("Adding triggerIdleLogout listener");
    window.addEventListener('triggerIdleLogout', handleApiCall);

    // Hide when logged out
    return () => {
      console.log("IdleLogout cleanup - removing listener");
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
