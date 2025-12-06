import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function IdleLogout({
  isLoggedIn,
  onLogout,
  timeout = 15 * 60 * 1000 // 15 minutes
}) {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const warningShownRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) return;

    const warningTime = timeout - 10 * 1000; 
    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"];

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      warningShownRef.current = false;

      timerRef.current = setTimeout(() => {
        if (!warningShownRef.current) {
          toast.warning("⚠ You will be logged out in 10 seconds due to inactivity.", {
            autoClose: 5000,
          });
          warningShownRef.current = true;
        }

        setTimeout(() => {
          onLogout();
          navigate("/");
        }, 10000); // logout after 10s
      }, warningTime);
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
