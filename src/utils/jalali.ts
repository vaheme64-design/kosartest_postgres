/**
 * KPIMS Persian Jalali (Solar Hijri) Calendar Utilities
 * Standard astronomical conversion between Gregorian and Jalali dates
 */

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  formatted: string;
  weekdayIndex: number; // 1 = شنبه ... 7 = جمعه
  weekdayName: string;
}

const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const PERSIAN_WEEKDAY_NAMES = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

const toPersianDigitsInternal = (num: number | string): string => {
  const persianMap: Record<string, string> = {
    '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴',
    '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹',
  };
  return String(num).replace(/[0-9]/g, w => persianMap[w] || w);
};

/**
 * Converts a Gregorian Date to Jalali (Solar Hijri)
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Converts a Jalali date to Gregorian Date object
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  let gy: number, gm: number, gd: number, days: number;
  jy += 1595;
  days =
    -355668 +
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    days--;
    gy += 100 * Math.floor(days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  gd = days + 1;
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal_b = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (gm = 1; gm <= 12; gm++) {
    const v = sal_b[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return { gy, gm, gd };
}

/**
 * Returns true if the given Jalali year is a leap year (کبیسه)
 * Uses exact round-trip verification against the 33-year astronomical cycle
 * so that 1403 is accurately leap (30 Esfand) and 1404 is normal (29 Esfand).
 */
export function isJalaliLeapYear(jy: number): boolean {
  const g = jalaliToGregorian(jy, 12, 30);
  const j = gregorianToJalali(g.gy, g.gm, g.gd);
  return j.jy === jy && j.jm === 12 && j.jd === 30;
}

/**
 * Returns the number of days in a given Jalali month (1-12)
 */
export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  if (jm === 12) return isJalaliLeapYear(jy) ? 30 : 29;
  return 30;
}

/**
 * Parses any Jalali date string like "1404/02/20" or "۱۴۰۴/۰۲/۲۰" into year, month, day
 */
export function parseJalaliString(str?: string | null): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const persianToEng: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  };
  const normalized = str.replace(/[۰-۹]/g, c => persianToEng[c] || c).trim();
  const match = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (year < 1300 || year > 1500 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * Safely parses a string or Date into a local Date without UTC midnight day-shift
 */
export function parseSafeGregorianDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  const trimmed = input.trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dateOnlyMatch) {
    const gy = parseInt(dateOnlyMatch[1], 10);
    const gm = parseInt(dateOnlyMatch[2], 10);
    const gd = parseInt(dateOnlyMatch[3], 10);
    return new Date(gy, gm - 1, gd, 12, 0, 0);
  }
  return new Date(trimmed);
}

/**
 * Format any ISO string, Jalali string, timestamp or Date into Persian Jalali string
 * e.g. "۱۴۰۵/۰۸/۲۰" or "۲۰ آبان ۱۴۰۵"
 */
export function formatToJalali(
  inputDate?: string | Date | null,
  options: { includeTime?: boolean; textualMonth?: boolean } = {}
): string {
  if (!inputDate) return '—';

  const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  if (typeof inputDate === 'string') {
    const alreadyJalali = parseJalaliString(inputDate);
    if (alreadyJalali) {
      const { year: jy, month: jm, day: jd } = alreadyJalali;
      if (options.textualMonth) {
        const monthName = JALALI_MONTH_NAMES[jm - 1] || '';
        return `${toPersianDigitsInternal(jd)} ${monthName} ${toPersianDigitsInternal(jy)}`;
      }
      return `${toPersianDigitsInternal(jy)}/${toPersianDigitsInternal(padZero(jm))}/${toPersianDigitsInternal(padZero(jd))}`;
    }
  }

  const d = parseSafeGregorianDate(inputDate);
  if (isNaN(d.getTime())) return '—';

  const { jy, jm, jd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());

  if (options.textualMonth) {
    const monthName = JALALI_MONTH_NAMES[jm - 1] || '';
    let result = `${toPersianDigitsInternal(jd)} ${monthName} ${toPersianDigitsInternal(jy)}`;
    if (options.includeTime) {
      const hours = padZero(d.getHours());
      const mins = padZero(d.getMinutes());
      result += ` - ساعت ${toPersianDigitsInternal(hours)}:${toPersianDigitsInternal(mins)}`;
    }
    return result;
  }

  let result = `${toPersianDigitsInternal(jy)}/${toPersianDigitsInternal(padZero(jm))}/${toPersianDigitsInternal(padZero(jd))}`;

  if (options.includeTime) {
    const hours = padZero(d.getHours());
    const mins = padZero(d.getMinutes());
    result += ` ${toPersianDigitsInternal(hours)}:${toPersianDigitsInternal(mins)}`;
  }

  return result;
}

/**
 * Returns the 1-based Persian weekday index for a given Date (1 = شنبه ... 7 = جمعه)
 */
export function getTodayWorkDayIndex(referenceDate: Date = new Date()): number {
  return ((referenceDate.getDay() + 1) % 7) + 1;
}

/**
 * Returns current Jalali date object
 */
export function getCurrentJalaliDate(referenceDate: Date = new Date()): JalaliDate {
  const { jy, jm, jd } = gregorianToJalali(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    referenceDate.getDate()
  );
  const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const weekdayIndex = getTodayWorkDayIndex(referenceDate);
  return {
    year: jy,
    month: jm,
    day: jd,
    monthName: JALALI_MONTH_NAMES[jm - 1] || '',
    formatted: `${jy}/${padZero(jm)}/${padZero(jd)}`,
    weekdayIndex,
    weekdayName: PERSIAN_WEEKDAY_NAMES[weekdayIndex - 1] || 'شنبه',
  };
}

export interface DynamicWorkDay {
  index: number;
  name: string;
  shortName: string;
  date: string; // Persian formatted date, e.g. "۱۴۰۵/۰۸/۲۰"
  isoDate: string; // YYYY-MM-DD local date
  isToday: boolean;
}

/**
 * Dynamically generates all 7 Persian week days (شنبه تا جمعه)
 * anchored to the current week of referenceDate.
 */
export function getDynamicWorkDays(referenceDate: Date = new Date()): DynamicWorkDay[] {
  const jsDay = referenceDate.getDay();
  const daysSinceSaturday = (jsDay + 1) % 7;

  const saturday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - daysSinceSaturday,
    12,
    0,
    0
  );

  const dayNames = [
    { index: 1, name: 'شنبه', shortName: 'شنبه' },
    { index: 2, name: 'یکشنبه', shortName: 'یکشنبه' },
    { index: 3, name: 'دوشنبه', shortName: 'دوشنبه' },
    { index: 4, name: 'سه‌شنبه', shortName: 'سه‌شنبه' },
    { index: 5, name: 'چهارشنبه', shortName: 'چهارشنبه' },
    { index: 6, name: 'پنج‌شنبه', shortName: 'پنج‌شنبه' },
    { index: 7, name: 'جمعه', shortName: 'جمعه' },
  ];

  const todayY = referenceDate.getFullYear();
  const todayM = referenceDate.getMonth();
  const todayD = referenceDate.getDate();

  const tomorrowDate = new Date(todayY, todayM, todayD + 1, 12, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');

  return dayNames.map((item, i) => {
    const targetDate = new Date(
      saturday.getFullYear(),
      saturday.getMonth(),
      saturday.getDate() + i,
      12,
      0,
      0
    );

    const isToday =
      targetDate.getFullYear() === todayY &&
      targetDate.getMonth() === todayM &&
      targetDate.getDate() === todayD;

    const isTomorrow =
      targetDate.getFullYear() === tomorrowDate.getFullYear() &&
      targetDate.getMonth() === tomorrowDate.getMonth() &&
      targetDate.getDate() === tomorrowDate.getDate();

    let displayTitle = item.name;
    if (isToday) displayTitle = `${item.name} (امروز)`;
    else if (isTomorrow) displayTitle = `${item.name} (فردا)`;

    const isoDate = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;

    return {
      index: item.index,
      name: displayTitle,
      shortName: item.shortName,
      date: formatToJalali(targetDate),
      isoDate,
      isToday,
    };
  });
}

export { JALALI_MONTH_NAMES, PERSIAN_WEEKDAY_NAMES };
