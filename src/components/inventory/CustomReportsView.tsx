import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Bookmark,
  Plus,
  RefreshCw,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
  Printer,
  GitBranch,
  Boxes,
  Scale,
} from 'lucide-react';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { exportToCsv } from '../../utils/csvExport';

interface CoilItem {
  id: string;
  coilId: string;
  coilPackNumber: string;
  materialGrade: string;
  thicknessMm: number;
  widthMm: number;
  remainingWeightKg: number;
  originalWeightKg: number;
  warehouseName: string;
  allocations?: Array<{ contractId: string; contractNumber: string; allocatedWeightKg: number }>;
}

const REPORT_TYPES = [
  {
    id: 'THREE_TIER_STOCK',
    title: '۱. کنترل موجودی ۳ سطحی پس از مصرف (مواد اولیه، نیمه‌ساخته WIP، محصول نهایی)',
    badge: 'کنترل موجودی پس از مصرف',
    desc: 'نمایش دقیق کل ورود به سازمان، کل مصرف ثبت‌شده در تولید و مانده فعلی هر قطعه در هر ۳ سطح',
  },
  {
    id: 'END_TO_END_TRACEABILITY',
    title: '۲. زنجیره رهگیری سرتاسری اسناد و مواد (از ورود کلاف/ذوب تا مصرف و محصول)',
    badge: 'رهگیری از ابتدا تا مصرف',
    desc: 'ردیابی کامل شماره سند، نوع عملیات، شماره کلاف، شماره ذوب (Heat No) و دستور کار تولید',
  },
  {
    id: 'BOM_BACKFLUSH_VARIANCE',
    title: '۳. تطبیق مصرف واقعی مواد و اتصالات با ضرایب مهندسی BOM (Backflush)',
    badge: 'انحراف مصرف BOM',
    desc: 'مقایسه مصرف ورق DC01A، مهره جوشی M6 (۱۵ عدد) و پیچ ۶×۲۰ (۲ عدد) در برابر استاندارد BOM',
  },
  {
    id: 'COILS_SUMMARY',
    title: '۴. خلاصه وضعیت کلاف‌ها و رول‌های ورق (وزن اولیه، مصرف‌شده و مانده)',
    badge: 'رول و کلاف ورق',
    desc: 'گزارش تفکیکی رول‌های DC01A به همراه وزن اولیه، وزن مصرف‌شده در برش و مانده قابل مصرف',
  },
  {
    id: 'STOCK_BY_WAREHOUSE',
    title: '۵. موجودی تفکیکی انبارها و ایستگاه‌های کاری (کاردکس انبار)',
    badge: 'تفکیک انبار',
    desc: 'موجودی فیزیکی، آزاد (ATP) و رزرو به تفکیک انبار مواد، پای کار جوش (WIP) و محصول نهایی',
  },
];

export const CustomReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<string>('THREE_TIER_STOCK');
  const [materialGrade, setMaterialGrade] = useState('');
  const [coilPackNumber, setCoilPackNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [ownership, setOwnership] = useState('');
  const [contractId, setContractId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    columns: string[];
    rows: any[];
    summary: Record<string, any>;
  }>({ columns: [], rows: [], summary: {} });

  // Dynamic Column Selection for Custom Report Building (توانایی ساختن گزارش سفارشی)
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);

  const [allCoils, setAllCoils] = useState<CoilItem[]>([]);
  const [contractsList, setContractsList] = useState<Array<{ id: string; contractNumber: string; title: string }>>([]);

  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [configName, setConfigName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchFilterMetadata = async () => {
    try {
      const [coilsRes, contractsRes] = await Promise.all([
        fetch('/api/inventory/coils'),
        fetch('/api/inventory/contracts'),
      ]);
      const coilsJson = await coilsRes.json();
      const contractsJson = await contractsRes.json();

      if (coilsJson.success) {
        setAllCoils(coilsJson.data || []);
      }
      if (contractsJson.success) {
        setContractsList(contractsJson.data || []);
      }
    } catch (err) {
      console.error('Error fetching metadata for reports:', err);
    }
  };

  useEffect(() => {
    fetchFilterMetadata();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('reportType', reportType);
      if (materialGrade) params.append('materialGrade', materialGrade);
      if (coilPackNumber) params.append('coilPackNumber', coilPackNumber);
      if (warehouseId) params.append('warehouseId', warehouseId);
      if (ownership) params.append('ownership', ownership);
      if (contractId) params.append('contractId', contractId);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/inventory/custom-reports?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        const cols: string[] = data.columns || [];
        setReportData({
          columns: cols,
          rows: data.data || [],
          summary: data.summary || {},
        });
        setSelectedColumns(cols);
      }
    } catch (err) {
      console.error('Error fetching custom report:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedConfigs = async () => {
    try {
      const res = await fetch('/api/inventory/report-configs');
      const data = await res.json();
      if (data.success) {
        setSavedConfigs(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching report configs:', err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, materialGrade, coilPackNumber, warehouseId, ownership, contractId, searchTerm]);

  useEffect(() => {
    fetchSavedConfigs();
  }, []);

  const visibleColumns = useMemo(() => {
    if (selectedColumns.length === 0) return reportData.columns;
    return reportData.columns.filter(c => selectedColumns.includes(c));
  }, [reportData.columns, selectedColumns]);

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(col)) {
        if (prev.length <= 1) return prev; // keep at least 1 column
        return prev.filter(c => c !== col);
      }
      return [...prev, col];
    });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configName.trim()) return;

    try {
      const res = await fetch('/api/inventory/report-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: configName,
          reportType,
          selectedColumns: visibleColumns,
          filters: { materialGrade, coilPackNumber, warehouseId, ownership, contractId, searchTerm },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigName('');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchSavedConfigs();
      }
    } catch (err) {
      console.error('Error saving config:', err);
    }
  };

  const handleExportCustomCsv = () => {
    if (reportData.rows.length === 0) return;
    const headers = visibleColumns;
    const rows = reportData.rows.map(row =>
      visibleColumns.map(col => (row[col] !== undefined && row[col] !== null ? String(row[col]) : ''))
    );
    exportToCsv(`KPIMS_CUSTOM_${reportType}_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const activeReportMeta = REPORT_TYPES.find(r => r.id === reportType) || REPORT_TYPES[0];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header & Quick Dataset Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                گزارش‌ساز پویا و سفارشی (کنترل موجودی پس از مصرف و رهگیری سرتاسری اسناد)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                انتخاب منبع داده، شخصی‌سازی ستون‌های گزارش، فیلتر زنده، ذخیره قالب گزارش و خروجی اکسل/چاپ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setShowColumnSelector(prev => !prev)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                showColumnSelector
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>انتخاب ستون‌ها ({toPersianDigits(visibleColumns.length)} از {toPersianDigits(reportData.columns.length)})</span>
            </button>

            <button
              type="button"
              onClick={fetchReport}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ رسمی</span>
            </button>

            <button
              type="button"
              onClick={handleExportCustomCsv}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>خروجی اکسل (CSV)</span>
            </button>
          </div>
        </div>

        {/* 5 Core Report Type Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {REPORT_TYPES.map(rt => {
            const isSelected = reportType === rt.id;
            return (
              <button
                key={rt.id}
                type="button"
                onClick={() => setReportType(rt.id)}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div>
                  <span
                    className={`text-[10px] font-bold block mb-1 ${
                      isSelected ? 'text-emerald-300' : 'text-emerald-700'
                    }`}
                  >
                    {rt.badge}
                  </span>
                  <div className="text-xs font-bold leading-snug">{rt.title}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Column Picker Drawer (Progressive Disclosure) */}
        {showColumnSelector && reportData.columns.length > 0 && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                ستون‌های دلخواه خود را برای ساخت گزارش انتخاب کنید:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedColumns(reportData.columns)}
                  className="text-[11px] text-emerald-700 hover:underline font-bold cursor-pointer"
                >
                  انتخاب همه ستون‌ها
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {reportData.columns.map(col => {
                const checked = visibleColumns.includes(col);
                return (
                  <label
                    key={col}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                      checked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleColumn(col)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{col}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Save Template Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجو در مقادیر گزارش (کد قطعه، شماره سند، شماره ذوب HT-1404-ECU01، کلاف...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none"
            >
              <option value="">همه انبارها و ایستگاه‌ها</option>
              <option value="WH-RAW">انبار مرکزی مواد اولیه و رول (WH-RAW)</option>
              <option value="WH-WIP-WELD">انبار پای کار جوش و مونتاژ (WH-WIP-WELD)</option>
              <option value="WH-FINISHED">انبار محصولات نهایی (WH-FINISHED)</option>
            </select>
          </div>

          <form onSubmit={handleSaveConfig} className="lg:col-span-4 flex items-center gap-2">
            <input
              type="text"
              value={configName}
              onChange={e => setConfigName(e.target.value)}
              placeholder="نام قالب گزارش جهت ذخیره..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ذخیره گزارش</span>
            </button>
          </form>
        </div>

        {saveSuccess && (
          <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>قالب گزارش سفارشی شما با موفقیت ذخیره شد.</span>
          </div>
        )}

        {/* Saved Report Templates */}
        {savedConfigs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-amber-600" />
              گزارش‌های ذخیره‌شده شما:
            </span>
            {savedConfigs.map(cfg => (
              <button
                key={cfg.id}
                type="button"
                onClick={() => {
                  setReportType(cfg.reportType);
                  if (Array.isArray(cfg.selectedColumns) && cfg.selectedColumns.length > 0) {
                    setSelectedColumns(cfg.selectedColumns);
                  }
                  if (cfg.filters) {
                    setMaterialGrade(cfg.filters.materialGrade || '');
                    setCoilPackNumber(cfg.filters.coilPackNumber || '');
                    setWarehouseId(cfg.filters.warehouseId || '');
                    setOwnership(cfg.filters.ownership || '');
                    setContractId(cfg.filters.contractId || '');
                    setSearchTerm(cfg.filters.searchTerm || '');
                  }
                }}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
              >
                {cfg.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-700" />
            <h4 className="text-sm font-bold text-slate-900">{activeReportMeta.title}</h4>
            <span className="text-xs text-slate-500 font-mono">
              ({toPersianDigits(reportData.rows.length)} ردیف)
            </span>
          </div>
          <p className="text-xs text-slate-500">{activeReportMeta.desc}</p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-500 text-sm">در حال تولید گزارش...</div>
          ) : reportData.rows.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              هیچ رکوردی مطابق با فیلترهای انتخابی یافت نشد.
            </div>
          ) : (
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="p-3 w-10 text-center">#</th>
                  {visibleColumns.map((col, idx) => (
                    <th key={idx} className="p-3 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {reportData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center font-mono text-slate-400">
                      {toPersianDigits(rIdx + 1)}
                    </td>
                    {visibleColumns.map((col, cIdx) => {
                      const val = row[col];
                      const isNumeric = typeof val === 'number';
                      const strVal = val !== undefined && val !== null ? String(val) : '-';
                      const isHighlightCol =
                        col.includes('موجودی فعلی پس از مصرف') ||
                        col.includes('مصرف واقعی') ||
                        col.includes('شماره سند');

                      return (
                        <td
                          key={cIdx}
                          className={`p-3 whitespace-nowrap ${
                            isNumeric ? 'font-mono font-bold tabular-nums' : ''
                          } ${isHighlightCol ? 'text-emerald-800 font-bold bg-emerald-50/40' : ''}`}
                        >
                          {isNumeric ? formatNumber(val) : strVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
