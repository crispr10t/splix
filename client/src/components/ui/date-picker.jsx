import * as React from "react";
import { useState, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toIsoDate(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function formatPickerDisplay(isoDateString) {
  if (!isoDateString) return "Select date";
  const parts = isoDateString.split("-").map(Number);
  if (parts.length !== 3) return isoDateString;
  const [y, m, d] = parts;
  const targetDate = new Date(y, m - 1, d);

  const now = new Date();
  const todayStr = toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());

  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yestStr = toIsoDate(yest.getFullYear(), yest.getMonth(), yest.getDate());

  const monthShort = targetDate.toLocaleString("en-US", { month: "short" });

  if (isoDateString === todayStr) {
    return `Today, ${d} ${monthShort}`;
  }
  if (isoDateString === yestStr) {
    return `Yesterday, ${d} ${monthShort}`;
  }

  if (y === now.getFullYear()) {
    return `${d} ${monthShort}`;
  }
  return `${d} ${monthShort} ${y}`;
}

export function DatePicker({
  value,
  onChange,
  maxDate,
  className,
  disabled = false
}) {
  const [open, setOpen] = useState(false);

  // Initialize calendar view to the month of the selected value or today
  const [viewDate, setViewDate] = useState(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const now = new Date();
  const todayIso = toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());

  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yestIso = toIsoDate(yest.getFullYear(), yest.getMonth(), yest.getDate());

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    // Prevent navigating past maxDate if configured
    if (maxDate) {
      const [maxY, maxM] = maxDate.split("-").map(Number);
      if (viewYear > maxY || (viewYear === maxY && viewMonth >= maxM - 1)) {
        return;
      }
    }
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const isNextDisabled = useMemo(() => {
    if (!maxDate) return false;
    const [maxY, maxM] = maxDate.split("-").map(Number);
    return viewYear > maxY || (viewYear === maxY && viewMonth >= maxM - 1);
  }, [maxDate, viewYear, viewMonth]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days = [];
    // Blank padding before first day
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toIsoDate(viewYear, viewMonth, d);
      const isFuture = maxDate ? iso > maxDate : false;
      const isSelected = iso === value;
      const isToday = iso === todayIso;

      days.push({
        day: d,
        iso,
        isFuture,
        isSelected,
        isToday
      });
    }
    return days;
  }, [viewYear, viewMonth, value, maxDate, todayIso]);

  const selectDate = (iso) => {
    onChange(iso);
    setOpen(false);
  };

  const monthLabel = viewDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-xl border border-ink-300 bg-white px-3.5 py-2 text-sm font-medium text-ink-900 transition-colors duration-150 hover:border-ink-400 focus-visible:outline-none focus-visible:border-leaf-600 focus-visible:ring-2 focus-visible:ring-leaf-200 cursor-pointer text-left",
            className
          )}
        >
          <span className="truncate">{formatPickerDisplay(value)}</span>
          <CalendarIcon className="h-4 w-4 text-ink-400 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[280px] p-3 rounded-2xl shadow-xl border-ink-200 bg-white"
      >
        {/* Quick Shortcut Chips */}
        <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-ink-100">
          <button
            type="button"
            onClick={() => selectDate(todayIso)}
            className={cn(
              "flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-colors text-center",
              value === todayIso
                ? "bg-leaf-600 text-white shadow-2xs"
                : "bg-ink-50 hover:bg-ink-100 text-ink-700"
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => selectDate(yestIso)}
            className={cn(
              "flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-colors text-center",
              value === yestIso
                ? "bg-leaf-600 text-white shadow-2xs"
                : "bg-ink-50 hover:bg-ink-100 text-ink-700"
            )}
          >
            Yesterday
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-600 transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-ink-900 select-none">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            disabled={isNextDisabled}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-lg hover:bg-ink-100 text-ink-600 transition-colors",
              isNextDisabled && "opacity-25 cursor-not-allowed hover:bg-transparent"
            )}
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
            <span
              key={dayName}
              className="text-[10px] font-bold text-ink-400 uppercase tracking-wider select-none py-0.5"
            >
              {dayName}
            </span>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((item, idx) => {
            if (!item) {
              return <div key={`empty-${idx}`} className="h-8 w-8" />;
            }
            const { day, iso, isFuture, isSelected, isToday } = item;

            if (isFuture) {
              return (
                <div
                  key={iso}
                  className="h-8 w-8 flex items-center justify-center text-xs text-ink-300 cursor-not-allowed select-none opacity-40"
                >
                  {day}
                </div>
              );
            }

            return (
              <button
                key={iso}
                type="button"
                onClick={() => selectDate(iso)}
                className={cn(
                  "h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors duration-150 select-none",
                  isSelected
                    ? "bg-leaf-600 text-white font-bold shadow-xs hover:bg-leaf-700"
                    : isToday
                    ? "ring-1.5 ring-leaf-500 font-bold text-leaf-800 hover:bg-leaf-50"
                    : "text-ink-800 hover:bg-ink-100/80"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
