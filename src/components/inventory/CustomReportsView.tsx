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
  Building2,
  Calendar,
  CheckCircle2,
  Package,
  Boxes,
  Tag,
  Scale,
} from 'lucide-react';
import { formatNumber, formatWeightKg, toPersianDigits } from '../../utils/formatters';

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

export const CustomReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<string>('COILS_SUMMARY');
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

  // Real-time coils list for dynamic coil-pack filtering
  const [allCoils, setAllCoils] = useState<CoilItem[]>([]);
  const [contractsList, setContractsList] = useState<Array<{ id: string; contractNumber: string; title: string }>>([]);

  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [configName, setConfigName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch coils and contracts for filter dropdowns
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

  // Compute dynamic coil packs matching current materialGrade filter
  const matchingCoilPacks = useMemo(() => {
    let filtered = allCoils;
    if (materialGrade) {
      filtered = filtered.filter(c => c.materialGrade === materialGrade);
    }
    if (contractId) {
      filtered = filtered.filter(c =>
        (c.allocations || []).some(a => a.contractId === contractId || a.contractNumber === contractId)
      );
    }
    const packsMap = new Map<string, { pack: string; grade: string; thickness: number; remainingKg: number }>();
    filtered.forEach(c => {
      if (c.coilPackNumber && !packsMap.has(c.coilPackNumber)) {
        packsMap.set(c.coilPackNumber, {
          pack: c.coilPackNumber,
          grade: c.materialGrade,
          thickness: c.thicknessMm,
          remainingKg: c.remainingWeightKg,
        });
      }
    });
    return Array.from(packsMap.values());
  }, [allCoils, materialGrade, contractId]);

  // Compute spec-based aggregation: "کلا من چند تا کویل با چه مشخصات کالایی دارم"
  const aggregatedSpecs = useMemo(() => {
    let list = allCoils;
    if (materialGrade) list = list.filter(c => c.materialGrade === materialGrade);
    if (coilPackNumber) list = list.filter(c => c.coilPackNumber.toLowerCase().includes(coilPackNumber.toLowerCase()));
    if (contractId) {
      list = list.filter(c =>
        (c.allocations || []).some(a => a.contractId === contractId || a.contractNumber === contractId)
      );
    }

    const map = new Map<
      string,
      {
        grade: string;
        thicknessMm: number;
        widthMm: number;
        coilCount: number;
        packs: string[];
        totalOriginalKg: number;
        totalRemainingKg: number;
      }
    >();

    list.forEach(c => {
      const key = `${c.materialGrade}_${c.thicknessMm}_${c.widthMm}`;
      if (!map.has(key)) {
        map.set(key, {
          grade: c.materialGrade,
          thicknessMm: c.thicknessMm,
          widthMm: c.widthMm,
          coilCount: 0,
          packs: [],
          totalOriginalKg: 0,
          totalRemainingKg: 0,
        });
      }
      const item = map.get(key)!;
      item.coilCount += 1;
      if (c.coilPackNumber && !item.packs.includes(c.coilPackNumber)) {
        item.packs.push(c.coilPackNumber);
      }
      item.totalOriginalKg += c.originalWeightKg || 0;
      item.totalRemainingKg += c.remainingWeightKg || 0;
    });

    return Array.from(map.values());
  }, [allCoils, materialGrade, coilPackNumber, contractId]);

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
        setReportData({
          columns: data.columns || [],
          rows: data.data || [],
          summary: data.summary || {},
        });
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

  // Unique grades combining standard grades and any grades present in allCoils
  const allGrades = useMemo(() => {
    const base = ['DC01A', 'DC04', 'ST14', 'ST12', 'DX51D+Z140', 'ST37', 'DC06'];
    const set = new Set<string>(base);
    allCoils.forEach(c => {
      if (c.materialGrade) set.add(c.materialGrade);
    });
    return Array.from(set);
  }, [allCoils]);

  useEffect(() => {
    fetchFilterMetadata();
    fetchReport();
  }, [reportType, materialGrade, coilPackNumber, warehouseId, ownership, contractId, searchTerm]);

  useEffect(() => {
    fetchSavedConfigs();
  }, []);

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

  const handleExportCsv = () => {
    const dataset =
      reportType === 'COILS_SUMMARY' || reportType === 'COIL_PACK_INQUIRY'
        ? 'PHYSICAL_COILS'
        : 'STOCK_BALANCES';
    window.location.href = `/api/inventory/export?dataset=${dataset}`;
  };

  return (
    <div className="space-y-5 text-right text-slate-900" dir="rtl">
      {/* Report Type Selector & Action Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-medium">نوع گزارش تحلیلی:</span>
          {[
            { id: 'COILS_SUMMARY', label: 'گزارش A: تجمیعی کلاف‌ها و مشخصات فنی' },
            { id: 'COIL_PACK_INQUIRY', label: 'گزارش B: استعلام کویل‌پک‌های ساپکو' },
            { id: 'CONTRACT_INVENTORY', label: 'گزارش C: موجودی قراردادهای ساپکو/مشتری' },
            { id: 'WAREHOUSE_STOCK', label: 'گزارش D: موجودی تفکیک انبار' },
            { id: 'OWNERSHIP_REPORT', label: 'گزارش E: تفکیک مالکیت (امانی/ملکی)' },
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setReportType(type.id)}
              className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                reportType === type.id
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 rounded text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>خروجی اکسل امن (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          {/* Free-text Search */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">جستجوی کویل / کالا</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="شماره کویل، پک، نام قطعه..."
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Material Grade */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">گرید ورق / جنس</label>
            <select
              value={materialGrade}
              onChange={e => {
                setMaterialGrade(e.target.value);
                setCoilPackNumber('');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="">همه گریدها</option>
              {allGrades.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Coil Pack Number */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              شماره کویل‌پک {materialGrade && <span className="text-blue-600 font-mono">({materialGrade})</span>}
            </label>
            <select
              value={coilPackNumber}
              onChange={e => setCoilPackNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="">همه کویل‌پک‌ها ({toPersianDigits(matchingCoilPacks.length)})</option>
              {matchingCoilPacks.map(p => (
                <option key={p.pack} value={p.pack}>
                  {p.pack} ({p.grade} - {p.thickness}mm)
                </option>
              ))}
            </select>
          </div>

          {/* Contract Filter */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">قرارداد ساپکو / مشتری</label>
            <select
              value={contractId}
              onChange={e => setContractId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="">همه قراردادها</option>
              {contractsList.map(c => (
                <option key={c.id} value={c.contractNumber}>
                  {c.contractNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">انبار هدف</label>
            <select
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="">همه انبارها</option>
              <option value="WH-RAW">انبار مرکزی رول و ورق ساپکو</option>
              <option value="WH-WIP-STAMP">انبار پای کار سالن پرس (WIP)</option>
              <option value="WH-WIP-WELD">انبار پای کار جوشکاری</option>
              <option value="WH-FINISHED">انبار محصولات نهایی</option>
            </select>
          </div>

          {/* Ownership */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">مالکیت متریال</label>
            <select
              value={ownership}
              onChange={e => setOwnership(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="">همه انواع مالکیت</option>
              <option value="SAPCO_SUPPLIER_OWNED">امانی ساپکو</option>
              <option value="CUSTOMER_SUPPLIED">تأمینی مشتری</option>
              <option value="COMPANY_OWNED">ملکی کارخانه</option>
              <option value="THIRD_PARTY_OWNED">شخص ثالث</option>
            </select>
          </div>

          {/* Apply / Refresh */}
          <div className="flex items-end">
            <button
              onClick={() => {
                fetchFilterMetadata();
                fetchReport();
              }}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی گزارش</span>
            </button>
          </div>
        </div>

        {/* Dynamic Quick Tag Selection for Coil Packs */}
        {matchingCoilPacks.length > 0 && (
          <div className="pt-2 border-t border-slate-200 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Tag className="w-3 h-3 text-blue-400" />
              کویل‌پک‌های متناظر با جنس انتخاب‌شده:
            </span>
            {matchingCoilPacks.map(p => (
              <button
                key={p.pack}
                type="button"
                onClick={() => setCoilPackNumber(coilPackNumber === p.pack ? '' : p.pack)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
                  coilPackNumber === p.pack
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-200'
                }`}
              >
                {p.pack} ({formatNumber(p.remainingKg)} kg)
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SPEC-BASED AGGREGATION SUMMARY CARD: "کلا من چند تا کویل با چه مشخصات کالایی دارم" */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900">
              تجمیع موجودی کلاف‌ها بر اساس مشخصات کالا (گرید، ضخامت، عرض و پکینگ)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            پاسخ به سوال کاربردی: «کلاً چند تا کویل با چه مشخصاتی در انبار موجود است؟»
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 text-slate-400 border-b border-slate-200 font-medium">
              <tr>
                <th className="py-2 px-3">گرید ورق فولادی</th>
                <th className="py-2 px-3">ضخامت</th>
                <th className="py-2 px-3">عرض</th>
                <th className="py-2 px-3 text-center">تعداد کلاف (رول)</th>
                <th className="py-2 px-3">کویل‌پک‌های موجود</th>
                <th className="py-2 px-3 text-left font-mono">مجموع وزن اولیه (kg)</th>
                <th className="py-2 px-3 text-left font-mono">مانده فعلی در انبار (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {aggregatedSpecs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-500">
                    کلافی با مشخصات تعیین‌شده در انبار یافت نشد.
                  </td>
                </tr>
              ) : (
                aggregatedSpecs.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-100 font-sans">
                    <td className="py-2 px-3 font-bold text-blue-700">{item.grade}</td>
                    <td className="py-2 px-3 font-mono">{item.thicknessMm} mm</td>
                    <td className="py-2 px-3 font-mono">{item.widthMm} mm</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-700 rounded font-mono font-bold">
                        {toPersianDigits(item.coilCount)} کلاف
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.packs.map(p => (
                          <span key={p} className="px-1.5 py-0.2 bg-slate-50 border border-slate-200 text-[10px] font-mono rounded text-slate-700">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-left font-mono text-slate-400">
                      {formatNumber(item.totalOriginalKg)} kg
                    </td>
                    <td className="py-2 px-3 text-left font-mono text-emerald-400 font-bold">
                      {formatNumber(item.totalRemainingKg)} kg
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary KPI Badges */}
      {reportData.summary && Object.keys(reportData.summary).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-6 text-xs">
          <div className="text-slate-400 font-medium">خلاصه تراز فیلترشده:</div>
          {reportData.summary.totalCoils !== undefined && (
            <div>
              <span className="text-slate-400">تعداد کلاف: </span>
              <span className="font-bold font-mono text-slate-900">{toPersianDigits(reportData.summary.totalCoils)}</span>
            </div>
          )}
          {reportData.summary.totalWeightKg !== undefined && (
            <div>
              <span className="text-slate-400">مجموع مانده وزن: </span>
              <span className="font-bold font-mono text-emerald-400">{formatWeightKg(reportData.summary.totalWeightKg)}</span>
            </div>
          )}
          {reportData.summary.totalPhysicalWeightKg !== undefined && (
            <div>
              <span className="text-slate-400">مجموع وزن فیزیکی: </span>
              <span className="font-bold font-mono text-emerald-400">{formatWeightKg(reportData.summary.totalPhysicalWeightKg)}</span>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-400 border-b border-slate-200 font-medium">
              <tr>
                {reportData.columns.map((col, idx) => (
                  <th key={idx} className="py-2.5 px-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.columns.length || 6} className="py-8 text-center text-slate-500">
                    داده‌ای منطبق با فیلترهای گزارش یافت نشد.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-100 transition-colors">
                    {Object.values(row).map((val: any, valIdx) => (
                      <td key={valIdx} className="py-2.5 px-3">
                        {typeof val === 'number' ? (
                          <span className="font-mono">{formatNumber(val)}</span>
                        ) : (
                          <span>{String(val ?? '—')}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
