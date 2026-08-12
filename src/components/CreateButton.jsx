import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  validateCreateAction, 
  shouldDisableCreateButton, 
  getCreateButtonTooltip, 
  createValidatedClickHandler,
  debounceCreateAction,
  refreshAfterCreate
} from '../utils/createActionUtils';
import { NOTIFICATION_TYPES, TOAST_DURATION } from '../contants/constants';

/**
 * A reusable CreateButton component with built-in permission and limit validation
 * 
 * @param {Object} props
 * @param {string} props.actionType - The action type from CREATE_ACTION_TYPES
 * @param {Function} props.onClick - The actual click handler to execute if validation passes
 * @param {string} props.children - Button content (text or JSX)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Button variant (primary, secondary, etc.)
 * @param {boolean} props.disabled - External disabled state
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.showTooltip - Whether to show tooltip for disabled state
 * @param {boolean} props.debounce - Whether to debounce the click handler
 * @param {number} props.debounceDelay - Debounce delay in milliseconds
 * @param {Function} props.onSuccess - Callback after successful creation
 * @param {Function} props.onError - Callback on error
 * @param {boolean} props.refreshAfterCreate - Whether to refresh permissions/limits after successful creation
 * @param {Object} props.tooltipProps - Additional tooltip properties
 */
const CreateButton = ({
  actionType,
  onClick,
  children,
  className = '',
  variant = 'primary',
  disabled = false,
  loading = false,
  showTooltip = true,
  debounce = true,
  debounceDelay = 300,
  onSuccess,
  onError,
  refreshAfterCreate: shouldRefresh = true,
  tooltipProps = {},
  ...restProps
}) => {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const clickTimeoutRef = useRef(null);
  const lastClickTimeRef = useRef(0);

  // Validate the action type
  const validationResult = validateCreateAction(actionType);
  const isDisabledByValidation = shouldDisableCreateButton(actionType);
  const tooltipMessage = getCreateButtonTooltip(actionType, t);

  // Determine if button should be disabled
  // We don't natively disable the button for validation issues so the onClick can fire and show the limit error toast/popup
  const isNativelyDisabled = loading || isCreating;
  const isEffectivelyDisabled = disabled || isNativelyDisabled || isDisabledByValidation;

  // Create enhanced click handler
  const handleClick = useCallback(async (event) => {
    // Prevent rapid clicks
    const now = Date.now();
    if (now - lastClickTimeRef.current < 100) {
      event.preventDefault();
      return;
    }
    lastClickTimeRef.current = now;

    // Prevent multiple simultaneous clicks
    if (isCreating) {
      event.preventDefault();
      return;
    }

    // Set creating state
    setIsCreating(true);

    try {
      // Execute the actual click handler
      if (typeof onClick === 'function') {
        await onClick(event);
      }

      // Call success callback
      if (typeof onSuccess === 'function') {
        onSuccess();
      }

      // Refresh permissions/limits after successful creation
      if (shouldRefresh) {
        refreshAfterCreate();
      }
    } catch (error) {
      console.error('Create action failed:', error);
      
      // Call error callback
      if (typeof onError === 'function') {
        onError(error);
      }
    } finally {
      // Reset creating state with a small delay to prevent double-clicks
      clickTimeoutRef.current = setTimeout(() => {
        setIsCreating(false);
      }, 200);
    }
  }, [onClick, onSuccess, onError, shouldRefresh, isCreating]);

  // Create debounced click handler if needed
  const debouncedClickHandler = debounceCreateAction(handleClick, debounceDelay);
  const finalClickHandler = debounce ? debouncedClickHandler : handleClick;

  // Create validated click handler
  const validatedClickHandler = function(event) {
    if (event) {
      event.preventDefault();
    }
    
    // Validate the create action
    const validationResult = validateCreateAction(actionType);

    // If not allowed by internal validation, show its toast and return
    if (!validationResult.canCreate) {
      import('../utils/createActionUtils').then(({ showCreateActionToast }) => {
        showCreateActionToast(validationResult, t, actionType);
      });
      return;
    }
    
    // If externally disabled, show a toast for that reason instead of clicking
    if (disabled) {
      const reason = restProps.title || t("COMMON.ACTION_NOT_ALLOWED");
      import('../utils/ShowEmsg').then(({ showEmsg }) => {
        showEmsg(reason, NOTIFICATION_TYPES.WARNING, TOAST_DURATION.LONG);
      });
      return;
    }

    // If allowed, execute the actual handler
    finalClickHandler(event);
  };

  // Button styles based on variant
  const getButtonClasses = () => {
    // When a caller supplies sizing classes (e.g. Toolbar), don't force larger defaults.
    const hasCustomSize = /\b(h-|px-|py-|p-|text-|gap-|rounded-)/.test(className);
    const baseClasses = hasCustomSize
      ? "inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
      : "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variantClasses = {
      primary:
        "bg-custom-bg text-white hover:bg-custom-bg-dark focus:ring-custom-bg disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed aria-disabled:bg-gray-300 aria-disabled:text-gray-500 aria-disabled:cursor-not-allowed",
      secondary:
        "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed aria-disabled:bg-gray-50 aria-disabled:text-gray-400 aria-disabled:cursor-not-allowed",
      success:
        "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed aria-disabled:bg-gray-300 aria-disabled:text-gray-500 aria-disabled:cursor-not-allowed",
      danger:
        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed aria-disabled:bg-gray-300 aria-disabled:text-gray-500 aria-disabled:cursor-not-allowed",
      warning:
        "bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed aria-disabled:bg-gray-300 aria-disabled:text-gray-500 aria-disabled:cursor-not-allowed",
      info: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed aria-disabled:bg-gray-300 aria-disabled:text-gray-500 aria-disabled:cursor-not-allowed",
    };

    return `${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${className} ${isEffectivelyDisabled ? 'opacity-70 cursor-not-allowed' : ''}`;
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Render the button
  const buttonElement = (
    <button
      className={getButtonClasses()}
      disabled={isNativelyDisabled}
      aria-disabled={isEffectivelyDisabled}
      onClick={validatedClickHandler}
      title={showTooltip && isDisabledByValidation ? tooltipMessage : undefined}
      {...restProps}
    >
      {loading || isCreating ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {t('COMMON.LOADING', 'Loading...')}
        </>
      ) : (
        children
      )}
    </button>
  );

  // If tooltip is needed and button is disabled by validation, wrap with tooltip
  if (showTooltip && isDisabledByValidation && tooltipMessage) {
    return (
      <div className="relative inline-block">
        {buttonElement}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-xs text-white bg-gray-800 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          {tooltipMessage}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      </div>
    );
  }

  return buttonElement;
};

export default CreateButton;
