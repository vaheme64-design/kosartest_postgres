import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Droplets,
  Wrench,
  Package,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Printer,
  ShoppingCart,
  Search,
  Calendar,
  SlidersHorizontal,
  Edit3,
  FileText,
  X,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import {
  ConsumablesForecastSummary,
  ConsumableForecastItem,
  ConsumableCategory,
} from '../../types/oeeAndConsumables';
import { exportToCsv } from '../../utils/csvExport';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { ReportModuleSkeleton } from '../common/Skeleton';

export const ConsumablesForecastView: React.FC = () => {
  const [data, setData] = useState<ConsumablesForecastSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [growthPercent, setGrowthPercent] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubView, setActiveSubView] = useState<'forecast_table' | 'requisitions'>('forecast_table');
  const [notice, setNotice] = useState<string | null>(null);
  const [creatingPr, setCreatingPr] = useState(false);

  // Edit Stock / Rate Modal
  const [editingItem, setEditingItem] = useState<ConsumableForecastItem | null>(null);
  const [editStockVal, setEditStockVal] = useState<number>(0);
  const [editRateVal, setEditRateVal] = useState<number>(0);
  const [editSafetyVal, setEditSafetyVal] = useState<number>(0);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.append('horizonDays', String(horizonDays));
      q.append('growth', String(growthPercent));
      if (categoryFilter !== 'ALL') q.append('category', categoryFilter);

      const res = await fetch(`/api/consumables/forecast?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load consumables forecast:', err);
    } finally {
      setLoading(false);
    }
  }, [horizonDays, growthPercent, categoryFilter]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  const handleIssueRequisition = async (specificCodes?: string[]) => {
    setCreatingPr(true);
    try {
      const res = await fetch('/api/consumables/requisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCodes: specificCodes,
          urgency: 'IMMEDIATE',
          notes: specificCodes
            ? `درخواست خرید اختصاصی برای قلم ${specificCodes.join(', ')} بر اساس هشدار نقطه سفارش`
            : `درخواست خرید تجمیعی برای کلیه اقلام زیر نقطه سفارش (افق ${horizonDays} روزه)`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice(json.message);
        await loadForecast();
        setActiveSubView('requisitions');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingPr(false);
    }
  };

  const handleOpenEdit = (item: ConsumableForecastItem) => {
    setEditingItem(item);
    setEditStockVal(item.currentStock);
    setEditRateVal(item.standardRatePerDriverUnit);
    setEditSafetyVal(item.minSafetyStock);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      const res = await fetch('/api/consumables/update-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editingItem.code,
          newStock: editStockVal,
          newStandardRate: editRateVal,
          newMinSafetyStock: editSafetyVal,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice(json.message);
        setEditingItem(null);
        await loadForecast();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    const headers = [
      'کد کالای مصرفی',
      'شرح کالا',
      'گروه مصرفی',
      'واحد',
      'مبنای مصرف مهندسی',
      'نرخ مصرف روزانه',
      `نیاز پیش‌بینی (${horizonDays} روز)`,
      'موجودی فعلی انبار',
      'حداقل موجودی اطمینان',
      'نقطه سفارش مجدد (ROP)',
      'پوشش موجودی (روز)',
      'تاریخ تخمینی اتمام',
      'پیشنهاد خرید',
      'برآورد هزینه (ریال)',
      'تأمین‌کننده منتخب',
    ];
    const rows = data.items.map(i => [
      i.code,
      `"${i.name.replace(/"/g, '""')}"`,
      i.categoryLabelFa,
      i.unit,
      i.consumptionDriverLabelFa,
      i.dailyBurnRate,
      i.forecastedGrossRequirement,
      i.currentStock,
      i.minSafetyStock,
      i.reorderPoint,
      i.daysOfSupplyRemaining,
      i.estimatedRunOutDateFa,
      i.suggestedOrderQty,
      i.estimatedTotalOrderCostRials,
      i.preferredSupplierName,
    ]);
    exportToCsv(`KPIMS_Consumables_Forecast_${horizonDays}Days`, headers, rows);
  };

  const filteredItems = (data?.items || []).filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.categoryLabelFa.toLowerCase().includes(q) ||
      item.preferredSupplierName.toLowerCase().includes(q)
    );
  });

  const categories: { id: string; label: string }[] = [
    { id: 'ALL', label: 'همه مواد مصرفی (۱۰)' },
    { id: 'WELDING_CONSUMABLES', label: 'سیم جوش، الکترود و گاز' },
    { id: 'PRESS_LUBRICANTS', label: 'روغن کشش ورق و هیدرولیک' },
    { id: 'DIE_SPAREPARTS', label: 'قطعات مصرفی قالب (سنبه/فنر)' },
    { id: 'COATING_CHEMICALS', label: 'مواد شیمیایی و پوشش ED' },
    { id: 'PACKAGING_SAFETY', label: 'تسمه پالت و نایلون VCI' },
  ];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 text-slate-900 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base lg:text-lg font-bold text-slate-900">
                ماژول پیش‌بینی مواد مصرفی و ملزومات کارگاهی (Consumables & Supplies Forecasting)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-700 border border-cyan-500/30">
                ROP & Burn-Rate Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              پیش‌بینی هوشمند مصرف سیم جوش CO2، الکترود نقطه‌جوش، روغن کشش ورق، سنبه‌های قالب، رنگ ED و ملزومات بسته‌بندی بر اساس ضرب پرس و تیراژ دستور کارها
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleIssueRequisition()}
            disabled={creatingPr}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>صدور خودکار درخواست خرید کسری‌ها (PR)</span>
          </button>

          <button
            type="button"
            onClick={loadForecast}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-900 border border-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>محاسبه مجدد</span>
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
            <span>چاپ</span>
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

      {/* Horizon & Demand Growth Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            افق زمانی پیش‌بینی:
          </span>
          {[
            { days: 15, label: '۱۵ روز آینده (دو هفته)' },
            { days: 30, label: '۳۰ روز آینده (یک ماه)' },
            { days: 60, label: '۶۰ روز آینده (دو ماه)' },
            { days: 90, label: '۹۰ روز آینده (فصلی)' },
          ].map(h => (
            <button
              key={h.days}
              type="button"
              onClick={() => setHorizonDays(h.days)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                horizonDays === h.days
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            ضریب تغییر تیراژ برنامه تولید:
          </span>
          <div className="flex items-center gap-1.5">
            {[-10, 0, 15, 30, 50].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setGrowthPercent(g)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] cursor-pointer transition tabular-nums ${
                  growthPercent === g
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {g > 0 ? `+${toPersianDigits(g)}٪` : `${toPersianDigits(g)}٪`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Skeleton Loading State */}
      {loading && !data && (
        <ReportModuleSkeleton kpiCount={5} showChart={false} tableRows={6} tableColumns={9} />
      )}

      {/* 5 KPI Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-rose-500/40 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              اقلام بحرانی (نیاز به خرید فوری)
            </span>
            <div className="text-2xl font-black text-rose-400 font-mono tabular-nums mt-1">
              {toPersianDigits(data.criticalShortageCount)} <span className="text-xs font-sans font-normal text-slate-400">قلم</span>
            </div>
            <span className="text-[10px] text-rose-400/80 mt-1 block">پوشش کمتر از Lead-Time تامین‌کننده</span>
          </div>

          <div className="bg-white border border-amber-500/40 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-amber-400 font-bold block">رسیده به نقطه سفارش (ROP)</span>
            <div className="text-2xl font-black text-amber-400 font-mono tabular-nums mt-1">
              {toPersianDigits(data.belowReorderPointCount)} <span className="text-xs font-sans font-normal text-slate-400">قلم</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">نیازمند ثبت سفارش شارژ مجدد</span>
          </div>

          <div className="bg-white border border-emerald-500/30 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-emerald-400 font-bold block">موجودی کافی و ایمن</span>
            <div className="text-2xl font-black text-emerald-400 font-mono tabular-nums mt-1">
              {toPersianDigits(data.adequateStockCount)} <span className="text-xs font-sans font-normal text-slate-400">قلم</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">پوشش کامل افق {toPersianDigits(data.horizonDays)} روزه</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-cyan-400 font-bold block">کمترین روز پوشش موجودی</span>
            <div className="text-xl font-black text-slate-900 font-mono tabular-nums mt-1">
              {data.lowestDaysOfSupplyItem ? `${toPersianDigits(data.lowestDaysOfSupplyItem.daysRemaining)} روز` : '-'}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block truncate" title={data.lowestDaysOfSupplyItem?.name}>
              {data.lowestDaysOfSupplyItem?.name || '-'}
            </span>
          </div>

          <div className="bg-white border border-indigo-500/30 rounded-xl p-3.5 text-right">
            <span className="text-[11px] text-indigo-400 font-bold block">برآورد بودجه خرید پیشنهادی</span>
            <div className="text-lg font-black text-indigo-700 font-mono tabular-nums mt-1">
              {formatNumber(Math.round(data.totalSuggestedProcurementBudgetRials / 1000000))} <span className="text-[10px] font-sans font-normal text-slate-400">میلیون ریال</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">برای پوشش کسری و نقطه سفارش</span>
          </div>
        </div>
      )}

      {/* Sub-navigation: Forecast Table vs Purchase Requisitions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2 no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubView('forecast_table')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubView === 'forecast_table'
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-slate-400 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>ماتریس پیش‌بینی مصرف و نقطه سفارش (ROP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('requisitions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubView === 'requisitions'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-400 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>درخواست‌های خرید تدارکات صادره (PR)</span>
            {data && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/20 text-slate-900 tabular-nums">
                {toPersianDigits(data.activeRequisitions.length)}
              </span>
            )}
          </button>
        </div>

        {activeSubView === 'forecast_table' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام یا کد کالای مصرفی..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}
      </div>

      {activeSubView === 'forecast_table' ? (
        <>
          {/* Category Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-print">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-slate-100 text-cyan-700 border border-cyan-500/40 font-bold'
                    : 'bg-white text-slate-400 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Consumables Forecast Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm printable-area">
            {/* Print Header shown only during print */}
            <div className="hidden print:block p-4 border-b border-slate-300 text-center">
              <span className="text-xs text-slate-600 block">شرکت تولیدی قطعات خودرو (زنجیره تامین ساپکو)</span>
              <h2 className="text-base font-bold text-slate-900 mt-1">گزارش رسمی پیش‌بینی مواد مصرفی و ملزومات کارگاهی (Consumables ROP)</h2>
              <span className="text-[10px] text-slate-500 font-mono">افق پیش‌بینی: {toPersianDigits(horizonDays)} روز کاری</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold text-xs">
                  <tr>
                    <th className="py-3 px-3">کد و شرح کالای مصرفی</th>
                    <th className="py-3 px-3">مبنای مهندسی مصرف</th>
                    <th className="py-3 px-3 text-center">مصرف روزانه</th>
                    <th className="py-3 px-3 text-center text-cyan-700 font-bold">
                      نیاز {toPersianDigits(horizonDays)} روزه
                    </th>
                    <th className="py-3 px-3 text-center text-slate-900 font-bold">موجودی فعلی</th>
                    <th className="py-3 px-3 text-center text-slate-800">نقطه سفارش (ROP)</th>
                    <th className="py-3 px-3 text-center font-bold text-slate-800">پوشش موجودی (روز)</th>
                    <th className="py-3 px-3 text-center text-slate-800">تاریخ اتمام</th>
                    <th className="py-3 px-3 text-center text-amber-700 font-black">پیشنهاد خرید</th>
                    <th className="py-3 px-3 text-center text-slate-800">وضعیت</th>
                    <th className="py-3 px-3 text-center text-slate-800 no-print">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-100 transition">
                      <td className="py-3 px-3 font-sans">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.code} • <span className="font-sans text-cyan-400">{item.categoryLabelFa}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <div className="text-[11px] text-slate-700">{item.consumptionDriverLabelFa}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ضریب: {toPersianDigits(item.standardRatePerDriverUnit)} {item.unit} (پرت: {toPersianDigits(item.wasteAllowancePercent)}٪)
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700">
                        {toPersianDigits(item.dailyBurnRate)} <span className="text-[10px] text-slate-500">{item.unit}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-cyan-400 text-sm">
                        {formatNumber(item.forecastedGrossRequirement)} <span className="text-[10px] font-normal">{item.unit}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {formatNumber(item.currentStock)} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700">
                        {formatNumber(item.reorderPoint)}
                        <span className="block text-[10px] text-slate-500">اطمینان: {formatNumber(item.minSafetyStock)}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-black">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            item.daysOfSupplyRemaining <= item.supplierLeadTimeDays
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : item.daysOfSupplyRemaining <= 20
                              ? 'bg-amber-500/15 text-amber-800 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {toPersianDigits(item.daysOfSupplyRemaining)} روز
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-[11px] text-slate-700">
                        {item.estimatedRunOutDateFa}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-amber-400 text-sm">
                        {item.suggestedOrderQty > 0 ? (
                          <div>
                            <span>{formatNumber(item.suggestedOrderQty)} {item.unit}</span>
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {formatNumber(Math.round(item.estimatedTotalOrderCostRials / 1000000))} م.ریال
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        {item.status === 'CRITICAL_SHORTAGE' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-700 border border-rose-500/30">
                            کسری فوری
                          </span>
                        )}
                        {item.status === 'BELOW_ROP' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 border border-amber-500/30">
                            نقطه سفارش
                          </span>
                        )}
                        {item.status === 'ADEQUATE' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                            موجودی کافی
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="تنظیم موجودی یا ضریب مصرف"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-700 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {item.suggestedOrderQty > 0 && (
                            <button
                              type="button"
                              onClick={() => handleIssueRequisition([item.code])}
                              title="صدور درخواست خرید برای این قلم"
                              className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-700 hover:text-slate-900 border border-emerald-500/30 text-[10px] font-bold cursor-pointer transition"
                            >
                              خرید
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Active Purchase Requisitions View */
        <div className="space-y-4">
          {data?.activeRequisitions.map(pr => (
            <div key={pr.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-emerald-400">{pr.prNumber}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                      {pr.status === 'APPROVED_BY_PLANT_MGR' ? 'تأیید مدیریت کارخانه' : 'در انتظار تأیید تدارکات'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    درخواست‌کننده: {pr.requestedBy} • تاریخ صدور: <span className="font-mono">{pr.createdAtFa}</span>
                  </div>
                </div>
                <div className="text-left font-mono tabular-nums">
                  <span className="text-[11px] text-slate-400 block font-sans">جمع برآورد مالی سفارش:</span>
                  <span className="text-base font-black text-amber-400">
                    {formatNumber(pr.totalEstimatedCostRials)} ریال
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="py-2 px-3">کد کالا</th>
                      <th className="py-2 px-3">شرح کالای مصرفی</th>
                      <th className="py-2 px-3 text-center">موجودی فعلی</th>
                      <th className="py-2 px-3 text-center text-emerald-400">مقدار سفارش</th>
                      <th className="py-2 px-3">تأمین‌کننده منتخب</th>
                      <th className="py-2 px-3 text-left">برآورد مبلغ (ریال)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {pr.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-cyan-400 font-bold">{line.consumableCode}</td>
                        <td className="py-2 px-3 font-sans text-slate-900">{line.consumableName}</td>
                        <td className="py-2 px-3 text-center text-slate-400">
                          {formatNumber(line.currentStock)} {line.unit}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-400">
                          {formatNumber(line.orderQuantity)} {line.unit}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-700">{line.supplierName}</td>
                        <td className="py-2 px-3 text-left text-slate-900 font-bold">
                          {formatNumber(line.estimatedCostRials)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pr.notes && (
                <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  توضیحات: {pr.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Consumable Stock / Rate Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">تنظیم موجودی و ضریب مصرف مهندسی</h3>
                <p className="text-xs text-slate-400 mt-0.5">{editingItem.name}</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  موجودی آزاد فعلی در انبار ({editingItem.unit}):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editStockVal}
                  onChange={e => setEditStockVal(Number(e.target.value))}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  ضریب مصرف استاندارد ({editingItem.consumptionDriverLabelFa}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editRateVal}
                  onChange={e => setEditRateVal(Number(e.target.value))}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  حداقل موجودی اطمینان (Safety Stock - {editingItem.unit}):
                </label>
                <input
                  type="number"
                  step="1"
                  value={editSafetyVal}
                  onChange={e => setEditSafetyVal(Number(e.target.value))}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                >
                  {savingEdit ? 'در حال ذخیره...' : 'ذخیره و بازمحاسبه پیش‌بینی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
