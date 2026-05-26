import { toast } from 'react-toastify';
import { getPermissionCode, permissionIdsInclude, hasPermissionId } from './permissionUtils';
import { MODULES, PERMISSIONS, PLAN_FEATURE_TOKEN } from '../contants/constants';
import {
  isFeatureTokenAllowedByPlan,
  isProductCreateLimitBlocked,
  isUserCreateLimitBlocked,
} from './planAccessUtils';

const CREATE_LIMIT_CHECKS = {
  isUserCreateLimitBlocked,
  isProductCreateLimitBlocked,
};

/**
 * Centralized validation result for create actions
 */
export const CREATE_ACTION_VALIDATION_RESULTS = {
  ALLOWED: 'allowed',
  NO_PERMISSION: 'no_permission',
  LIMIT_EXCEEDED: 'limit_exceeded',
  PLAN_NOT_AVAILABLE: 'plan_not_available',
  UNKNOWN_ERROR: 'unknown_error'
};

/**
 * Create action types with their corresponding modules and permissions
 */
export const CREATE_ACTION_TYPES = {
  USER: {
    module: MODULES.USER,
    permission: PERMISSIONS.ADD_USER,
    featureToken: 'users',
    limitCheck: 'isUserCreateLimitBlocked'
  },
  PRODUCT: {
    module: MODULES.PRODUCT,
    permission: PERMISSIONS.CREATE_PRODUCT,
    featureToken: PLAN_FEATURE_TOKEN.PRODUCTS,
    limitCheck: 'isProductCreateLimitBlocked',
  },
  STORE: {
    module: MODULES.STORE,
    permission: PERMISSIONS.ADD_STORE,
    featureToken: 'stores',
    limitCheck: 'isStoreCreateLimitBlocked'
  },
  BANNER: {
    module: MODULES.BANNER,
    permission: PERMISSIONS.CREATE_BANNER,
    featureToken: 'banners',
    limitCheck: 'isBannerCreateLimitBlocked'
  },
  BRAND: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.ADD_BRAND,
    featureToken: 'product_setup_brands',
    limitCheck: 'isBrandCreateLimitBlocked'
  },
  CATEGORY: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.ADD_CATEGORY,
    featureToken: 'product_setup_categories',
    limitCheck: 'isCategoryCreateLimitBlocked'
  },
  ATTRIBUTE: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.ADD_ATTRIBUTE,
    featureToken: 'product_setup_attributes',
    limitCheck: 'isAttributeCreateLimitBlocked'
  },
  ATTRIBUTE_TYPE: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.ADD_ATTRIBUTE_TYPE,
    featureToken: 'product_setup_attribute_types',
    limitCheck: 'isAttributeTypeCreateLimitBlocked'
  },
  COLOR: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.ADD_COLOUR,
    featureToken: 'product_setup_colors',
    limitCheck: 'isColorCreateLimitBlocked'
  },
  PRODUCT_GROUP: {
    module: MODULES.PRODUCT_SETUP,
    permission: PERMISSIONS.ADD_PRODUCT_GROUP,
    featureToken: 'product_setup_specification_types',
    limitCheck: 'isProductGroupCreateLimitBlocked'
  },
  ROLE: {
    module: MODULES.ROLE,
    permission: PERMISSIONS.ADD_ROLE,
    featureToken: 'roles',
    limitCheck: 'isRoleCreateLimitBlocked'
  }
};

/**
 * Toast messages for create action validation
 */
export const CREATE_ACTION_TOAST_MESSAGES = {
  [CREATE_ACTION_VALIDATION_RESULTS.NO_PERMISSION]: {
    title: 'Permission Denied',
    message: 'You do not have permission to create this item.',
    type: 'error'
  },
  [CREATE_ACTION_VALIDATION_RESULTS.LIMIT_EXCEEDED]: {
    title: 'Limit Reached',
    message: 'You have reached your plan limit. Please upgrade to continue.',
    type: 'error'
  },
  [CREATE_ACTION_VALIDATION_RESULTS.PLAN_NOT_AVAILABLE]: {
    title: 'Feature Not Available',
    message: 'This feature is not available in your current plan.',
    type: 'error'
  },
  [CREATE_ACTION_VALIDATION_RESULTS.UNKNOWN_ERROR]: {
    title: 'Validation Error',
    message: 'Unable to validate create permissions. Please try again.',
    type: 'error'
  }
};

/**
 * Validates if the user has permission to create a specific action type
 * @param {string} actionType - The action type from CREATE_ACTION_TYPES
 * @returns {boolean} - Whether the user has permission
 */
export function hasCreatePermission(actionType) {
  try {
    const actionConfig = CREATE_ACTION_TYPES[actionType];
    if (!actionConfig) {
      console.error(`Unknown action type: ${actionType}`);
      return false;
    }

    const permissionCode = getPermissionCode(actionConfig.module, actionConfig.permission);
    if (!permissionCode) {
      console.error(`Permission code not found for ${actionConfig.module}:${actionConfig.permission}`);
      return false;
    }

    return hasPermissionId(permissionCode);
  } catch (error) {
    console.error('Error checking create permission:', error);
    return false;
  }
}

/**
 * Validates if the user has reached their creation limit for a specific action type
 * @param {string} actionType - The action type from CREATE_ACTION_TYPES
 * @returns {boolean} - Whether the limit is exceeded
 */
export function isCreateLimitExceeded(actionType) {
  try {
    const actionConfig = CREATE_ACTION_TYPES[actionType];
    if (!actionConfig) {
      console.error(`Unknown action type: ${actionType}`);
      return false;
    }

    const limitFn = actionConfig.limitCheck
      ? CREATE_LIMIT_CHECKS[actionConfig.limitCheck]
      : null;
    if (typeof limitFn === 'function') {
      return limitFn();
    }

    return false;
  } catch (error) {
    console.error('Error checking create limit:', error);
    return false;
  }
}

/**
 * Validates if the feature is available in the user's current plan
 * @param {string} actionType - The action type from CREATE_ACTION_TYPES
 * @returns {boolean} - Whether the feature is available
 */
export function isFeatureAvailableInPlan(actionType) {
  try {
    const actionConfig = CREATE_ACTION_TYPES[actionType];
    if (!actionConfig) {
      console.error(`Unknown action type: ${actionType}`);
      return false;
    }

    const featureToken = actionConfig.featureToken;
    if (!featureToken) {
      return true;
    }

    return isFeatureTokenAllowedByPlan(featureToken);
  } catch (error) {
    console.error('Error checking plan availability:', error);
    return false;
  }
}

/**
 * Comprehensive validation for create actions
 * @param {string} actionType - The action type from CREATE_ACTION_TYPES
 * @returns {Object} - Validation result with status and details
 */
export function validateCreateAction(actionType) {
  try {
    // Check permission first
    if (!hasCreatePermission(actionType)) {
      return {
        status: CREATE_ACTION_VALIDATION_RESULTS.NO_PERMISSION,
        canCreate: false,
        message: CREATE_ACTION_TOAST_MESSAGES[CREATE_ACTION_VALIDATION_RESULTS.NO_PERMISSION]
      };
    }

    // Check plan availability
    if (!isFeatureAvailableInPlan(actionType)) {
      return {
        status: CREATE_ACTION_VALIDATION_RESULTS.PLAN_NOT_AVAILABLE,
        canCreate: false,
        message: CREATE_ACTION_TOAST_MESSAGES[CREATE_ACTION_VALIDATION_RESULTS.PLAN_NOT_AVAILABLE]
      };
    }

    // Check creation limits
    if (isCreateLimitExceeded(actionType)) {
      return {
        status: CREATE_ACTION_VALIDATION_RESULTS.LIMIT_EXCEEDED,
        canCreate: false,
        message: CREATE_ACTION_TOAST_MESSAGES[CREATE_ACTION_VALIDATION_RESULTS.LIMIT_EXCEEDED]
      };
    }

    // All checks passed
    return {
      status: CREATE_ACTION_VALIDATION_RESULTS.ALLOWED,
      canCreate: true,
      message: null
    };
  } catch (error) {
    console.error('Error validating create action:', error);
    return {
      status: CREATE_ACTION_VALIDATION_RESULTS.UNKNOWN_ERROR,
      canCreate: false,
      message: CREATE_ACTION_TOAST_MESSAGES[CREATE_ACTION_VALIDATION_RESULTS.UNKNOWN_ERROR]
    };
  }
}

/**
 * Shows appropriate toast message based on validation result
 * @param {Object} validationResult - Result from validateCreateAction
 * @param {Function} t - Translation function from useTranslation
 */
export function showCreateActionToast(validationResult, t) {
  if (!validationResult.message) return;

  const { title, message, type } = validationResult.message;
  
  if (t && typeof t === 'function') {
    // Use translation keys if available
    const translationKey = `CREATE_ACTION.${validationResult.status.toUpperCase()}`;
    const translatedMessage = t(translationKey, message);
    toast[type](translatedMessage, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
    });
  } else {
    // Fallback to direct message
    toast[type](`${title}: ${message}`, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
    });
  }
}

/**
 * Creates a click handler for create buttons with validation
 * @param {string} actionType - The action type from CREATE_ACTION_TYPES
 * @param {Function} actualClickHandler - The actual click handler to execute if validation passes
 * @param {Function} t - Translation function from useTranslation
 * @returns {Function} - Enhanced click handler with validation
 */
export function createValidatedClickHandler(actionType, actualClickHandler, t) {
  return function(event) {
    // Prevent default action
    if (event) {
      event.preventDefault();
    }

    // Validate the create action
    const validationResult = validateCreateAction(actionType);

    // If not allowed, show toast and return
    if (!validationResult.canCreate) {
      showCreateActionToast(validationResult, t);
      return;
    }

    // If allowed, execute the actual handler
    if (typeof actualClickHandler === 'function') {
      actualClickHandler(event);
    }
  };
}

/**
 * Gets the tooltip message for a disabled create button
 * @param {string} actionType - The action type from CREATE_ACTION_TYPES
 * @param {Function} t - Translation function from useTranslation
 * @returns {string} - Tooltip message
 */
export function getCreateButtonTooltip(actionType, t) {
  const validationResult = validateCreateAction(actionType);
  
  if (validationResult.canCreate) {
    return '';
  }

  if (t && typeof t === 'function') {
    const translationKey = `CREATE_ACTION.${validationResult.status.toUpperCase()}_TOOLTIP`;
    return t(translationKey, validationResult.message?.message || '');
  }

  return validationResult.message?.message || 'Action not allowed';
}

/**
 * Checks if a create button should be disabled
 * @param {string} actionType - The action type from CREATE_ACTION_TYPES
 * @returns {boolean} - Whether the button should be disabled
 */
export function shouldDisableCreateButton(actionType) {
  const validationResult = validateCreateAction(actionType);
  return !validationResult.canCreate;
}

/**
 * Utility to refresh permissions and limits after successful creation
 * This can be called after a successful create operation to update the UI state
 */
export function refreshAfterCreate() {
  // Dispatch events to notify components of changes
  try {
    // Notify about permission changes if any
    window.dispatchEvent(new CustomEvent('permissions:refresh'));
    
    // Notify about subscription/plan changes if any
    window.dispatchEvent(new CustomEvent('subscription:refresh'));
    
    // Clear any cached validation results
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('createActionValidationCache');
    }
  } catch (error) {
    console.error('Error refreshing after create:', error);
  }
}

/**
 * Debounce utility to prevent duplicate API calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounceCreateAction(func, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
