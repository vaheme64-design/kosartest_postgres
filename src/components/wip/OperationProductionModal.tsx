import React, { useState } from 'react';
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

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await onSubmit({
        moId: operation.moId,
        operationId: operation.id,
        goodQty: good,
        scrapQty: scrap,
        reworkQty: rework,
        rejectedQty: rejected,
        scrapReason: scrap > 0 ? scrapReason : undefined,
        operatorName: operatorName.trim() || 'اپراتور مسئول خط',
        notes: notes.trim(),
      });

      if (res.success) {
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
              <strong>قانون انتقال صریح:</strong> قطعات سالم ثبت‌شده مستقیماً به مرحله بعد منتقل نمی‌شوند؛ این قطعات در وضعیت «آماده انتقال» قرار گرفته و نیازمند صدور و تأیید حواله انتقال ردیابی‌پذیر هستند.
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
              disabled={isSubmitting || totalAccounted <= 0 || totalAccounted > inProgressTotal}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>ثبت قطعی عملکرد در دفاتر WIP</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
