import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  List,
  LayoutGrid,
  Filter,
  Plus,
  Download,
  ChevronDown,
} from "lucide-react";
import { Combobox } from "@headlessui/react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import DateTimeRangePickerComponent from "./CustomDatePicker";
import { VIEW_MODES } from "../contants/constants";
 
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
  createLabel,
  onExport,
  exportLabel = "Export",
}) => {
  const { t } = useTranslation();
 
  // Separate date vs. other filters
  const dateFilters = (additionalFilters || []).filter(
    (f) => f.type === "date"
  );
  const otherFilters = (additionalFilters || []).filter(
    (f) => f.type !== "date"
  );
 
  // Toggle between table and grid view
  const toggleViewMode = () => {
    setViewMode(
      viewMode === VIEW_MODES.TABLE ? VIEW_MODES.GRID : VIEW_MODES.TABLE
    );
  };
 
  // Handle dropdown/combobox value changes
  const handleComboboxChange = (option, filterName) => {
    if (!option) return;
    const syntheticEvent = {
      target: {
        value: option.value,
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
                className="block w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-custom-bg focus:border-custom-bg text-xs h-full"
                placeholder={
                  searchPlaceholder || t("TOOLBAR.SEARCH_PLACEHOLDER")
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}
        {showViewToggle && (
          <button
            onClick={toggleViewMode}
            className={`btn-toggle-view flex items-center ${
              viewMode === VIEW_MODES.TABLE ? "btn-highlighted" : "btn-default"
            }`}
            title={
              viewMode === VIEW_MODES.TABLE
                ? t("TOOLBAR.GRID")
                : t("TOOLBAR.TABLE")
            }
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
        )}
        {showFilterButton && (
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`btn-toggle-view group ${
                showFilterDropdown ? "btn-highlighted" : "btn-default"
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
          <button
            onClick={onExport}
            disabled={exportLabel === t("COMMON.EXPORTING")}
            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            <Download className="w-3.5 h-3.5" />
            {exportLabel}
          </button>
        )}
 
        {onCreate && (
         <button
            onClick={onCreate}
            className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-semibold text-white bg-custom-bg hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-bg transition gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {createLabel || t("PRODUCTS.ADD_BTN")}
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
 
  return (
    <div className="w-40">
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {filter.label || filter.name}
      </label>
      <Combobox
        value={
          filter.options?.find((opt) => opt.value === filter.value) || null
        }
        onChange={(option) => handleComboboxChange(option, filter.name)}
      >
        {({ open }) => {
          // Update open state for portal positioning
          useEffect(() => {
            setIsOptionsOpen(open);
          }, [open]);
 
          return (
            <div className="relative" ref={comboboxRef}>
              <Combobox.Input
                className="w-full border border-gray-300 rounded-md py-1.5 pl-2.5 pr-8 text-xs focus:ring-1 focus:ring-custom-bg focus:border-custom-bg"
                displayValue={(option) => option?.label || ""}
                placeholder={`Select ${filter.label || filter.name}`}
                onChange={(event) => {
                  const inputValue = event.target.value.toLowerCase();
                  if (filter.onInputChange) {
                    filter.onInputChange(inputValue);
                  }
                }}
              />
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </Combobox.Button>
             
              {/* Portal for dropdown options */}
              {open &&
                createPortal(
                  <div
                    className="dropdown-portal-container absolute z-[99999] bg-white border border-gray-200 rounded-md shadow-lg"
                    style={{
                      top: `${dropdownPos.top}px`,
                      left: `${dropdownPos.left}px`,
                      width: `${dropdownPos.width}px`,
                    }}
                  >
                    <Combobox.Options
                      static
                      className="max-h-48 w-full overflow-auto rounded-md bg-white py-1 text-xs shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    >
                      {filter.options?.length > 0 ? (
                        filter.options.map((option) => (
                          <Combobox.Option
                            key={option.value}
                            value={option}
                            disabled={option.disabled}
                            className={({ active }) =>
                              `cursor-pointer select-none relative py-1.5 pl-2.5 pr-8 ${
                                active
                                  ? "bg-custom-bg text-white"
                                  : "text-gray-900"
                              } ${
                                option.disabled
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`
                            }
                          >
                            {option.label}
                          </Combobox.Option>
                        ))
                      ) : (
                        <div className="py-1.5 px-2.5 text-gray-500 text-xs">
                          {t("COMMON.NO_OPTIONS_FOUND")}
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