import { useState, useRef, useEffect, forwardRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const SelectWithIcon = forwardRef(
  (
    {
      label,
      id,
      name,
      value,
      onChange,
      options,
      Icon,
      error,
      placeholder,
      loading,
      multiple = false,
      maxVisibleItems = 3,
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [sSearchTerm, setSearchTerm] = useState("");
    const [nHighlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const selectRef = useRef(null);
    const inputRef = useRef(null);
    const optionsRef = useRef(null);
    const selectedItemsRef = useRef(null);

    const selectedOptionLabels = Array.isArray(value)
      ? options
        .filter((option) => value.includes(option.value))
        .map((option) => option.label)
      : [options.find((option) => option.value === value)?.label || placeholder];

    const displayLabel =
      multiple && Array.isArray(value) && value.length === 0
        ? placeholder
        : selectedOptionLabels[0];

    const filteredOptions = options.filter(
      (option) =>
        typeof option.label === "string" &&
        option.label.toLowerCase().includes(sSearchTerm.toLowerCase())
    );
    const shouldShowSelectAll = multiple && filteredOptions.length > 2;

    const allSelected =
      multiple &&
      Array.isArray(value) &&
      filteredOptions.length > 0 &&
      filteredOptions.every((option) => value.includes(option.value));

    const handleSelectAll = () => {
      if (disabled) return;
      if (!multiple) return;
      const allValues = filteredOptions.map((option) => option.value);
      const newValue = allSelected ? [] : allValues;

      onChange({ target: { name, value: newValue } });
    };


    const visibleItems =
      multiple && Array.isArray(value) ? value.slice(0, maxVisibleItems) : [];
    const remainingCount =
      multiple && Array.isArray(value)
        ? Math.max(0, value.length - maxVisibleItems)
        : 0;

    useEffect(() => {
      if (isOpen && selectRef.current) {
        const rect = selectRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }, [isOpen]);

    const handleSelect = (optionValue) => {
      let newValue;
      if (multiple) {
        newValue = Array.isArray(value)
          ? value.includes(optionValue)
            ? value.filter((val) => val !== optionValue)
            : [...value, optionValue]
          : [optionValue];
      } else {
        newValue = optionValue;
        setIsOpen(false);
      }

      const scrollY = window.scrollY;
      onChange({ target: { name, value: newValue } });
      setSearchTerm("");
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    };

    const handleRemoveSelectedItem = (itemValue, e) => {
      e.stopPropagation();
      if (disabled) return;
      if (!multiple || !Array.isArray(value)) return;
      const newValue = value.filter((val) => val !== itemValue);
      onChange({ target: { name, value: newValue } });
    };

    const handleClickOutside = (event) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target) &&
        !event.target.closest(".dropdown-portal-container")
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    useEffect(() => {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    useEffect(() => {
      if (isOpen && inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
      }
    }, [isOpen]);

    return (
      <div className="w-full mt-4 md:mt-0">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>

        <div className="relative group" ref={selectRef}>
          <div
            ref={ref}
            className={`relative w-full pl-9 pr-2 py-5 text-sm border ${error ? "border-red-300" : "border-gray-200"
              } rounded-lg transition-all duration-200 flex items-center justify-between 
            ${disabled
                ? "bg-gray-100 cursor-not-allowed opacity-75"
                : "bg-white cursor-pointer group-hover:border-custom-bg focus:ring-2 focus:ring-custom-bg focus:border-custom-bg placeholder:text-sm"
              }
            ${multiple && value.length > 0 ? "h-auto min-h-9" : "h-9"}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                setIsOpen((prev) => !prev);
              }
            }}
            tabIndex={disabled ? -1 : 0}
            {...rest}
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {Icon && (
                <Icon
                  className={`h-5 w-5 transition-colors duration-200 ${disabled
                      ? "text-gray-400"
                      : "text-gray-400 group-hover:text-custom-bg"
                    }`}
                />
              )}
            </div>

            <div
              ref={selectedItemsRef}
              className={`flex flex-wrap gap-2 w-full pr-6 overflow-hidden ${multiple && value.length > maxVisibleItems
                  ? "max-h-12 overflow-y-auto"
                  : ""
                }`}
            >
              {multiple && Array.isArray(value) && value.length > 0 ? (
                <>
                  {visibleItems.map((itemValue) => {
                    const itemLabel = options.find(
                      (opt) => opt.value === itemValue
                    )?.label;
                    return itemLabel ? (
                      <span
                        key={itemValue}
                        className={`flex items-center text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${disabled
                            ? "bg-gray-300 text-gray-600"
                            : "bg-custom-bg text-white"
                          }`}
                        onClick={(e) => handleRemoveSelectedItem(itemValue, e)}
                      >
                        {itemLabel}
                        {!disabled && (
                          <X className="ml-1 h-3 w-3 cursor-pointer" />
                        )}
                      </span>
                    ) : null;
                  })}
                  {remainingCount > 0 && (
                    <span className="flex items-center bg-gray-300 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                      +{remainingCount} more
                    </span>
                  )}
                </>
              ) : (
                <span
                  className={`block truncate w-full text-left ${displayLabel === placeholder
                      ? "text-gray-500"
                      : "text-gray-900"
                    }`}
                >
                  {displayLabel}
                </span>
              )}
            </div>

            {!disabled && (
              <ChevronDown
                className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transform transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"
                  }`}
              />
            )}
          </div>

          {error && (
            <p className="mt-1.5 text-sm text-red flex items-center">
              <span className="mr-1">⚠️</span>
              {error}
            </p>
          )}

          {isOpen &&
            !disabled &&
            createPortal(
              <div
                className="dropdown-portal-container absolute z-[99999] bg-white border border-gray-200 rounded-lg shadow-lg"
                style={{
                  position: "absolute",
                  top: `${dropdownPos.top}px`,
                  left: `${dropdownPos.left}px`,
                  width: `${dropdownPos.width}px`,
                }}
              >
                <div className="px-3 py-2 border-b border-gray-100 bg-white sticky top-0 z-10">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={t("SELECT.SEARCH_PLACEHOLDER")}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-custom-bg focus:border-custom-bg text-sm"
                      value={sSearchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setHighlightedIndex(-1);
                        if (typeof rest.onInputChange === "function") {
                          rest.onInputChange(e.target.value);
                        }
                      }}
                    />
                    {sSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          inputRef.current.focus({ preventScroll: true });
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <ul
                  tabIndex="-1"
                  role="listbox"
                  className="py-1 bg-white max-h-[250px] overflow-y-auto"
                  ref={optionsRef}
                >
                  {loading ? (
                    <div className="text-center py-4 text-gray-500">
                      {t("COMMON.LOADING_SIMPLE")}
                    </div>
                  ) : filteredOptions.length === 0 ? (
                    <li className="text-center py-2 text-gray-500 text-sm">
                      {t("COMMON.NO_OPTIONS_FOUND")}
                    </li>
                  ) : (
                    <>
                      {/* --- Select All Option --- */}
                      {shouldShowSelectAll && (
                        <li
                          className={`cursor-pointer select-none relative py-2 pl-4 pr-4 border-b border-gray-100 ${nHighlightedIndex === -1
                              ? "bg-custom-bg text-white"
                              : "text-gray-900 hover:bg-gray-100"
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAll();
                          }}
                          onMouseEnter={() => setHighlightedIndex(-1)}
                          role="option"
                          aria-selected={allSelected}
                        >
                          <div className="flex items-center">
                            <span className="block truncate font-medium">
                              {allSelected
                                ? t("COMMON.DESELECT_ALL")
                                : t("COMMON.SELECT_ALL")}
                            </span>
                          </div>
                        </li>
                      )}


                      {filteredOptions.map((opt, index) => {
                        const isSelected = multiple
                          ? Array.isArray(value) && value.includes(opt.value)
                          : value === opt.value;
                        const isHighlighted = index === nHighlightedIndex;

                        return (
                          <li
                            key={opt.value}
                            className={`cursor-pointer select-none relative py-2 text-sm 
                            ${multiple ? "pl-12 pr-4" : "pl-4 pr-4"} 
                            ${isHighlighted
                                ? "bg-custom-bg text-white"
                                : "text-gray-900 hover:bg-gray-100"
                              } 
                            ${isSelected && !isHighlighted ? "bg-blue-50" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(opt.value);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="flex items-center">

                              {multiple && (
                                <div className="absolute left-0 flex items-center pl-3">
                                  <div
                                    className={`flex items-center justify-center w-4 h-4 border rounded ${isSelected
                                        ? "bg-custom-bg border-custom-bg"
                                        : "border-gray-300"
                                      }`}
                                  >
                                    {isSelected && (
                                      <svg
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              )}
                              <span className="block truncate">{opt.label}</span>
                            </div>
                          </li>
                        );
                      })}
                    </>
                  )}
                </ul>
              </div>,
              document.body
            )}
        </div>
      </div>
    );
  }
);

export default SelectWithIcon;