import { forwardRef } from "react";

const TextInputWithIcon = forwardRef(
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
      isValid,
      required,
      inputSlot,
      className = "",
      ...rest
    },
    ref
  ) => {
    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {Icon && (
              <Icon className="h-4 w-4 text-gray-400 group-hover:text-custom-bg transition-colors duration-200" />
            )}
          </div>
          <input
            ref={ref}
            type="text"
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`block w-full pl-10 pr-3 py-2.5 border ${error ? "border-red-300" : "border-gray-200"
              } rounded-md focus:outline-none focus:border-custom-bg transition-all duration-200 group-hover:border-custom-bg bg-white shadow-sm appearance-none placeholder:text-xs text-xs ${className}`}
            {...rest}
          />
          {inputSlot && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {inputSlot}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red flex items-center">
            <span className="mr-1">⚠️</span>
            {error}
          </p>
        )}
      </div>
    );
  }
);

export default TextInputWithIcon;