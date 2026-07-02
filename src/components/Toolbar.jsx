import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  List,
  LayoutGrid,
  Filter,
  Plus,
  Download,
  Upload,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { Combobox } from "@headlessui/react";
import { useTranslation } from "react-i18next";
import Tooltip from "./Tooltip";
import { createPortal } from "react-dom";
import DateTimeRangePickerComponent from "./CustomDatePicker";
import { VIEW_MODES, TOOLTIPSTATUS } from "../contants/constants";
import { useSubscriptionReadOnly } from "../hooks/useSubscriptionReadOnly";
import CreateButton from "./CreateButton";

const OrderToolbar = ({
  searchTerm,
  setSearchTerm,
  viewMode,
  setViewMode,
  showFilterDropdown,
  setShowFilterDropdown,
  additionalFilters,
  handleFilterChange,
  searchPlaceholder,
  showSearch = true,
  showViewToggle = true,
  showFilterButton = true,
  onClearFilters,
  onCreate,
  onAddVariants,
  createLabel,
  onExport,
  exportLabel = "Export",
  showFileInput = false,
  fileInputRef,
  onFileSelect,
  fileAccept = ".xlsx,.xls,.csv",
  fileMultiple = false,
  selectedFiles = [],
  onClearFiles,
  exportDisabled = false,
  disableCreate = false,
  disableCreateReason = "",
  disableAddVariants = false,
  disableAddVariantsReason = "",
  createProcessing = false, // true while a create API request is in-flight
  isBrowsePage = false, // New prop to identify browse pages
  actionType = null, // Add actionType for CreateButton validation
}) => {
  const { t } = useTranslation();
  const subscriptionReadOnly = useSubscriptionReadOnly();
  const createDisabled = disableCreate || subscriptionReadOnly || createProcessing;
  const addVariantsDisabled = disableAddVariants || subscriptionReadOnly;
  const effectiveDisableReason =
    disableCreateReason ||
    (subscriptionReadOnly
      ? t("SUBSCRIPTION.READ_ONLY_ACTION_BLOCKED", "Action blocked — your subscription is in read-only mode.")
      : "");
  const effectiveAddVariantsDisableReason =
    disableAddVariantsReason ||
    (subscriptionReadOnly
      ? t("SUBSCRIPTION.READ_ONLY_ACTION_BLOCKED", "Action blocked — your subscription is in read-only mode.")
      : "");

  // Track filter dropdown state for dynamic table height
  useEffect(() => {
    // Set CSS variable based on filter state and page type
    if (isBrowsePage) {
      // Browse pages have different layout structure - need much more aggressive height reduction
      if (showFilterDropdown && (additionalFilters?.length > 0)) {
        document.documentElement.style.setProperty('--table-height', 'calc(100vh - 380px)');
      } else {
        document.documentElement.style.setProperty('--table-height', 'calc(100vh - 280px)');
      }
    } else {
      // Original pages (Users, Stores, etc.) with flex layout
      if (showFilterDropdown && (additionalFilters?.length > 0)) {
        document.documentElement.style.setProperty('--table-height', 'calc(100vh - 280px)');
      } else {
        document.documentElement.style.setProperty('--table-height', 'calc(100vh - 180px)');
      }
    }

    // Cleanup on unmount
    return () => {
      document.documentElement.style.removeProperty('--table-height');
    };
  }, [showFilterDropdown, additionalFilters, isBrowsePage]);

  // Separate date vs. other filters
  const dateFilters = (additionalFilters || []).filter(
    (f) => f.type === "date"
  );
  const otherFilters = (additionalFilters || []).filter(
    (f) => f.type !== "date"
  );

  // Toggle between table and grid view
  const toggleViewMode = () => {
    if (typeof setViewMode === 'function') {
      const newMode = viewMode === VIEW_MODES.TABLE ? VIEW_MODES.GRID : VIEW_MODES.TABLE;
      setViewMode(newMode);
    }
  };

  // Handle dropdown/combobox value changes
  const handleComboboxChange = (option, filterName) => {
    if (!option) return;

    let newValue;
    if (Array.isArray(option)) {
      newValue = option.map(opt => opt.value);
    } else {
      newValue = option.value;
    }

    const syntheticEvent = {
      target: {
        value: newValue,
        name: filterName,
      },
    };
    handleFilterChange(syntheticEvent, filterName);
  };

  // Handle date range + time changes
  const handleDateRangeChange = (dateRange, filterName) => {
    const syntheticEvent = {
      target: {
        value: dateRange,
        name: filterName,
      },
    };
    handleFilterChange(syntheticEvent, filterName);
  };

  return (
    <div className="mb-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {showSearch && (
          <div className="flex-1">
            <div className="relative h-full">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-8 pr-8 py-1.5 border border-gray-300 rounded-md focus:ring-custom-bg focus:border-custom-bg text-xs h-full"
                placeholder={
                  searchPlaceholder || t("TOOLBAR.SEARCH_PLACEHOLDER")
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {showViewToggle && (
          <Tooltip 
            text={viewMode === VIEW_MODES.TABLE ? t("TOOLBAR.GRID") : t("TOOLBAR.TABLE")} 
            position="bottom"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleViewMode();
              }}
              onMouseDown={(e) => e.preventDefault()}
              onFocus={(e) => e.target.focus()}
              onBlur={(e) => e.target.blur()}
              className={`btn-toggle-view flex items-center ${viewMode === VIEW_MODES.GRID ? "btn-highlighted" : "btn-default"
                }`}
              type="button"
              tabIndex={0}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            >
              {viewMode === VIEW_MODES.TABLE ? (
                <>
                  <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                  {t("TOOLBAR.GRID")}
                </>
              ) : (
                <>
                  <List className="w-3.5 h-3.5 mr-1.5" />
                  {t("TOOLBAR.TABLE")}
                </>
              )}
            </button>
          </Tooltip>
        )}
        {showFilterButton && (
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`btn-toggle-view group ${showFilterDropdown ? "btn-highlighted" : "btn-default"
                }`}
              title={t("TOOLBAR.FILTER")}
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              {t("TOOLBAR.FILTER")}
            </button>
          </div>
        )}
        {dateFilters.map((filter, index) => (
          <div key={`date-${index}`} className="w-[320px] relative h-full">
            <DateTimeRangePickerComponent
              dateRange={filter.value || { start: null, end: null }}
              setDateRange={(range) =>
                handleDateRangeChange(range, filter.name)
              }
              displayText={
                filter.value?.start && filter.value?.end
                  ? `${filter.value.start.format(
                    "MMM D, YYYY h:mm A"
                  )} - ${filter.value.end.format("MMM D, YYYY h:mm A")}`
                  : filter.placeholder || "Select Date & Time"
              }
              handleQuickFilter={(value) =>
                handleDateRangeChange(value, filter.name)
              }
              handleClearDates={() =>
                handleDateRangeChange({ start: null, end: null }, filter.name)
              }
              t={t}
            />
          </div>
        ))}

        {onExport && (
          <Tooltip 
            text={exportDisabled ? t("COMMON.NO_PERMISSION") : ""} 
            position="bottom" 
            align="right"
            disabled={!exportDisabled}
          >
            <button
              onClick={onExport}
              disabled={exportDisabled || exportLabel === t("COMMON.EXPORTING")}
              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              <Download className="w-3.5 h-3.5" />
              {exportLabel}
            </button>
          </Tooltip>
        )}

        {showFileInput && (
          <div className="inline-flex items-center">
            <label className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 gap-1.5 cursor-pointer transition-colors duration-150">
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileSelect}
                multiple={fileMultiple}
                accept={fileAccept}
                className="hidden"
              />
              <Upload className="w-3.5 h-3.5" />
              <span>
                {selectedFiles.length > 0 
                  ? selectedFiles.map(file => file.name).join(', ') 
                  : 'Choose Files'
                }
              </span>
            </label>
            {selectedFiles.length > 0 && onClearFiles && (
              <button
                onClick={onClearFiles}
                className="ml-1 p-1 text-red-500 hover:text-red-700 transition-colors"
                title="Clear files"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {onCreate && (
          actionType ? (
            <CreateButton
              actionType={actionType}
              onClick={onCreate}
              loading={createProcessing}
              disabled={createDisabled}
              className={`inline-flex items-center justify-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-semibold transition gap-1.5 ${
                createDisabled
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-70 hover:bg-gray-300"
                  : "text-white bg-custom-bg hover:bg-bg-hover"
              }`}
              style={{ minWidth: '100px' }}
              showTooltip={true}
              title={createDisabled ? effectiveDisableReason : undefined}
            >
              <Plus className="h-3.5 w-3.5" />
              {createLabel || t("PRODUCTS.ADD_BTN")}
            </CreateButton>
          ) : (
            <button
              type="button"
              aria-disabled={createDisabled}
              onClick={(e) => {
                if (createDisabled) {
                  e.preventDefault();
                  if (effectiveDisableReason) {
                    // Import showEmsg lazily via dynamic import to avoid circular deps
                    import("../utils/ShowEmsg").then(({ showEmsg }) => {
                      showEmsg(effectiveDisableReason, "warning", 4000);
                    });
                  }
                  return;
                }
                onCreate(e);
              }}
              className={`inline-flex items-center justify-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-semibold transition gap-1.5 ${
                createDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70'
                  : 'text-white bg-custom-bg hover:bg-bg-hover'
              }`}
              style={{ minWidth: '100px' }}
              title={createDisabled ? effectiveDisableReason : undefined}
            >
              <Plus className="h-3.5 w-3.5" />
              {createLabel || t("PRODUCTS.ADD_BTN")}
            </button>
          )
        )}
        {onAddVariants && (
          <button
            type="button"
            aria-disabled={addVariantsDisabled}
            onClick={(e) => {
              if (addVariantsDisabled) {
                e.preventDefault();
                if (effectiveAddVariantsDisableReason) {
                  import("../utils/ShowEmsg").then(({ showEmsg }) => {
                    showEmsg(effectiveAddVariantsDisableReason, "warning", 4000);
                  });
                }
                return;
              }
              onAddVariants(e);
            }}
            className={`inline-flex items-center justify-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-semibold transition gap-1.5 ${
              addVariantsDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70'
                : 'text-white bg-custom-bg hover:bg-bg-hover'
            }`}
            style={{ minWidth: '100px' }}
            title={addVariantsDisabled ? effectiveAddVariantsDisableReason : undefined}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("PRODUCTS.ADD_VARIANTS_BTN")}
          </button>
        )}
      </div>

      {showFilterDropdown && otherFilters.length > 0 && (
        <div className="mt-2 p-2.5 bg-white rounded-md border border-gray-200 shadow-sm relative overflow-visible z-0">
          <div className="flex justify-end mb-2">
            {onClearFilters && (
              <button
                onClick={onClearFilters}
                className="text-xs text-red-500 hover:text-red-700 font-semibold"
              >
                {t("COMMON.CLEAR")}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {otherFilters.map((filter, index) => (
              <FilterCombobox
                key={index}
                filter={filter}
                handleComboboxChange={handleComboboxChange}
                t={t}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Separate component for the Combobox with portal functionality
const FilterCombobox = ({ filter, handleComboboxChange, t }) => {
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const comboboxRef = useRef(null);

  // Update dropdown position when options open
  useEffect(() => {
    if (isOptionsOpen && comboboxRef.current) {
      const rect = comboboxRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOptionsOpen]);

  const selectedOptions = filter.multiple
    ? filter.options?.filter((opt) => filter.value?.includes(opt.value)) || []
    : filter.options?.find((opt) => opt.value === filter.value) || null;

  const filteredOptions =
    query === ""
      ? filter.options
      : filter.options.filter((opt) =>
        opt.label?.toLowerCase().includes(query.toLowerCase())
      );

  const removeValue = (val, e) => {
    e.stopPropagation();
    const newValue = Array.isArray(filter.value) ? filter.value.filter((v) => v !== val) : [];
    handleComboboxChange(
      newValue.map((v) => ({ value: v })),
      filter.name
    );
  };

  return (
    <div className="w-48">
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {filter.label || filter.name}
      </label>
      <Combobox
        value={selectedOptions}
        onChange={(option) => {
          handleComboboxChange(option, filter.name);
          setQuery(""); // reset search after selection
        }}
        multiple={filter.multiple}
      >
        {({ open }) => {
          useEffect(() => {
            setIsOptionsOpen(open);
            if (!open) setQuery(""); // reset query when dropdown closes
          }, [open]);

          return (
            <div className="relative" ref={comboboxRef}>
              <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-gray-300 focus-within:ring-2 focus-within:ring-custom-bg/20 focus-within:border-custom-bg h-8 flex items-center">
                <div className="flex items-center w-full px-3 gap-2">
                  <Combobox.Input
                    spellCheck={false}
                    readOnly={!filter.searchable}
                    className={`w-full border-none p-0 text-xs leading-5 text-gray-900 focus:ring-0 bg-transparent outline-none shadow-none truncate ${!filter.searchable ? 'cursor-pointer' : ''}`}
                    displayValue={(option) => {
                      if (filter.multiple && Array.isArray(filter.value) && filter.value.length > 0) {
                        const firstOpt = filter.options?.find(o => o.value === filter.value[0]);
                        if (!firstOpt) return "";
                        return filter.value.length > 1
                          ? `${firstOpt.label} (+${filter.value.length - 1})`
                          : firstOpt.label;
                      }
                      return option?.label || "";
                    }}
                    placeholder={filter.placeholder || `Select ${filter.label || filter.name}`}
                    onChange={(event) => {
                      if (!filter.searchable) return;
                      setQuery(event.target.value);
                      if (filter.onInputChange) {
                        filter.onInputChange(event.target.value);
                      }
                    }}
                  />
                </div>
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1.5 bg-gradient-to-l from-white via-white/90 to-transparent pl-4">
                  {filter.multiple && filter.value?.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleComboboxChange([], filter.name);
                      }}
                      className="group flex items-center justify-center p-0.5 rounded-full hover:bg-red-50 transition-colors"
                      title="Clear all"
                    >
                      <X className="h-3 w-3 text-gray-400 group-hover:text-red-500" />
                    </button>
                  )}

                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </Combobox.Button>
              </div>

              {open &&
                createPortal(
                  <div
                    className="dropdown-portal-container absolute z-[99999] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden mt-1"
                    style={{
                      top: `${dropdownPos.top}px`,
                      left: `${dropdownPos.left}px`,
                      width: `${dropdownPos.width}px`,
                    }}
                  >
                    <Combobox.Options
                      static
                      className="max-h-48 w-full overflow-auto py-1 text-xs focus:outline-none"
                    >
                      {filter.multiple && filteredOptions.length > 0 && (
                        <div
                          className="relative cursor-pointer select-none py-2 pl-3 pr-4 border-b border-gray-100 text-xs font-medium text-custom-bg hover:bg-gray-50 flex items-center gap-2 sticky top-0 bg-white z-10"
                          onMouseDown={(e) => {
                            // usage of onMouseDown prevents blur event issues
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const allFilteredValues = filteredOptions.map(o => o.value);
                            const currentValues = Array.isArray(filter.value) ? filter.value : [];
                            const areAllSelected = allFilteredValues.every(val => currentValues.includes(val));

                            let newValues;
                            if (areAllSelected) {
                              // Unselect all filtered
                              newValues = currentValues.filter(v => !allFilteredValues.includes(v));
                            } else {
                              // Select all filtered
                              newValues = [...new Set([...currentValues, ...allFilteredValues])];
                            }

                            const newOptions = newValues.map(v => filter.options?.find(o => o.value === v)).filter(Boolean);
                            handleComboboxChange(newOptions, filter.name);
                          }}
                        >
                          <div className={`flex h-4 w-4 items-center justify-center rounded border ${filteredOptions.every(o => (Array.isArray(filter.value) ? filter.value : []).includes(o.value))
                            ? "bg-custom-bg border-custom-bg"
                            : "border-gray-300 bg-white"
                            }`}>
                            {filteredOptions.every(o => (Array.isArray(filter.value) ? filter.value : []).includes(o.value)) &&
                              <Check className="h-3 w-3 text-white" />
                            }
                          </div>
                          <span>{t("COMMON.SELECT_ALL")}</span>
                        </div>
                      )}
                      {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => {
                          const isSelected = filter.multiple
                            ? filter.value?.includes(option.value)
                            : filter.value === option.value;
                          return (
                            <Combobox.Option
                              key={option.value}
                              value={option}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors ${active ? "bg-custom-bg/5 text-custom-bg" : "text-gray-900"
                                }`
                              }
                            >
                              {({ active }) => (
                                <>
                                  <span className={`block truncate ${isSelected ? "font-semibold" : "font-normal"}`}>
                                    {option.label}
                                  </span>
                                  {isSelected && (
                                    <span className={`absolute inset-y-0 left-0 flex items-center pl-3 text-custom-bg`}>
                                      <Check className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                  )}
                                </>
                              )}
                            </Combobox.Option>
                          );
                        })
                      ) : (
                        <div className="py-3 px-4 text-gray-400 text-xs italic text-center">
                          {t("COMMON.NO_OPTIONS_FOUND") || "No options found"}
                        </div>
                      )}
                    </Combobox.Options>
                  </div>,
                  document.body
                )}
            </div>
          );
        }}
      </Combobox>
    </div>
  );
};

export default OrderToolbar;