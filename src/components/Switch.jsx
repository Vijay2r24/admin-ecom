import React from "react";
import { TOOLTIPSTATUS } from "../contants/constants";

const Switch = ({
  checked,
  onChange,
  label = "",
  disabled = false,
  disableTooltip = false,
  ...props
}) => (
  <label
    className={`relative inline-flex items-center ml-2 group 
    ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
  >
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      disabled={disabled}
      onChange={(e) => {
        if (disabled) return;
        onChange?.(e);
      }}
      {...props}
    />

    <div
      className={`
        w-9 h-5 rounded-full relative transition-all
        peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300
        dark:peer-focus:ring-green-800
        ${checked ? "bg-green-600" : "bg-red-500"}
        ${disabled ? "bg-gray-400 opacity-60" : ""}
      `}
    >
      {/* Toggle Knob */}
      <div
        className={`
          absolute top-[2px] left-[2px]
          h-4 w-4 bg-white rounded-full
          transition-all shadow-sm border-2 border-gray-200
          ${checked 
            ? "translate-x-[16px]" 
            : ""
          }
        `}
      />

      {/* ACTIVE / INACTIVE Tooltip */}
      {!disabled && !disableTooltip && (
        <span
          className="
            absolute top-1/2 left-[120%] -translate-y-1/2
            px-1.5 py-0.5 text-[10px] text-white bg-gray-800
            rounded-md opacity-0 group-hover:opacity-100
            transition-opacity duration-200 whitespace-nowrap
          "
        >
          {checked ? TOOLTIPSTATUS.ACTIVE : TOOLTIPSTATUS.INACTIVE}
        </span>
      )}

      {/* DISABLED Tooltip */}
      {disabled && !disableTooltip && (
        <span
          className="
            absolute top-1/2 right-[120%] -translate-y-1/2
            px-1.5 py-0.5 text-[10px] text-white bg-gray-800
            rounded-md opacity-0 group-hover:opacity-100
            transition-opacity duration-200 whitespace-nowrap
          "
        >
          {TOOLTIPSTATUS.NO_PERMISSION}
        </span>
      )}
    </div>

    {label && (
      <span
        className={`ml-2 text-xs font-semibold ${
          disabled ? "text-gray-500" : "text-gray-900"
        }`}
      >
        {label}
      </span>
    )}
  </label>
);

export default Switch;
