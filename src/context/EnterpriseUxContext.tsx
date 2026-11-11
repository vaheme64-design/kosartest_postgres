import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  X,
  History,
  Edit3,
  Trash2,
  Clock,
  UserCheck,
  FileCheck2,
  Info,
} from 'lucide-react';
import { toPersianDigits } from '../utils/formatters';
import { formatToJalali } from '../utils/jalali';

export interface AuditTrailEntry {
  id: string;
  entityId?: string;
  entityCode?: string;
  moduleName: string;
  actionType:
    | 'CREATE'
    | 'UPDATE'
    | 'SOFT_DELETE'
    | 'RESTORE_UNDO'
    | 'COMPLETE_MO'
    | 'LINE_STOP'
    | 'MATERIAL_ISSUE'
    | 'STATUS_CHANGE';
  title: string;
  details: string;
  actor: string;
  timestamp: string;
}

export interface ConfirmDialogOptions {
  title: string;
  message?: string;
  description?: string;
  consequences?: string[];
  consequenceText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'emerald' | 'indigo' | 'info';
  severity?: 'danger' | 'warning' | 'emerald' | 'indigo' | 'info';
  onConfirm: () => void | Promise<void>;
}

export interface UndoToastOptions {
  title: string;
  detail?: string;
  description?: string;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  durationMs?: number;
  onUndo?: () => void;
}

export interface EditableFieldSpec {
  key: string;
  label: string;
  value?: any;
  required?: boolean;
  min?: number;
  max?: number;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: Array<{ value: string; label: string }>;
}

export interface QuickEditDrawerOptions {
  title?: string;
  drawerTitle?: string;
  subtitle?: string;
  drawerSubtitle?: string;
  entityId?: string;
  entityCode?: string;
  moduleName?: string;
  moduleTitle?: string;
  fields: EditableFieldSpec[];
  initialValues?: Record<string, any>;
  onSave: (updatedValues: Record<string, any>) => void;
}

export type RecordAuditInput = {
  entityId?: string;
  entityCode?: string;
  module?: string;
  moduleName?: string;
  moduleTitle?: string;
  actionType: AuditTrailEntry['actionType'];
  title?: string;
  summaryFa?: string;
  details?: string;
  detailsFa?: string;
  actor?: string;
  beforeSnapshot?: any;
  afterSnapshot?: any;
};

interface EnterpriseUxContextValue {
  auditLogs: AuditTrailEntry[];
  recordAudit: (entry: RecordAuditInput) => void;
  requestConfirm: (options: ConfirmDialogOptions) => void;
  showUndoToast: (options: UndoToastOptions) => void;
  openQuickEditDrawer: (options: QuickEditDrawerOptions) => void;
}

const INITIAL_AUDIT_LOGS: AuditTrailEntry[] = [
  {
    id: 'AUD-1001',
    entityId: 'SCN-ECU-BRK',
    entityCode: 'MO-1404-2001',
    moduleName: 'پیشخوان تولید (MO)',
    actionType: 'CREATE',
    title: 'صدور دستور تولید MO-1404-2001 برای براکت ضدسرقت ECU',
    details: 'تخصیص کلاف MOB-2025-DC01-409 با شماره ذوب HT-99412-MOB به تیراژ ۵,۰۰۰ عدد',
    actor: 'مهندس حسینی (مدیر تولید)',
    timestamp: '۱۴۰۴/۰۲/۲۰ - ۰۷:۳۰',
  },
  {
    id: 'AUD-1002',
    entityId: 'SCN-ECU-BRK',
    entityCode: 'MO-1404-2001',
    moduleName: 'انبار و تغذیه خط',
    actionType: 'MATERIAL_ISSUE',
    title: 'صدور حواله ورق ISS-1404-881 به ایستگاه برش OP10',
    details: 'خروج ۷,۶۱۳ کیلوگرم ورق DC01A از انبار رول به سالن برشکاری',
    actor: 'سرپرست انبار ورق',
    timestamp: '۱۴۰۴/۰۲/۲۰ - ۰۸:۱۰',
  },
  {
    id: 'AUD-1003',
    entityId: 'SCN-SEAT-LHRH',
    entityCode: 'MO-1404-2002',
    moduleName: 'پیشخوان تولید (MO)',
    actionType: 'UPDATE',
    title: 'ثبت کارکرد ایستگاه OP30 (دوربری و تفکیک چپ و راست)',
    details: 'تأیید ۴,۰۰۰ قطعه سالم در پرس ۴۰۰ تن ۲ با قالب DIE-SEAT-TRM2',
    actor: 'اپراتور ارشد سالن پرس',
    timestamp: '۱۴۰۴/۰۲/۲۰ - ۱۱:۴۵',
  },
  {
    id: 'AUD-1004',
    entityId: 'SCN-BUMP-BEAM',
    entityCode: 'MO-1404-2003',
    moduleName: 'برنامه‌ریزی و MRP',
    actionType: 'CREATE',
    title: 'برنامه‌ریزی دستور تولید MO-1404-2003 (تیر عرضی سپر جلو)',
    details: 'اتصال به ذوب HT-77190-FOOLAD و رزرو ظرفیت پرس ۸۰۰ تن',
    actor: 'واحد برنامه‌ریزی (PPC)',
    timestamp: '۱۴۰۴/۰۲/۲۰ - ۰۸:۳۰',
  },
];

const EnterpriseUxContext = createContext<EnterpriseUxContextValue | null>(null);

export const useEnterpriseUx = (): EnterpriseUxContextValue => {
  const ctx = useContext(EnterpriseUxContext);
  if (!ctx) {
    throw new Error('useEnterpriseUx must be used within EnterpriseUxProvider');
  }
  return ctx;
};

export const EnterpriseUxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auditLogs, setAuditLogs] = useState<AuditTrailEntry[]>(() => {
    try {
      const saved = localStorage.getItem('kpims_enterprise_audit_trail_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [confirmState, setConfirmState] = useState<ConfirmDialogOptions | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [toastState, setToastState] = useState<(UndoToastOptions & { id: number }) | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [quickEditState, setQuickEditState] = useState<QuickEditDrawerOptions | null>(null);
  const [quickEditForm, setQuickEditForm] = useState<Record<string, any>>({});

  useEffect(() => {
    try {
      localStorage.setItem('kpims_enterprise_audit_trail_v1', JSON.stringify(auditLogs.slice(0, 150)));
    } catch {
      // ignore
    }
  }, [auditLogs]);

  const getNowPersianTimestamp = () => {
    return formatToJalali(new Date(), { includeTime: true });
  };

  const recordAudit = useCallback(
    (entry: RecordAuditInput) => {
      const newEntry: AuditTrailEntry = {
        id: `AUD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
        entityId: entry.entityId,
        entityCode: entry.entityCode,
        moduleName: entry.moduleName || entry.moduleTitle || 'سیستم ERP',
        actionType: entry.actionType,
        title: entry.title || entry.summaryFa || 'ثبت رویداد سیستمی',
        details: entry.details || entry.detailsFa || '',
        actor: entry.actor || 'مهندس حسینی (مدیر تولید)',
        timestamp: getNowPersianTimestamp(),
      };
      setAuditLogs(prev => [newEntry, ...prev]);
    },
    []
  );

  const requestConfirm = useCallback((options: ConfirmDialogOptions) => {
    setConfirmState(options);
  }, []);

  const showUndoToast = useCallback((options: UndoToastOptions) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    const id = Date.now();
    const duration = options.durationMs || 8000;
    setToastState({ ...options, id, durationMs: duration });

    toastTimerRef.current = window.setTimeout(() => {
      setToastState(curr => (curr?.id === id ? null : curr));
    }, duration);
  }, []);

  const openQuickEditDrawer = useCallback((options: QuickEditDrawerOptions) => {
    const derivedInitial: Record<string, any> = { ...(options.initialValues || {}) };
    options.fields.forEach(f => {
      if (f.value !== undefined && derivedInitial[f.key] === undefined) {
        derivedInitial[f.key] = f.value;
      }
    });
    setQuickEditForm(derivedInitial);
    setQuickEditState({
      ...options,
      title: options.title || options.drawerTitle || 'ویرایش مشخصات رکورد',
      subtitle: options.subtitle || options.drawerSubtitle,
      moduleName: options.moduleName || options.moduleTitle || 'سیستم ERP',
      initialValues: derivedInitial,
    });
  }, []);

  const handleConfirmExecute = async () => {
    if (!confirmState) return;
    setConfirmLoading(true);
    try {
      await confirmState.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirmState(null);
    }
  };

  const handleSaveQuickEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditState) return;
    const prevSnapshot = { ...(quickEditState.initialValues || {}) };
    const nextSnapshot = { ...quickEditForm };

    quickEditState.onSave(nextSnapshot);

    const effectiveTitle = quickEditState.title || quickEditState.drawerTitle || 'رکورد';
    const effectiveModule = quickEditState.moduleName || quickEditState.moduleTitle || 'سیستم ERP';

    recordAudit({
      entityId: quickEditState.entityId,
      entityCode: quickEditState.entityCode,
      moduleName: effectiveModule,
      actionType: 'UPDATE',
      title: `ویرایش در کشو: ${effectiveTitle}`,
      details: `مقادیر فیلدها توسط کاربر بروزرسانی گردید.`,
    });

    const savedOptions = quickEditState;
    setQuickEditState(null);

    showUndoToast({
      title: `تغییرات «${effectiveTitle}» ذخیره شد`,
      detail: 'در صورت نیاز تا ۸ ثانیه می‌توانید تغییرات را به حالت قبل بازگردانید.',
      variant: 'success',
      onUndo: () => {
        savedOptions.onSave(prevSnapshot);
        recordAudit({
          entityId: savedOptions.entityId,
          entityCode: savedOptions.entityCode,
          moduleName: effectiveModule,
          actionType: 'RESTORE_UNDO',
          title: `لغو ویرایش (Undo) برای ${effectiveTitle}`,
          details: 'بازگردانی مقادیر قبلی رکورد توسط کاربر',
        });
      },
    });
  };

  return (
    <EnterpriseUxContext.Provider
      value={{
        auditLogs,
        recordAudit,
        requestConfirm,
        showUndoToast,
        openQuickEditDrawer,
      }}
    >
      {children}

      {/* ================================================================== */}
      {/* 1. GLOBAL DEFENSIVE UX CONFIRM DIALOG (SAP / DYNAMICS 365 STYLE)   */}
      {/* ================================================================== */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-4 animate-in fade-in"
          dir="rtl"
          onClick={() => !confirmLoading && setConfirmState(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    confirmState.variant === 'danger'
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : confirmState.variant === 'emerald'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : confirmState.variant === 'indigo'
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}
                >
                  {confirmState.variant === 'emerald' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : confirmState.variant === 'danger' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 inline-block mb-1">
                    سپر دفاعی و تاییدیه عملیات حساس (Defensive UX)
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{confirmState.title}</h3>
                </div>
              </div>
              <button
                type="button"
                disabled={confirmLoading}
                onClick={() => setConfirmState(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmState.message || confirmState.description}
            </p>

            {confirmState.consequences && confirmState.consequences.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px] text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>پیامدها و اثرات سیستمی این عملیات:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pr-1">
                  {confirmState.consequences.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={confirmLoading}
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {confirmState.cancelLabel || 'انصراف'}
              </button>
              <button
                type="button"
                disabled={confirmLoading}
                onClick={handleConfirmExecute}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition cursor-pointer shadow-xs ${
                  confirmState.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmState.variant === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : confirmState.variant === 'indigo'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {confirmLoading ? 'در حال انجام...' : confirmState.confirmLabel || 'تایید و اجرای عملیات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. GLOBAL SLIDE-OVER DRAWER FOR INLINE/ROW EDITING                 */}
      {/* ================================================================== */}
      {quickEditState && (
        <div
          className="fixed inset-0 z-[85] flex justify-end bg-slate-900/35 backdrop-blur-[2px] animate-in fade-in"
          dir="rtl"
          onClick={() => setQuickEditState(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white h-full shadow-2xl border-r border-slate-200 flex flex-col justify-between overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 p-5 border-b border-slate-200 bg-white/95 backdrop-blur-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {quickEditState.moduleName} — ویرایش سریع در کشو (Drawer Editing)
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{quickEditState.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditState(null)}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveQuickEdit} className="flex-1 p-5 space-y-4 text-xs">
              {quickEditState.subtitle && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                  {quickEditState.subtitle}
                </div>
              )}

              <div className="space-y-3.5">
                {quickEditState.fields.map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="block font-bold text-slate-700">{field.label}</label>
                    {field.type === 'select' && field.options ? (
                      <select
                        value={String(quickEditForm[field.key] ?? '')}
                        onChange={e =>
                          setQuickEditForm(prev => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium focus:bg-white focus:border-slate-900 focus:outline-none"
                      >
                        {field.options.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={String(quickEditForm[field.key] ?? '')}
                        onChange={e =>
                          setQuickEditForm(prev => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium focus:bg-white focus:border-slate-900 focus:outline-none"
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        step="any"
                        min={field.min}
                        max={field.max}
                        required={field.required}
                        value={quickEditForm[field.key] ?? ''}
                        onChange={e =>
                          setQuickEditForm(prev => ({
                            ...prev,
                            [field.key]:
                              field.type === 'number' ? Number(e.target.value) : e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium focus:bg-white focus:border-slate-900 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Embedded Mini Audit Trail for this Record */}
              <div className="pt-4 border-t border-slate-100">
                <AuditTrailTabContent
                  entityId={quickEditState.entityId}
                  entityCode={quickEditState.entityCode}
                  moduleFilter={quickEditState.moduleName}
                  compact
                />
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 pt-4 pb-2 bg-white border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickEditState(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer shadow-xs"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 3. GMAIL-STYLE UNDO TOAST NOTIFICATION                             */}
      {/* ================================================================== */}
      {toastState && (
        <div
          className="fixed bottom-5 left-5 z-[95] max-w-md w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 flex items-center justify-between gap-4 animate-in fade-in"
          dir="rtl"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-white">{toastState.title}</div>
              {(toastState.detail || toastState.description) && (
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {toastState.detail || toastState.description}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {toastState.onUndo && (
              <button
                type="button"
                onClick={() => {
                  const undoFn = toastState.onUndo;
                  setToastState(null);
                  undoFn?.();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>لغو (Undo)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setToastState(null)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </EnterpriseUxContext.Provider>
  );
};

// Reusable Audit Trail Tab Component for all Drawers across the ERP
export const AuditTrailTabContent: React.FC<{
  entityId?: string;
  entityCode?: string;
  moduleFilter?: string;
  title?: string;
  compact?: boolean;
}> = ({ entityId, entityCode, moduleFilter, title, compact = false }) => {
  const { auditLogs } = useEnterpriseUx();

  const filtered = auditLogs.filter(log => {
    if (entityId && log.entityId === entityId) return true;
    if (entityCode && log.entityCode === entityCode) return true;
    if (moduleFilter && log.moduleName.includes(moduleFilter)) return true;
    return !entityId && !entityCode && !moduleFilter;
  });

  const displayList = filtered.length > 0 ? filtered : auditLogs.slice(0, 6);

  return (
    <div className="space-y-3 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-slate-900">
            {title || 'تاریخچه تغییرات و لاگ ممیزی سیستم (Enterprise Audit Trail)'}
          </h4>
        </div>
        <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
          {toPersianDigits(displayList.length)} رویداد ثبت‌شده
        </span>
      </div>

      <div className={`relative pr-4 space-y-2.5 ${compact ? 'max-h-48 overflow-y-auto' : ''}`}>
        <div className="absolute right-1.5 top-2 bottom-2 w-0.5 bg-slate-200 rounded-full" />
        {displayList.map(item => {
          const badgeColor =
            item.actionType === 'SOFT_DELETE'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : item.actionType === 'RESTORE_UNDO'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : item.actionType === 'COMPLETE_MO'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200';

          return (
            <div
              key={item.id}
              className="relative bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1 text-xs"
            >
              <span className="absolute -right-[13px] top-4 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                    {item.moduleName}
                  </span>
                  <span className="font-bold text-slate-900">{item.title}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.timestamp}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">{item.details}</p>
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  ثبت‌کننده: {item.actor}
                </span>
                {item.entityCode && (
                  <span className="font-mono text-slate-500">شناسه: {item.entityCode}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
