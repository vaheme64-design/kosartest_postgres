import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, ChevronRight, ChevronLeft, Clock, Check, X } from 'lucide-react';
import {
  getCurrentJalaliDate,
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliMonthDays,
  parseJalaliString,
  JALALI_MONTH_NAMES,
} from '../../utils/jalali';
import { toPersianDigits } from '../../utils/formatters';

export interface JalaliDatePickerProps {
  value?: string;
  onChange: (jalaliDate: string, gregorianDate: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const PERSIAN_WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'انتخاب تاریخ شمسی...',
  disabled = false,
  required = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial or fallback to current Jalali date
  const today = useMemo(() => getCurrentJalaliDate(), []);
  
  const parsedValue = useMemo(() => {
    if (!value) return null;
    const direct = parseJalaliString(value);
    if (direct) return direct;

    // Check if ISO Gregorian date passed
    const gDate = new Date(value);
    if (!isNaN(gDate.getTime())) {
      const { jy, jm, jd } = gregorianToJalali(
        gDate.getFullYear(),
        gDate.getMonth() + 1,
        gDate.getDate()
      );
      return { year: jy, month: jm, day: jd };
    }
    return null;
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(parsedValue?.year || today.year);
  const [viewMonth, setViewMonth] = useState<number>(parsedValue?.month || today.month);
  const [manualText, setManualText] = useState<string>(
    parsedValue
      ? `${parsedValue.year}/${String(parsedValue.month).padStart(2, '0')}/${String(
          parsedValue.day
        ).padStart(2, '0')}`
      : ''
  );

  // Sync when prop value changes
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
      setManualText(
        `${parsedValue.year}/${String(parsedValue.month).padStart(2, '0')}/${String(
          parsedValue.day
        ).padStart(2, '0')}`
      );
    } else if (!value) {
      setManualText('');
    }
  }, [parsedValue, value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Calculate day cells
  const monthDaysCount = useMemo(() => {
    return getJalaliMonthDays(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  // Determine starting weekday of the 1st of this Jalali month
  const firstDayWeekdayIndex = useMemo(() => {
    const { gy, gm, gd } = jalaliToGregorian(viewYear, viewMonth, 1);
    const gDate = new Date(gy, gm - 1, gd);
    const jsDay = gDate.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
    // In Persian: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
    return (jsDay + 1) % 7;
  }, [viewYear, viewMonth]);

  const selectDate = (year: number, month: number, day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const jalaliStr = `${year}/${pad(month)}/${pad(day)}`;
    const { gy, gm, gd } = jalaliToGregorian(year, month, day);
    const gDate = new Date(Date.UTC(gy, gm - 1, gd));
    const isoStr = gDate.toISOString().slice(0, 10);

    setManualText(jalaliStr);
    onChange(jalaliStr, isoStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    selectDate(today.year, today.month, today.day);
  };

  const handleQuickOffset = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const { jy, jm, jd } = gregorianToJalali(
      target.getFullYear(),
      target.getMonth() + 1,
      target.getDate()
    );
    selectDate(jy, jm, jd);
  };

  const handleManualInputBlur = () => {
    if (!manualText.trim()) {
      if (!required) onChange('', '');
      return;
    }
    const parsed = parseJalaliString(manualText);
    if (parsed) {
      selectDate(parsed.year, parsed.month, parsed.day);
    } else {
      // Revert to current selected or today
      if (parsedValue) {
        setManualText(
          `${parsedValue.year}/${String(parsedValue.month).padStart(2, '0')}/${String(
            parsedValue.day
          ).padStart(2, '0')}`
        );
      } else {
        setManualText('');
      }
    }
  };

  // Year options list around viewYear
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = today.year - 6; y <= today.year + 6; y++) {
      list.push(y);
    }
    return list;
  }, [today.year]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-800 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Input Box */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-900 transition cursor-pointer text-right ${
            isOpen ? 'border-indigo-600 ring-2 ring-indigo-100 bg-white' : 'border-slate-300 hover:border-slate-400'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className={manualText ? 'font-mono font-bold text-slate-900' : 'text-slate-400'}>
              {manualText ? toPersianDigits(manualText) : placeholder}
            </span>
          </div>
          {manualText && !disabled && (
            <span
              onClick={e => {
                e.stopPropagation();
                setManualText('');
                onChange('', '');
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>
      </div>

      {/* Popup Calendar */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 right-0 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 space-y-3 animate-in fade-in zoom-in-95">
          {/* Header Month / Year Selectors */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
              title="ماه قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
              >
                {JALALI_MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono focus:outline-none cursor-pointer"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>
                    {toPersianDigits(y)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
              title="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 transition cursor-pointer shrink-0"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => handleQuickOffset(1)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer shrink-0"
            >
              فردا (+1)
            </button>
            <button
              type="button"
              onClick={() => handleQuickOffset(7)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer shrink-0"
            >
              یک هفته بعد (+7)
            </button>
            <button
              type="button"
              onClick={() => handleQuickOffset(30)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer shrink-0"
            >
              یک ماه بعد (+30)
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
            {PERSIAN_WEEK_DAYS.map((wd, idx) => (
              <div key={wd} className={idx === 6 ? 'text-rose-400' : ''}>
                {wd}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots for month start weekday offset */}
            {Array.from({ length: firstDayWeekdayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7 w-7" />
            ))}

            {/* Days */}
            {Array.from({ length: monthDaysCount }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                parsedValue &&
                parsedValue.year === viewYear &&
                parsedValue.month === viewMonth &&
                parsedValue.day === day;
              const isCurrentToday =
                today.year === viewYear && today.month === viewMonth && today.day === day;
              const isFriday = (firstDayWeekdayIndex + i) % 7 === 6;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(viewYear, viewMonth, day)}
                  className={`h-7 w-7 rounded-lg text-xs font-mono font-medium transition flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : isCurrentToday
                      ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300 hover:bg-amber-200'
                      : isFriday
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          {/* Manual Input Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <span className="text-[10px] text-slate-400 shrink-0">ورود دستی:</span>
            <input
              type="text"
              placeholder="1404/02/20"
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              onBlur={handleManualInputBlur}
              className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-900 focus:outline-none focus:border-indigo-500 text-left"
            />
          </div>
        </div>
      )}
    </div>
  );
};
