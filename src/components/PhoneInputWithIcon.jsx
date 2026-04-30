import { forwardRef } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";
import { DEFAULT_COUNTRY } from "../contants/constants";
import { getPhonePayload } from "../utils/getPhonePayload";
import { useTranslation } from "react-i18next";

const PhoneInputWithIcon = forwardRef(
  (
    {
      label,
      id,
      name,
      value,
      onChange,
      onBlur,
      placeholder,
      error,
      Icon,
      inputSlot,
      defaultCountry = DEFAULT_COUNTRY,
      ...rest
    },
    ref
  ) => {
     const { t } = useTranslation();
    // react-phone-number-input gives us an E.164 string (e.g. "+919876543210") or undefined
    const handlePhoneChange = (val) => {
      const payload = getPhonePayload(val || "");
      onChange(payload);
    };

    const handleBlur = () => {
      if (onBlur) {
        // Synthesise a blur event-like object so AddUser's handleBlur can read name/value
        onBlur({ target: { name, value: value || "" } });
      }
    };

    // Determine if the current value is invalid (non-empty but fails validation)
    const showInlineWarning =
      !error &&
      value &&
      value.trim() !== "" &&
      (() => {
        try {
          return !isValidPhoneNumber(value);
        } catch {
          return false;
        }
      })();

    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>

        <div className="relative group">
          {/* Left Icon */}
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="h-4 w-4 text-gray-400 group-hover:text-custom-bg transition-colors duration-200" />
            </div>
          )}

          {/* Phone Input */}
          <PhoneInput
            ref={ref}
            id={id}
            name={name}
            value={value || ""}
            onChange={handlePhoneChange}
            onBlur={handleBlur}
            defaultCountry={defaultCountry}
            international
            countryCallingCodeEditable={false}
            placeholder={placeholder}
            className={`block w-full ${
              Icon ? "pl-12" : "pl-4"
            } pr-4 py-2.5 border ${
              error ? "border-red-300" : "border-gray-200"
            } rounded-md focus:outline-none focus:border-custom-bg transition-all duration-200 group-hover:border-custom-bg bg-white shadow-sm appearance-none text-xs`}
            {...rest}
          />

          {/* Right Slot */}
          {inputSlot && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {inputSlot}
            </div>
          )}
        </div>

        {/* Validation Message — show parent error first, then inline warning */}
        {error ? (
          <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
            <span>⚠️</span>
            {error}
          </p>
        ) : showInlineWarning ? (
          <p className="mt-1.5 text-sm text-yellow-600 flex items-center gap-1">
            <span>⚠️</span>
            {t("ADD_USER.VALIDATION.PHONENUMBER_VALID")}
          </p>
        ) : null}
      </div>
    );
  }
);

export default PhoneInputWithIcon;