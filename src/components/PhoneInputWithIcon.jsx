import { forwardRef } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";
import { DEFAULT_COUNTRY } from "../contants/constants";
import { getPhonePayload } from "../utils/getPhonePayload";

const PhoneInputWithIcon = forwardRef(
  (
    {
      label,
      id,
      name,
      value,
      onChange,
      placeholder,
      error,
      Icon,
      inputSlot,
      defaultCountry = DEFAULT_COUNTRY,
      ...rest
    },
    ref
  ) => {

    const handlePhoneChange = (val) => {
      const payload = getPhonePayload(val);
      onChange(payload); 
    };

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
              <Icon className="h-5 w-5 text-gray-400 group-hover:text-custom-bg transition-colors duration-200" />
            </div>
          )}

          {/* Phone Input */}
          <PhoneInput
            ref={ref}
            id={id}
            name={name}
            value={value}
            onChange={handlePhoneChange}
            defaultCountry={defaultCountry}
            international
            countryCallingCodeEditable={false}
            placeholder={placeholder}
            className={`block w-full ${
              Icon ? "pl-12" : "pl-4"
            } pr-4 py-3 border ${
              error ? "border-red-300" : "border-gray-200"
            } rounded-xl focus:outline-none focus:border-custom-bg transition-all duration-200 group-hover:border-custom-bg bg-white shadow-sm appearance-none`}
            {...rest}
          />

          {/* Right Slot */}
          {inputSlot && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {inputSlot}
            </div>
          )}
        </div>

        {/* Validation Message */}
        {error ? (
          <p className="mt-1.5 text-sm text-red flex items-center">
            <span className="mr-1">⚠️</span>
            {error}
          </p>
        ) : value && !isValidPhoneNumber(value) ? (
          <p className="mt-1.5 text-sm text-red flex items-center"></p>
        ) : null}
      </div>
    );
  }
);

export default PhoneInputWithIcon;