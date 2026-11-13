import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Plus,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Info,
  Clock,
  Printer,
  X,
  FileText,
  Boxes,
  Split,
  Calendar,
  Edit3,
  Trash2,
  ShieldAlert,
  Lock,
  Unlock,
} from 'lucide-react';
import { PhysicalCoil, StockOwnership } from '../../types/inventory';
import { formatNumber, formatWeightKg, toPersianDigits } from '../../utils/formatters';
import { CoilSlittingGenealogyPanel } from './CoilSlittingGenealogyPanel';
import { useEnterpriseUx } from '../../context/EnterpriseUxContext';
import { loadQcHoldMap, saveQcHoldMap, QcHoldRecord } from '../../utils/qcHoldStore';

interface PhysicalCoilsViewProps {
  onRefresh?: () => Promise<void>;
  currentUser: {
    uid: string;
    displayName: string;
  };
}

export const PhysicalCoilsView: React.FC<PhysicalCoilsViewProps> = ({ currentUser }) => {
  const { requestConfirm, showUndoToast, openQuickEditDrawer, recordAudit } = useEnterpriseUx();
  const [coils, setCoils] = useState<PhysicalCoil[]>([]);
  const [qcHoldMap, setQcHoldMap] = useState<Record<string, QcHoldRecord>>(() => loadQcHoldMap());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FULL' | 'PARTIAL' | 'CONSUMED'>('ALL');

  useEffect(() => {
    const onHoldChange = () => setQcHoldMap(loadQcHoldMap());
    window.addEventListener('kpims-qc-hold-changed', onHoldChange);
    return () => window.removeEventListener('kpims-qc-hold-changed', onHoldChange);
  }, []);

  const isCoilInQcHold = (c: PhysicalCoil): boolean => {
    return Boolean(
      c.qualityStatus === 'QUARANTINE' ||
        c.qualityStatus === 'QUALITY_BLOCKED' ||
        qcHoldMap[c.id]?.isHeld ||
        qcHoldMap[c.coilId]?.isHeld
    );
  };

  // Mandatory QC Hold Reason Modal State
  const [qcHoldModalCoil, setQcHoldModalCoil] = useState<PhysicalCoil | null>(null);
  const [qcHoldReasonInput, setQcHoldReasonInput] = useState('');
  const [qcHoldReasonError, setQcHoldReasonError] = useState('');

  const QC_HOLD_REASON_PRESETS = [
    'زنگ‌زدگی سطحی ورق (Surface Rust / Oxidation)',
    'مغایرت ضخامت یا عرض با تلرانس فنی ساپکو',
    'عدم انطباق نتایج تست کشش / سختی با گواهی ذوب',
    'لهیدگی لبه کلاف در زمان حمل و تخلیه (Edge Damage)',
    'موج‌دار بودن سطح ورق یا پوسته شدن گالوانیزه',
  ];

  const executeCoilQcHoldChange = async (coil: PhysicalCoil, nextHeld: boolean, mandatoryReasonFa?: string) => {
    const prevMap = { ...qcHoldMap };
    const prevCoils = [...coils];
    const updatedMap = { ...qcHoldMap };
    const finalReason = (mandatoryReasonFa || '').trim() || 'قرنطینه کیفی کلاف ورق (QC Hold)';

    if (nextHeld) {
      const rec: QcHoldRecord = {
        key: coil.id,
        partId: coil.partId,
        partCode: coil.partCode,
        partName: `${coil.partName} (${coil.coilId})`,
        lotNumber: coil.coilId,
        warehouseName: coil.warehouseName,
        isHeld: true,
        heldQty: coil.remainingWeightKg,
        heldWeightKg: coil.remainingWeightKg,
        unit: 'KG',
        reasonFa: finalReason,
        updatedAt: new Date().toLocaleString('fa-IR'),
        actor: currentUser?.displayName || 'واحد کنترل کیفیت',
      };
      updatedMap[coil.id] = rec;
      updatedMap[coil.coilId] = rec;
    } else {
      delete updatedMap[coil.id];
      delete updatedMap[coil.coilId];
    }

    setQcHoldMap(updatedMap);
    saveQcHoldMap(updatedMap);
    setCoils(prev =>
      prev.map(c =>
        c.id === coil.id
          ? { ...c, qualityStatus: nextHeld ? 'QUARANTINE' : 'AVAILABLE' }
          : c
      )
    );

    try {
      await fetch('/api/inventory/qc-hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: coil.id,
          partId: coil.partId,
          partCode: coil.partCode,
          materialGrade: coil.materialGrade,
          lotNumber: coil.coilId,
          isHeld: nextHeld,
          heldQty: coil.remainingWeightKg,
          heldWeightKg: coil.remainingWeightKg,
          reasonFa: finalReason,
        }),
      });
    } catch {
      // local state updated
    }

    recordAudit({
      actionType: 'STATUS_CHANGE',
      module: 'مدیریت کلاف‌های ورق (QC Hold)',
      entityId: coil.id,
      entityCode: coil.coilId,
      summaryFa: nextHeld
        ? `قرنطینه کیفی کلاف «${coil.coilId}» (${formatWeightKg(coil.remainingWeightKg)}) — علت: ${finalReason}`
        : `رفع قرنطینه کیفی کلاف «${coil.coilId}» و بازگشت به ATP`,
      details: nextHeld
        ? `علت قرنطینه (QC Hold Reason): ${finalReason} | کسر ${formatWeightKg(coil.remainingWeightKg)} از موجودی آزاد (ATP) در MRP`
        : `آزادسازی کلاف ${coil.coilId} و بازگشت به موجودی قابل برنامه‌ریزی`,
      beforeSnapshot: { qualityStatus: coil.qualityStatus },
      afterSnapshot: {
        qualityStatus: nextHeld ? 'QUARANTINE' : 'AVAILABLE',
        qcHoldReason: nextHeld ? finalReason : null,
      },
    });

    showUndoToast({
      title: nextHeld
        ? `🔒 کلاف «${coil.coilId}» در قرنطینه کیفی قرار گرفت`
        : `🔓 قرنطینه کیفی کلاف «${coil.coilId}» آزاد شد`,
      description: nextHeld
        ? `علت: ${finalReason} | ${formatWeightKg(coil.remainingWeightKg)} از ATP کسر شد.`
        : 'کلاف به چرخه موجودی آزاد بازگشت.',
      onUndo: () => {
        setQcHoldMap(prevMap);
        saveQcHoldMap(prevMap);
        setCoils(prevCoils);
      },
    });
  };

  const handleToggleCoilQcHold = (coil: PhysicalCoil) => {
    const currentlyHeld = isCoilInQcHold(coil);
    const nextHeld = !currentlyHeld;

    if (nextHeld) {
      // Open Mandatory QC Hold Reason Modal before freezing the coil
      setQcHoldModalCoil(coil);
      setQcHoldReasonInput('');
      setQcHoldReasonError('');
      return;
    }

    requestConfirm({
      title: `رفع قرنطینه کیفی رول ورق — کلاف «${coil.coilId}»`,
      description: `آیا از تایید کیفی و آزادسازی کلاف «${coil.coilId}» اطمینان دارید؟`,
      consequenceText: `وزن ${formatWeightKg(
        coil.remainingWeightKg
      )} مجدداً به موجودی آزاد قابل تخصیص (ATP) در ماژول MRP بازگردانده می‌شود.`,
      severity: 'info',
      confirmLabel: 'تأیید رفع قرنطینه کلاف',
      onConfirm: async () => {
        await executeCoilQcHoldChange(coil, false);
      },
    });
  };

  const handleConfirmQcHoldModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcHoldModalCoil) return;
    const trimmedReason = qcHoldReasonInput.trim();
    if (!trimmedReason) {
      setQcHoldReasonError('ثبت «علت قرنطینه (QC Hold Reason)» قبل از فریز کردن کلاف الزامی است.');
      return;
    }
    const targetCoil = qcHoldModalCoil;
    setQcHoldModalCoil(null);
    setQcHoldReasonInput('');
    setQcHoldReasonError('');
    await executeCoilQcHoldChange(targetCoil, true, trimmedReason);
  };

  // Modals
  const [selectedCoil, setSelectedCoil] = useState<PhysicalCoil | null>(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [genealogyModalOpen, setGenealogyModalOpen] = useState(false);

  // Issue Form states (Single vs Multi-Part issue)
  const [issueMode, setIssueMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [issueWeight, setIssueWeight] = useState('');
  const [issueMoId, setIssueMoId] = useState('');
  const [issueOperationId, setIssueOperationId] = useState('');
  const [issueScrap, setIssueScrap] = useState('0');
  const [issueRequestKey, setIssueRequestKey] = useState('');
  const [initialInputQuantityPcs, setInitialInputQuantityPcs] = useState('');
  const [multiPartsList, setMultiPartsList] = useState<Array<{ partName: string; moId: string; moOperationId: string; issuedWeightKg: string }>>([
    { partName: '', moId: '', moOperationId: '', issuedWeightKg: '' },
  ]);
  const [availableManufacturingOrders, setAvailableManufacturingOrders] = useState<Array<{
    id: string; moNumber: string; partCode: string; partName: string; status: string;
    weightNetKg: number;
    weightGrossKg: number;
    wipManufacturingOrderId: string | null;
    operations: Array<{ id: string; stepNumber: number; operationCode: string; operationName: string; processType: string; status: string; plannedMachine?: string | null; isFirstOperation?: boolean }>;
  }>>([]);

  // Return Form states
  const [returnWeight, setReturnWeight] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  // Multi-contract allocation form
  const [allocationsList, setAllocationsList] = useState<{ contractId: string; allocatedWeightKg: number }[]>([]);
  const [availableContracts, setAvailableContracts] = useState<
    Array<{ id: string; contractNumber: string; title?: string; customerName?: string }>
  >([]);

  const selectedIssueMo = availableManufacturingOrders.find(mo => mo.id === issueMoId);
  const selectedIssueOperation = selectedIssueMo?.operations.find(operation => operation.id === issueOperationId);
  const suggestedInitialInputPcs = selectedIssueMo && selectedIssueMo.weightGrossKg > 0
    ? Math.floor(Math.max(0, (Number(issueWeight) || 0) - (Number(issueScrap) || 0)) / selectedIssueMo.weightGrossKg)
    : 0;

  useEffect(() => {
    if (selectedIssueOperation?.isFirstOperation) {
      setInitialInputQuantityPcs(suggestedInitialInputPcs > 0 ? String(suggestedInitialInputPcs) : '');
    } else {
      setInitialInputQuantityPcs('');
    }
  }, [issueMoId, issueOperationId, issueWeight, issueScrap]);

  // Genealogy data state
  const [genealogyData, setGenealogyData] = useState<any>(null);
  const [genealogyLoading, setGenealogyLoading] = useState(false);

  // Feedback notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCoils = async () => {
    setLoading(true);
    try {
      const [coilsRes, cntRes, moRes] = await Promise.all([
        fetch('/api/inventory/coils'),
        fetch('/api/inventory/contracts'),
        fetch('/api/inventory/coils/issue-options'),
      ]);
      const data = await coilsRes.json();
      if (data.success) {
        setCoils(data.data);
      }
      const cntData = await cntRes.json();
      if (cntData.success && Array.isArray(cntData.data)) {
        setAvailableContracts(cntData.data);
      }
      const moData = await moRes.json();
      if (moData.success && Array.isArray(moData.data)) setAvailableManufacturingOrders(moData.data);
    } catch (err) {
      console.error('Error fetching coils:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoils();
  }, []);

  // Filtered coils
  const filteredCoils = useMemo(() => {
    return coils.filter(c => {
      if (gradeFilter !== 'ALL' && c.materialGrade !== gradeFilter) return false;
      if (ownershipFilter !== 'ALL' && c.ownership !== ownershipFilter) return false;

      // Status filter
      if (statusFilter === 'FULL' && (c.remainingWeightKg < c.originalWeightKg || c.remainingWeightKg <= 0)) {
        return false;
      }
      if (statusFilter === 'PARTIAL' && (c.remainingWeightKg >= c.originalWeightKg || c.remainingWeightKg <= 0)) {
        return false;
      }
      if (statusFilter === 'CONSUMED' && c.remainingWeightKg > 0) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          c.coilId.toLowerCase().includes(q) ||
          c.coilPackNumber.toLowerCase().includes(q) ||
          (c.partName && c.partName.toLowerCase().includes(q)) ||
          (c.partCode && c.partCode.toLowerCase().includes(q)) ||
          (c.heatNumber && c.heatNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [coils, gradeFilter, ownershipFilter, statusFilter, searchTerm]);

  // Aggregate stats across all coils
  const fullCoilsCount = coils.filter(c => c.remainingWeightKg === c.originalWeightKg && c.remainingWeightKg > 0).length;
  const partialCoilsCount = coils.filter(c => c.remainingWeightKg < c.originalWeightKg && c.remainingWeightKg > 0).length;
  const consumedCoilsCount = coils.filter(c => c.remainingWeightKg <= 0).length;
  const totalPhysicalWeight = filteredCoils.reduce((sum, c) => sum + c.remainingWeightKg, 0);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoil) return;

    if (issueMode === 'MULTI') {
      const validParts = multiPartsList.filter(p => Number(p.issuedWeightKg) > 0);
      if (validParts.length === 0 || validParts.some(p => !p.moId.trim() || !p.moOperationId.trim())) {
        setNotification({ type: 'error', message: 'برای هر ردیف، دستور ساخت، عملیات مجاز و وزن حواله را انتخاب کنید.' });
        return;
      }
      const totalMultiKg = validParts.reduce((sum, p) => sum + Number(p.issuedWeightKg), 0);
      const scrap = Number(issueScrap) || 0;
      const totalRequired = totalMultiKg + scrap;

      if (totalRequired <= 0 || totalRequired > selectedCoil.remainingWeightKg) {
        setNotification({
          type: 'error',
          message: `مجموع وزن تخصیص به قطعات (${totalRequired} kg) باید بین ۱ تا ${selectedCoil.remainingWeightKg} کیلوگرم باشد.`,
        });
        return;
      }

      try {
        const res = await fetch(`/api/inventory/coils/${selectedCoil.id}/issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueRequestKey,
            multiParts: validParts.map(p => ({
              partName: p.partName,
              moId: p.moId,
              moOperationId: p.moOperationId,
              issuedWeightKg: Number(p.issuedWeightKg),
            })),
            scrappedKg: scrap,
            user: currentUser,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setNotification({ type: 'error', message: data.error || 'خطا در صدور چندقطعه‌ای کلاف' });
        } else {
          setNotification({ type: 'success', message: data.message });
          setIssueModalOpen(false);
          setIssueRequestKey('');
          fetchCoils();
        }
      } catch (err: any) {
        setNotification({ type: 'error', message: err.message || 'خطای شبکه' });
      }
    } else {
      const issuedKg = Number(issueWeight);
      if (!issueMoId.trim() || !issueOperationId.trim()) {
        setNotification({ type: 'error', message: 'برای رهگیری مصرف، دستور ساخت و عملیات تولید را انتخاب کنید.' });
        return;
      }
      if (!issuedKg || issuedKg <= 0 || issuedKg > selectedCoil.remainingWeightKg) {
        setNotification({
          type: 'error',
          message: `مقدار صادر شده باید بین ۱ تا ${selectedCoil.remainingWeightKg} کیلوگرم باشد.`,
        });
        return;
      }

      try {
        const res = await fetch(`/api/inventory/coils/${selectedCoil.id}/issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueRequestKey,
            issuedWeightKg: issuedKg,
            moId: issueMoId.trim(),
            moOperationId: issueOperationId.trim(),
            scrappedKg: Number(issueScrap) || 0,
            initialInputQuantityPcs: selectedIssueOperation?.isFirstOperation ? Number(initialInputQuantityPcs) || 0 : undefined,
            wipManufacturingOrderId: selectedIssueMo?.wipManufacturingOrderId || undefined,
            user: currentUser,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setNotification({ type: 'error', message: data.error || 'خطا در صدور جزئی کلاف' });
        } else {
          setNotification({ type: 'success', message: data.message });
          setIssueModalOpen(false);
          setIssueRequestKey('');
          setIssueWeight('');
          fetchCoils();
        }
      } catch (err: any) {
        setNotification({ type: 'error', message: err.message || 'خطای شبکه' });
      }
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoil) return;

    const returnedKg = Number(returnWeight);
    if (!returnedKg || returnedKg <= 0) {
      setNotification({ type: 'error', message: 'وزن ته‌کلاف برگشتی باید مثبت باشد.' });
      return;
    }

    try {
      const res = await fetch(`/api/inventory/coils/${selectedCoil.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnedRemnantWeightKg: returnedKg,
          notes: returnNotes || 'برگشت مازاد یا ته‌کلاف از خط تولید به انبار',
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.error || 'خطا در برگشت ته‌کلاف' });
      } else {
        setNotification({ type: 'success', message: data.message });
        setReturnModalOpen(false);
        setReturnWeight('');
        fetchCoils();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'خطای شبکه' });
    }
  };

  const openAllocateModal = (coil: PhysicalCoil) => {
    setSelectedCoil(coil);
    setAllocationsList(
      coil.allocations && coil.allocations.length > 0
        ? coil.allocations.map(a => ({ contractId: a.contractId, allocatedWeightKg: a.allocatedWeightKg }))
        : [{ contractId: 'CNT-SAPCO-1403-Q3', allocatedWeightKg: coil.originalWeightKg }]
    );
    setAllocateModalOpen(true);
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoil) return;

    const totalAlloc = allocationsList.reduce((sum, a) => sum + Number(a.allocatedWeightKg || 0), 0);
    if (totalAlloc > selectedCoil.originalWeightKg) {
      setNotification({
        type: 'error',
        message: `مجموع وزن تخصیص (${totalAlloc} kg) بیشتر از وزن کلاف (${selectedCoil.originalWeightKg} kg) است.`,
      });
      return;
    }

    try {
      const res = await fetch(`/api/inventory/coils/${selectedCoil.id}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocations: allocationsList,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotification({ type: 'error', message: data.error || 'خطا در ثبت تخصیص قراردادها' });
      } else {
        setNotification({ type: 'success', message: data.message });
        setAllocateModalOpen(false);
        fetchCoils();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'خطای شبکه' });
    }
  };

  const openGenealogyModal = async (coil: PhysicalCoil) => {
    setSelectedCoil(coil);
    setGenealogyModalOpen(true);
    setGenealogyLoading(true);
    try {
      const res = await fetch(`/api/inventory/coils/${coil.id}/genealogy`);
      const data = await res.json();
      if (data.success) {
        setGenealogyData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenealogyLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-700'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards & Lifecycle Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-white text-slate-900 border-slate-900 shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={statusFilter === 'ALL' ? 'text-slate-700' : 'text-slate-500'}>کل کلاف‌های ثبت‌شده</span>
            <Layers className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">
            {formatNumber(coils.length)}{' '}
            <span className="text-xs font-normal opacity-70">رول</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('FULL')}
          className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
            statusFilter === 'FULL'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={statusFilter === 'FULL' ? 'text-emerald-100' : 'text-slate-500'}>کلاف‌های دست‌نخورده (کامل)</span>
            <Boxes className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight ${statusFilter === 'FULL' ? 'text-slate-900' : 'text-emerald-700'}`}>
            {formatNumber(fullCoilsCount)}{' '}
            <span className="text-xs font-normal opacity-70">رول</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PARTIAL')}
          className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
            statusFilter === 'PARTIAL'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={statusFilter === 'PARTIAL' ? 'text-amber-100' : 'text-slate-500'}>کلاف‌های ناقص / در گردش (ته‌رول)</span>
            <Split className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight ${statusFilter === 'PARTIAL' ? 'text-slate-900' : 'text-amber-700'}`}>
            {formatNumber(partialCoilsCount)}{' '}
            <span className="text-xs font-normal opacity-70">رول</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('CONSUMED')}
          className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
            statusFilter === 'CONSUMED'
              ? 'bg-slate-700 text-slate-900 border-slate-200 shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={statusFilter === 'CONSUMED' ? 'text-slate-900' : 'text-slate-500'}>کلاف‌های پایان‌یافته (مصرف‌شده)</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">
            {formatNumber(consumedCoilsCount)}{' '}
            <span className="text-xs font-normal opacity-70">رول</span>
          </div>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="جستجوی شماره کویل، پکینگ، شماره ذوب یا قطعه..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">همه گریدها</option>
            <option value="DC04">DC04</option>
            <option value="ST14">ST14</option>
            <option value="ST12">ST12</option>
          </select>

          <select
            value={ownershipFilter}
            onChange={e => setOwnershipFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">همه مالکیت‌ها</option>
            <option value="SAPCO_SUPPLIER_OWNED">امانی ساپکو</option>
            <option value="COMPANY_OWNED">ملکی کارخانه</option>
            <option value="CUSTOMER_SUPPLIED">مشتری</option>
          </select>

          <button
            onClick={fetchCoils}
            disabled={loading}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="بروزرسانی اطلاعات"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Visual Parent-to-Child Coil Slitting Genealogy Tree */}
      <CoilSlittingGenealogyPanel coils={coils} />

      {/* Coils Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-medium">
              <tr>
                <th className="py-3 px-3.5">شناسه کویل</th>
                <th className="py-3 px-3.5">شماره پکینگ (پلاک)</th>
                <th className="py-3 px-3.5">وضعیت چرخه عمر</th>
                <th className="py-3 px-3.5">شرح ورق و ابعاد</th>
                <th className="py-3 px-3.5">گرید</th>
                <th className="py-3 px-3.5">وزن اولیه</th>
                <th className="py-3 px-3.5">مانده در انبار</th>
                <th className="py-3 px-3.5">سهمیه قراردادها</th>
                <th className="py-3 px-3.5">محل استقرار</th>
                <th className="py-3 px-3.5 text-center">عملیات کارگاهی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCoils.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    هیچ کلاف فیزیکی منطبق بر این فیلترها یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredCoils.map(coil => {
                  const isFull = coil.remainingWeightKg === coil.originalWeightKg && coil.remainingWeightKg > 0;
                  const isPartial = coil.remainingWeightKg < coil.originalWeightKg && coil.remainingWeightKg > 0;
                  const isConsumed = coil.remainingWeightKg <= 0;
                  const isHeld = isCoilInQcHold(coil);

                  return (
                    <tr
                      key={coil.id}
                      className={`transition-colors ${
                        isHeld ? 'bg-rose-50/75 hover:bg-rose-50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{coil.coilId}</span>
                          {isHeld && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-sans text-[9px] font-bold">
                              QC Hold
                            </span>
                          )}
                        </div>
                        {coil.heatNumber && (
                          <div className="text-[10px] text-slate-400">ذوب: {coil.heatNumber}</div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-800 font-medium">
                        {coil.coilPackNumber}
                      </td>
                      <td className="py-3 px-3.5">
                        {isHeld ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full font-bold">
                            <Lock className="w-3 h-3 text-rose-700" />
                            قرنطینه کیفی (کسر از ATP)
                          </span>
                        ) : isFull ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            کامل (دست‌نخورده)
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            ناقص / ته‌رول
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                            پایان‌یافته (صفر)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-slate-900">{coil.partName}</div>
                        <div className="text-[10px] text-slate-500">
                          ضخامت: {coil.thicknessMm}mm | عرض: {coil.widthMm}mm
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {coil.materialGrade}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-500">
                        {formatWeightKg(coil.originalWeightKg)}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold">
                        {isHeld ? (
                          <div>
                            <span className="text-rose-700 line-through">{formatWeightKg(coil.remainingWeightKg)}</span>
                            <span className="block text-[10px] text-rose-600 font-sans">آزاد (ATP): ۰ kg</span>
                          </div>
                        ) : (
                          <span className="text-emerald-700">{formatWeightKg(coil.remainingWeightKg)}</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        {coil.allocations && coil.allocations.length > 0 ? (
                          <div className="space-y-0.5">
                            {coil.allocations.map((alloc, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-1 text-[11px]">
                                <span className="text-slate-500">{alloc.contractNumber}:</span>
                                <span className="font-mono text-slate-800">{formatNumber(alloc.allocatedWeightKg)} kg</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="text-slate-800">{coil.warehouseName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{coil.warehouseLocationCode}</div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleCoilQcHold(coil)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 border cursor-pointer ${
                              isHeld
                                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                            }`}
                            title={
                              isHeld
                                ? 'رفع قرنطینه کیفی و بازگشت به موجودی آزاد (ATP)'
                                : 'قرنطینه کیفی / QC Hold و کسر از موجودی آزاد (ATP) در MRP'
                            }
                          >
                            {isHeld ? <Unlock className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                            <span>{isHeld ? 'رفع قرنطینه' : 'قرنطینه کیفی / QC Hold'}</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedCoil(coil);
                              setIssueWeight(String(coil.remainingWeightKg));
                              setIssueMoId('');
                              setIssueOperationId('');
                              setIssueScrap('0');
                              setInitialInputQuantityPcs('');
                              setIssueRequestKey(globalThis.crypto?.randomUUID?.() || `coil-issue-${Date.now()}-${Math.random().toString(36).slice(2)}`);
                              setIssueMode('SINGLE');
                              setIssueModalOpen(true);
                            }}
                            disabled={coil.remainingWeightKg <= 0 || isHeld}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                            title={isHeld ? 'کلاف در قرنطینه کیفی است و امکان صدور ندارد' : 'صدور کلاف به خطوط پرس'}
                          >
                            <ArrowUpRight className="w-3 h-3 text-slate-500" />
                            <span>خروج / صدور</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCoil(coil);
                              setReturnWeight('');
                              setReturnModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                            title="برگشت ته‌کلاف یا مازاد به انبار"
                          >
                            <ArrowDownLeft className="w-3 h-3 text-slate-500" />
                            <span>برگشت ته‌رول</span>
                          </button>
                          <button
                            onClick={() => openGenealogyModal(coil)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="شناسنامه کامل و ردگیری مصرف این کلاف"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span>ردگیری / شناسنامه</span>
                          </button>
                          <button
                            onClick={() => openAllocateModal(coil)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] transition-colors cursor-pointer"
                            title="مدیریت سهمیه‌ها و قراردادها"
                          >
                            تسهیم
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openQuickEditDrawer({
                                entityId: coil.id,
                                entityCode: coil.coilId,
                                moduleTitle: 'انبار کلاف و رول ورق (Physical Coils)',
                                drawerTitle: `ویرایش مشخصات کلاف ${coil.coilId}`,
                                drawerSubtitle: `شماره پکینگ: ${coil.coilPackNumber}`,
                                fields: [
                                  { key: 'coilPackNumber', label: 'شماره پکینگ (پلاک ساپکو)', value: coil.coilPackNumber, type: 'text', required: true },
                                  { key: 'heatNumber', label: 'شماره ذوب (Heat Number)', value: coil.heatNumber || '', type: 'text' },
                                  { key: 'partName', label: 'شرح ورق / نام کالا', value: coil.partName, type: 'text', required: true },
                                  {
                                    key: 'materialGrade',
                                    label: 'گرید ورق',
                                    value: coil.materialGrade,
                                    type: 'select',
                                    options: [
                                      { value: 'ST14', label: 'ST14 (کشش عمیق)' },
                                      { value: 'ST12', label: 'ST12 (معمولی)' },
                                      { value: 'DC04', label: 'DC04 (فوق کشش)' },
                                    ],
                                  },
                                  { key: 'remainingWeightKg', label: 'وزن مانده در انبار (kg)', value: coil.remainingWeightKg, type: 'number', min: 0 },
                                  { key: 'warehouseLocationCode', label: 'کد سلول / محل استقرار انبار', value: coil.warehouseLocationCode || '', type: 'text' },
                                ],
                                onSave: values => {
                                  const prevCoils = coils;
                                  setCoils(prev =>
                                    prev.map(c =>
                                      c.id === coil.id
                                        ? {
                                            ...c,
                                            coilPackNumber: String(values.coilPackNumber || c.coilPackNumber),
                                            heatNumber: String(values.heatNumber ?? c.heatNumber),
                                            partName: String(values.partName || c.partName),
                                            materialGrade: String(values.materialGrade || c.materialGrade) as any,
                                            remainingWeightKg: Number(values.remainingWeightKg ?? c.remainingWeightKg),
                                            warehouseLocationCode: String(values.warehouseLocationCode ?? c.warehouseLocationCode),
                                          }
                                        : c
                                    )
                                  );
                                  showUndoToast({
                                    title: `مشخصات کلاف «${coil.coilId}» بروزرسانی شد`,
                                    description: `پکینگ: ${values.coilPackNumber} • مانده: ${formatNumber(Number(values.remainingWeightKg))} kg`,
                                    onUndo: () => setCoils(prevCoils),
                                  });
                                },
                              })
                            }
                            className="p-1.5 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 rounded-md transition-colors cursor-pointer"
                            title="ویرایش مشخصات کلاف در کشوی جانبی"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              requestConfirm({
                                title: `حذف منطقی (بایگانی) کلاف فیزیکی «${coil.coilId}»`,
                                description: `آیا از بایگانی و حذف منطقی کلاف «${coil.coilId}» (پکینگ ${coil.coilPackNumber}) از لیست موجودی فعال اطمینان دارید؟`,
                                consequences: [
                                  `کلاف از جدول کلاف‌های فعال انبار خارج می‌شود (مانده فعلی: ${formatNumber(coil.remainingWeightKg)} کیلوگرم).`,
                                  'سوابق شناسنامه ذوب و حواله‌های قبلی جهت ممیزی حفظ می‌گردد.',
                                  'امکان بازگردانی فوری از طریق دکمه «لغو (Undo)» وجود دارد.',
                                ],
                                confirmLabel: 'تایید و حذف منطقی کلاف',
                                variant: 'danger',
                                onConfirm: () => {
                                  const prevCoils = coils;
                                  setCoils(prev => prev.filter(c => c.id !== coil.id));
                                  recordAudit({
                                    actionType: 'SOFT_DELETE',
                                    moduleTitle: 'انبار کلاف و رول ورق (Physical Coils)',
                                    entityId: coil.id,
                                    entityCode: coil.coilId,
                                    summaryFa: `حذف منطقی کلاف فیزیکی «${coil.coilId}» (پکینگ ${coil.coilPackNumber})`,
                                    detailsFa: `وزن مانده: ${coil.remainingWeightKg} kg • ذوب: ${coil.heatNumber || '—'}`,
                                  });
                                  showUndoToast({
                                    title: `کلاف «${coil.coilId}» به صورت منطقی بایگانی شد`,
                                    description: 'جهت بازگردانی کلاف به لیست موجودی فعال روی «لغو (Undo)» کلیک کنید.',
                                    onUndo: () => setCoils(prevCoils),
                                  });
                                },
                              })
                            }
                            className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-md transition-colors cursor-pointer"
                            title="حذف منطقی (Soft Delete)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Part Issue Modal */}
      {issueModalOpen && selectedCoil && (
        <div className="fixed inset-0 bg-white backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 text-right shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  خروج و صدور کلاف به خطوط تولید (امکان تخصیص همزمان به ۲ قطعه)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  کویل {selectedCoil.coilId} (پکینگ {selectedCoil.coilPackNumber}) — مانده موجود: {formatWeightKg(selectedCoil.remainingWeightKg)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Issue Mode: Single Part vs Multi-Part */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIssueMode('SINGLE')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  issueMode === 'SINGLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                صدور برای یک قطعه / سفارش ساخت
              </button>
              <button
                type="button"
                onClick={() => setIssueMode('MULTI')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  issueMode === 'MULTI' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                صدور همزمان برای ۲ قطعه (تسهیم بین دو خط)
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-3.5 text-xs">
              {issueMode === 'SINGLE' ? (
                <>
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">وزن مورد نیاز جهت صدور (کیلوگرم)</label>
                    <input
                      type="number"
                      value={issueWeight}
                      onChange={e => setIssueWeight(e.target.value)}
                      max={selectedCoil.remainingWeightKg}
                      min={1}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:border-slate-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">دستور ساخت (MO)</label>
                    <select
                      value={issueMoId}
                      onChange={e => { setIssueMoId(e.target.value); setIssueOperationId(''); }}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                    >
                      <option value="">انتخاب دستور ساخت</option>
                      {availableManufacturingOrders.map(mo => (
                        <option key={mo.id} value={mo.id}>{mo.moNumber} — {mo.partCode} / {mo.partName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">عملیات مصرف</label>
                    <select
                      value={issueOperationId}
                      onChange={e => setIssueOperationId(e.target.value)}
                      required
                      disabled={!issueMoId}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none disabled:opacity-50"
                    >
                      <option value="">انتخاب عملیات</option>
                      {availableManufacturingOrders.find(mo => mo.id === issueMoId)?.operations.map(operation => (
                        <option key={operation.id} value={operation.id}>مرحله {operation.stepNumber} — {operation.operationName}{operation.plannedMachine ? ' (' + operation.plannedMachine + ')' : ''}</option>
                      ))}
                    </select>
                  </div>
                  {selectedIssueOperation?.isFirstOperation && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-2">
                      <div className="text-xs font-semibold text-slate-800">ورودی اولیه مرحله اول (عدد قطعه)</div>
                      <div className="text-[11px] text-slate-600">
                        پیشنهاد سیستم: {formatNumber(suggestedInitialInputPcs)} عدد؛ بر اساس وزن ناخالص مهندسی هر قطعه ({formatNumber(selectedIssueMo?.weightGrossKg || 0)} kg)
                      </div>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        required
                        value={initialInputQuantityPcs}
                        onChange={e => setInitialInputQuantityPcs(e.target.value)}
                        placeholder="تعداد پیشنهادی را بررسی و تأیید کنید"
                        className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:border-blue-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500">تعداد پیشنهادی قابل ویرایش است؛ مقدار نهایی با تأیید اپراتور در موجودی انتظار مرحله اول ثبت می‌شود.</p>
                    </div>
                  )}
                </>
              ) : (
                /* Multi-Part Allocation (Scenario: 1 coil for 2 parts simultaneously) */
                <div className="space-y-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-200">
                  <span className="font-semibold text-slate-800 block text-xs">
                    تسهیم وزن کلاف بین قطعات سالن تولید:
                  </span>

                  {multiPartsList.map((p, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>قطعه شماره {idx + 1}</span>
                        {multiPartsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setMultiPartsList(multiPartsList.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            حذف
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">دستور ساخت</label>
                          <select
                            value={p.moId}
                            onChange={e => {
                              const updated = [...multiPartsList];
                              const selectedMo = availableManufacturingOrders.find(mo => mo.id === e.target.value);
                              updated[idx].moId = e.target.value;
                              updated[idx].partName = selectedMo ? selectedMo.partCode + ' — ' + selectedMo.partName : '';
                              updated[idx].moOperationId = '';
                              setMultiPartsList(updated);
                            }}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900"
                          >
                            <option value="">انتخاب MO</option>
                            {availableManufacturingOrders.map(mo => (
                              <option key={mo.id} value={mo.id}>{mo.moNumber} — {mo.partCode}</option>
                            ))}
                          </select>
                          <span className="block mt-1 text-[10px] text-slate-500">{p.partName}</span>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">وزن مورد نیاز (kg)</label>
                          <input
                            type="number"
                            placeholder="وزن"
                            value={p.issuedWeightKg}
                            onChange={e => {
                              const updated = [...multiPartsList];
                              updated[idx].issuedWeightKg = e.target.value;
                              setMultiPartsList(updated);
                            }}
                            min={0.001}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">عملیات مصرف</label>
                        <select
                          value={p.moOperationId}
                          onChange={e => {
                            const updated = [...multiPartsList];
                            updated[idx].moOperationId = e.target.value;
                            setMultiPartsList(updated);
                          }}
                          required
                          disabled={!p.moId}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-[11px] text-slate-700 disabled:opacity-50"
                        >
                          <option value="">انتخاب عملیات</option>
                          {availableManufacturingOrders.find(mo => mo.id === p.moId)?.operations.map(operation => (
                            <option key={operation.id} value={operation.id}>مرحله {operation.stepNumber} — {operation.operationName}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setMultiPartsList([...multiPartsList, { partName: '', moId: '', moOperationId: '', issuedWeightKg: '' }])}
                    className="w-full rounded-lg border border-dashed border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-50"
                  >
                    افزودن قطعه / دستور ساخت
                  </button>

                  <div className="flex items-center justify-between pt-2 border-t border-blue-200 text-xs">
                    <span className="text-slate-600">
                      مجموع صادر شده:{' '}
                      <strong className="font-mono text-blue-700">
                        {formatNumber(multiPartsList.reduce((s, p) => s + (Number(p.issuedWeightKg) || 0), 0))} kg
                      </strong>
                    </span>
                    <span className="text-slate-600">
                      مانده پس از صدور:{' '}
                      <strong className="font-mono text-emerald-700">
                        {formatNumber(
                          Math.max(
                            0,
                            selectedCoil.remainingWeightKg -
                              multiPartsList.reduce((s, p) => s + (Number(p.issuedWeightKg) || 0), 0) -
                              (Number(issueScrap) || 0)
                          )
                        )}{' '}
                        kg
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-600 mb-1 font-medium">افت وزنی / ضایعات سر و ته کلاف (کیلوگرم)</label>
                <input
                  type="number"
                  value={issueScrap}
                  onChange={e => setIssueScrap(e.target.value)}
                  min={0}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
                >
                  ثبت خروج و صدور به خط تولید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remnant Return Modal */}
      {returnModalOpen && selectedCoil && (
        <div className="fixed inset-0 bg-white backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-right shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              برگشت ته‌کلاف یا مازاد از خط تولید به انبار
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              پکینگ ساپکو: {selectedCoil.coilPackNumber} (با حفظ کامل ردیابی مادر)
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">وزن ته‌کلاف وزن‌کشی‌شده (کیلوگرم)</label>
                <input
                  type="number"
                  value={returnWeight}
                  onChange={e => setReturnWeight(e.target.value)}
                  min={1}
                  required
                  placeholder="وزن دقیق ترازوی انبار"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">توضیحات و گزارش وضعیت ته‌کلاف</label>
                <textarea
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                  placeholder="علت برگشت، کنترل ابعادی و بسته‌بندی مجدد..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
                >
                  ثبت برگشت ته‌کلاف به انبار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COIL GENEALOGY & TRACEABILITY AUDIT MODAL */}
      {genealogyModalOpen && selectedCoil && (
        <div className="fixed inset-0 bg-white backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 text-right shadow-2xl my-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    شناسنامه کامل و ردگیری مصرف کلاف {selectedCoil.coilId}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    شماره پکینگ: {selectedCoil.coilPackNumber} | شماره ذوب: {selectedCoil.heatNumber || 'ثبت‌نشده'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  title="چاپ گزارش شناسنامه"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">چاپ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGenealogyModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {genealogyLoading ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                در حال استخراج شناسنامه و ردیابی تاریخچه کلاف...
              </div>
            ) : genealogyData ? (
              <div className="mt-4 space-y-4 text-xs">
                {/* Status Bar & Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">وزن اولیه ورود:</span>
                    <strong className="text-slate-900 font-mono text-sm block mt-1">
                      {formatWeightKg(genealogyData.metrics.originalWeightKg)}
                    </strong>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                    <span className="text-blue-700 block text-[11px]">مجموع خروجی به خط:</span>
                    <strong className="text-blue-900 font-mono text-sm block mt-1">
                      {formatWeightKg(genealogyData.metrics.totalIssuedKg)}
                    </strong>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <span className="text-amber-700 block text-[11px]">مجموع برگشت ته‌رول:</span>
                    <strong className="text-amber-900 font-mono text-sm block mt-1">
                      {formatWeightKg(genealogyData.metrics.totalReturnedKg)}
                    </strong>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <span className="text-emerald-700 block text-[11px]">مانده موجود در انبار:</span>
                    <strong className="text-emerald-900 font-mono text-sm block mt-1">
                      {formatWeightKg(genealogyData.metrics.remainingWeightKg)}
                    </strong>
                  </div>
                </div>

                {/* Utilization Progress Bar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">راندمان و نسبت مصرف کلاف:</span>
                    <span className="font-mono text-slate-900">{genealogyData.metrics.utilizationPercent}٪ مصرف شده</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, genealogyData.metrics.utilizationPercent)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Contract Allocation Info */}
                {genealogyData.allocations && genealogyData.allocations.length > 0 && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 block text-xs">
                      تسهیم قراردادهای متصل به این کلاف:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {genealogyData.allocations.map((a: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg text-slate-800 text-xs">
                          <Tag className="w-3.5 h-3.5 text-slate-500" />
                          <span>{a.contractNumber}:</span>
                          <strong className="font-mono">{formatNumber(a.allocatedWeightKg)} kg</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chronological Event Timeline */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Clock className="w-4 h-4 text-slate-600" />
                    <span>تاریخچه وقایع و ردگیری مصرف (ورود، خروج‌ها و برگشت ته‌کلاف):</span>
                  </h4>

                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {/* Event 1: Receipt */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mt-1 shrink-0"></span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900 font-semibold">ورود کلاف به انبار مرکزی مواد اولیه</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(selectedCoil.receiptDate).toLocaleDateString('fa-IR')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          تامین‌کننده: {selectedCoil.supplierName || 'ساپکو'} | وزن اولیه: {formatWeightKg(selectedCoil.originalWeightKg)} | انبار: {selectedCoil.warehouseName} ({selectedCoil.warehouseLocationCode})
                        </p>
                      </div>
                    </div>

                    {/* Operational records */}
                    {genealogyData.records && genealogyData.records.length > 0 ? (
                      genealogyData.records.map((r: any) => (
                        <div
                          key={r.id}
                          className={`p-3 rounded-xl border flex items-start gap-3 ${
                            r.actionType === 'ISSUE_TO_PRODUCTION'
                              ? 'bg-blue-50/60 border-blue-200'
                              : 'bg-amber-50/60 border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                              r.actionType === 'ISSUE_TO_PRODUCTION' ? 'bg-blue-600' : 'bg-amber-600'
                            }`}
                          ></span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <strong className="text-slate-900 font-semibold">
                                {r.actionType === 'ISSUE_TO_PRODUCTION'
                                  ? 'خروج و صدور به خط تولید'
                                  : 'برگشت مازاد یا ته‌کلاف به انبار'}
                              </strong>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(r.timestamp).toLocaleDateString('fa-IR')}
                              </span>
                            </div>

                            {r.actionType === 'ISSUE_TO_PRODUCTION' ? (
                              <div className="text-[11px] text-slate-700 mt-0.5 space-y-1">
                                {r.multiParts && r.multiParts.length > 0 ? (
                                  <div>
                                    <span className="font-semibold text-blue-900">تخصیص چندقطعه‌ای:</span>
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-600">
                                      {r.multiParts.map((mp: any, i: number) => (
                                        <li key={i}>
                                          {mp.partName} ({mp.moId || 'MO'}): <strong className="font-mono">{formatNumber(mp.issuedWeightKg)} kg</strong>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : (
                                  <div>
                                    دستور ساخت: {r.moId || 'MO-PROD'} | وزن صادر شده: <strong className="font-mono">{formatNumber(r.issuedWeightKg)} kg</strong>
                                  </div>
                                )}
                                {r.scrappedKg > 0 && (
                                  <div className="text-amber-800">
                                    افت وزنی / ضایعات سر و ته: {r.scrappedKg} kg
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400">
                                  ثبت توسط: {r.userName || 'اپراتور'}
                                </div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-700 mt-0.5">
                                وزن ته‌کلاف برگشتی: <strong className="font-mono text-emerald-800">{formatNumber(r.returnedWeightKg)} kg</strong>
                                {r.notes && <p className="text-slate-600 mt-0.5">{r.notes}</p>}
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  ثبت توسط: {r.userName || 'انباردار'}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400">
                        هنوز هیچ برگه صدور به خط تولید یا برگشت ته‌کلافی برای این رول ثبت نشده است (کلاف دست‌نخورده است).
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setGenealogyModalOpen(false)}
                className="px-4 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-semibold cursor-pointer"
              >
                بستن پنجره شناسنامه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Contract Allocation Modal */}
      {allocateModalOpen && selectedCoil && (
        <div className="fixed inset-0 bg-white backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 text-right shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              تسهیم چندقراردادی کلاف فیزیکی شماره {selectedCoil.coilId}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              وزن کل فیزیکی کلاف: {formatWeightKg(selectedCoil.originalWeightKg)} | این کلاف واحد می‌تواند به چند قرارداد سهمیه تخصیص داده شود بدون ایجاد کلاف تکراری.
            </p>

            <form onSubmit={handleAllocateSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-2">
                {allocationsList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                  >
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-500 mb-1">
                        انتخاب قرارداد از لیست قراردادهای فعال:
                      </label>
                      <select
                        value={item.contractId}
                        onChange={e => {
                          const updated = [...allocationsList];
                          updated[idx].contractId = e.target.value;
                          setAllocationsList(updated);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono font-bold focus:outline-none text-xs"
                      >
                        <option value="">-- انتخاب قرارداد از لیست --</option>
                        {availableContracts.map(cnt => (
                          <option key={cnt.id} value={cnt.contractNumber}>
                            {cnt.contractNumber} — {cnt.title || cnt.customerName || 'ساپکو'}
                          </option>
                        ))}
                        {item.contractId &&
                          !availableContracts.some(
                            c => c.contractNumber === item.contractId || c.id === item.contractId
                          ) && <option value={item.contractId}>{item.contractId}</option>}
                      </select>
                    </div>
                    <div className="w-full sm:w-32">
                      <label className="block text-[10px] text-slate-500 mb-1">وزن تخصیصی (kg):</label>
                      <input
                        type="number"
                        placeholder="وزن (kg)"
                        value={item.allocatedWeightKg}
                        onChange={e => {
                          const updated = [...allocationsList];
                          updated[idx].allocatedWeightKg = Number(e.target.value);
                          setAllocationsList(updated);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono font-bold text-xs focus:outline-none"
                      />
                    </div>
                    {allocationsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAllocationsList(allocationsList.filter((_, i) => i !== idx));
                        }}
                        className="text-rose-500 hover:text-rose-700 px-1.5 pt-4 text-sm cursor-pointer self-end sm:self-center"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const defaultCnt = availableContracts[0]?.contractNumber || '';
                  setAllocationsList([
                    ...allocationsList,
                    { contractId: defaultCnt, allocatedWeightKg: 0 },
                  ]);
                }}
                className="text-xs text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 mt-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ افزودن سهم قرارداد دیگر</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <span className="text-slate-500">
                  مجموع تسهیم‌شده: <strong className="text-slate-900 font-mono">{formatNumber(allocationsList.reduce((s, a) => s + Number(a.allocatedWeightKg || 0), 0))}</strong> / {selectedCoil.originalWeightKg} kg
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllocateModalOpen(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    ذخیره تسهیم
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory QC Hold Reason Modal (ثبت اجباری علت قرنطینه کیفی کلاف) */}
      {qcHoldModalCoil && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setQcHoldModalCoil(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 text-right shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ثبت اجباری علت قرنطینه کیفی (QC Hold) — کلاف {qcHoldModalCoil.coilId}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    شماره ذوب: <span className="font-mono font-bold text-slate-700">{qcHoldModalCoil.heatNumber || '—'}</span> | وزن درگیر:{' '}
                    <span className="font-mono font-bold text-rose-700">{formatWeightKg(qcHoldModalCoil.remainingWeightKg)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQcHoldModalCoil(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmQcHoldModalSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
                <strong>هشدار کنترل کیفیت و برنامه‌ریزی (ATP):</strong> با ثبت قرنطینه کیفی، مقدار{' '}
                <strong className="font-mono">{formatWeightKg(qcHoldModalCoil.remainingWeightKg)}</strong> از موجودی آزاد قابل تخصیص (ATP) در ماژول MRP کسر شده و حواله آن به خط تولید مسدود می‌گردد. درج علت دقیق قرنطینه در لاگ حسابرسی (Audit Trail) اجباری است.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  انتخاب سریع از دلایل متداول عدم انطباق کیفی:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QC_HOLD_REASON_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setQcHoldReasonInput(preset);
                        setQcHoldReasonError('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] border transition cursor-pointer ${
                        qcHoldReasonInput === preset
                          ? 'bg-rose-600 text-white border-rose-600 font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  علت قرنطینه کیفی (QC Hold Reason) <span className="text-rose-600">* (اجباری)</span>
                </label>
                <textarea
                  rows={3}
                  value={qcHoldReasonInput}
                  onChange={e => {
                    setQcHoldReasonInput(e.target.value);
                    if (e.target.value.trim()) setQcHoldReasonError('');
                  }}
                  placeholder="شرح دقیق عیب ظاهری، مغایرت ابعادی یا شماره برگه عدم انطباق (NCR) را وارد نمایید..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                />
                {qcHoldReasonError && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1">{qcHoldReasonError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQcHoldModalCoil(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>ثبت علت در لاگ و اعمال قرنطینه (QC Hold)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
