import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Clock,
  Send,
  HelpCircle,
} from 'lucide-react';

export interface AuditConfirmationModalProps {
  isOpen: boolean;
  title: string;
  actionSummary: string;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
  entityName?: string;
  entityId?: string;
  actionType?: string;
  isDestructive?: boolean;
}

const QUICK_REASONS = [
  'تغییر شیفت و فوریت سفارش ساپکو',
  'رفع نقص و راه‌اندازی مجدد خط',
  'توقف موقت به علت بررسی قالب',
  'اصلاح تیراژ طبق دستور مدیریت تولید',
  'جابجایی ایستگاه کاری به پرس موازی',
];

export const AuditConfirmationModal: React.FC<AuditConfirmationModalProps> = ({
  isOpen,
  title,
  actionSummary,
  onConfirm,
  onCancel,
  confirmButtonText = 'تایید نهایی و ثبت در ممیزی',
  cancelButtonText = 'انصراف',
  entityName,
  entityId,
  actionType,
  isDestructive = false,
}) => {
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setIsSubmitting(false);
      setHasInteracted(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const trimmedReason = reason.trim();
  const charCount = trimmedReason.length;
  const isReasonValid = charCount >= 10;
  const charsRemaining = Math.max(0, 10 - charCount);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isReasonValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onConfirm(trimmedReason);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectQuickReason = (qr: string) => {
    setReason(prev => (prev ? `${prev} - ${qr}` : qr));
    setHasInteracted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col text-right text-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-modal-title"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl flex items-center justify-center ${
                isDestructive
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="audit-modal-title" className="font-bold text-sm text-white">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ثبت سند ممیزی تغییرات حساس (Enterprise Audit Trail)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Action Summary Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-[11px]">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>شرح عملیات درخواستی:</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                AUDIT-MANDATORY
              </span>
            </div>
            <p className="text-slate-900 font-medium leading-relaxed text-xs">
              {actionSummary}
            </p>

            {(entityName || entityId || actionType) && (
              <div className="pt-2 border-t border-slate-200/70 flex flex-wrap gap-2 text-[10px] font-mono text-slate-600">
                {entityName && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                    موجودیت: <strong className="text-slate-800">{entityName}</strong>
                  </span>
                )}
                {entityId && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                    شناسه: <strong className="text-slate-800">{entityId}</strong>
                  </span>
                )}
                {actionType && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                    نوع عملیات: <strong className="text-indigo-700">{actionType}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Reason Input Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="audit-reason-input"
                className="font-bold text-slate-800 flex items-center gap-1.5"
              >
                <span>دلیل تغییرات / تایید عملیات</span>
                <span className="text-rose-500">*</span>
                <span className="text-[10px] font-normal text-slate-500">
                  (حداقل ۱۰ کاراکتر الزامی)
                </span>
              </label>

              {/* Character Counter Badge */}
              <div
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 font-bold ${
                  isReasonValid
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {isReasonValid ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{charCount} کاراکتر (معتبر)</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>{charCount} / ۱۰ ({charsRemaining} کاراکتر باقی‌مانده)</span>
                  </>
                )}
              </div>
            </div>

            <textarea
              id="audit-reason-input"
              rows={3}
              value={reason}
              onChange={e => {
                setReason(e.target.value);
                setHasInteracted(true);
              }}
              placeholder="لطفاً دلیل فنی، مدیریتی یا عملیاتی این اقدام را به صورت مستند بنویسید (مثلاً: تغییر شیفت و فوریت سفارش ساپکو)..."
              className={`w-full p-3 rounded-xl border text-xs leading-relaxed focus:outline-none transition resize-none ${
                hasInteracted && !isReasonValid
                  ? 'border-amber-400 bg-amber-50/20 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                  : isReasonValid
                  ? 'border-emerald-300 bg-emerald-50/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  : 'border-slate-300 bg-white focus:border-slate-500 focus:ring-1 focus:ring-slate-500'
              }`}
              disabled={isSubmitting}
              autoFocus
            />

            {/* Quick Reason Suggestions */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                <span>دلایل پرتکرار پیشنهادی:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectQuickReason(qr)}
                    disabled={isSubmitting}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer disabled:opacity-50"
                  >
                    + {qr}
                  </button>
                ))}
              </div>
            </div>

            {hasInteracted && !isReasonValid && (
              <p className="text-[11px] text-amber-700 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  متن واردشده کمتر از ۱۰ کاراکتر است. ثبت دلیل مستند برای تضمین جامعیت ممیزی الزامی است.
                </span>
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">
              کلید <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600 font-mono">ESC</kbd> برای انصراف
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer disabled:opacity-50"
              >
                {cancelButtonText}
              </button>

              <button
                type="submit"
                disabled={!isReasonValid || isSubmitting}
                className={`px-4 py-2 rounded-xl text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  !isReasonValid || isSubmitting
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                    : 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950'
                }`}
                title={!isReasonValid ? 'برای تایید ابتدا حداقل ۱۰ کاراکتر دلیل بنویسید' : confirmButtonText}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>در حال ثبت...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{confirmButtonText}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
