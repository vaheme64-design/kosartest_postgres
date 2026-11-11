import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
  Factory,
  Wrench,
  Gauge,
  ArrowRight,
  Printer,
  Download,
  Filter,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  X,
  Boxes,
  FileCheck2,
  TrendingUp,
  Cpu,
  UserCheck,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { MultiPartScheduleItem, ScheduledOpStep, WORK_DAYS } from './ErpProductionWorkbenchView';
import { formatNumber, toPersianDigits, exportToCsv } from '../../utils/formatters';

interface ManufacturingOrderTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: MultiPartScheduleItem | null;
  allOrders: MultiPartScheduleItem[];
  onSelectOrder?: (order: MultiPartScheduleItem) => void;
  onOpenLogModal?: (partItem: MultiPartScheduleItem, opStep: ScheduledOpStep) => void;
}

export const ManufacturingOrderTimelineModal: React.FC<ManufacturingOrderTimelineModalProps> = ({
  isOpen,
  onClose,
  order,
  allOrders,
  onSelectOrder,
  onOpenLogModal,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(order?.id || '');
  const [filterType, setFilterType] = useState<'ALL' | 'OPS_ONLY' | 'COMPLETED' | 'IN_PROGRESS'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sync when prop order changes
  React.useEffect(() => {
    if (order?.id) {
      setSelectedOrderId(order.id);
    }
  }, [order?.id]);

  const activeOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = allOrders.find(o => o.id === selectedOrderId || o.orderCode === selectedOrderId);
      if (found) return found;
    }
    return order || allOrders[0] || null;
  }, [selectedOrderId, allOrders, order]);

  // Overall metrics calculation
  const metrics = useMemo(() => {
    if (!activeOrder) return null;

    const totalOps = activeOrder.ops.length;
    const completedOps = activeOrder.ops.filter(o => o.status === 'COMPLETED').length;
    const inProgressOps = activeOrder.ops.filter(o => o.status === 'IN_PROGRESS').length;
    const rolledForwardOps = activeOrder.ops.filter(o => o.status === 'ROLLED_FORWARD').length;

    const totalGoodProduced = activeOrder.ops.reduce((sum, o) => sum + o.completedGoodQty, 0);
    const totalScrap = activeOrder.ops.reduce((sum, o) => sum + o.scrapQty, 0);
    const scrapRate = totalGoodProduced + totalScrap > 0
      ? ((totalScrap / (totalGoodProduced + totalScrap)) * 100).toFixed(1)
      : '0.0';

    const finalOp = activeOrder.ops[activeOrder.ops.length - 1];
    const finalReceived = activeOrder.warehouseReceivedQty || (finalOp ? finalOp.completedGoodQty : 0);
    const completionPercentage = activeOrder.weeklyTargetQty > 0
      ? Math.min(100, Math.round((finalReceived / activeOrder.weeklyTargetQty) * 100))
      : 0;

    const rawMaterialYield = activeOrder.rawMaterialIssuedKg > 0
      ? Math.min(100, Math.round(((finalReceived * activeOrder.unitWeightKg) / activeOrder.rawMaterialIssuedKg) * 100))
      : 100;

    return {
      totalOps,
      completedOps,
      inProgressOps,
      rolledForwardOps,
      totalGoodProduced,
      totalScrap,
      scrapRate,
      finalReceived,
      completionPercentage,
      rawMaterialYield,
      finalOp,
    };
  }, [activeOrder]);

  // Timeline events reconstruction
  const timelineEvents = useMemo(() => {
    if (!activeOrder) return [];

    interface TimelineEvent {
      id: string;
      stepType: 'RELEASE' | 'RAW_MATERIAL' | 'OPERATION' | 'QC_INSPECTION' | 'WAREHOUSE_RECEIPT';
      stepIndex: number;
      title: string;
      subTitle: string;
      status: 'DONE' | 'ACTIVE' | 'WARNING' | 'PENDING';
      dateLabel: string;
      timeLabel: string;
      details: {
        machine?: string;
        machineCode?: string;
        dieCode?: string;
        hall?: string;
        shift?: string;
        targetQty?: number;
        goodQty?: number;
        scrapQty?: number;
        wipNext?: number;
        docNumber?: string;
        weightKg?: number;
        spec?: string;
        operator?: string;
        efficiency?: number;
      };
      opRef?: ScheduledOpStep;
    }

    const events: TimelineEvent[] = [];

    // 1. Order Release Milestone
    events.push({
      id: `EV-RELEASE-${activeOrder.id}`,
      stepType: 'RELEASE',
      stepIndex: 1,
      title: 'ایجاد و تصویب برنامه تولید (MO Release)',
      subTitle: `ثبت دستور ساخت شماره ${activeOrder.orderCode} در سیستم APS`,
      status: 'DONE',
      dateLabel: '۱۴۰۴/۰۲/۱۹',
      timeLabel: '۰۸:۳۰',
      details: {
        docNumber: activeOrder.orderCode,
        targetQty: activeOrder.weeklyTargetQty,
        operator: 'مهندس حسینی (واحد برنامه‌ریزی تولید)',
      },
    });

    // 2. Raw Material Allocation Milestone
    const isMaterialAllocated = activeOrder.rawMaterialIssuedKg > 0;
    events.push({
      id: `EV-RM-${activeOrder.id}`,
      stepType: 'RAW_MATERIAL',
      stepIndex: 2,
      title: 'تخصیص و حواله کویل ورق (Coil Allocation)',
      subTitle: activeOrder.rawMaterialName,
      status: isMaterialAllocated ? 'DONE' : 'PENDING',
      dateLabel: '۱۴۰۴/۰۲/۲۰',
      timeLabel: '۰۹:۱۵',
      details: {
        docNumber: `ISS-RM-${activeOrder.orderCode.replace('MO-', '')}`,
        weightKg: activeOrder.rawMaterialIssuedKg,
        spec: activeOrder.rawMaterialCode,
        operator: 'انبار مواد اولیه و رول ورق (WH-RAW)',
      },
    });

    // 3. Operations Steps
    activeOrder.ops.forEach((op, idx) => {
      let eventStatus: 'DONE' | 'ACTIVE' | 'WARNING' | 'PENDING' = 'PENDING';
      if (op.status === 'COMPLETED') eventStatus = 'DONE';
      else if (op.status === 'IN_PROGRESS') eventStatus = 'ACTIVE';
      else if (op.status === 'ROLLED_FORWARD') eventStatus = 'WARNING';

      const dayObj = WORK_DAYS.find(d => d.index === op.scheduledDayIndex) || WORK_DAYS[0];
      const eff = op.effectiveTargetQty > 0
        ? Math.min(100, Math.round((op.completedGoodQty / op.effectiveTargetQty) * 100))
        : 0;

      events.push({
        id: `EV-OP-${op.opId}`,
        stepType: 'OPERATION',
        stepIndex: 3 + idx,
        title: `${op.opCode} — ${op.opTitle}`,
        subTitle: `${op.stationHall} | ${op.machineName}`,
        status: eventStatus,
        dateLabel: dayObj.date,
        timeLabel: op.shiftName === 'شیفت صبح' ? '۰۷:۳۰' : op.shiftName === 'شیفت عصر' ? '۱۵:۳۰' : '۲۳:۳۰',
        details: {
          machine: op.machineName,
          machineCode: op.machineCode,
          dieCode: op.dieCode,
          hall: op.stationHall,
          shift: op.shiftName,
          targetQty: op.effectiveTargetQty,
          goodQty: op.completedGoodQty,
          scrapQty: op.scrapQty,
          wipNext: op.wipBufferAfterOp,
          efficiency: eff,
          docNumber: op.warehouseReceiptDocNumber,
          operator: `اپراتور ایستگاه ${op.opCode}`,
        },
        opRef: op,
      });

      // Insert In-Process QC Milestone after key forming/welding steps (e.g. OP20 or OP40)
      if (idx === 1 || (idx === activeOrder.ops.length - 2 && activeOrder.ops.length >= 4)) {
        const isQcPassed = op.status === 'COMPLETED' || op.completedGoodQty > 0;
        events.push({
          id: `EV-QC-${op.opId}`,
          stepType: 'QC_INSPECTION',
          stepIndex: 3 + idx + 0.5,
          title: `بازرسی کیفی بین‌ایستگاهی (In-Process QC Check - ${op.opCode})`,
          subTitle: 'کنترل ابعادی، تست گِیج و بازرسی عدم پلیسه/ترک کشش',
          status: isQcPassed ? 'DONE' : 'PENDING',
          dateLabel: dayObj.date,
          timeLabel: '۱۱:۴۵',
          details: {
            docNumber: `QC-INSP-${op.opCode}-${activeOrder.orderCode.replace('MO-', '')}`,
            spec: 'استاندارد ابعادی Sapco STD-4109',
            operator: 'بازرس کنترل کیفیت خط (QC Line Inspector)',
          },
        });
      }
    });

    // 4. Warehouse Receipt Milestone
    const finalOp = activeOrder.ops[activeOrder.ops.length - 1];
    const isReceivedInWh = (activeOrder.warehouseReceivedQty > 0) || (finalOp && finalOp.status === 'COMPLETED');
    const receiptDoc = finalOp?.warehouseReceiptDocNumber || `RCV-FG-${activeOrder.orderCode.replace('MO-', '')}`;

    events.push({
      id: `EV-FG-RCV-${activeOrder.id}`,
      stepType: 'WAREHOUSE_RECEIPT',
      stepIndex: 99,
      title: 'تحویل نهایی به انبار محصول و صدور رسید (FG Receipt)',
      subTitle: `انبار قطعات نهایی خودرویی (WH-FG-01) — پالت‌بندی و برچسب SAPCO`,
      status: isReceivedInWh ? 'DONE' : 'PENDING',
      dateLabel: isReceivedInWh ? '۱۴۰۴/۰۲/۲۴' : 'در انتظار اتمام',
      timeLabel: isReceivedInWh ? '۱۶:۰۰' : '---',
      details: {
        docNumber: receiptDoc,
        goodQty: activeOrder.warehouseReceivedQty || (finalOp ? finalOp.completedGoodQty : 0),
        operator: 'انباردار محصولات نهایی (WH-FG)',
      },
    });

    return events;
  }, [activeOrder]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return timelineEvents.filter(ev => {
      if (filterType === 'OPS_ONLY' && ev.stepType !== 'OPERATION') return false;
      if (filterType === 'COMPLETED' && ev.status !== 'DONE') return false;
      if (filterType === 'IN_PROGRESS' && ev.status !== 'ACTIVE' && ev.status !== 'WARNING') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchSub = ev.subTitle.toLowerCase().includes(q);
        const matchDoc = ev.details.docNumber?.toLowerCase().includes(q) || false;
        const matchMachine = ev.details.machine?.toLowerCase().includes(q) || false;
        return matchTitle || matchSub || matchDoc || matchMachine;
      }
      return true;
    });
  }, [timelineEvents, filterType, searchTerm]);

  // Export CSV
  const handleExportTimelineCsv = () => {
    if (!activeOrder) return;
    const headers = [
      'شناسه رویداد',
      'نوع مرحله',
      'عنوان رویداد',
      'توضیحات',
      'وضعیت',
      'تاریخ',
      'ساعت',
      'ماشین / ایستگاه',
      'کد قالب',
      'شیفت',
      'تیراژ هدف',
      'تولید سالم',
      'ضایعات',
      'شماره سند',
    ];
    const rows = timelineEvents.map(e => [
      e.id,
      e.stepType,
      e.title,
      e.subTitle,
      e.status,
      e.dateLabel,
      e.timeLabel,
      e.details.machine || '-',
      e.details.dieCode || '-',
      e.details.shift || '-',
      e.details.targetQty || 0,
      e.details.goodQty || 0,
      e.details.scrapQty || 0,
      e.details.docNumber || '-',
    ]);
    exportToCsv(`MO_Timeline_${activeOrder.orderCode}`, headers, rows);
  };

  // Print Timeline
  const handlePrintTimeline = () => {
    if (!activeOrder) return;
    const content = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>شناسنامه و تاریخچه دستور کار ${activeOrder.orderCode}</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; padding: 24px; color: #111; direction: rtl; }
          h1 { font-size: 18px; margin-bottom: 4px; border-bottom: 2px solid #222; padding-bottom: 8px; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          .meta-table td, .meta-table th { border: 1px solid #ccc; padding: 6px 10px; }
          .meta-table th { background: #f0f0f0; }
          .timeline-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 16px; }
          .timeline-table th, .timeline-table td { border: 1px solid #ccc; padding: 6px; text-align: center; }
          .timeline-table th { background: #e5e5e5; }
        </style>
      </head>
      <body>
        <h1>شناسنامه رهگیری و تایم‌لاین دستور ساخت (MO Lifecycle Traveler)</h1>
        <table class="meta-table">
          <tr>
            <th>شماره دستور ساخت (MO)</th>
            <td><strong>${activeOrder.orderCode}</strong></td>
            <th>نام قطعه</th>
            <td><strong>${activeOrder.partName}</strong> (${activeOrder.partCode})</td>
          </tr>
          <tr>
            <th>خودرو / کاربرد</th>
            <td>${activeOrder.carModel}</td>
            <th>تیراژ مصوب سفارش</th>
            <td><strong>${formatNumber(activeOrder.weeklyTargetQty)} عدد</strong></td>
          </tr>
          <tr>
            <th>کد رول ورق مصرفی</th>
            <td>${activeOrder.rawMaterialCode} (${activeOrder.rawMaterialName})</td>
            <th>وزن ناخالص حواله</th>
            <td>${formatNumber(activeOrder.rawMaterialIssuedKg)} کیلوگرم</td>
          </tr>
        </table>

        <h3>رویدادهای ثبت‌شده در چرخه حیات دستور ساخت:</h3>
        <table class="timeline-table">
          <thead>
            <tr>
              <th>ردیف</th>
              <th>مرحله / رویداد</th>
              <th>ایستگاه / ماشین</th>
              <th>تاریخ و زمان</th>
              <th>هدف</th>
              <th>تولید سالم</th>
              <th>ضایعات</th>
              <th>شماره سند</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            ${timelineEvents
              .map(
                (ev, idx) => `
              <tr>
                <td>${toPersianDigits(idx + 1)}</td>
                <td style="text-align: right;"><strong>${ev.title}</strong><br/><small>${ev.subTitle}</small></td>
                <td>${ev.details.machine || ev.details.hall || '-'}</td>
                <td>${ev.dateLabel} - ${ev.timeLabel}</td>
                <td>${ev.details.targetQty ? formatNumber(ev.details.targetQty) : '-'}</td>
                <td>${ev.details.goodQty ? formatNumber(ev.details.goodQty) : '-'}</td>
                <td>${ev.details.scrapQty ? formatNumber(ev.details.scrapQty) : '-'}</td>
                <td style="font-family: monospace;">${ev.details.docNumber || '-'}</td>
                <td>${ev.status === 'DONE' ? 'تکمیل' : ev.status === 'ACTIVE' ? 'در حال انجام' : ev.status === 'WARNING' ? 'انتقال یافته' : 'در انتظار'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const doc = frame.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(content);
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      frame.remove();
    }, 400);
  };

  if (!isOpen || !activeOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden text-right font-sans">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold border border-slate-700">
                  {activeOrder.orderCode}
                </span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  تاریخچه وضعیت و تایم‌لاین دستور ساخت (MO Lifecycle)
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {activeOrder.partName} ({activeOrder.partCode}) — {activeOrder.carModel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Order Switcher Dropdown */}
            <div className="relative">
              <select
                value={activeOrder.id}
                onChange={e => {
                  setSelectedOrderId(e.target.value);
                  const sel = allOrders.find(o => o.id === e.target.value);
                  if (sel && onSelectOrder) onSelectOrder(sel);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                {allOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.orderCode} — {o.partName.slice(0, 24)}...
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrintTimeline}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="چاپ شناسنامه رهگیری"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleExportTimelineCsv}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="خروجی فایل اکسل (CSV)"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        {metrics && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-medium block">تیراژ مصوب سفارش</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {formatNumber(activeOrder.weeklyTargetQty)}{' '}
                <span className="text-[10px] font-normal text-slate-500">عدد</span>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-medium block">تحویل قطعی به انبار</span>
              <div className="text-sm font-bold text-emerald-700 mt-0.5 flex items-center justify-between">
                <span>{formatNumber(metrics.finalReceived)}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                  {toPersianDigits(metrics.completionPercentage)}٪
                </span>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-medium block">تعداد مراحل عملیاتی</span>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {toPersianDigits(metrics.completedOps)} از {toPersianDigits(metrics.totalOps)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">OP تکمیل</span>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-medium block">کل ضایعات فرایندی</span>
              <div className="text-sm font-bold text-rose-700 mt-0.5 flex items-center justify-between">
                <span>{formatNumber(metrics.totalScrap)} عدد</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                  {toPersianDigits(metrics.scrapRate)}٪
                </span>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-medium block">ورق مصرفی / بازده وزنی</span>
              <div className="text-sm font-bold text-indigo-700 mt-0.5 flex items-center justify-between">
                <span>{formatNumber(activeOrder.rawMaterialIssuedKg)} kg</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                  {toPersianDigits(metrics.rawMaterialYield)}٪
                </span>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-medium block">وضعیت فعلی سفارش</span>
              <div className="text-xs font-bold mt-1">
                {metrics.completionPercentage === 100 ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 inline" /> خاتمه‌یافته
                  </span>
                ) : metrics.inProgressOps > 0 ? (
                  <span className="text-amber-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block"></span> در جریان ساخت
                  </span>
                ) : (
                  <span className="text-blue-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 inline" /> در برنامه تولید
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> فیلتر رویدادها:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  filterType === 'ALL' ? 'bg-white shadow-2xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تمام رویدادها ({toPersianDigits(timelineEvents.length)})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('OPS_ONLY')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  filterType === 'OPS_ONLY' ? 'bg-white shadow-2xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                فقط ایستگاه‌های OP ({toPersianDigits(activeOrder.ops.length)})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('COMPLETED')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  filterType === 'COMPLETED' ? 'bg-white shadow-2xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تکمیل‌شده
              </button>
              <button
                type="button"
                onClick={() => setFilterType('IN_PROGRESS')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  filterType === 'IN_PROGRESS' ? 'bg-white shadow-2xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                در حال اقدام
              </button>
            </div>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجو در مراحل، ماشین‌ها، اسناد..."
              className="w-full pl-3 pr-8 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>
        </div>

        {/* Scrollable Timeline Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="relative border-r-2 border-slate-200 pr-6 mr-3 space-y-8">
            {filteredEvents.map((event, idx) => {
              const isLast = idx === filteredEvents.length - 1;

              // Node badge styling
              let nodeBg = 'bg-slate-100 text-slate-500 border-slate-300';
              if (event.status === 'DONE') {
                nodeBg = 'bg-emerald-500 text-white border-emerald-600 ring-4 ring-emerald-100';
              } else if (event.status === 'ACTIVE') {
                nodeBg = 'bg-amber-500 text-white border-amber-600 ring-4 ring-amber-100 animate-pulse';
              } else if (event.status === 'WARNING') {
                nodeBg = 'bg-rose-500 text-white border-rose-600 ring-4 ring-rose-100';
              }

              return (
                <div key={event.id} className="relative group">
                  {/* Timeline Node Bullet */}
                  <div
                    className={`absolute -right-[35px] top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-transform shadow-xs ${nodeBg}`}
                  >
                    {event.status === 'DONE' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : event.status === 'ACTIVE' ? (
                      <Play className="w-3 h-3 fill-current" />
                    ) : event.status === 'WARNING' ? (
                      <RotateCcw className="w-3 h-3" />
                    ) : (
                      <span className="text-[10px]">{toPersianDigits(idx + 1)}</span>
                    )}
                  </div>

                  {/* Card Container */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{event.title}</h4>
                          {event.stepType === 'RELEASE' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                              شروع گردش کار
                            </span>
                          )}
                          {event.stepType === 'RAW_MATERIAL' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                              تغذیه کلاف
                            </span>
                          )}
                          {event.stepType === 'QC_INSPECTION' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                              تاییدیه CMM / بازرسی
                            </span>
                          )}
                          {event.stepType === 'WAREHOUSE_RECEIPT' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              رسید دائم انبار
                            </span>
                          )}
                          {event.status === 'DONE' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              تکمیل شده
                            </span>
                          )}
                          {event.status === 'ACTIVE' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                              در حال تولید
                            </span>
                          )}
                          {event.status === 'WARNING' && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                              انتقال مانده به روز بعد
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{event.subTitle}</p>
                      </div>

                      {/* Date & Time Badge */}
                      <div className="text-left font-mono text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                        <span>{event.dateLabel}</span>
                        <span className="mx-1 text-slate-300">|</span>
                        <span>{event.timeLabel}</span>
                      </div>
                    </div>

                    {/* Body Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                      {event.details.machine && (
                        <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">ایستگاه و ماشین:</span>
                          <span className="font-bold text-slate-800">{event.details.machine}</span>
                          {event.details.machineCode && (
                            <span className="text-[10px] text-slate-500 font-mono block">({event.details.machineCode})</span>
                          )}
                        </div>
                      )}

                      {event.details.dieCode && (
                        <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">کد قالب تخصیص‌یافته:</span>
                          <span className="font-bold font-mono text-slate-800">{event.details.dieCode}</span>
                          <span className="text-[10px] text-slate-500 block">{event.details.shift}</span>
                        </div>
                      )}

                      {event.details.targetQty !== undefined && (
                        <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">تیراژ هدف / تولید سالم:</span>
                          <div className="font-bold text-slate-800">
                            {formatNumber(event.details.goodQty || 0)}{' '}
                            <span className="text-slate-400 font-normal">/ {formatNumber(event.details.targetQty)}</span>
                          </div>
                          {event.details.efficiency !== undefined && (
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              راندمان: {toPersianDigits(event.details.efficiency)}٪
                            </span>
                          )}
                        </div>
                      )}

                      {event.details.scrapQty !== undefined && event.details.scrapQty > 0 && (
                        <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                          <span className="text-[10px] text-rose-600 block">ضایعات ثبت‌شده:</span>
                          <span className="font-bold text-rose-800">{formatNumber(event.details.scrapQty)} عدد</span>
                          {event.details.wipNext !== undefined && (
                            <span className="text-[10px] text-slate-500 block">
                              بافر بعد از OP: {formatNumber(event.details.wipNext)} عدد
                            </span>
                          )}
                        </div>
                      )}

                      {event.details.weightKg !== undefined && (
                        <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">وزن ناخالص ورق:</span>
                          <span className="font-bold text-indigo-700">{formatNumber(event.details.weightKg)} کیلوگرم</span>
                          <span className="text-[10px] text-slate-500 block">{event.details.spec}</span>
                        </div>
                      )}

                      {event.details.docNumber && (
                        <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">شماره سند / ردیابی:</span>
                          <span className="font-bold font-mono text-slate-800 text-[11px]">{event.details.docNumber}</span>
                          <span className="text-[10px] text-slate-500 block">{event.details.operator}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar for Operation */}
                    {event.opRef && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>استاندارد ساعتی: {toPersianDigits(event.opRef.standardRatePerHour)} ضرب در ساعت</span>
                          {event.opRef.isFinalOp && (
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              مرحله نهایی (اتمام خط)
                            </span>
                          )}
                        </div>

                        {onOpenLogModal && (
                          <button
                            type="button"
                            onClick={() => {
                              if (event.opRef) {
                                onOpenLogModal(activeOrder, event.opRef);
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          >
                            <Wrench className="w-3 h-3 text-slate-600" />
                            <span>ثبت کارکرد / ویرایش عملکرد</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>کل رویدادهای ردیابی‌شده: {toPersianDigits(timelineEvents.length)} مرحله</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
