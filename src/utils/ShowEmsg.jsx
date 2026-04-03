import { toast } from "react-toastify";
import { addNotification } from '../store/slices/notificationSlice';
import { DATA_TYPES, NOTIFICATION_TYPES } from '../contants/constants';
import { store } from '../store/index';

export const showEmsg = (
  message,
  type = "info",
  duration = 1400,
  onCloseCallback = null
) => {
  // Convert type to uppercase for consistent comparison
  const normalizedType = type?.toUpperCase();
  
  // Determine notification type
  let notificationType = NOTIFICATION_TYPES.INFO;
  if (normalizedType === NOTIFICATION_TYPES.SUCCESS.toUpperCase()) {
    notificationType = NOTIFICATION_TYPES.SUCCESS;
  } else if (normalizedType === NOTIFICATION_TYPES.ERROR.toUpperCase()) {
    notificationType = NOTIFICATION_TYPES.ERROR;
  } else if (normalizedType === NOTIFICATION_TYPES.WARNING.toUpperCase()) {
    notificationType = NOTIFICATION_TYPES.WARNING;
  }

  const safeDuration =
    typeof duration === DATA_TYPES.NUMBER && duration > 0 ? duration : 3000;

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

  // Show toast first
  let toastResult;
  switch (notificationType) {
    case NOTIFICATION_TYPES.SUCCESS:
      toastResult = toast.success(message, options);
      break;
    case NOTIFICATION_TYPES.ERROR:
      toastResult = toast.error(message, options);
      break;
    case NOTIFICATION_TYPES.INFO:
      toastResult = toast.info(message, options);
      break;
    case NOTIFICATION_TYPES.WARNING:
      toastResult = toast.warn(message, options);
      break;
    default:
      toastResult = toast(message, options);
  }

  // Add to Redux store using store.dispatch directly
  store.dispatch(addNotification({ message, type: notificationType }));

  return toastResult;
};
