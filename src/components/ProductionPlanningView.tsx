import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Boxes,
  Layers,
  Filter,
  Search,
  ChevronLeft,
} from 'lucide-react';
import { ProductionPlan, Part } from '../types/inventory';
import { formatNumber, toPersianDigits } from '../utils/formatters';
import { formatToJalali } from '../utils/jalali';

interface ProductionPlanningViewProps {
  plans: ProductionPlan[];
  parts: Part[];
  onRefresh: () => Promise<void>;
  loading: boolean;
}

export const ProductionPlanningView: React.FC<ProductionPlanningViewProps> = ({
  plans,
  parts,
  onRefresh,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Plan Form State
  const [title, setTitle] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [plannedQty, setPlannedQty] = useState<number>(1000);
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');

  const filteredPlans = plans.filter(p => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.partName.toLowerCase().includes(q) ||
        p.partCode.toLowerCase().includes(q) ||
        p.planNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedPartId || plannedQty <= 0) {
      setErrorMsg('لطفاً عنوان، قطعه و تیراژ برنامه را وارد نمایید.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          partId: selectedPartId,
          plannedQty: Number(plannedQty),
          priority: Number(priority),
          startDate,
          endDate,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در ثبت برنامه تولید');
      }

      setShowNewModal(false);
      setTitle('');
      setSelectedPartId('');
      setNotes('');
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'خطا در ثبت برنامه');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPlanned = plans.reduce((acc, p) => acc + p.plannedQty, 0);
  const totalProduced = plans.reduce((acc, p) => acc + p.producedQty, 0);
  const completionRate = totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">برنامه‌ریزی تولید خطوط پرس و مونتاژ</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            برنامه‌ریزی تیراژ هفتگی، ماهانه و تخصیص قطعات به سالن‌های پرس و مونتاژ بر اساس ظرفیت و سفارش ساپکو
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت برنامه تولید جدید</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>برنامه‌های در جریان</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {toPersianDigits(plans.filter(p => p.status === 'IN_PROGRESS').length)}
            <span className="text-xs font-normal text-slate-500 mr-1.5">برنامه فعال</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>مجموع تیراژ مصوب</span>
            <Boxes className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatNumber(totalPlanned)}
            <span className="text-xs font-normal text-slate-500 mr-1.5">عدد</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>تولید محقق‌شده</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {formatNumber(totalProduced)}
            <span className="text-xs font-normal text-slate-500 mr-1.5">عدد</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>درصد تحقق کل</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">
            {toPersianDigits(completionRate)}٪
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی برنامه تولید، قطعه یا کد..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'همه وضعیت‌ها' },
            { id: 'IN_PROGRESS', label: 'در حال اجرا' },
            { id: 'CONFIRMED', label: 'تایید شده' },
            { id: 'COMPLETED', label: 'تکمیل‌شده' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlans.map(plan => {
          const progress = plan.plannedQty > 0 ? Math.min(100, Math.round((plan.producedQty / plan.plannedQty) * 100)) : 0;
          return (
            <div
              key={plan.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {plan.planNumber}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {plan.priority === 3 && (
                      <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                        بحرانی ساپکو
                      </span>
                    )}
                    {plan.priority === 2 && (
                      <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                        فوری
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        plan.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : plan.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {plan.status === 'IN_PROGRESS'
                        ? 'در حال اجرا'
                        : plan.status === 'COMPLETED'
                        ? 'تکمیل‌شده'
                        : 'تاییدشده'}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">{plan.title}</h3>
                <div className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>{plan.partName}</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">پیشرفت تولید:</span>
                    <span className="font-bold text-slate-900">
                      {formatNumber(plan.producedQty)} از {formatNumber(plan.plannedQty)} عدد ({toPersianDigits(progress)}٪)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress >= 100 ? 'bg-emerald-600' : progress >= 50 ? 'bg-indigo-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>مهلت: {formatToJalali(plan.endDate)}</span>
                {plan.notes && <span className="text-slate-400 truncate max-w-[140px]">{plan.notes}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Plan Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-white">ثبت برنامه تولید جدید</h3>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">عنوان برنامه تولید</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تولید هفتگی براکت‌های تارا و پژو ۲۰۶"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">انتخاب قطعه هدف</label>
                <select
                  required
                  value={selectedPartId}
                  onChange={e => setSelectedPartId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- انتخاب قطعه از کاتالوگ --</option>
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name} ({p.carModel || 'ساپکو'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">تیراژ برنامه‌ریزی (عدد)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={plannedQty}
                    onChange={e => setPlannedQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">اولویت تولید</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>۱ - عادی</option>
                    <option value={2}>۲ - فوری</option>
                    <option value={3}>۳ - بحرانی خط خودروساز</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">تاریخ شروع</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">تاریخ تحویل</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">یادداشت فنی و دستورات خاص</label>
                <textarea
                  rows={2}
                  placeholder="دستورات ویژه کیفی یا سهمیه کویل..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs shadow-lg cursor-pointer"
                >
                  {submitting ? 'در حال ثبت...' : 'ثبت برنامه تولید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
