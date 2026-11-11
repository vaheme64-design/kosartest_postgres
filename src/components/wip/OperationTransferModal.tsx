import React, { useState } from 'react';
import {
  ArrowRightLeft,
  X,
  AlertCircle,
  Truck,
  CheckCircle2,
  Building2,
  Boxes,
} from 'lucide-react';
import { ManufacturingOrder, ManufacturingOperation } from '../../types/productionWip';
import { formatNumber, toPersianDigits } from '../../utils/formatters';

interface OperationTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  mo: ManufacturingOrder | null;
  fromOperation: ManufacturingOperation | null;
  onSubmit: (payload: any) => Promise<{ success: boolean; error?: string }>;
}

export const OperationTransferModal: React.FC<OperationTransferModalProps> = ({
  isOpen,
  onClose,
  mo,
  fromOperation,
  onSubmit,
}) => {
  const [selectedToOpId, setSelectedToOpId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dispatchedBy, setDispatchedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !mo || !fromOperation) return null;

  const readyQty = fromOperation.readyForTransferQty;

  // Determine potential destination operations:
  // Usually the immediately next sequence operation, or any subsequent operation, or 'STORE-FINISHED'
  const isLastOperation = fromOperation.sequence === mo.operations.length;
  const subsequentOps = mo.operations.filter(o => o.sequence > fromOperation.sequence);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);

    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('تعداد انتقال باید یک عدد مثبت باشد.');
      return;
    }

    if (qty > readyQty) {
      setErrorMsg(`تعداد نمی‌تواند از موجودی آماده انتقال (${formatNumber(readyQty)} عدد) بیشتر باشد.`);
      return;
    }

    const toOpId = selectedToOpId || (subsequentOps.length > 0 ? subsequentOps[0].id : 'STORE-FINISHED');

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await onSubmit({
        moId: mo.id,
        fromOperationId: fromOperation.id,
        toOperationId: toOpId,
        quantity: qty,
        dispatchedBy: dispatchedBy.trim() || 'سرپرست خط تولید',
        notes: notes.trim(),
      });

      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'خطا در صدور حواله انتقال');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">صدور حواله انتقال بین‌مراحل (Inter-Op Transfer)</h3>
              <p className="text-xs text-slate-400">
                دستور {mo.moNumber} - انتقال از {fromOperation.stepCode}
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

        {/* Source Status Card */}
        <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">مرحله مبدأ:</span>
            <span className="font-bold text-slate-900 block mt-0.5">{fromOperation.stepName}</span>
            <span className="font-mono text-[11px] text-cyan-700">{fromOperation.warehouseLocation}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">موجودی آماده انتقال:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
              {formatNumber(readyQty)} <span className="text-xs font-normal text-slate-400">PCS</span>
            </span>
            <span className="text-[10px] text-slate-400">پشتیبانی از انتقال جزئی (Partial)</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900">
              ایستگاه یا انبار مقصد <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedToOpId || (subsequentOps.length > 0 ? subsequentOps[0].id : 'STORE-FINISHED')}
              onChange={e => setSelectedToOpId(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
            >
              {subsequentOps.map(op => (
                <option key={op.id} value={op.id}>
                  {op.stepCode} - {op.stepName} ({op.warehouseLocation})
                </option>
              ))}
              <option value="STORE-FINISHED">انبار محصولات نهایی (تحویل قطعی پالت آماده به ساپکو)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900">
                تعداد ارسالی (PCS) <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setQuantity(String(readyQty))}
                className="text-[11px] text-purple-400 hover:underline cursor-pointer"
              >
                ارسال کل موجودی ({formatNumber(readyQty)})
              </button>
            </div>
            <input
              type="number"
              min="1"
              max={readyQty}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder={`حداکثر ${readyQty}`}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">مسئول ارسال / تحویل‌دهنده</label>
              <input
                type="text"
                value={dispatchedBy}
                onChange={e => setDispatchedBy(e.target.value)}
                placeholder="نام مسئول شیفت مبدأ"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">شماره پالت / توضیحات</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="پالت فلزی کد A-12..."
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="p-2.5 bg-purple-950/20 border border-purple-500/30 rounded-xl text-[11px] text-purple-700 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              <span>جلوگیری از دوبارشماری (Zero Double-Counting)</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[10px]">
              با ثبت این حواله، قطعات به عنوان «در حال انتقال (In-Transit)» ثبت شده و تا زمان تأیید فیزیکی در ایستگاه مقصد، در صف ورودی قرار نمی‌گیرند.
            </p>
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
              disabled={isSubmitting || readyQty <= 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-900/40 cursor-pointer disabled:opacity-50"
            >
              <ArrowRightLeft className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>صدور و ارسال حواله انتقال</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
