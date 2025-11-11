import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function IdleLogout({
  isLoggedIn,
  onLogout,
  timeout = 15 * 60 * 1000
}) {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"];

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onLogout();
        setTimeout(() => navigate("/"), 100);
      }, timeout);
    };

    resetTimer();
    events.forEach((e) => window.addEventListener(e, resetTimer));

    return () => {
      clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [isLoggedIn, onLogout, navigate, timeout]);

  return null; 
}
