import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Printer,
  Plus,
  Zap,
  Wrench,
  Eye,
  X,
  Layers,
} from 'lucide-react';
import {
  MachineUtilizationSummary,
  MachineUtilizationItem,
  ShiftFilterKey,
} from '../../types/oeeAndConsumables';
import { exportToCsv } from '../../utils/csvExport';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { ReportModuleSkeleton } from '../common/Skeleton';
import { SearchableSelect } from '../common/SearchableSelect';

export interface MachineUtilizationViewProps {
  machines?: any[];
}

export const MachineUtilizationView: React.FC<MachineUtilizationViewProps> = () => {
  const [data, setData] = useState<MachineUtilizationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [shiftFilter, setShiftFilter] = useState<ShiftFilterKey>('ALL');
  const [hallFilter, setHallFilter] = useState<string>('ALL');
  const [selectedMachine, setSelectedMachine] = useState<MachineUtilizationItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Modal for logging downtime or runtime
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logMachineId, setLogMachineId] = useState<string>('MCH-02');
  const [logEventType, setLogEventType] = useState<'PLANNED_DOWNTIME' | 'UNPLANNED_DOWNTIME' | 'PRODUCTION_RUN'>('UNPLANNED_DOWNTIME');
  const [logDurationMin, setLogDurationMin] = useState<number>(35);
  const [logStrokes, setLogStrokes] = useState<number>(600);
  const [logReason, setLogReason] = useState<string>('توقف تعویض سنبه پیرسینگ و تنظیم ورق‌گیر قالب');
  const [submitting, setSubmitting] = useState(false);

  const loadUtilization = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (shiftFilter !== 'ALL') q.append('shift', shiftFilter);
      if (hallFilter !== 'ALL') q.append('hall', hallFilter);
      const res = await fetch(`/api/machines/utilization-report?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load machine utilization:', err);
    } finally {
      setLoading(false);
    }
  }, [shiftFilter, hallFilter]);

  useEffect(() => {
    loadUtilization();
  }, [loadUtilization]);

  const handleExportCsv = () => {
    if (!data) return;
    const headers = [
      'کد دستگاه',
      'نام دستگاه',
      'سالن',
      'فرایند',
      'تناژ (تن)',
      'ساعت تقویمی در دسترس',
      'ساعت کارکرد خالص تولیدی',
      'توقف برنامه‌ریزی‌شده (PM/SMED)',
      'توقف اضطراری (خرابی)',
      'ساعت بیکاری',
      'درصد بهره زمانی کل',
      'راندمان بارگذاری خالص',
      'SPM واقعی / اسمی',
      'تعداد کل ضرب',
      'تولید سالم',
      'ضایعات',
      'مصرف انرژی (kWh)',
    ];
    const rows = data.machines.map(m => [
      m.machineCode,
      m.machineName,
      m.hallName,
      m.processType,
      m.tonnage,
      m.calendarAvailableHours,
      m.netOperatingHours,
      m.plannedDowntimeHours,
      m.unplannedDowntimeHours,
      m.idleNoOrderHours,
      `${m.grossUtilizationPercent}%`,
      `${m.netLoadingEfficiencyPercent}%`,
      `${m.actualAvgSpm} / ${m.nominalSpm}`,
      m.totalStrokesCount,
      m.goodPartsProduced,
      m.scrapPartsCount,
      m.estimatedEnergyKwh,
    ]);
    exportToCsv(`KPIMS_Machine_Utilization_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/machines/log-downtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: logMachineId,
          eventType: logEventType,
          durationMinutes: logDurationMin,
          strokesExecuted: logStrokes,
          reasonTitleFa: logReason,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setNotice(json.message);
        setIsLogModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 text-slate-900 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base lg:text-lg font-bold text-slate-900">
                ماژول گزارش بهره ماشین و کارکرد خطوط پرس (Machine Utilization Analytics)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-800 border border-amber-500/30">
                Real-Time Capacity & SPM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              موازنه ساعات تقویمی شیفت، کارکرد خالص تولیدی، توقفات تعویض قالب (SMED)، تعمیرات اضطراری، راندمان ضرب (SPM) و بار تناژ پرس‌ها
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت توقف / کارکرد دستگاه</span>
          </button>

          <button
            type="button"
            onClick={loadUtilization}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-900 border border-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>بروزرسانی</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-900 border border-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>خروجی اکسل</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-900 border border-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>چاپ رسمی</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-xs underline cursor-pointer">بستن</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-medium">انتخاب شیفت کاری:</span>
          {[
            { id: 'ALL', label: 'مجموع دو شیفت (۱۵ ساعت روزانه)' },
            { id: 'MORNING', label: 'شیفت صبح (A - ۷.۵ ساعت)' },
            { id: 'EVENING', label: 'شیفت عصر (B - ۷.۵ ساعت)' },
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setShiftFilter(s.id as ShiftFilterKey)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                shiftFilter === s.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">فیلتر سالن:</span>
          <select
            value={hallFilter}
            onChange={e => setHallFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">همه سالن‌های کارخانه</option>
            <option value="پرس">سالن پرس سنگین و متوسط</option>
            <option value="برش">سالن برشکاری و نواربری</option>
            <option value="جوش">سالن مونتاژ و جوشکاری بدنه</option>
          </select>
        </div>
      </div>

      {/* Skeleton Loading State */}
      {loading && !data && (
        <ReportModuleSkeleton kpiCount={6} showChart={true} tableRows={5} tableColumns={8} />
      )}

      {/* 6 KPI Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-amber-500/40 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-amber-400 font-bold block">بهره زمانی کل کارخانه</span>
            <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
              {toPersianDigits(data.averageGrossUtilizationPercent)}٪
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              راندمان بارگذاری خالص: {toPersianDigits(data.averageNetLoadingEfficiencyPercent)}٪
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-emerald-400 font-bold block">ساعات کارکرد خالص تولیدی</span>
            <div className="text-xl font-black text-emerald-400 font-mono tabular-nums mt-1">
              {toPersianDigits(data.totalNetOperatingHours)} <span className="text-xs font-sans font-normal text-slate-400">ساعت</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              از کل {toPersianDigits(data.totalCalendarHours)} ساعت در دسترس
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-cyan-400 font-bold block">توقف برنامه‌ریزی‌شده (SMED/PM)</span>
            <div className="text-xl font-black text-cyan-700 font-mono tabular-nums mt-1">
              {toPersianDigits(data.totalPlannedDowntimeHours)} <span className="text-xs font-sans font-normal text-slate-400">ساعت</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">تعویض قالب و سرویس دوره‌ای</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-rose-400 font-bold block">توقفات اضطراری و خرابی</span>
            <div className="text-xl font-black text-rose-400 font-mono tabular-nums mt-1">
              {toPersianDigits(data.totalUnplannedDowntimeHours)} <span className="text-xs font-sans font-normal text-slate-400">ساعت</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">خرابی پرس، قالب یا انتظار کلاف</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-indigo-400 font-bold block">کل ضرب ثبت‌شده پرس‌ها</span>
            <div className="text-xl font-black text-indigo-700 font-mono tabular-nums mt-1">
              {formatNumber(data.totalStrokesExecuted)}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              راندمان سرعت ضرب: {toPersianDigits(data.averageSpmEfficiencyPercent)}٪
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-amber-800 font-bold block">دستگاه‌های گلوگاه (بیش‌بار)</span>
            <div className="text-xl font-black text-amber-400 font-mono tabular-nums mt-1">
              {toPersianDigits(data.bottleneckMachinesCount)} <span className="text-xs font-sans font-normal text-slate-400">دستگاه</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">بهره‌وری بالای ۸۰٪ یا تناژ بالا</span>
          </div>
        </div>
      )}

      {/* Visual Time-Allocation Stacked Bars per Machine */}
      {data && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                نمودار تفکیک ساعات کارکرد، تعویض قالب، خرابی و بیکاری هر دستگاه
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                مقایسه بصری نحوه مصرف ساعات شیفت به تفکیک هر پرس و خط جوشکاری
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400">● کارکرد خالص تولیدی</span>
              <span className="flex items-center gap-1 text-cyan-400">● تعویض قالب / PM</span>
              <span className="flex items-center gap-1 text-rose-400">● توقف اضطراری</span>
              <span className="flex items-center gap-1 text-slate-400">● ظرفیت آزاد / بیکاری</span>
            </div>
          </div>

          <div className="space-y-3">
            {data.machines.map(m => {
              const total = Math.max(1, m.calendarAvailableHours);
              const runPct = Math.round((m.netOperatingHours / total) * 100);
              const planPct = Math.round((m.plannedDowntimeHours / total) * 100);
              const unplanPct = Math.round((m.unplannedDowntimeHours / total) * 100);
              const idlePct = Math.max(0, 100 - runPct - planPct - unplanPct);
              const isOverloaded = m.grossUtilizationPercent >= 80 || m.utilizationStatus === 'BOTTLENECK_OVERLOAD';

              return (
                <div
                  key={m.machineId}
                  onClick={() => setSelectedMachine(m)}
                  className={`border rounded-xl p-3.5 space-y-2.5 cursor-pointer transition ${
                    isOverloaded
                      ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400'
                      : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 font-mono font-bold border border-amber-500/20">
                        {m.machineCode}
                      </span>
                      <span className="font-bold text-slate-900">{m.machineName}</span>
                      <span className="text-[11px] text-slate-500">({m.activePartName})</span>
                      {isOverloaded && (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold">
                          گلوگاه اشغال ظرفیت ({toPersianDigits(m.grossUtilizationPercent)}٪)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums flex-wrap">
                      <span className="text-emerald-700 font-bold">کارکرد: {toPersianDigits(m.netOperatingHours)}h</span>
                      <span className="text-cyan-700">قالب/PM: {toPersianDigits(m.plannedDowntimeHours)}h</span>
                      <span className="text-rose-600">خرابی: {toPersianDigits(m.unplannedDowntimeHours)}h</span>
                      <span className="text-slate-500">آزاد: {toPersianDigits(m.idleNoOrderHours)}h</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-900 font-black">
                        بهره: {toPersianDigits(m.grossUtilizationPercent)}٪
                      </span>
                    </div>
                  </div>

                  {/* Stacked Progress Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${runPct}%` }}
                      className="bg-emerald-500 h-full"
                      title={`کارکرد خالص: ${m.netOperatingHours} ساعت`}
                    />
                    <div
                      style={{ width: `${planPct}%` }}
                      className="bg-cyan-500 h-full"
                      title={`توقف برنامه‌ریزی‌شده: ${m.plannedDowntimeHours} ساعت`}
                    />
                    <div
                      style={{ width: `${unplanPct}%` }}
                      className="bg-rose-500 h-full"
                      title={`توقف اضطراری: ${m.unplannedDowntimeHours} ساعت`}
                    />
                    <div
                      style={{ width: `${idlePct}%` }}
                      className="bg-slate-700 h-full"
                      title={`ظرفیت آزاد: ${m.idleNoOrderHours} ساعت`}
                    />
                  </div>

                  {/* Direct Auto & Manual Leveling Actions on Overloaded / Bottleneck Machines */}
                  {isOverloaded && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="text-amber-900 font-medium">
                        این دستگاه بیش از ۸۰٪ اشغال است. برای رفع گلوگاه یا تداخل در گانت چارت اقدام کنید:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.hash = `#/planning?subTab=capacity_planning`;
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition cursor-pointer"
                        >
                          تسطیح دستی در گانت چارت
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextMachines = data.machines.map(item =>
                              item.machineId === m.machineId
                                ? {
                                    ...item,
                                    netOperatingHours: Number(Math.max(8, item.netOperatingHours - 2.0).toFixed(1)),
                                    idleNoOrderHours: Number((item.idleNoOrderHours + 2.0).toFixed(1)),
                                    grossUtilizationPercent: Math.max(68, item.grossUtilizationPercent - 14),
                                    utilizationStatus: 'OPTIMAL' as const,
                                  }
                                : item
                            );
                            setData({ ...data, machines: nextMachines });
                            setNotice(
                              `تسطیح خودکار بار کاری روی دستگاه «${m.machineName} (${m.machineCode})» انجام شد و ۲ ساعت بار مازاد به پرس هم‌خانواده منتقل گردید.`
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition cursor-pointer"
                        >
                          تسطیح خودکار بار (Auto-Level)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Machine Utilization Data Grid */}
      {data && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              جدول جامع شاخص‌های بهره‌وری، سرعت ضرب (SPM)، قالب فعال و مصرف انرژی ماشین‌آلات
            </h3>
            <span className="text-[11px] text-slate-400">برای مشاهده جزئیات علل توقف روی هر دستگاه کلیک کنید</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-400 border-b border-slate-200 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-3">کد و نام دستگاه</th>
                  <th className="py-3 px-3">قالب و دستور کار فعال</th>
                  <th className="py-3 px-3 text-center">ساعت تقویمی</th>
                  <th className="py-3 px-3 text-center text-emerald-400 font-bold">کارکرد خالص</th>
                  <th className="py-3 px-3 text-center text-cyan-400">تعویض قالب (SMED)</th>
                  <th className="py-3 px-3 text-center text-rose-400">توقف اضطراری</th>
                  <th className="py-3 px-3 text-center font-black text-amber-400">بهره زمانی کل</th>
                  <th className="py-3 px-3 text-center">ضرب در دقیقه (SPM)</th>
                  <th className="py-3 px-3 text-center">بار تناژ</th>
                  <th className="py-3 px-3 text-center">کل ضرب ثبت‌شده</th>
                  <th className="py-3 px-3 text-center">وضعیت ظرفیت</th>
                  <th className="py-3 px-3 text-center">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {data.machines.map(m => (
                  <tr
                    key={m.machineId}
                    onClick={() => setSelectedMachine(m)}
                    className="hover:bg-slate-100 transition cursor-pointer"
                  >
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-900">{m.machineName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{m.machineCode} • {toPersianDigits(m.tonnage)}T</div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-cyan-700 font-mono text-[11px]">{m.activeDieCode} • {m.activeMoNumber}</div>
                      <div className="text-[11px] text-slate-700">{m.activePartName}</div>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700">
                      {toPersianDigits(m.calendarAvailableHours)}h
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">
                      {toPersianDigits(m.netOperatingHours)}h
                    </td>
                    <td className="py-3 px-3 text-center text-cyan-400">
                      {toPersianDigits(m.plannedDowntimeHours)}h
                      <span className="block text-[10px] text-slate-500">({toPersianDigits(m.avgDieChangeoverMinutes)}m/قالب)</span>
                    </td>
                    <td className="py-3 px-3 text-center text-rose-400 font-bold">
                      {toPersianDigits(m.unplannedDowntimeHours)}h
                    </td>
                    <td className="py-3 px-3 text-center font-black text-sm bg-amber-500/5 text-amber-400">
                      {toPersianDigits(m.grossUtilizationPercent)}٪
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-slate-900 font-bold">{toPersianDigits(m.actualAvgSpm)}</span>
                      <span className="text-slate-500"> / {toPersianDigits(m.nominalSpm)}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={m.tonnageLoadPercent >= 90 ? 'text-rose-400 font-bold' : 'text-slate-700'}>
                        {toPersianDigits(m.tonnageLoadPercent)}٪
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {formatNumber(m.totalStrokesCount)}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      {m.utilizationStatus === 'BOTTLENECK_OVERLOAD' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 border border-amber-500/30">
                          گلوگاه خط (پربار)
                        </span>
                      )}
                      {m.utilizationStatus === 'OPTIMAL' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                          بهره‌وری بهینه
                        </span>
                      )}
                      {m.utilizationStatus === 'UNDER_UTILIZED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          دارای ظرفیت خالی
                        </span>
                      )}
                      {m.utilizationStatus === 'DOWNTIME_ALERT' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-700 border border-rose-500/30">
                          توقف / تعمیرات
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Eye className="w-4 h-4 text-amber-400 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Downtime Causes Pareto */}
      {data && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-rose-400" />
            پارتو علل اصلی توقفات ماشین‌آلات در کل کارخانه و راهکارهای فنی کاهش توقف
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.topDowntimeCauses.map((c, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.category === 'PLANNED'
                      ? 'bg-cyan-500/15 text-cyan-700 border border-cyan-500/30'
                      : 'bg-rose-500/15 text-rose-700 border border-rose-500/30'
                  }`}>
                    {c.category === 'PLANNED' ? 'برنامه‌ریزی‌شده (SMED/PM)' : 'توقف اضطراری'}
                  </span>
                  <span className="font-mono text-xs font-black text-amber-400 tabular-nums">
                    {toPersianDigits(c.totalHours)} ساعت ({toPersianDigits(c.sharePercent)}٪)
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900">{c.reasonTitleFa}</div>
                <div className="text-[11px] text-emerald-400 leading-relaxed">
                  <strong>راهکار مهندسی:</strong> {c.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Machine Detail Modal */}
      {selectedMachine && (
        <div className="fixed inset-0 z-50 bg-slate-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  شناسنامه بهره‌وری و ریز توقفات: {selectedMachine.machineName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  کد دستگاه: {selectedMachine.machineCode} • اپراتور: {selectedMachine.operatorName}
                </p>
              </div>
              <button onClick={() => setSelectedMachine(null)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center font-mono text-xs tabular-nums">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-sans">بهره زمانی کل</span>
                <span className="text-base font-black text-emerald-400">{toPersianDigits(selectedMachine.grossUtilizationPercent)}٪</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-sans">راندمان بارگذاری</span>
                <span className="text-base font-black text-cyan-400">{toPersianDigits(selectedMachine.netLoadingEfficiencyPercent)}٪</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-sans">مصرف برق شیفت</span>
                <span className="text-base font-black text-amber-400">{formatNumber(selectedMachine.estimatedEnergyKwh)} kWh</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900">ریز علل توقف ثبت‌شده برای این دستگاه:</div>
              {selectedMachine.downtimeBreakdown.map((d, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{d.reasonTitleFa}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      نوع: {d.category === 'PLANNED' ? 'برنامه‌ریزی‌شده' : 'توقف اضطراری'} • تکرار: {toPersianDigits(d.occurrencesCount)} مرتبه
                    </div>
                  </div>
                  <div className="text-left font-mono tabular-nums">
                    <span className="text-rose-400 font-bold">{toPersianDigits(d.durationMinutes)} دقیقه</span>
                    <span className="block text-[10px] text-slate-400">{toPersianDigits(d.sharePercent)}٪ از توقف</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Log Machine Downtime / Runtime Modal */}
      {isLogModalOpen && data && (
        <div className="fixed inset-0 z-50 bg-slate-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">ثبت رویداد توقف یا کارکرد دستگاه پرس</h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">دستگاه مورد نظر (جستجو در ماشین‌آلات):</label>
                <SearchableSelect
                  value={logMachineId}
                  onChange={val => setLogMachineId(val)}
                  placeholder="جستجو و انتخاب پرس یا دستگاه..."
                  searchPlaceholder="جستجوی کد دستگاه، نام پرس، یا سالن..."
                  options={data.machines.map(m => ({
                    value: m.machineId,
                    label: m.machineName,
                    sublabel: `${m.machineCode} • ${m.hallName}`,
                    badge: `${m.tonnage} تن`,
                  }))}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">نوع رویداد:</label>
                <select
                  value={logEventType}
                  onChange={e => setLogEventType(e.target.value as any)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                >
                  <option value="UNPLANNED_DOWNTIME">توقف اضطراری (خرابی پرس / قالب / انتظار مواد)</option>
                  <option value="PLANNED_DOWNTIME">توقف برنامه‌ریزی‌شده (تعویض قالب SMED / سرویس PM)</option>
                  <option value="PRODUCTION_RUN">ثبت کارکرد و ضرب تولیدی جدید</option>
                </select>
              </div>

              {logEventType === 'PRODUCTION_RUN' ? (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">تعداد ضرب ثبت‌شده:</label>
                  <input
                    type="number"
                    value={logStrokes}
                    onChange={e => setLogStrokes(Number(e.target.value))}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">مدت زمان توقف (دقیقه):</label>
                  <input
                    type="number"
                    value={logDurationMin}
                    onChange={e => setLogDurationMin(Number(e.target.value))}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">علت توقف / توضیحات فنی:</label>
                <input
                  type="text"
                  value={logReason}
                  onChange={e => setLogReason(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
                >
                  {submitting ? 'در حال ثبت...' : 'ثبت در کاردکس ماشین'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
