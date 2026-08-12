import { useState, useEffect, useRef, useCallback } from "react";
import { permissionIdsInclude } from "../utils/permissionUtils";
import {
  isUserCreateLimitBlocked,
  isSubscriptionReadOnlyMode,
  clearUserCreateLimitBlocked,
  getPlanResourceLimit,
  getPlanResourceUsage,
} from "../utils/planAccessUtils";
import { showEmsg } from "../utils/ShowEmsg";
import { WINDOW_CUSTOM_EVENTS } from "../contants/constants";
import {
  validateCreateAction,
  CREATE_ACTION_VALIDATION_RESULTS,
} from "../utils/createActionUtils";

/**
 * Reads from localStorage whether the given permissionCode is present in
 * the user's PermissionIDs, and whether any global create-limit block is active.
 *
 * @param {string|null} permissionCode
 *   The PermissionID UUID (returned by `getPermissionCode`) to check.
 *   Pass `null` to skip the permission check (always allowed).
 *
 * @param {object} [options]
 * @param {string} [options.noPermissionMsg]   Toast shown when permission is missing.
 * @param {string} [options.limitReachedMsg]   Toast shown when creation limit is hit.
 * @param {string} [options.readOnlyMsg]       Toast shown when subscription is read-only.
 * @param {string} [options.actionType]        Optional key from `CREATE_ACTION_TYPES` for plan + quota checks.
 * @param {string} [options.planNotAvailableMsg] Toast when the module is not on the current plan.
 *
 * @returns {{
 *   canCreate: boolean,
 *   disabledReason: string,
 *   showBlockedToast: () => void,
 *   isProcessing: boolean,
 *   startProcessing: () => void,
 *   stopProcessing: () => void,
 * }}
 */
export function useCreateAccess(permissionCode, options = {}) {
  const {
    noPermissionMsg = "You do not have permission to perform this action.",
    limitReachedMsg = "You have reached your creation limit. Please upgrade your plan to continue.",
    readOnlyMsg = "Your subscription is in read-only mode. Please renew or upgrade your plan.",
    actionType = null,
    planNotAvailableMsg = "This feature is not included in your current plan.",
    resourceKey,
    resourceLabel,
    currentUsage,
  } = options;

  // ── Read state from localStorage ──────────────────────────────────
  const readState = useCallback(() => {
    // 1. Subscription read-only (no creates allowed)
    if (isSubscriptionReadOnlyMode()) {
      return { canCreate: false, reason: readOnlyMsg };
    }

    // 2. Plan module + numeric limits (products, users, etc.)
    if (actionType) {
      const planValidation = validateCreateAction(actionType);
      if (!planValidation.canCreate) {
        if (
          planValidation.status === CREATE_ACTION_VALIDATION_RESULTS.PLAN_NOT_AVAILABLE
        ) {
          return { canCreate: false, reason: planNotAvailableMsg };
        }
        if (
          planValidation.status === CREATE_ACTION_VALIDATION_RESULTS.LIMIT_EXCEEDED
        ) {
          return { canCreate: false, reason: limitReachedMsg };
        }
        if (
          planValidation.status === CREATE_ACTION_VALIDATION_RESULTS.NO_PERMISSION
        ) {
          return { canCreate: false, reason: noPermissionMsg };
        }
      }
    } else if (!actionType && isUserCreateLimitBlocked()) {
      return { canCreate: false, reason: limitReachedMsg };
    }

    // 3. Permission check (skip if no code provided → always allowed)
    if (permissionCode != null) {
      let permissionIDs = [];
      try {
        permissionIDs = JSON.parse(localStorage.getItem("PermissionIDs") || "[]");
      } catch { /* ignore */ }

      if (!permissionIdsInclude(permissionIDs, permissionCode)) {
        return { canCreate: false, reason: noPermissionMsg };
      }
    }

    return { canCreate: true, reason: "" };
  }, [
    permissionCode,
    noPermissionMsg,
    limitReachedMsg,
    readOnlyMsg,
    actionType,
    planNotAvailableMsg,
  ]);

  const [state, setState] = useState(readState);

  // Sync whenever permission storage or limit flags change
  useEffect(() => {
    const sync = () => setState(readState());

    window.addEventListener(WINDOW_CUSTOM_EVENTS.PERMISSIONS_STORAGE_CHANGED, sync);
    window.addEventListener(WINDOW_CUSTOM_EVENTS.SUBSCRIPTION_READ_ONLY_CHANGED, sync);
    window.addEventListener(WINDOW_CUSTOM_EVENTS.SUBSCRIPTION_STORAGE_CHANGED, sync);
    // USER_CREATE_LIMIT_CHANGED may not be in older builds of the constant, use the string directly
    window.addEventListener(
      WINDOW_CUSTOM_EVENTS.USER_CREATE_LIMIT_CHANGED || "userCreateLimitChanged",
      sync
    );
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(WINDOW_CUSTOM_EVENTS.PERMISSIONS_STORAGE_CHANGED, sync);
      window.removeEventListener(WINDOW_CUSTOM_EVENTS.SUBSCRIPTION_READ_ONLY_CHANGED, sync);
      window.removeEventListener(WINDOW_CUSTOM_EVENTS.SUBSCRIPTION_STORAGE_CHANGED, sync);
      window.removeEventListener(
        WINDOW_CUSTOM_EVENTS.USER_CREATE_LIMIT_CHANGED || "userCreateLimitChanged",
        sync
      );
      window.removeEventListener("storage", sync);
    };
  }, [readState]);

  // Also re-read when the permissionCode prop itself changes
  useEffect(() => {
    setState(readState());
  }, [readState]);

  // ── Processing lock — prevents duplicate API calls on rapid clicks ─
  const processingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const startProcessing = useCallback(() => {
    processingRef.current = true;
    setIsProcessing(true);
  }, []);

  const stopProcessing = useCallback(() => {
    processingRef.current = false;
    setIsProcessing(false);
  }, []);

  /**
   * Call this after a SUCCESSFUL create API response to:
   * - clear any create-limit block (backend accepted the create, so limit isn't hit)
   * - release the processing lock
   */
  const onCreateSuccess = useCallback(() => {
    clearUserCreateLimitBlocked();
    processingRef.current = false;
    setIsProcessing(false);
  }, []);

  // ── Toast helper ───────────────────────────────────────────────────
  const showBlockedToast = useCallback(() => {
    if (state.reason) {
      if (resourceKey) {
        const limit = getPlanResourceLimit(resourceKey);
        const used = currentUsage != null ? currentUsage : getPlanResourceUsage(resourceKey);
        const remaining = Math.max(0, limit - used);
        const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
        const isExhausted = used >= limit;

        import("../components/PlanLimitToast").then(({ showPlanLimitToast }) => {
          showPlanLimitToast({
            resourceKey,
            label: resourceLabel || resourceKey,
            limit,
            used,
            remaining,
            percent,
            isExhausted,
          });
        });
      } else {
        showEmsg(state.reason, "warning", 4000);
      }
    }
  }, [state.reason, resourceKey, resourceLabel, currentUsage]);

  return {
    /** true when the user is allowed to create (permission + limit both clear) */
    canCreate: state.canCreate,
    /** Human-readable reason why create is blocked (empty string if allowed) */
    disabledReason: state.reason,
    /** Call this to show a toast explaining why create is blocked */
    showBlockedToast,
    /** true while a create API call is in flight (rapid-click protection) */
    isProcessing,
    /** Call before starting the create API request */
    startProcessing,
    /** Call after the create API request finishes (success OR failure) */
    stopProcessing,
    /** Call after a SUCCESSFUL create to clear limit block and release the processing lock */
    onCreateSuccess,
  };
}

export default useCreateAccess;
