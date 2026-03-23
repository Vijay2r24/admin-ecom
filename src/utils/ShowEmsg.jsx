import { toast } from "react-toastify";
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/slices/notificationSlice';

export const showEmsg = (
  message,
  type = "info",
  duration = 1400,
  onCloseCallback = null
) => {
  // Add to Redux store
  let notificationType = 'info';
  if (type === 'success' || type === 'SUCCESS') notificationType = 'success';
  else if (type === 'error' || type === 'ERROR') notificationType = 'error';
  else if (type === 'warning' || type === 'WARNING') notificationType = 'warning';
  
  const dispatch = useDispatch();
  dispatch(addNotification({ message, type: notificationType }));

  const safeDuration =
    typeof duration === "number" && duration > 0 ? duration : 3000;

  const options = {
    position: "top-right",
    autoClose: safeDuration,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    onClose: onCloseCallback || undefined,
  };

  switch (type) {
    case "success":
      return toast.success(message, options);
    case "error":
      return toast.error(message, options);
    case "info":
      return toast.info(message, options);
    case "warning":
      return toast.warn(message, options);
    default:
      return toast(message, options);
  }
};
