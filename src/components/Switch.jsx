import React from "react";
import { TOOLTIPSTATUS } from "../contants/constants";
 
const Switch = ({ checked, onChange, disabled = false, label = "", ...props }) => (
  <label className={`relative inline-flex items-center ml-2 group ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      disabled={disabled}
      onChange={(e) => {
        if (disabled) return; 
        onChange(e);
      }}
      {...props}
    />
    <div className={`w-9 h-5 rounded-full relative transition-all ${checked ? "bg-green-600" : "bg-red-500"} ${disabled ? "opacity-50" : "opacity-100"}`}>
      <div className={` absolute top-[2px] bg-white border border-gray-300 rounded-full h-4 w-4 transition-all ${checked ? "translate-x-[18px]" : "translate-x-[2px]"} `}>
      </div>
      {!disabled && (
        <span className="
          absolute top-1/2 left-[120%] -translate-y-1/2
          px-1.5 py-0.5 text-[10px] text-white bg-gray-800
          rounded-md opacity-0 group-hover:opacity-100 
          transition-opacity duration-200 whitespace-nowrap
        ">
          {checked ? TOOLTIPSTATUS.ACTIVE : TOOLTIPSTATUS.INACTIVE}
        </span>
      )}
    </div>
 
    {label && (
      <span className="ml-2 text-xs font-semibold text-gray-900">{label}</span>
    )}
  </label>
);      
 
export default Switch;