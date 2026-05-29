import { useState, useEffect } from 'react';
import { AlertCircle, LogOut, X, ShieldOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';

const IdleLogout = ({ isLoggedIn, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showWarning, setShowWarning] = useState(false);
  const [message, setMessage] = useState('');
  const [isDeactivated, setIsDeactivated] = useState(false);

  useEffect(() => {
    const handleTrigger = (event) => {
      const msg = event?.detail?.message || '';
      const deactivated =
        msg.toLowerCase().includes('deactivated') ||
        msg.toLowerCase().includes('inactive');
      setMessage(msg || (deactivated
        ? 'Your account has been deactivated. Please contact an administrator.'
        : 'Your permissions have been updated. Please log out and log in again.'));
      setIsDeactivated(deactivated);
      setShowWarning(true);
    };
    window.addEventListener('triggerIdleLogout', handleTrigger);
    return () => window.removeEventListener('triggerIdleLogout', handleTrigger);
  }, []);

  // Hide on login page
  useEffect(() => {
    const isLoginPage = location.pathname === '/' || location.pathname === '/login';
    if (isLoginPage) setShowWarning(false);
  }, [location.pathname]);

  if (!showWarning) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999]"
      style={{ animation: 'slideDown 0.3s ease-out' }}
    >
      <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border min-w-[340px] max-w-lg text-white
        ${isDeactivated ? 'bg-red-600 border-red-500' : 'bg-orange-500 border-orange-400'}`}
      >
        {isDeactivated
          ? <ShieldOff className="w-5 h-5 text-red-200 flex-shrink-0 mt-0.5" />
          : <AlertCircle className="w-5 h-5 text-yellow-200 animate-pulse flex-shrink-0 mt-0.5" />
        }
        <span className="text-sm font-medium flex-1 leading-snug">{message}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              setShowWarning(false);
              onLogout();
              navigate('/');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${isDeactivated ? 'bg-red-800 hover:bg-red-900' : 'bg-red-600 hover:bg-red-700'}`}
          >
            <LogOut className="w-3.5 h-3.5" />
            {isDeactivated ? 'OK' : 'Logout'}
          </button>
          <button
            onClick={() => setShowWarning(false)}
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IdleLogout;
