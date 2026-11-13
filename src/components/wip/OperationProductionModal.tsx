import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  X,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { ManufacturingOperation } from '../../types/productionWip';
import { DynamicSelect } from '../common/DynamicSelect';
import { formatNumber, toPersianDigits } from '../../utils/formatters';

interface OperationProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: ManufacturingOperation | null;
  onSubmit: (payload: any) => Promise<{ success: boolean; error?: string }>;
}

export const OperationProductionModal: React.FC<OperationProductionModalProps> = ({
  isOpen,
  onClose,
  operation,
  onSubmit,
}) => {
  const [goodQty, setGoodQty] = useState('');
  const [scrapQty, setScrapQty] = useState('0');
  const [reworkQty, setReworkQty] = useState('0');
  const [rejectedQty, setRejectedQty] = useState('0');
  const [scrapReason, setScrapReason] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [postingContext, setPostingContext] = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [relationalManufacturingOrderId, setRelationalManufacturingOrderId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [createdByUserId, setCreatedByUserId] = useState('');
  const [relationalMachineId, setRelationalMachineId] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (!isOpen || !operation) return;
    let cancelled = false;
    setContextLoading(true);
    fetch(`/api/wip/production-posting-context?wipMoId=${encodeURIComponent(operation.moId)}`)
      .then(response => response.json())
      .then(result => {
        if (cancelled) return;
        if (!result.success) throw new Error(result.error || 'خطا در دریافت اطلاعات ثبت تولید');
        setPostingContext(result.data);
        setRelationalManufacturingOrderId(result.data.identityLink?.manufacturingOrderId || '');
        setShiftId(result.data.shifts?.length === 1 ? result.data.shifts[0].id : '');
        setCreatedByUserId(result.data.users?.length === 1 ? result.data.users[0].id : '');
      })
      .catch(error => {
        if (!cancelled) setErrorMsg(error.message || 'خطا در دریافت اطلاعات ثبت تولید');
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, operation?.moId]);

  useEffect(() => {
    if (!isOpen) setIdempotencyKey('');
  }, [isOpen]);

  const selectedRelationalOrder = useMemo(
    () => postingContext?.manufacturingOrders?.find((row: any) => row.id === relationalManufacturingOrderId),
    [postingContext, relationalManufacturingOrderId],
  );
  const selectedRelationalOperation = useMemo(
    () => selectedRelationalOrder?.operations?.find((row: any) =>
      row.stepNumber === operation?.stepNumber && row.operation?.processType === operation?.processType
    ),
    [selectedRelationalOrder, operation?.stepNumber, operation?.processType],
  );


  if (!isOpen || !operation) return null;

  const inProgressTotal = operation.inProgressQty;

  const good = Math.max(0, Number(goodQty) || 0);
  const scrap = Math.max(0, Number(scrapQty) || 0);
  const rework = Math.max(0, Number(reworkQty) || 0);
  const rejected = Math.max(0, Number(rejectedQty) || 0);
  const totalAccounted = good + scrap + rework + rejected;
  const remainingInProgress = inProgressTotal - totalAccounted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalAccounted <= 0) {
      setErrorMsg('حداقل یکی از مقادیر تولید سالم، ضایعات، دوباره‌کاری یا نامنطبق باید بزرگتر از صفر باشد.');
      return;
    }

    if (totalAccounted > inProgressTotal) {
      setErrorMsg(
        `مجموع قطعات اعلام‌شده (${formatNumber(totalAccounted)}) از موجودی در حال ساخت پای دستگاه (${formatNumber(inProgressTotal)}) بیشتر است.`
      );
      return;
    }

    if (scrap > 0 && !scrapReason) {
      setErrorMsg('با توجه به وجود ضایعات، انتخاب علت فنی ضایعات الزامی است.');
      return;
    }
    if (!relationalManufacturingOrderId || !shiftId || !createdByUserId) {
      setErrorMsg('انتخاب دستور ساخت دیتابیس، شیفت و کاربر ثبت‌کننده الزامی است.');
      return;
    }
    if (selectedRelationalOrder && !selectedRelationalOperation) {
      setErrorMsg('برای این مرحله، عملیات متناظر با شماره مرحله و نوع فرایند در دستور ساخت انتخابی پیدا نشد.');
      return;
    }
    if (selectedRelationalOperation && !selectedRelationalOperation.plannedMachineId && !relationalMachineId) {
      setErrorMsg('برای عملیات بدون ماشین برنامه‌ریزی‌شده، انتخاب ماشین واقعی الزامی است.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const submissionKey = idempotencyKey || (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `WIP-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      setIdempotencyKey(submissionKey);
      const res = await onSubmit({
        moId: operation.moId,
        operationId: operation.id,
        goodQty: good,
        scrapQty: scrap,
        reworkQty: rework,
        rejectedQty: rejected,
        scrapReason: scrap > 0 ? scrapReason : undefined,
        operatorName: operatorName.trim() || postingContext?.users?.find((user: any) => user.id === createdByUserId)?.fullName || 'اپراتور مسئول خط',
        notes: notes.trim(),
        relationalManufacturingOrderId,
        shiftId,
        createdByUserId,
        relationalMachineId: relationalMachineId || undefined,
        idempotencyKey: submissionKey,
      });

      if (res.success) {
        setIdempotencyKey('');
        onClose();
      } else {
        setErrorMsg(res.error || 'خطا در ثبت عملکرد تولید');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ثبت خروجی تولید و کنترل کیفیت ({operation.stepCode})
              </h3>
              <p className="text-xs text-slate-400">
                تفکیک قطعی تولید سالم، ضایعات، دوباره‌کاری و قرنطینه - دستور {operation.moNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* In-Progress Status Card */}
        <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">موجودی در حال ساخت پای دستگاه:</span>
            <span className="font-mono font-bold text-slate-900 text-base">
              {formatNumber(inProgressTotal)} <span className="text-xs font-normal text-slate-400">PCS</span>
            </span>
          </div>
          <div className="text-left">
            <span className="text-slate-400 text-[11px] block">مانده پس از ثبت این فرم:</span>
            <span className={`font-mono font-bold text-base ${remainingInProgress >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {formatNumber(remainingInProgress)} <span className="text-xs font-normal text-slate-400">PCS</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">دستور ساخت متناظر در دیتابیس</label>
              <select value={relationalManufacturingOrderId} onChange={e => setRelationalManufacturingOrderId(e.target.value)} disabled={contextLoading || isSubmitting} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900">
                <option value="">انتخاب دستور ساخت...</option>
                {(postingContext?.manufacturingOrders || []).map((row: any) => (
                  <option key={row.id} value={row.id}>{row.moNumber} — {row.part?.partNumber}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">شیفت تولید</label>
              <select value={shiftId} onChange={e => setShiftId(e.target.value)} disabled={contextLoading || isSubmitting} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900">
                <option value="">انتخاب شیفت...</option>
                {(postingContext?.shifts || []).map((row: any) => (
                  <option key={row.id} value={row.id}>{row.name} ({row.startTime} تا {row.endTime})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">کاربر ثبت‌کننده</label>
              <select value={createdByUserId} onChange={e => setCreatedByUserId(e.target.value)} disabled={contextLoading || isSubmitting} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900">
                <option value="">انتخاب کاربر...</option>
                {(postingContext?.users || []).map((row: any) => (
                  <option key={row.id} value={row.id}>{row.fullName}{row.personnelCode ? ` — ${row.personnelCode}` : ''}</option>
                ))}
              </select>
            </div>
            {selectedRelationalOperation && !selectedRelationalOperation.plannedMachineId && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">ماشین واقعی عملیات</label>
                <select value={relationalMachineId} onChange={e => setRelationalMachineId(e.target.value)} disabled={contextLoading || isSubmitting} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900">
                  <option value="">انتخاب ماشین...</option>
                  {(postingContext?.machines || []).map((row: any) => (
                    <option key={row.id} value={row.id}>{row.code} — {row.name}</option>
                  ))}
                </select>
              </div>
            )}
            {contextLoading && <p className="text-xs text-slate-500">در حال دریافت شیفت‌ها، کاربران و دستورهای ساخت...</p>}
            {!contextLoading && postingContext?.manufacturingOrders?.length === 0 && (
              <p className="text-xs text-rose-600 sm:col-span-2">برای این کد قطعه دستور ساخت relational متناظر پیدا نشد؛ ابتدا باید دستور ساخت معتبر در دیتابیس ایجاد شود.</p>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Good Qty */}
            <div className="space-y-1 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/30">
              <label className="text-[11px] font-bold text-emerald-400 block">
                تولید سالم (Good) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={goodQty}
                onChange={e => setGoodQty(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-emerald-500/40 rounded-lg p-2 text-xs text-slate-900 font-mono font-bold text-left focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[10px] text-slate-400 block">آماده ارسال بعدی</span>
            </div>

            {/* 2. Scrap Qty */}
            <div className="space-y-1 bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/30">
              <label className="text-[11px] font-bold text-rose-400 block">ضایعات قطعی (Scrap)</label>
              <input
                type="number"
                min="0"
                value={scrapQty}
                onChange={e => setScrapQty(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-rose-500/40 rounded-lg p-2 text-xs text-slate-900 font-mono font-bold text-left focus:outline-none focus:border-rose-400"
              />
              <span className="text-[10px] text-slate-400 block">پرت غیرقابل بازیافت</span>
            </div>

            {/* 3. Rework Qty */}
            <div className="space-y-1 bg-amber-950/20 p-2.5 rounded-xl border border-amber-500/30">
              <label className="text-[11px] font-bold text-amber-400 block">دوباره‌کاری (Rework)</label>
              <input
                type="number"
                min="0"
                value={reworkQty}
                onChange={e => setReworkQty(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-amber-500/40 rounded-lg p-2 text-xs text-slate-900 font-mono font-bold text-left focus:outline-none focus:border-amber-400"
              />
              <span className="text-[10px] text-slate-400 block">نیاز به اصلاح</span>
            </div>

            {/* 4. Rejected Qty */}
            <div className="space-y-1 bg-purple-950/20 p-2.5 rounded-xl border border-purple-500/30">
              <label className="text-[11px] font-bold text-purple-400 block">نامنطبق / قرنطینه</label>
              <input
                type="number"
                min="0"
                value={rejectedQty}
                onChange={e => setRejectedQty(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-purple-500/40 rounded-lg p-2 text-xs text-slate-900 font-mono font-bold text-left focus:outline-none focus:border-purple-400"
              />
              <span className="text-[10px] text-slate-400 block">در انتظار تصمیم QC</span>
            </div>
          </div>

          {/* Scrap Reason (Required if scrap > 0) */}
          {scrap > 0 && (
            <div className="space-y-1.5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <DynamicSelect
                categoryCode="SCRAP_REASON"
                label="علت فنی ضایعات (الزام مهندسی کیفیت از دیتابیس MasterItem)"
                value={scrapReason}
                valueField="value"
                onChange={(val, item) => setScrapReason(item?.value || val)}
                required
                allowAddOption={true}
                placeholder="-- انتخاب علت ضایعات از پایگاه داده --"
                selectClassName="bg-white border-rose-500/40"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">اپراتور / سرپرست ثبت‌کننده</label>
              <input
                type="text"
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                placeholder="نام اپراتور شیفت"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">توضیحات و بازرسی</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="شرح بازرسی چشمی و تلرانس..."
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>ثبت اتمیک:</strong> گزارش تولید، کسر موجودی مرحله جاری، ورود سالم به مرحله بعد و ثبت ضایعات/دوباره‌کاری/مردودی با هم ثبت می‌شوند؛ مرحله مقصد نیازی به تأیید دریافت ندارد.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting || contextLoading || totalAccounted <= 0 || totalAccounted > inProgressTotal || !relationalManufacturingOrderId || !shiftId || !createdByUserId}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>ثبت قطعی تولید و کاردکس</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
