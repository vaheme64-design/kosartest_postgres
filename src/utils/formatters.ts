/**
 * Persian number formatting, Jalali date display and CSV exporter helpers
 */

export function toPersianDigits(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '-';
  const str = n.toString();
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, d => persianDigits[parseInt(d, 10)]);
}

export function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return '۰';
  return new Intl.NumberFormat('fa-IR').format(n);
}

export function formatWeightKg(kg: number | undefined | null): string {
  if (kg === undefined || kg === null) return '۰ کیلوگرم';
  if (kg >= 1000) {
    const tons = (kg / 1000).toFixed(2);
    return `${toPersianDigits(tons)} تن (${formatNumber(Math.round(kg))} کیلوگرم)`;
  }
  return `${formatNumber(Math.round(kg * 10) / 10)} کیلوگرم`;
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    // Format in Persian locale with Jalali calendar
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      calendar: 'persian',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'persian',
    }).format(date);
  } catch {
    return isoString;
  }
}

export const formatDate = formatDateShort;

export function getVoucherTypeLabel(type: string): { label: string; color: string; bg: string } {
  switch (type) {
    case 'OPENING_BALANCE':
      return { label: 'موجودی اول دوره', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
    case 'RECEIPT':
      return { label: 'رسید ورود به انبار', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    case 'ISSUE':
      return { label: 'حواله مصرف مواد', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    case 'CUSTOMER_DELIVERY':
      return { label: 'حواله تحویل محصول به مشتری', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
    case 'PRODUCTION_OUTPUT':
      return { label: 'ثبت تولید سالم', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' };
    case 'SCRAP':
      return { label: 'ثبت ضایعات', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
    case 'WIP_TRANSFER_DISPATCH':
      return { label: 'ارسال بین مراحل', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' };
    case 'WIP_TRANSFER_RECEIPT':
      return { label: 'وصول در مرحله مقصد', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' };
    case 'ADJUSTMENT':
      return { label: 'سند اصلاحی / انبارگردانی', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    default:
      return { label: type, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' };
  }
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  // Add UTF-8 BOM so Excel opens Persian text correctly
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row =>
      row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
