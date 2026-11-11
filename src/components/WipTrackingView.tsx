import React, { useState } from 'react';
import {
  Boxes,
  ArrowRightLeft,
  Clock,
  AlertTriangle,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Cpu,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { StageInventorySummary, FACTORY_STAGES, Part } from '../types/inventory';
import { formatNumber, formatWeightKg, toPersianDigits } from '../utils/formatters';

interface WipTrackingViewProps {
  balances: StageInventorySummary[];
  parts: Part[];
  onOpenTransfer: (partId?: string, stageId?: string) => void;
  onRefresh: () => Promise<void>;
  loading: boolean;
}

export const WipTrackingView: React.FC<WipTrackingViewProps> = ({
  balances,
  parts,
  onOpenTransfer,
  onRefresh,
  loading,
}) => {
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // WIP stages are 1 to 8 (excluding STAGE_RAW_STORE and STAGE_FINISHED_STORE and STAGE_SCRAP_YARD)
  const wipStageConfigs = FACTORY_STAGES.filter(
    s => s.type === 'WIP'
  );

  const wipBalances = balances.filter(b => {
    const isWipStage = wipStageConfigs.some(s => s.id === b.stageId);
    if (!isWipStage) return false;
    if (selectedStage !== 'ALL' && b.stageId !== selectedStage) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        b.partName.toLowerCase().includes(q) ||
        b.partCode.toLowerCase().includes(q) ||
        b.stageName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalWipQty = wipBalances.reduce((acc, b) => acc + b.totalQty, 0);
  const totalWipKg = wipBalances.reduce((acc, b) => acc + b.totalKg, 0);
  const totalInTransit = wipBalances.reduce((acc, b) => acc + b.inTransitQty, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">کنترل کار در جریان ساخت (WIP Tracking)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            رهگیری موجودی مرحله‌ای، محموله‌های در حال انتقال بین‌خطوط، موجودی قابل استفاده و جلوگیری از دپوی مازاد
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenTransfer()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>ثبت انتقال بین‌مراحل</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>کل موجودی کار در جریان</span>
            <Boxes className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {formatNumber(totalWipQty)}
            <span className="text-xs font-normal text-slate-400 mr-1.5">قطعه نیمه‌ساخته</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>وزن کل فلزی WIP</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {formatWeightKg(totalWipKg)}
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>در حال انتقال بین ایستگاه‌ها</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {formatNumber(totalInTransit)}
            <span className="text-xs font-normal text-slate-400 mr-1.5">عدد (در ترانزیت)</span>
          </div>
        </div>
      </div>

      {/* Visual Stage Stepper Pipeline */}
      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="text-xs font-bold text-slate-400 mb-3">زنجیره ایستگاه‌های ۸ گانه خطوط تولید کارخانه:</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {wipStageConfigs.map((stage, idx) => {
            const countInStage = balances
              .filter(b => b.stageId === stage.id)
              .reduce((acc, b) => acc + b.totalQty, 0);
            const isSelected = selectedStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(isSelected ? 'ALL' : stage.id)}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-500 mb-1">مرحله ۰{idx + 1}</div>
                <div className="text-xs font-bold truncate text-slate-200">{stage.name.replace(/ایستگاه \d+: /, '')}</div>
                <div className="text-sm font-black text-purple-400 mt-2">
                  {formatNumber(countInStage)} <span className="text-[10px] font-normal text-slate-500">عدد</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی قطعه، کد یا مرحله..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {selectedStage !== 'ALL' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-400 font-semibold">فیلتر فعال روی ایستگاه انتخابی</span>
            <button
              onClick={() => setSelectedStage('ALL')}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              نمایش همه ایستگاه‌ها
            </button>
          </div>
        )}
      </div>

      {/* WIP Balances Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3.5">ایستگاه و مرحله ساخت</th>
                <th className="p-3.5">کد قطعه</th>
                <th className="p-3.5">نام قطعه نیمه‌ساخته</th>
                <th className="p-3.5">موجودی فیزیکی</th>
                <th className="p-3.5">در حال انتقال (ترانزیت)</th>
                <th className="p-3.5">موجودی قابل استفاده</th>
                <th className="p-3.5">وزن فلزی (kg)</th>
                <th className="p-3.5">درصد ضایعات مرحله</th>
                <th className="p-3.5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {wipBalances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    قطعه نیمه‌ساخته‌ای با این فیلتر یافت نشد.
                  </td>
                </tr>
              ) : (
                wipBalances.map((item, idx) => (
                  <tr key={`${item.stageId}-${item.partId}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                      {item.stageName}
                    </td>
                    <td className="p-3.5 font-mono text-purple-400 font-semibold">{item.partCode}</td>
                    <td className="p-3.5 font-medium text-slate-200">{item.partName}</td>
                    <td className="p-3.5 font-bold text-white">
                      {formatNumber(item.totalQty)} {item.unit}
                    </td>
                    <td className="p-3.5 text-amber-400 font-bold">
                      {item.inTransitQty > 0 ? `${formatNumber(item.inTransitQty)} عدد` : '—'}
                    </td>
                    <td className="p-3.5 font-bold text-emerald-400">
                      {formatNumber(item.usableQty)} {item.unit}
                    </td>
                    <td className="p-3.5 font-mono">{formatWeightKg(item.totalKg)}</td>
                    <td className="p-3.5">
                      {item.scrapQty > 0 ? (
                        <span className="text-rose-400 font-bold">
                          {toPersianDigits(item.scrapRatePercent)}٪ ({formatNumber(item.scrapQty)} عدد)
                        </span>
                      ) : (
                        <span className="text-slate-500">۰٪</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => onOpenTransfer(item.partId, item.stageId)}
                        className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        ارسال به مرحله بعد
                      </button>
                    </td>
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
