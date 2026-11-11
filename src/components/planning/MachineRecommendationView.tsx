import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Layers,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Send,
  GitBranch,
  Info,
  HelpCircle,
  Trash2,
  ExternalLink,
  Check,
  Sliders,
} from 'lucide-react';
import {
  ProductionPlanSuggestion,
  ProposedOperationPlan,
  MachineEligibilityCheck,
} from '../../types/productionPlanning';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { formatToJalali } from '../../utils/jalali';
import { useErpRouter } from '../../context/RouterContext';
import { useEnterpriseUx } from '../../context/EnterpriseUxContext';
import {
  buildInitial20PartsSchedule,
  MultiPartScheduleItem,
  ScheduledOpStep,
} from '../production/ErpProductionWorkbenchView';

const SCHEDULE_STORAGE_KEY = 'kpims_aps_multi_part_op_schedule_v2';

interface MachineRecommendationViewProps {
  suggestions: ProductionPlanSuggestion[];
  selectedSuggestionId: string | null;
  onSelectSuggestion: (id: string) => void;
  onApprovePlan: (id: string, approvedBy: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onReleaseMo: (id: string, releasedBy: string) => Promise<{ success: boolean; message?: string; moId?: string; error?: string }>;
  onRevisePlan: (id: string, changeReason: string) => Promise<{ success: boolean; message?: string; newPlanId?: string; error?: string }>;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

export const MachineRecommendationView: React.FC<MachineRecommendationViewProps> = ({
  suggestions,
  selectedSuggestionId,
  onSelectSuggestion,
  onApprovePlan,
  onReleaseMo,
  onRevisePlan,
  onRefresh,
}) => {
  const router = useErpRouter();
  const { requestConfirm, recordAudit, showUndoToast } = useEnterpriseUx();

  const [expandedOperationIndex, setExpandedOperationIndex] = useState<number | null>(0);
  const [showAllCandidates, setShowAllCandidates] = useState<Record<number, boolean>>({});
  const [actionInProgress, setActionInProgress] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState<boolean>(true);

  // Manual override of machine per operation: key = `${planId}_${opIndex}`, value = MachineEligibilityCheck
  const [manualMachineOverrides, setManualMachineOverrides] = useState<Record<string, MachineEligibilityCheck>>({});

  // Track current shop-floor schedule from localStorage so we know if activePlan is already dispatched
  const [shopFloorSchedule, setShopFloorSchedule] = useState<MultiPartScheduleItem[]>([]);

  const loadShopFloorSchedule = useCallback((): MultiPartScheduleItem[] => {
    try {
      const saved = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setShopFloorSchedule(parsed);
          return parsed;
        }
      }
      const initial = buildInitial20PartsSchedule();
      window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(initial));
      setShopFloorSchedule(initial);
      return initial;
    } catch {
      const fallback = buildInitial20PartsSchedule();
      setShopFloorSchedule(fallback);
      return fallback;
    }
  }, []);

  useEffect(() => {
    loadShopFloorSchedule();
  }, [loadShopFloorSchedule]);

  // Revision Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');

  // Current selected suggestion
  const activePlan = suggestions.find(s => s.id === selectedSuggestionId) || suggestions[0] || null;

  // Check if activePlan is already dispatched to shop-floor schedule
  const dispatchedScheduleItem = useMemo(() => {
    if (!activePlan) return null;
    return (
      shopFloorSchedule.find(
        item =>
          item.id === `SCH-${activePlan.id}` ||
          (activePlan.createdMoId && item.orderCode === activePlan.createdMoId)
      ) || null
    );
  }, [activePlan, shopFloorSchedule]);

  const toggleAllCandidates = (idx: number) => {
    setShowAllCandidates(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getEffectiveMachineForOp = (
    planId: string,
    opIdx: number,
    op: ProposedOperationPlan
  ): MachineEligibilityCheck | null => {
    const key = `${planId}_${opIdx}`;
    return manualMachineOverrides[key] || op.recommendedMachine || null;
  };

  const handleSelectCandidateMachine = (
    planId: string,
    opIdx: number,
    candidate: MachineEligibilityCheck,
    stepName: string
  ) => {
    if (!candidate.isEligible) return;
    const key = `${planId}_${opIdx}`;
    setManualMachineOverrides(prev => ({ ...prev, [key]: candidate }));
    setFeedbackMsg({
      type: 'success',
      text: `دستگاه «${candidate.machineName} (${candidate.machineCode})» به صورت دستی برای مرحله «${stepName}» انتخاب شد.`,
    });
  };

  // Recall / Remove a dispatched plan from shop-floor schedule
  const handleRecallFromShopFloor = () => {
    if (!activePlan || !dispatchedScheduleItem) return;

    requestConfirm({
      title: `لغو ارسال و حذف دستور کار ${dispatchedScheduleItem.orderCode} از برنامه سالن`,
      description: `آیا مطمئن هستید که می‌خواهید برنامه تولید قطعه «${activePlan.partName}» (${dispatchedScheduleItem.orderCode}) را از ماتریس OP و شیت برنامه روزانه سالن خارج کنید؟`,
      consequences: [
        `تمامی ایستگاه‌های کاری (${toPersianDigits(dispatchedScheduleItem.ops.length)} مرحله OP) مربوط به دستور ${dispatchedScheduleItem.orderCode} از شیت روزانه سرپرست سالن حذف می‌شوند.`,
        `ظرفیت اشغال‌شده روی پرس‌های انتخابی آزاد می‌گردد.`,
        `پیشنهاد برنامه در همین صفحه حفظ می‌شود تا در صورت نیاز پس از ویرایش مجدداً ارسال کنید.`,
      ],
      confirmLabel: 'بله، حذف از برنامه سالن',
      cancelLabel: 'انصراف',
      variant: 'danger',
      onConfirm: () => {
        const current = loadShopFloorSchedule();
        const previousSnapshot = [...current];
        const filtered = current.filter(item => item.id !== dispatchedScheduleItem.id);
        try {
          window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(filtered));
        } catch {
          // ignore
        }
        setShopFloorSchedule(filtered);

        recordAudit({
          moduleName: 'موتور تطبیق ماشین‌آلات (APS)',
          actionType: 'SOFT_DELETE',
          title: `لغو ارسال و حذف از سالن: ${activePlan.partName}`,
          details: `دستور کار ${dispatchedScheduleItem.orderCode} از برنامه روزانه و ماتریس OP سالن خارج شد.`,
        });

        setFeedbackMsg({
          type: 'success',
          text: `دستور کار ${dispatchedScheduleItem.orderCode} (${activePlan.partName}) با موفقیت از برنامه روزانه سالن حذف شد.`,
        });

        showUndoToast({
          title: `دستور کار ${dispatchedScheduleItem.orderCode} از برنامه سالن خارج شد`,
          detail: 'برای بازگردانی فوری به برنامه سالن روی Undo کلیک کنید.',
          variant: 'warning',
          onUndo: () => {
            try {
              window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(previousSnapshot));
            } catch {
              // ignore
            }
            setShopFloorSchedule(previousSnapshot);
          },
        });
      },
    });
  };

  // Confirm & Dispatch to Shop Floor
  const handleApproveAndDispatchToShopFloor = () => {
    if (!activePlan) return;

    const opsPreview = activePlan.proposedOperations.map((op, idx) => {
      const chosenMachine = getEffectiveMachineForOp(activePlan.id, idx, op);
      return `${op.stepCode} (${op.stepName}) ← ${chosenMachine?.machineName || 'پرس پیش‌فرض'} [${chosenMachine?.machineCode || '—'}]`;
    });

    const requiredGrade = activePlan.materialStatus?.requiredGrade || 'ST37 / DC01';
    const requiredKg = activePlan.materialStatus?.requiredWeightKg || 0;

    requestConfirm({
      title: dispatchedScheduleItem
        ? `بروزرسانی دستور کار ارسالی (${dispatchedScheduleItem.orderCode}) در برنامه سالن`
        : `تأیید نهایی پیشنهاد و ارسال به برنامه روزانه سالن تولید`,
      description: `با تایید این عملیات، برنامه تولید قطعه «${activePlan.partName} (${activePlan.partCode})» به تیراژ خالص ${formatNumber(activePlan.proposedQuantity)} عدد مستقیماً به «ماتریس برنامه‌ریزی OP» و «شیت برنامه روزانه شیفت (امروز)» ارسال می‌شود.`,
      consequences: [
        `قطعه و تیراژ هدف: ${activePlan.partName} — ${formatNumber(activePlan.proposedQuantity)} عدد`,
        `ورق و متریال اختصاصی قطعه: ورق ${requiredGrade} به وزن خالص ${formatNumber(requiredKg)} کیلوگرم`,
        ...opsPreview,
        `پس از تایید، به صفحه «برنامه روزانه شیفت» هدایت می‌شوید و در هر زمان می‌توانید ارسال را لغو یا حذف نمایید.`,
      ],
      confirmLabel: dispatchedScheduleItem
        ? 'بروزرسانی و مشاهده در برنامه سالن'
        : 'تایید و ارسال به سالن تولید',
      cancelLabel: 'انصراف و بررسی بیشتر',
      variant: 'indigo',
      onConfirm: async () => {
        setActionInProgress(true);
        setFeedbackMsg(null);
        try {
          // 1. Approve plan via backend if in draft
          if (activePlan.approvalStatus === 'DRAFT_SUGGESTION') {
            await onApprovePlan(activePlan.id, 'مدیر برنامه‌ریزی تولید').catch(() => null);
          }

          // 2. Load existing 20-part schedule safely (never overwrite with empty array)
          const currentSchedule = loadShopFloorSchedule();

          const newMoNumber =
            dispatchedScheduleItem?.orderCode ||
            activePlan.createdMoId ||
            `MO-1404-${String(Math.floor(2100 + Math.random() * 7800))}`;

          const unitWeight =
            Number(
              (
                (activePlan.materialStatus?.requiredWeightKg || activePlan.proposedQuantity * 1.5) /
                Math.max(1, activePlan.proposedQuantity)
              ).toFixed(2)
            ) || 1.5;

          const totalOpsCount = activePlan.proposedOperations.length;

          const opsList: ScheduledOpStep[] = activePlan.proposedOperations.map(
            (op: ProposedOperationPlan, idx: number) => {
              const chosenMachine = getEffectiveMachineForOp(activePlan.id, idx, op);
              const cycleSec = Math.max(4, op.standardCycleTimeSec || 12);
              const standardRatePerHour = Math.max(50, Math.round(3600 / cycleSec));

              return {
                opId: `OP-${activePlan.id}-${idx + 1}`,
                opNo: (idx + 1) * 10,
                opCode: op.stepCode || `OP${(idx + 1) * 10}`,
                opTitle: op.stepName,
                stationHall: 'سالن پرس و فرم‌دهی',
                machineCode: chosenMachine?.machineCode || 'PRS-250-01',
                machineName: chosenMachine?.machineName || 'پرس ضربه‌ای ۲۵۰ تن ۱',
                dieCode: op.dieMoldCode || `DIE-${activePlan.partCode}-${(idx + 1) * 10}`,
                standardRatePerHour,
                // Schedule OP10 on Day 1 (Today) so the user immediately sees it in Today's Daily Dispatch Sheet!
                scheduledDayIndex: Math.min(6, idx + 1),
                shiftName: idx % 2 === 0 ? 'شیفت صبح' : 'شیفت عصر',
                basePlannedQty: op.plannedQuantity || activePlan.proposedQuantity,
                carriedOverQty: 0,
                effectiveTargetQty: op.plannedQuantity || activePlan.proposedQuantity,
                completedGoodQty: 0,
                scrapQty: 0,
                wipBufferBeforeOp: idx === 0 ? activePlan.proposedQuantity : 0,
                wipBufferAfterOp: 0,
                isFinalOp: idx === totalOpsCount - 1,
                status: idx === 0 ? 'IN_PROGRESS' : 'PLANNED',
              };
            }
          );

          const newItem: MultiPartScheduleItem = {
            id: `SCH-${activePlan.id}`,
            orderCode: newMoNumber,
            partId: activePlan.partId,
            partCode: activePlan.partCode,
            partName: activePlan.partName,
            carModel: 'ساپکو / ایران‌خودرو',
            partType: 'SUB_ASSEMBLY',
            rawMaterialCode: `RM-SHEET-${requiredGrade.replace(/\s+/g, '-')}`,
            rawMaterialName: `ورق فولادی ${requiredGrade} (مخصوص ${activePlan.partName})`,
            unitWeightKg: unitWeight,
            weeklyTargetQty: activePlan.proposedQuantity,
            rawMaterialIssuedKg:
              activePlan.materialStatus?.availableWeightKg ||
              activePlan.materialStatus?.requiredWeightKg ||
              Math.round(activePlan.proposedQuantity * unitWeight),
            warehouseReceivedQty: 0,
            ops: opsList,
          };

          const existingIdx = currentSchedule.findIndex(
            s => s.id === newItem.id || s.orderCode === newMoNumber
          );

          const nextSchedule = [...currentSchedule];
          if (existingIdx >= 0) {
            nextSchedule[existingIdx] = newItem;
          } else {
            nextSchedule.unshift(newItem);
          }

          try {
            window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(nextSchedule));
          } catch {
            // ignore
          }
          setShopFloorSchedule(nextSchedule);

          // 3. Record audit trail & toast
          recordAudit({
            moduleName: 'موتور تطبیق ماشین‌آلات (APS)',
            actionType: 'COMPLETE_MO',
            title: `تایید پیشنهاد و ارسال به سالن: ${activePlan.partName}`,
            details: `دستور ${newMoNumber} با تیراژ ${activePlan.proposedQuantity} قطعه و ورق ${requiredGrade} به برنامه روزانه کارگاه ارسال شد.`,
          });

          showUndoToast({
            title: `دستور تولید «${activePlan.partName}» (${newMoNumber}) به سالن ارسال شد`,
            detail: 'در حال نمایش در شیت برنامه روزانه شیفت (امروز)...',
            variant: 'success',
          });

          await onRefresh();

          // 4. Navigate explicitly to ERP_WORKBENCH -> DAILY_DISPATCH_SHEET
          router.navigate({
            tab: 'production',
            productionViewMode: 'ERP_WORKBENCH',
            productionModuleTab: 'DAILY_DISPATCH_SHEET',
          });
        } catch (err: any) {
          setFeedbackMsg({
            type: 'error',
            text: err.message || 'خطا در تایید و ارسال به برنامه سالن',
          });
        } finally {
          setActionInProgress(false);
        }
      },
    });
  };

  const handleApprove = async () => {
    if (!activePlan) return;
    setActionInProgress(true);
    setFeedbackMsg(null);
    try {
      const res = await onApprovePlan(activePlan.id, 'مدیر برنامه‌ریزی تولید');
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text:
            res.message ||
            'برنامه تولید با موفقیت تصویب شد و ظرفیت ماشین/ورق در سطح برنامه‌ریزی رزرو گردید (هنوز به کف سالن دیسپچ نشده است).',
        });
        await onRefresh();
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'خطا در تصویب برنامه' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'خطای ارتباط' });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRelease = async () => {
    if (!activePlan) return;
    setActionInProgress(true);
    setFeedbackMsg(null);
    try {
      const res = await onReleaseMo(activePlan.id, 'سرپرست برنامه‌ریزی');
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: `دستور کار کارگاهی با شناسه ${res.moId || ''} ایجاد و به خط تولید صادر گردید.`,
        });
        await onRefresh();
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'خطا در صدور دستور کار' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'خطای ارتباط' });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan || !revisionReason.trim()) return;
    setActionInProgress(true);
    setFeedbackMsg(null);
    try {
      const res = await onRevisePlan(activePlan.id, revisionReason.trim());
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message || 'نسخه جدید برنامه ایجاد شد.' });
        setShowRevisionModal(false);
        setRevisionReason('');
        await onRefresh();
        if (res.newPlanId) {
          onSelectSuggestion(res.newPlanId);
        }
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'خطا در ایجاد بازنگری' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'خطای ارتباط' });
    } finally {
      setActionInProgress(false);
    }
  };

  if (!activePlan && suggestions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
        <Cpu className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">هیچ برنامه تولید پیشنهادی یافت نشد</h3>
        <p className="text-sm mt-1 text-slate-400">
          برای ایجاد برنامه‌های پیشنهادی، سفارشات مشتریان را ثبت کرده یا دکمه «محاسبه مجدد تقاضا و برنامه‌ریزی هوشمند» را بزنید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Engineering Role & Action Buttons Guide Banner */}
      <div className="bg-gradient-to-l from-indigo-50/90 via-white to-amber-50/60 border border-indigo-200/80 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                راهنمای مهندسی: این صفحه در فرآیند برنامه‌ریزی چه کاری انجام می‌دهد و تفاوت دکمه‌ها چیست؟
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                شفاف‌سازی وظیفه موتور تطبیق پرس (APS) و تفاوت «تصویب برنامه» با «ارسال مستقیم به سالن تولید»
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWorkflowGuide(prev => !prev)}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer shrink-0"
          >
            {showWorkflowGuide ? 'بستن راهنما' : 'نمایش راهنما'}
          </button>
        </div>

        {showWorkflowGuide && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3.5 pt-3.5 border-t border-indigo-100 text-xs">
            <div className="bg-white p-3 rounded-lg border border-slate-200/90 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>۱. وظیفه این صفحه (تطبیق و انتخاب پرس)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                سیستم برای هر مرحله عملیات قطعه (OP10، OP20 و ...) تمام پرس‌های کارخانه را از نظر <strong>تناژ الزامی قالب</strong>، <strong>سازگاری ابعاد میز</strong> و <strong>ساعت آزاد شیفت</strong> بررسی کرده و بهترین پرس را پیشنهاد می‌دهد. شما می‌توانید در هر مرحله، پرس پیشنهادی را <strong>به صورت دستی تغییر دهید</strong>.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-emerald-200/90 space-y-1">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>۲. دکمه «تأیید و تصویب برنامه»</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                فقط وضعیت برنامه را در واحد برنامه‌ریزی از «پیش‌نویس» به <strong>«مصوب مدیر تولید»</strong> تغییر می‌دهد و ظرفیت پرس و کلاف ورق را رزرو می‌کند، اما <strong>هنوز کاری به شیت روزانه سرپرست سالن ارسال نمی‌کند</strong>.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-indigo-200/90 space-y-1">
              <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-indigo-600" />
                <span>۳. دکمه «تایید پیشنهاد و ارسال به سالن»</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                پس از نمایش <strong>پنجره تایید مشخصات</strong>، دستور کار را با ورق اختصاصی همان قطعه و پرس‌های انتخابی مستقیماً وارد <strong>«ماتریس برنامه‌ریزی OP»</strong> و <strong>«برنامه روزانه شیفت (امروز)»</strong> می‌کند و در هر زمان از همین صفحه <strong>قابل لغو و حذف</strong> است.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {/* Dispatched Status & Recall Banner if already sent to shop floor */}
      {dispatchedScheduleItem && (
        <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-emerald-950">
                  این برنامه قبلاً به سالن تولید ارسال شده است
                </span>
                <span className="px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-300 font-mono text-[11px] font-bold">
                  شماره دستور کار: {dispatchedScheduleItem.orderCode}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-1">
                ورق اختصاص‌یافته: <strong>{dispatchedScheduleItem.rawMaterialName}</strong> • تیراژ هدف:{' '}
                <strong>{formatNumber(dispatchedScheduleItem.weeklyTargetQty)} عدد</strong> • تعداد ایستگاه:{' '}
                <strong>{toPersianDigits(dispatchedScheduleItem.ops.length)} مرحله OP</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() =>
                router.navigate({
                  tab: 'production',
                  productionViewMode: 'ERP_WORKBENCH',
                  productionModuleTab: 'DAILY_DISPATCH_SHEET',
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>مشاهده در برنامه روزانه سالن</span>
            </button>
            <button
              type="button"
              onClick={handleRecallFromShopFloor}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>لغو ارسال و حذف از برنامه سالن</span>
            </button>
          </div>
        </div>
      )}

      {/* Plan Selector & Quick Actions Top Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  موتور تطبیق و اولویت‌بندی ماشین‌آلات پرس و تجهیزات
                </h2>
                <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  {toPersianDigits(suggestions.length)} پیشنهاد فعال
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تخصیص هوشمند مراحل مسیر تولید براساس تناژ، سازگاری قالب، وضعیت سلامت دستگاه و سقف ظرفیت شیفت
              </p>
            </div>
          </div>

          {/* Plan Selector Dropdown */}
          <div className="w-full lg:w-auto flex flex-wrap items-center gap-2.5">
            <label className="text-xs font-bold text-slate-600">انتخاب برنامه قطعه:</label>
            <select
              value={activePlan?.id || ''}
              onChange={e => onSelectSuggestion(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {suggestions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.planNumber} (نسخه {toPersianDigits(s.planVersion)}) - {s.partName} ({formatNumber(s.proposedQuantity)} عدد)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activePlan && (
        <>
          {/* Active Plan Summary Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-lg font-black text-slate-900 font-mono tracking-tight">
                    {activePlan.planNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 font-mono">
                    نسخه {toPersianDigits(activePlan.planVersion)}
                  </span>
                  {activePlan.approvalStatus === 'DRAFT_SUGGESTION' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      پیش‌نویس موتور برنامه‌ریزی
                    </span>
                  )}
                  {activePlan.approvalStatus === 'APPROVED' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      مصوب مدیر تولید (رزرو ظرفیت)
                    </span>
                  )}
                  {activePlan.approvalStatus === 'CONVERTED_TO_MO' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      صادر شده به دستور کار کارگاهی
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-700 font-medium mt-1.5 flex flex-wrap items-center gap-3">
                  <span>
                    قطعه: <strong className="text-slate-900 font-black">{activePlan.partName}</strong>
                  </span>
                  <span className="text-slate-500 font-mono text-xs">({activePlan.partCode})</span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    موعد تحویل سفارشات: <strong>{formatToJalali(activePlan.targetDueDate)}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {activePlan.approvalStatus === 'DRAFT_SUGGESTION' && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={actionInProgress || !activePlan.overallFeasible}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                    title="تصویب برنامه در واحد برنامه‌ریزی و رزرو ظرفیت بدون ارسال فوری به شیت روزانه کف سالن"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>تأیید و تصویب برنامه (رزرو ظرفیت)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApproveAndDispatchToShopFloor}
                  disabled={actionInProgress || !activePlan.overallFeasible}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-sm cursor-pointer"
                  title="مشاهده خلاصه تایید و ارسال عملیات‌ها به ماتریس OP و شیت برنامه روزانه سالن تولید"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {dispatchedScheduleItem
                      ? 'بروزرسانی برنامه در سالن تولید'
                      : 'تایید پیشنهاد و ارسال به سالن'}
                  </span>
                </button>

                {activePlan.approvalStatus === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={handleRelease}
                    disabled={actionInProgress}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    صدور کد رسمی MO
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowRevisionModal(true)}
                  disabled={actionInProgress}
                  className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer"
                >
                  <GitBranch className="w-3.5 h-3.5 text-amber-600" />
                  ایجاد بازنگری (Revision)
                </button>
              </div>
            </div>

            {/* Infeasibility Warnings Banner if any */}
            {!activePlan.overallFeasible && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  برنامه با محدودیت‌های خط تولید مواجه بوده و قابل اجرای مستقیم نیست:
                </div>
                <ul className="list-disc list-inside space-y-0.5 pr-2">
                  {activePlan.infeasibilityWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Calculations Breakdown Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">تقاضای ناخالص سفارشات</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {formatNumber(activePlan.grossDemand)} <span className="text-[10px] text-slate-500">عدد</span>
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">موجودی آزاد انبار محصول</div>
                <div className="text-sm font-bold text-emerald-600 mt-0.5">
                  {formatNumber(activePlan.availableFg)} <span className="text-[10px] text-slate-500">عدد</span>
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">موجودی نیمه‌ساخته (WIP)</div>
                <div className="text-sm font-bold text-cyan-600 mt-0.5">
                  {formatNumber(activePlan.wipCredit)} <span className="text-[10px] text-slate-500">عدد</span>
                </div>
              </div>
              <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                <div className="text-[11px] text-amber-800 font-bold">الزام خالص تولید (تیراژ برنامه)</div>
                <div className="text-sm font-black text-amber-700 mt-0.5">
                  {formatNumber(activePlan.proposedQuantity)} <span className="text-[10px] text-amber-700">عدد</span>
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">
                  ورق مصرفی ({activePlan.materialStatus.requiredGrade})
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {formatNumber(activePlan.materialStatus.requiredWeightKg)} <span className="text-[10px] text-slate-500">kg</span>
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">وضعیت موجودی ورق در انبار</div>
                <div
                  className={`text-sm font-bold mt-0.5 ${
                    activePlan.materialStatus.hasShortage ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {activePlan.materialStatus.hasShortage
                    ? `کسری ${formatNumber(activePlan.materialStatus.shortageKg)} kg`
                    : `تأمین کامل (${formatNumber(activePlan.materialStatus.availableWeightKg)} kg آزاد)`}
                </div>
              </div>
            </div>
          </div>

          {/* Proposed Operations List with Ranked Machine Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                توالی عملیات مسیر تولید و انتخاب پرس هر ایستگاه (قابل تغییر دستی توسط برنامه‌ریز)
              </h3>
              <span className="text-xs text-slate-500 font-bold">
                {toPersianDigits(activePlan.proposedOperations.length)} مرحله عملیاتی (OP)
              </span>
            </div>

            <div className="space-y-4">
              {activePlan.proposedOperations.map((op, idx) => {
                const isExpanded = expandedOperationIndex === idx;
                const recMachine = getEffectiveMachineForOp(activePlan.id, idx, op);
                const isManuallyOverridden = Boolean(manualMachineOverrides[`${activePlan.id}_${idx}`]);
                const showCandidates = showAllCandidates[idx];

                return (
                  <div
                    key={idx}
                    className={`bg-white border rounded-xl overflow-hidden transition ${
                      op.isInfeasible
                        ? 'border-rose-300 bg-rose-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Operation Step Header Bar */}
                    <div
                      onClick={() => setExpandedOperationIndex(isExpanded ? null : idx)}
                      className="p-4 cursor-pointer hover:bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 font-mono text-xs font-black flex items-center justify-center border border-amber-200">
                          {op.stepCode || `OP${toPersianDigits(op.stepNumber)}`}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">{op.stepName}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                              {op.processType}
                            </span>
                            {op.requiredTonnage > 0 && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                                تناژ الزامی قالب: {formatNumber(op.requiredTonnage)} تن
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                            <span>
                              تیراژ عملیات: <strong className="text-slate-900">{formatNumber(op.plannedQuantity)}</strong> عدد
                            </span>
                            <span>
                              سایکل استاندارد: <strong className="text-slate-900">{toPersianDigits(op.standardCycleTimeSec)}</strong> ثانیه
                            </span>
                            <span>
                              زمان خالص ضرب: <strong className="text-slate-900">{toPersianDigits(op.estimatedRunHours)}</strong> ساعت
                            </span>
                            {op.dieMoldName && (
                              <span className="text-purple-700 font-medium">
                                قالب اختصاصی: {op.dieMoldName} ({op.dieMoldCode})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {recMachine ? (
                          <div className="flex items-center gap-2">
                            <div className="text-left">
                              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>
                                  {isManuallyOverridden ? 'انتخاب دستی برنامه‌ریز:' : 'پیشنهاد اول سیستم:'}{' '}
                                  {recMachine.machineName}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                امتیاز تناسب: {toPersianDigits(recMachine.suitabilityScore)}% | بار کاری فعلی: {toPersianDigits(recMachine.currentWorkloadPercent)}%
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-mono font-bold border border-emerald-200">
                              {recMachine.machineCode}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                            <XCircle className="w-4 h-4" />
                            فاقد دستگاه مجاز و سازگار
                          </div>
                        )}
                        <button type="button" className="text-slate-400 hover:text-slate-900 p-1">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-4">
                        {/* Top Selected/Recommended Machine Card Details */}
                        {recMachine ? (
                          <div className="bg-white border border-emerald-300 rounded-xl p-4 shadow-2xs relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500" />
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    {isManuallyOverridden
                                      ? '✓ دستگاه انتخاب‌شده توسط برنامه‌ریز'
                                      : '★ اولویت اول پیشنهادی سیستم'}
                                  </span>
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {recMachine.machineName} ({recMachine.machineCode})
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                                  {recMachine.recommendationReason}
                                </p>
                              </div>

                              <div className="grid grid-cols-3 gap-3 text-center shrink-0">
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                  <div className="text-[10px] text-slate-500">امتیاز شایستگی</div>
                                  <div className="text-sm font-black text-emerald-600 mt-0.5">
                                    {toPersianDigits(recMachine.suitabilityScore)}/۱۰۰
                                  </div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                  <div className="text-[10px] text-slate-500">ظرفیت آزاد شیفت</div>
                                  <div className="text-sm font-bold text-cyan-700 mt-0.5">
                                    {toPersianDigits(recMachine.availableHoursRemaining)} ساعت
                                  </div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                  <div className="text-[10px] text-slate-500">لود ظرفیت جاری</div>
                                  <div className="text-sm font-bold text-amber-600 mt-0.5">
                                    {toPersianDigits(recMachine.currentWorkloadPercent)}%
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Workload Progress Bar */}
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
                              <span className="text-[11px] text-slate-500 shrink-0">
                                اشغال ظرفیت دو شیفت کاری (سقف ۱۵ ساعت روزانه):
                              </span>
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    recMachine.currentWorkloadPercent > 80
                                      ? 'bg-rose-500'
                                      : recMachine.currentWorkloadPercent > 60
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, recMachine.currentWorkloadPercent)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono font-bold text-slate-700 shrink-0">
                                {toPersianDigits(recMachine.currentWorkloadHours)} از {toPersianDigits(recMachine.dailyCapacityHours)} ساعت
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block text-sm text-rose-900">
                                توقف در برنامه‌ریزی این مرحله:
                              </strong>
                              هیچ ماشینی با مشخصات فنی مورد نیاز سازگار نیست.
                              <ul className="list-disc list-inside mt-1 space-y-0.5">
                                {op.infeasibilityReasons.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Candidate Machines Audit Drawer Toggle */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => toggleAllCandidates(idx)}
                            className="text-xs text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Info className="w-4 h-4" />
                            {showCandidates
                              ? 'بستن جدول مقایسه و تغییر دستی ماشین‌آلات'
                              : `مشاهده سایر پرس‌های ارزیابی‌شده و تغییر دستی ماشین (${toPersianDigits(op.allCandidateMachines.length)} دستگاه)`}
                          </button>

                          {showCandidates && (
                            <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                              <div className="text-[11px] text-slate-500 mb-2">
                                برای تغییر پرس این مرحله، روی دکمه <strong>«انتخاب این پرس برای مرحله»</strong> در کارت دستگاه‌های مجاز کلیک کنید:
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {op.allCandidateMachines.map(cand => {
                                  const isCurrentlySelected =
                                    recMachine?.machineCode === cand.machineCode;
                                  return (
                                    <div
                                      key={cand.machineId}
                                      className={`p-3 rounded-xl border text-xs space-y-2 transition ${
                                        isCurrentlySelected
                                          ? 'bg-emerald-50/60 border-emerald-400 ring-1 ring-emerald-400'
                                          : cand.isEligible
                                          ? 'bg-white border-slate-200 text-slate-900 hover:border-indigo-300'
                                          : 'bg-rose-50/40 border-rose-200 text-slate-600'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900">{cand.machineName}</span>
                                          <span className="font-mono text-[10px] text-slate-500">({cand.machineCode})</span>
                                        </div>
                                        {cand.isEligible ? (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            رتبه {toPersianDigits(cand.recommendationRank)} (مجاز)
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                            رد صلاحیت فنی
                                          </span>
                                        )}
                                      </div>

                                      {/* Evaluation Criteria Checklist */}
                                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pt-1">
                                        <div className="flex items-center gap-1">
                                          {cand.supportsProcess ? (
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                          ) : (
                                            <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                          )}
                                          <span>پوشش فرایند: {cand.supportsProcess ? 'تأیید' : 'عدم تطابق'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {cand.tonnageSufficient ? (
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                          ) : (
                                            <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                          )}
                                          <span>تناژ مجاز: {cand.tonnageSufficient ? 'کافی' : 'ناکافی'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {cand.dieCompatible ? (
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                          ) : (
                                            <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                          )}
                                          <span>انطباق قالب: {cand.dieCompatible ? 'سازگار' : 'ناسازگار'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {cand.isMachineActive ? (
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                          ) : (
                                            <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                          )}
                                          <span>وضعیت: {cand.isMachineActive ? 'آماده‌به‌کار' : 'متوقف / تعمیرات'}</span>
                                        </div>
                                      </div>

                                      {/* Ineligibility Reasons */}
                                      {!cand.isEligible && cand.ineligibilityReasons.length > 0 && (
                                        <div className="text-[11px] text-rose-800 bg-rose-100/70 p-2 rounded border border-rose-200 space-y-0.5 mt-1">
                                          {cand.ineligibilityReasons.map((r, ri) => (
                                            <div key={ri} className="flex items-center gap-1">
                                              <span className="text-rose-600">•</span>
                                              <span>{r}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {cand.isEligible && (
                                        <div className="text-[11px] text-slate-700 pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-3">
                                            <span>
                                              ساعت آزاد: <strong>{toPersianDigits(cand.availableHoursRemaining)}h</strong>
                                            </span>
                                            <span>
                                              امتیاز: <strong className="text-emerald-700">{toPersianDigits(cand.suitabilityScore)}</strong>
                                            </span>
                                          </div>
                                          {isCurrentlySelected ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">
                                              <Check className="w-3 h-3" />
                                              ماشین انتخاب‌شده فعلی
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleSelectCandidateMachine(
                                                  activePlan.id,
                                                  idx,
                                                  cand,
                                                  op.stepName
                                                )
                                              }
                                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-[10px] font-bold transition cursor-pointer"
                                            >
                                              انتخاب این پرس برای مرحله
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational Workflow Chain Footer */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>زنجیره عملیاتی تجمیع برنامه و دیسپچ کارگاهی (APS → Daily Shop-Floor Dispatch)</span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                با کلیک روی دکمه روبرو، ابتدا پنجره تایید نهایی با جزئیات ورق مصرفی ({activePlan.materialStatus.requiredGrade}) و ایستگاه‌های OP نمایش داده می‌شود و پس از تایید شما، به شیت برنامه روزانه سالن تولید اضافه می‌گردد.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {dispatchedScheduleItem && (
                <button
                  type="button"
                  onClick={handleRecallFromShopFloor}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>لغو ارسال و حذف از سالن</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleApproveAndDispatchToShopFloor}
                disabled={actionInProgress || !activePlan.overallFeasible}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {dispatchedScheduleItem
                    ? 'بروزرسانی برنامه در سالن تولید'
                    : 'تایید پیشنهاد و ارسال به سالن'}
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-amber-500" />
              ایجاد نسخه بازنگری شده برنامه (Revision)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              نسخه فعلی ({activePlan?.planVersion}) بایگانی شده و نسخه جدیدی برای اعمال اصلاحات ایجاد می‌گردد.
            </p>

            <form onSubmit={handleCreateRevision} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  علت بازنگری یا تغییر برنامه:
                </label>
                <textarea
                  value={revisionReason}
                  onChange={e => setRevisionReason(e.target.value)}
                  placeholder="مثال: تغییر اولویت تحویل توسط ساپکو، خرابی پرس اصلی، کسری کلاف ورق..."
                  required
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress || !revisionReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs disabled:opacity-50 cursor-pointer"
                >
                  {actionInProgress ? 'در حال ثبت...' : 'ایجاد نسخه جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
