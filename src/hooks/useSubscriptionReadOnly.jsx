import { useEffect, useState } from "react";
import {
  isSubscriptionReadOnlyMode,
} from "../utils/planAccessUtils";
import { WINDOW_CUSTOM_EVENTS } from "../contants/constants";

/**
 * Reacts to `customCode` 1005 (read-only subscription) set via ApiUtils + localStorage.
 */
export function useSubscriptionReadOnly() {
  const [readOnly, setReadOnly] = useState(() => isSubscriptionReadOnlyMode());

  useEffect(() => {
    const sync = () => setReadOnly(isSubscriptionReadOnlyMode());
    window.addEventListener(
      WINDOW_CUSTOM_EVENTS.SUBSCRIPTION_READ_ONLY_CHANGED,
      sync
    );
    return () => {
      window.removeEventListener(
        WINDOW_CUSTOM_EVENTS.SUBSCRIPTION_READ_ONLY_CHANGED,
        sync
      );
    };
  }, []);

  return readOnly;
}
