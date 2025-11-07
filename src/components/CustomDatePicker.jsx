import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, X, Calendar, ChevronDown } from "lucide-react";
import {
  QUICK_FILTERS,
  MONTHS,
  WEEK_DAYS,
  YEARS,
  DATE_FORMATS,
  DEFAULT_PROPS,
  getDateRangeForFilter,
  CALENDAR_CONFIG,
  STYLES,
} from "./../contants/constants";

function CalendarMonth({ month, year, selectedStart, selectedEnd, onDateClick }) {
  const firstDay = dayjs(`${year}-${month + 1}-01`);
  const daysInMonth = firstDay.daysInMonth();
  const startingDayOfWeek = firstDay.day();

  const days = [];

  // Previous month days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push(firstDay.subtract(i + 1, "day"));
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(firstDay.add(i - 1, "day"));
  }

  // Next month days to fill the grid
  const remainingDays = CALENDAR_CONFIG.totalDays - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(firstDay.add(daysInMonth + i - 1, "day"));
  }

  const isInRange = (date) => {
    if (!selectedStart || !selectedEnd) return false;
    return date.isAfter(selectedStart) && date.isBefore(selectedEnd);
  };

  const isStart = (date) => selectedStart && selectedStart.isSame(date, "day");
  const isEnd = (date) => selectedEnd && selectedEnd.isSame(date, "day");
  const isCurrentMonth = (date) => date.month() === month && date.year() === year;

  return (
    <div className="w-full z-0">
      <div className="mb-2 text-center">
        <div className="text-sm font-semibold">
          {firstDay.format(DATE_FORMATS.monthYear).toUpperCase()} <span className="ml-2">{year}</span>
        </div>
      </div>
      <div className={`grid grid-cols-${CALENDAR_CONFIG.gridColumns} gap-1 mb-1`}>
        {WEEK_DAYS.map((day) => (
          <div key={day} className={`text-center text-xs ${STYLES.textColor.secondary} py-1`}>
            {day}
          </div>
        ))}
      </div>
      <div className={`grid grid-cols-${CALENDAR_CONFIG.gridColumns} gap-0.5`}>
        {days.map((date, idx) => {
          const inRange = isInRange(date);
          const isStartDate = isStart(date);
          const isEndDate = isEnd(date);
          const isCurrent = isCurrentMonth(date);

          return (
            <button
              key={idx}
              onClick={() => onDateClick(date)}
              className={`${STYLES.dimensions.dayCell} rounded text-xs font-medium transition-colors flex items-center justify-center
                ${!isCurrent ? STYLES.textColor.muted : STYLES.textColor.primary}
                ${isStartDate || isEndDate ? `${STYLES.backgroundColor.primary} text-white` : ""}
                ${inRange && !isStartDate && !isEndDate ? STYLES.backgroundColor.primaryLight : ""}
                ${!isStartDate && !isEndDate && !inRange && isCurrent ? STYLES.backgroundColor.hover : ""}
              `}
            >
              {date.date()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthYearSelector({ currentMonth, currentYear, onMonthChange, onYearChange }) {
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const monthRef = useRef(null);
  const yearRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (monthRef.current && !monthRef.current.contains(event.target)) {
        setShowMonthDropdown(false);
      }
      if (yearRef.current && !yearRef.current.contains(event.target)) {
        setShowYearDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex gap-2 mb-3">
      <div className="relative" ref={monthRef}>
        <button
          onClick={() => setShowMonthDropdown(!showMonthDropdown)}
          className={`flex items-center justify-between w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white ${STYLES.backgroundColor.hover} transition-colors focus:outline-none ${STYLES.border.focus} ${STYLES.dimensions.dropdown.minWidth.month}`}
        >
          <span>{MONTHS[currentMonth]}</span>
          <ChevronDown size={16} className={STYLES.textColor.secondary} />
        </button>
        {showMonthDropdown && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
            {MONTHS.map((month, index) => (
              <button
                key={month}
                onClick={() => {
                  onMonthChange(index);
                  setShowMonthDropdown(false);
                }}
                className={`w-full px-3 py-2 text-sm text-left ${STYLES.backgroundColor.hover} transition-colors ${
                  index === currentMonth ? `${STYLES.backgroundColor.primaryLight} ${STYLES.textColor.primary}` : ""
                }`}
              >
                {month}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative" ref={yearRef}>
        <button
          onClick={() => setShowYearDropdown(!showYearDropdown)}
          className={`flex items-center justify-between w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white ${STYLES.backgroundColor.hover} transition-colors focus:outline-none ${STYLES.border.focus} ${STYLES.dimensions.dropdown.minWidth.year}`}
        >
          <span>{currentYear}</span>
          <ChevronDown size={16} className={STYLES.textColor.secondary} />
        </button>
        {showYearDropdown && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
            {YEARS.map((year) => (
              <button
                key={year}
                onClick={() => {
                  onYearChange(year);
                  setShowYearDropdown(false);
                }}
                className={`w-full px-3 py-2 text-sm text-left ${STYLES.backgroundColor.hover} transition-colors ${
                  year === currentYear ? `${STYLES.backgroundColor.primaryLight} ${STYLES.textColor.primary}` : ""
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DateTimeRangePickerComponent({
  value,
  onChange,
  name,
  disableFuture,
  showLabel = DEFAULT_PROPS.showLabel,
  placeholder = DEFAULT_PROPS.placeholder,
}) {
  const [dateRange, setDateRange] = useState({
    start: value?.start || null,
    end: value?.end || null,
  });
  const [currentMonth, setCurrentMonth] = useState(dayjs().month());
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    if (value) {
      setDateRange({
        start: value.start ? dayjs(value.start) : null,
        end: value.end ? dayjs(value.end) : null,
      });
    }
  }, [value]);

  const handleDateClick = (date) => {
    let newDateRange;

    if (!dateRange.start) {
      newDateRange = { start: date, end: null };
    } else if (!dateRange.end) {
      if (date.isBefore(dateRange.start)) {
        newDateRange = { start: date, end: dateRange.start };
      } else {
        newDateRange = { start: dateRange.start, end: date };
      }
    } else {
      newDateRange = { start: date, end: null };
    }

    setDateRange(newDateRange);

    if (newDateRange.start && newDateRange.end) {
      onChange(newDateRange);
    }
  };

  const handleQuickFilter = (filter) => {
    const range = getDateRangeForFilter(filter);
    setDateRange(range);
    setCurrentMonth(range.end ? range.end.month() : dayjs().month());
    setCurrentYear(range.end ? range.end.year() : dayjs().year());
    onChange(range);
    setShowCalendar(false);
  };

  const handleClearDates = () => {
    const emptyRange = { start: null, end: null };
    setDateRange(emptyRange);
    onChange(emptyRange);
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleMonthChange = (month) => {
    setCurrentMonth(month);
  };

  const handleYearChange = (year) => {
    setCurrentYear(year);
  };

  const handleTimeChange = (type, timeValue) => {
    const [hours, minutes] = timeValue.split(":").map(Number);
    const newDateRange = {
      ...dateRange,
      [type]: dateRange[type].hour(hours).minute(minutes),
    };
    setDateRange(newDateRange);
    onChange(newDateRange);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  const displayText =
    dateRange.start && dateRange.end
      ? `${dateRange.start.format(DATE_FORMATS.display)} → ${dateRange.end.format(DATE_FORMATS.display)}`
      : placeholder;

  return (
    <div className="relative w-full z-0">
      {showLabel && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Date Range
        </label>
      )}

      <div className="relative">
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className={`flex items-center justify-between gap-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white ${STYLES.backgroundColor.hover} transition-colors focus:outline-none ${STYLES.border.focus}`}
        >
          <div className="flex items-center gap-2 truncate">
            <Calendar size={18} className={STYLES.textColor.secondary} />
            <span className="text-gray-700 truncate text-sm">
              {displayText}
            </span>
          </div>
        </button>

        {dateRange.start && dateRange.end && (
          <button
            onClick={handleClearDates}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Clear date range"
          >
            <X size={16} className="text-gray-500 hover:text-gray-700" />
          </button>
        )}
      </div>

      {showCalendar && (
        <div
          ref={calendarRef}
          className="absolute top-full right-0 mt-2 z-50 bg-white rounded-lg shadow-xl p-6 border border-gray-200 w-[550px]"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Range</h3>
            <button
              onClick={() => setShowCalendar(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleQuickFilter(filter.value)}
                className={`px-2 py-1.5 ${STYLES.backgroundColor.primaryLight} ${STYLES.textColor.primary} rounded-lg text-xs font-medium ${STYLES.backgroundColor.primaryHover} transition-colors text-center`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {dateRange.start && dateRange.end && (
            <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={dateRange.start.format(DATE_FORMATS.time)}
                  onChange={(e) => handleTimeChange("start", e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF5A5F] w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={dateRange.end.format(DATE_FORMATS.time)}
                  onChange={(e) => handleTimeChange("end", e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF5A5F] w-full"
                />
              </div>
            </div>
          )}

          <MonthYearSelector
            currentMonth={currentMonth}
            currentYear={currentYear}
            onMonthChange={handleMonthChange}
            onYearChange={handleYearChange}
          />

          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-6">
              <CalendarMonth
                month={currentMonth}
                year={currentYear}
                selectedStart={dateRange.start}
                selectedEnd={dateRange.end}
                onDateClick={handleDateClick}
              />
              <CalendarMonth
                month={currentMonth + 1 > 11 ? 0 : currentMonth + 1}
                year={currentMonth + 1 > 11 ? currentYear + 1 : currentYear}
                selectedStart={dateRange.start}
                selectedEnd={dateRange.end}
                onDateClick={handleDateClick}
              />
            </div>
            <button
              onClick={goToNextMonth}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
