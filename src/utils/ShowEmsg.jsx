import { toast } from "react-toastify";
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/slices/notificationSlice';
import { DATA_TYPES, NOTIFICATION_TYPES } from '../contants/constants';

export const showEmsg = (
  message,
  type = "info",
  duration = 1400,
  onCloseCallback = null
) => {
  // Add to Redux store
  let notificationType = NOTIFICATION_TYPES.INFO;
  if (type === NOTIFICATION_TYPES.SUCCESS || type === NOTIFICATION_TYPES.SUCCESS.toUpperCase()) notificationType = NOTIFICATION_TYPES.SUCCESS;
  else if (type === NOTIFICATION_TYPES.ERROR || type === NOTIFICATION_TYPES.ERROR.toUpperCase()) notificationType = NOTIFICATION_TYPES.ERROR;
  else if (type === NOTIFICATION_TYPES.WARNING || type === NOTIFICATION_TYPES.WARNING.toUpperCase()) notificationType = NOTIFICATION_TYPES.WARNING;

  const dispatch = useDispatch();
  dispatch(addNotification({ message, type: notificationType }));

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

  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return toast.success(message, options);
    case NOTIFICATION_TYPES.ERROR:
      return toast.error(message, options);
    case NOTIFICATION_TYPES.INFO:
      return toast.info(message, options);
    case NOTIFICATION_TYPES.WARNING:
      return toast.warn(message, options);
    default:
      return toast(message, options);
  }
};
