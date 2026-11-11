import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSignature,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  Scale,
  Layers,
  Package,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Download,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Edit3,
  History,
  X,
  Save,
  PauseCircle,
  Ban,
} from 'lucide-react';
import {
  SapcoContract,
  Part,
  PhysicalCoil,
  ContractCommercialLine,
  ContractRevisionEntry,
} from '../../types/inventory';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  formatDate,
  exportToCsv,
} from '../../utils/formatters';
import { ContractCreateModal } from './ContractCreateModal';
import { useEnterpriseUx } from '../../context/EnterpriseUxContext';
import { FormulaTooltip } from '../common/FormulaTooltip';

interface ContractsManagementViewProps {
  contracts: SapcoContract[];
  parts: Part[];
  coils: PhysicalCoil[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onViewContractLedger?: (contractId: string) => void;
  currentUser: { uid: string; displayName: string; role: string };
}

const CONTRACT_REVISIONS_STORAGE_KEY = 'kpims_contract_revisions_v1';
const CONTRACT_LOCAL_OVERRIDES_KEY = 'kpims_contract_overrides_v1';

const DEFAULT_SEEDED_REVISIONS: Record<string, ContractRevisionEntry[]> = {
  'CNT-SAPCO-1403-Q3': [
    {
      id: 'REV-SEED-1',
      revisionNumber: 2,
      timestamp: '۱۴۰۴/۰۲/۱۲ - ۱۰:۳۰',
      actor: 'مهندس رضایی (واحد بازرگانی)',
      fieldLabelFa: 'سهمیه وزنی قرارداد (الحاقیه بهاره)',
      oldQty: 40000,
      newQty: 50000,
      unit: 'کیلوگرم',
      oldStatus: 'ACTIVE',
      newStatus: 'ACTIVE',
      reasonFa: 'افزایش برنامه تولید پژو ۲۰۶ و تخصیص ۱۰ تن ورق کششی اضافه از ساپکو',
    },
    {
      id: 'REV-SEED-0',
      revisionNumber: 1,
      timestamp: '۱۴۰۴/۰۱/۱۰ - ۰۸:۱۵',
      actor: 'سیستم بازرگانی ساپکو',
      fieldLabelFa: 'ثبت اولیه سهمیه قرارداد',
      oldQty: 0,
      newQty: 40000,
      unit: 'کیلوگرم',
      oldStatus: 'ACTIVE',
      newStatus: 'ACTIVE',
      reasonFa: 'ابلاغ رسمی قرارداد تأمین ورق و تحویل قطعات فصل اول',
    },
  ],
};

export const ContractsManagementView: React.FC<ContractsManagementViewProps> = ({
  contracts,
  parts,
  coils,
  loading,
  onRefresh,
  onViewContractLedger,
  currentUser,
}) => {
  const { requestConfirm, showUndoToast, recordAudit } = useEnterpriseUx();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  // Local overrides & revisions state so edits are immediate and persistent
  const [localContractOverrides, setLocalContractOverrides] = useState<Record<string, Partial<SapcoContract>>>(() => {
    try {
      const saved = window.localStorage.getItem(CONTRACT_LOCAL_OVERRIDES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [revisionsMap, setRevisionsMap] = useState<Record<string, ContractRevisionEntry[]>>(() => {
    try {
      const saved = window.localStorage.getItem(CONTRACT_REVISIONS_STORAGE_KEY);
      return saved ? { ...DEFAULT_SEEDED_REVISIONS, ...JSON.parse(saved) } : DEFAULT_SEEDED_REVISIONS;
    } catch {
      return DEFAULT_SEEDED_REVISIONS;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(CONTRACT_LOCAL_OVERRIDES_KEY, JSON.stringify(localContractOverrides));
    } catch {
      // ignore
    }
  }, [localContractOverrides]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CONTRACT_REVISIONS_STORAGE_KEY, JSON.stringify(revisionsMap));
    } catch {
      // ignore
    }
  }, [revisionsMap]);

  // Merge server contracts with local edits & revisions
  const mergedContracts = useMemo(() => {
    return contracts.map(c => {
      const ov = localContractOverrides[c.id] || localContractOverrides[c.contractNumber] || {};
      const revs =
        revisionsMap[c.id] ||
        revisionsMap[c.contractNumber] ||
        c.revisions ||
        DEFAULT_SEEDED_REVISIONS[c.contractNumber] ||
        [];
      return {
        ...c,
        ...ov,
        revisions: revs,
      } as SapcoContract;
    });
  }, [contracts, localContractOverrides, revisionsMap]);

  // Slide-Over Details & Edit Drawer State
  const [drawerContractId, setDrawerContractId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'EDIT' | 'REVISIONS'>('EDIT');
  const [editTitle, setEditTitle] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editMaterialGrade, setEditMaterialGrade] = useState('');
  const [editAllocatedWeightKg, setEditAllocatedWeightKg] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'TERMINATED'>('ACTIVE');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRevisionReason, setEditRevisionReason] = useState('');
  const [editCommercialLines, setEditCommercialLines] = useState<ContractCommercialLine[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const activeDrawerContract = useMemo(
    () => mergedContracts.find(c => c.id === drawerContractId || c.contractNumber === drawerContractId) || null,
    [mergedContracts, drawerContractId]
  );

  const openContractDrawer = (contract: SapcoContract, tab: 'EDIT' | 'REVISIONS' = 'EDIT') => {
    setDrawerContractId(contract.id);
    setDrawerTab(tab);
    setEditTitle(contract.title || '');
    setEditCustomerName(contract.customerName || 'شرکت ساپکو');
    setEditMaterialGrade(contract.materialGrade || 'DC04');
    setEditAllocatedWeightKg(Number(contract.allocatedWeightKg) || 0);
    const normalizedStatus =
      contract.status === 'SUSPENDED'
        ? 'SUSPENDED'
        : contract.status === 'TERMINATED' || contract.status === 'FULFILLED' || contract.status === 'EXPIRED'
        ? 'TERMINATED'
        : 'ACTIVE';
    setEditStatus(normalizedStatus);
    setEditStartDate(contract.startDate ? contract.startDate.slice(0, 10) : '2026-03-21');
    setEditEndDate(contract.endDate ? contract.endDate.slice(0, 10) : '2026-09-22');
    setEditNotes(contract.notes || '');
    setEditRevisionReason('');
    setEditCommercialLines(
      contract.commercialLines ? JSON.parse(JSON.stringify(contract.commercialLines)) : []
    );
  };

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [allocatingContract, setAllocatingContract] = useState<SapcoContract | null>(null);
  const [selectedCoilToAllocate, setSelectedCoilToAllocate] = useState<string>('');
  const [allocateWeight, setAllocateWeight] = useState<number>(1000);
  const [allocateLoading, setAllocateLoading] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);

  // Extract unique customers
  const customers = useMemo(() => {
    const set = new Set<string>();
    mergedContracts.forEach(c => {
      if (c.customerName) set.add(c.customerName);
    });
    return Array.from(set);
  }, [mergedContracts]);

  // Aggregate Metrics
  const totalAllocatedKg = mergedContracts.reduce((sum, c) => sum + (c.allocatedWeightKg || 0), 0);
  const totalReceivedKg = mergedContracts.reduce((sum, c) => sum + (c.totalReceivedKg || 0), 0);
  const totalConsumedKg = mergedContracts.reduce((sum, c) => sum + (c.totalConsumedKg || 0), 0);
  const totalClosingBalanceKg = mergedContracts.reduce((sum, c) => sum + (c.closingBalanceKg || 0), 0);

  const totalCommittedProducts = mergedContracts.reduce((sum, c) => {
    const lines = c.commercialLines || [];
    return sum + lines.filter(l => l.lineType === 'FINISHED_PRODUCT_DELIVERY').reduce((s, l) => s + l.contractQty, 0);
  }, 0);

  const totalDeliveredProducts = mergedContracts.reduce((sum, c) => {
    const lines = c.commercialLines || [];
    return sum + lines.filter(l => l.lineType === 'FINISHED_PRODUCT_DELIVERY').reduce((s, l) => s + l.deliveredOrReceivedQty, 0);
  }, 0);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return mergedContracts.filter(c => {
      if (selectedCustomer !== 'ALL' && c.customerName !== selectedCustomer) {
        return false;
      }
      if (selectedType !== 'ALL' && c.contractType !== selectedType) {
        return false;
      }
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'TERMINATED') {
          if (c.status !== 'TERMINATED' && c.status !== 'FULFILLED' && c.status !== 'EXPIRED') return false;
        } else if (c.status !== selectedStatus) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchHeader =
          c.contractNumber.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (c.customerName && c.customerName.toLowerCase().includes(q)) ||
          (c.materialGrade && c.materialGrade.toLowerCase().includes(q));
        const matchLines = (c.commercialLines || []).some(
          l => l.partName.toLowerCase().includes(q) || l.partCode.toLowerCase().includes(q)
        );
        const matchCoils = (c.coils || []).some(
          cl => cl.coilId.toLowerCase().includes(q) || (cl.coilPackNumber && cl.coilPackNumber.toLowerCase().includes(q))
        );
        return matchHeader || matchLines || matchCoils;
      }
      return true;
    });
  }, [mergedContracts, selectedCustomer, selectedType, selectedStatus, searchTerm]);

  const handleSaveContractEdit = () => {
    if (!activeDrawerContract) return;
    const oldContract = activeDrawerContract;
    const oldQuota = Number(oldContract.allocatedWeightKg) || 0;
    const newQuota = Number(editAllocatedWeightKg) || 0;
    const oldCommQty = (oldContract.commercialLines || []).reduce((s, l) => s + (Number(l.contractQty) || 0), 0);
    const newCommQty = editCommercialLines.reduce((s, l) => s + (Number(l.contractQty) || 0), 0);
    const isStatusChanged = oldContract.status !== editStatus;
    const isSensitiveStatus = isStatusChanged && (editStatus === 'SUSPENDED' || editStatus === 'TERMINATED');

    const executeSave = async () => {
      setSavingEdit(true);
      const prevOverrides = { ...localContractOverrides };
      const prevRevisions = { ...revisionsMap };

      const existingRevs = [
        ...(revisionsMap[oldContract.id] ||
          revisionsMap[oldContract.contractNumber] ||
          oldContract.revisions ||
          []),
      ];

      const newRevEntries: ContractRevisionEntry[] = [];

      if (newQuota !== oldQuota) {
        newRevEntries.push({
          id: `REV-QT-${Date.now()}`,
          revisionNumber: existingRevs.length + newRevEntries.length + 1,
          timestamp: new Date().toLocaleString('fa-IR'),
          actor: currentUser?.displayName || 'مدیر بازرگانی و قراردادها',
          fieldLabelFa: 'سهمیه وزنی ورق قرارداد (Allocated Quota)',
          oldQty: oldQuota,
          newQty: newQuota,
          unit: 'کیلوگرم',
          oldStatus: oldContract.status,
          newStatus: editStatus,
          reasonFa: editRevisionReason.trim() || 'اصلاحیه سهمیه وزنی قرارداد در کشوی مدیریت قراردادها',
        });
      }

      if (newCommQty !== oldCommQty) {
        newRevEntries.push({
          id: `REV-LN-${Date.now() + 1}`,
          revisionNumber: existingRevs.length + newRevEntries.length + 1,
          timestamp: new Date().toLocaleString('fa-IR'),
          actor: currentUser?.displayName || 'مدیر بازرگانی و قراردادها',
          fieldLabelFa: 'مجموع تیراژ ردیف‌های تعهد محصول / مواد',
          oldQty: oldCommQty,
          newQty: newCommQty,
          unit: 'واحد/کیلوگرم',
          oldStatus: oldContract.status,
          newStatus: editStatus,
          reasonFa: editRevisionReason.trim() || 'بازنگری تیراژ ردیف‌های تجاری قرارداد',
        });
      }

      if (newRevEntries.length === 0 && (isStatusChanged || editRevisionReason.trim())) {
        newRevEntries.push({
          id: `REV-ST-${Date.now() + 2}`,
          revisionNumber: existingRevs.length + 1,
          timestamp: new Date().toLocaleString('fa-IR'),
          actor: currentUser?.displayName || 'مدیر بازرگانی و قراردادها',
          fieldLabelFa: isStatusChanged ? 'تغییر وضعیت اجرایی قرارداد' : 'ثبت یادداشت بازنگری قرارداد',
          oldQty: oldQuota,
          newQty: newQuota,
          unit: 'کیلوگرم',
          oldStatus: oldContract.status,
          newStatus: editStatus,
          reasonFa: editRevisionReason.trim() || `تغییر وضعیت از ${oldContract.status} به ${editStatus}`,
        });
      }

      const updatedRevs = [...newRevEntries, ...existingRevs];
      const updatedCommercialLines = editCommercialLines.map(l => ({
        ...l,
        contractQty: Number(l.contractQty) || 0,
        remainingQty: Math.max(0, (Number(l.contractQty) || 0) - (Number(l.deliveredOrReceivedQty) || 0)),
      }));

      const updatedPatch: Partial<SapcoContract> = {
        title: editTitle.trim() || oldContract.title,
        customerName: editCustomerName.trim() || oldContract.customerName,
        materialGrade: editMaterialGrade.trim() || oldContract.materialGrade,
        allocatedWeightKg: newQuota,
        closingBalanceKg: Math.max(0, newQuota - (oldContract.totalConsumedKg || 0)),
        status: editStatus,
        startDate: editStartDate,
        endDate: editEndDate,
        notes: editNotes,
        commercialLines: updatedCommercialLines,
        revisions: updatedRevs,
      };

      setLocalContractOverrides(prev => ({
        ...prev,
        [oldContract.id]: updatedPatch,
      }));
      setRevisionsMap(prev => ({
        ...prev,
        [oldContract.id]: updatedRevs,
        [oldContract.contractNumber]: updatedRevs,
      }));

      try {
        await fetch(`/api/inventory/contracts/${oldContract.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...updatedPatch,
            actor: currentUser?.displayName,
            revisionReasonFa: editRevisionReason.trim(),
          }),
        });
        await onRefresh();
      } catch {
        // local state already updated
      } finally {
        setSavingEdit(false);
      }

      recordAudit({
        actionType: 'UPDATE',
        module: 'مدیریت قراردادها (SalesContracts)',
        entityId: oldContract.id,
        entityCode: oldContract.contractNumber,
        summaryFa: `ویرایش قرارداد «${oldContract.contractNumber}» — وضعیت: ${
          editStatus === 'ACTIVE' ? 'فعال' : editStatus === 'SUSPENDED' ? 'معلق' : 'خاتمه‌یافته'
        } | سهمیه: ${formatNumber(newQuota)} ک.گ`,
        beforeSnapshot: {
          allocatedWeightKg: oldQuota,
          status: oldContract.status,
          title: oldContract.title,
        },
        afterSnapshot: {
          allocatedWeightKg: newQuota,
          status: editStatus,
          title: editTitle,
        },
      });

      showUndoToast({
        title: `قرارداد «${oldContract.contractNumber}» به‌روزرسانی شد`,
        description:
          newRevEntries.length > 0
            ? `تغییرات تیراژ/وضعیت در تب «تاریخچه تغییرات تیراژ (Revisions)» ثبت شد.`
            : 'مشخصات قرارداد با موفقیت ذخیره شد.',
        onUndo: () => {
          setLocalContractOverrides(prevOverrides);
          setRevisionsMap(prevRevisions);
        },
      });

      setEditRevisionReason('');
      setDrawerTab('REVISIONS');
    };

    if (isSensitiveStatus || newQuota !== oldQuota || newCommQty !== oldCommQty) {
      requestConfirm({
        title: isSensitiveStatus
          ? `تغییر وضعیت قرارداد «${oldContract.contractNumber}»`
          : `ثبت ویرایش و بازنگری تیراژ قرارداد «${oldContract.contractNumber}»`,
        description: `آیا از اعمال تغییرات روی قرارداد «${oldContract.title}» اطمینان دارید؟`,
        consequenceText: isSensitiveStatus
          ? editStatus === 'SUSPENDED'
            ? 'با تعلیق این قرارداد، صدور حواله‌های جدید از محل سهمیه این قرارداد متوقف می‌شود.'
            : 'با خاتمه این قرارداد، پرونده تجاری آن بسته شده و در لیست قراردادهای خاتمه‌یافته قرار می‌گیرد.'
          : `تغییر سهمیه از ${formatNumber(oldQuota)} به ${formatNumber(
              newQuota
            )} کیلوگرم به صورت رسمی در تاریخچه ویرایش‌ها (Revisions) ثبت خواهد شد.`,
        severity: isSensitiveStatus ? 'warning' : 'info',
        confirmLabel: 'تأیید و ثبت در تاریخچه قرارداد',
        onConfirm: executeSave,
      });
    } else {
      executeSave();
    }
  };

  // Handle quick coil allocation to contract
  const handleConfirmAllocateCoil = async () => {
    if (!allocatingContract || !selectedCoilToAllocate) return;
    setAllocateLoading(true);
    setAllocateError(null);

    try {
      const res = await fetch(`/api/inventory/contracts/${allocatingContract.id}/allocate-coil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coilId: selectedCoilToAllocate,
          allocatedWeightKg: Number(allocateWeight) || 0,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setAllocateError(data.error || 'خطا در تخصیص کلاف به قرارداد');
      } else {
        setAllocatingContract(null);
        setSelectedCoilToAllocate('');
        await onRefresh();
      }
    } catch (err: any) {
      setAllocateError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setAllocateLoading(false);
    }
  };

  const handleExportContractsCsv = () => {
    const headers = [
      'شماره قرارداد',
      'عنوان قرارداد',
      'مشتری / طرف حساب',
      'نوع قرارداد',
      'گرید ورق',
      'سهمیه کل ورق (kg)',
      'دریافتی (kg)',
      'مصرف شده (kg)',
      'مانده سهمیه (kg)',
      'تعداد ویرایش تیراژ (Revisions)',
      'وضعیت',
    ];

    const rows = filteredContracts.map(c => [
      c.contractNumber,
      c.title,
      c.customerName || 'شرکت ساپکو',
      c.contractType || 'HYBRID',
      c.materialGrade,
      c.allocatedWeightKg,
      c.totalReceivedKg,
      c.totalConsumedKg,
      c.closingBalanceKg,
      (c.revisions || []).length,
      c.status === 'ACTIVE'
        ? 'فعال'
        : c.status === 'SUSPENDED'
        ? 'معلق'
        : 'خاتمه‌یافته',
    ]);

    exportToCsv(`گزارش_قراردادها_و_تعهدات_${Date.now()}`, headers, rows);
  };

  const contractTypeBadges: Record<string, { label: string; color: string }> = {
    CONSIGNMENT_MATERIAL: { label: 'تأمین مواد امانی', color: 'bg-amber-500/15 text-amber-800 border-amber-500/30' },
    SALES_DELIVERY: { label: 'فروش و تحویل محصول', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
    HYBRID: { label: 'ترکیبی (تأمین ورق + تحویل قطعه)', color: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
  };

  const getContractStatusBadge = (status: SapcoContract['status']) => {
    if (status === 'ACTIVE') {
      return {
        label: 'فعال (Active)',
        cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    }
    if (status === 'SUSPENDED') {
      return {
        label: 'معلق (Suspended)',
        cls: 'bg-amber-50 text-amber-800 border border-amber-300',
      };
    }
    return {
      label: 'خاتمه‌یافته (Terminated)',
      cls: 'bg-slate-100 text-slate-700 border border-slate-300',
    };
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-blue-600" />
            <span>مدیریت قراردادها، وضعیت اجرایی (فعال / معلق / خاتمه‌یافته) و تاریخچه تیراژ (Revisions)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ویرایش کامل مفاد قرارداد، تغییر وضعیت اجرایی و ثبت خودکار تاریخچه تغییرات تیراژ (Revisions) در کشوی جزئیات هر قرارداد
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت قرارداد جدید</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی</span>
          </button>

          <button
            onClick={handleExportContractsCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">تعداد کل قراردادها</span>
            <FileSignature className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1.5 font-mono">
            {toPersianDigits(mergedContracts.length)}{' '}
            <span className="text-xs font-normal text-slate-400">قرارداد</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
            <span className="text-emerald-700 font-semibold">
              فعال: {toPersianDigits(mergedContracts.filter(c => c.status === 'ACTIVE').length)}
            </span>
            <span>|</span>
            <span className="text-amber-700 font-semibold">
              معلق: {toPersianDigits(mergedContracts.filter(c => c.status === 'SUSPENDED').length)}
            </span>
            <span>|</span>
            <span className="text-slate-600 font-semibold">
              خاتمه:{' '}
              {toPersianDigits(
                mergedContracts.filter(c => c.status === 'TERMINATED' || c.status === 'FULFILLED' || c.status === 'EXPIRED').length
              )}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">کل سهمیه ورق قراردادها</span>
            <Scale className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1.5 font-mono">
            {formatWeightKg(totalAllocatedKg)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            دریافت شده: {formatWeightKg(totalReceivedKg)} | مصرف: {formatWeightKg(totalConsumedKg)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center">
              <span>مانده تعهد ورق امانی</span>
              <FormulaTooltip
                title="فرمول مانده سهمیه ورق قرارداد"
                formula="ClosingQuota = AllocatedQuota - TotalConsumedKg"
                description="مانده سهمیه ورق امانی ساپکو که هنوز به محصول نهایی تبدیل و تسویه نشده است."
              />
            </span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1.5 font-mono">
            {formatWeightKg(totalClosingBalanceKg)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            موجودی ورق در تعهد کارخانه نزد مشتری
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">تعهد تحویل قطعات نهایی</span>
            <PackageCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-700 mt-1.5 font-mono">
            {formatNumber(totalDeliveredProducts)} / {formatNumber(totalCommittedProducts)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            مانده تحویل به مشتری: {formatNumber(Math.max(0, totalCommittedProducts - totalDeliveredProducts))} عدد
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="جستجوی شماره قرارداد، مشتری، قطعه، کویل‌پک..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
          />
        </div>

        <select
          value={selectedCustomer}
          onChange={e => setSelectedCustomer(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
        >
          <option value="ALL">همه مشتریان / طرف‌حساب‌ها</option>
          {customers.map(cust => (
            <option key={cust} value={cust}>
              {cust}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
        >
          <option value="ALL">همه انواع قرارداد</option>
          <option value="HYBRID">ترکیبی (دریافت مواد + تحویل محصول)</option>
          <option value="CONSIGNMENT_MATERIAL">فقط دریافت مواد و ورق امانی</option>
          <option value="SALES_DELIVERY">فقط فروش و تحویل محصول نهایی</option>
        </select>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-900"
        >
          <option value="ALL">همه وضعیت‌ها (فعال / معلق / خاتمه‌یافته)</option>
          <option value="ACTIVE">فعال (Active)</option>
          <option value="SUSPENDED">معلق (Suspended)</option>
          <option value="TERMINATED">خاتمه‌یافته (Terminated)</option>
        </select>
      </div>

      {/* Contracts List */}
      <div className="space-y-4">
        {filteredContracts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-white border border-slate-200 rounded-xl">
            قراردادی با شرایط فیلتر انتخاب شده یافت نشد.
          </div>
        ) : (
          filteredContracts.map(contract => {
            const isExpanded = expandedContractId === contract.id;
            const badge = contractTypeBadges[contract.contractType || 'HYBRID'] || contractTypeBadges.HYBRID;
            const statusBadge = getContractStatusBadge(contract.status);
            const commercialLines = contract.commercialLines || [];
            const incomingMaterials = commercialLines.filter(l => l.lineType === 'CUSTOMER_SUPPLIED_MATERIAL');
            const productDeliveries = commercialLines.filter(l => l.lineType === 'FINISHED_PRODUCT_DELIVERY');
            const connectedCoils = contract.coils || [];
            const revCount = (contract.revisions || []).length;

            const quotaProgress = contract.allocatedWeightKg > 0
              ? Math.min(100, Math.round(((contract.totalConsumedKg || 0) / contract.allocatedWeightKg) * 100))
              : 0;

            return (
              <div
                key={contract.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all"
              >
                {/* Contract Summary Bar */}
                <div className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openContractDrawer(contract, 'EDIT')}
                        className="font-mono text-xs font-bold px-2.5 py-0.5 bg-slate-900 hover:bg-indigo-700 text-white rounded transition-colors cursor-pointer"
                        title="کلیک جهت باز کردن کشوی جزئیات، ویرایش و تاریخچه تیراژ"
                      >
                        {contract.contractNumber}
                      </button>
                      <h3 className="text-sm font-bold text-slate-900">{contract.title}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-medium border rounded ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                      {revCount > 0 && (
                        <button
                          type="button"
                          onClick={() => openContractDrawer(contract, 'REVISIONS')}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          <span>{toPersianDigits(revCount)} ویرایش تیراژ (Rev)</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>طرف حساب: <strong className="text-slate-700">{contract.customerName || 'شرکت ساپکو'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          دوره: {formatDate(contract.startDate)} الی {formatDate(contract.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-slate-400" />
                        <span>گرید اصلی: <strong className="font-mono text-slate-700">{contract.materialGrade}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
                    {/* Quota Progress */}
                    <div className="text-left font-mono">
                      <div className="text-[11px] text-slate-500">
                        مانده سهمیه: <strong className="text-slate-900">{formatNumber(contract.closingBalanceKg)}</strong> / {formatNumber(contract.allocatedWeightKg)} kg
                      </div>
                      <div className="w-36 h-2 bg-slate-100 border border-slate-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${quotaProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openContractDrawer(contract, 'EDIT')}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        title="ویرایش کامل قرارداد، تغییر وضعیت و ثبت بازنگری تیراژ"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>ویرایش قرارداد</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openContractDrawer(contract, 'REVISIONS')}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        title="مشاهده تاریخچه تغییرات تیراژ (Revisions)"
                      >
                        <History className="w-3.5 h-3.5 text-indigo-600" />
                        <span>تاریخچه تیراژ</span>
                      </button>

                      <button
                        onClick={() => {
                          setAllocatingContract(contract);
                          setAllocateWeight(1000);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="تخصیص کلاف یا رول جدید به این قرارداد"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>تخصیص کلاف</span>
                      </button>

                      {onViewContractLedger && (
                        <button
                          onClick={() => onViewContractLedger(contract.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="مشاهده کاردکس و گردش اسناد این قرارداد"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                          <span>کاردکس</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedContractId(isExpanded ? null : contract.id)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Sections */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50 space-y-5 border-t border-slate-200">
                    {/* SECTION 1: INCOMING MATERIALS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-blue-600" />
                          مواد و قطعات دریافتی از مشتری / تأمین‌کننده (سهمیه ورق، پیچ و مهره، لاستیک)
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {toPersianDigits(incomingMaterials.length)} ردیف تعریف شده
                        </span>
                      </div>

                      {incomingMaterials.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-lg">
                          ردیف تفکیک شده ماده‌ای برای این قرارداد ثبت نشده است (سهمیه کلی: {formatNumber(contract.allocatedWeightKg)} kg).
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                          <table className="w-full text-xs text-right">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2">کد قطعه/ماده</th>
                                <th className="px-3 py-2">شرح کالا</th>
                                <th className="px-3 py-2">واحد</th>
                                <th className="px-3 py-2 text-left font-mono">سهمیه قرارداد</th>
                                <th className="px-3 py-2 text-left font-mono">دریافت شده</th>
                                <th className="px-3 py-2 text-left font-mono">مانده سهمیه</th>
                                <th className="px-3 py-2">توضیحات</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {incomingMaterials.map(mat => (
                                <tr key={mat.id} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 font-mono text-slate-700">{mat.partCode}</td>
                                  <td className="px-3 py-2 font-medium text-slate-900">{mat.partName}</td>
                                  <td className="px-3 py-2 text-slate-500">{mat.unit === 'KG' ? 'کیلوگرم' : 'عدد'}</td>
                                  <td className="px-3 py-2 text-left font-mono text-slate-900 font-bold">
                                    {formatNumber(mat.contractQty)}
                                  </td>
                                  <td className="px-3 py-2 text-left font-mono text-emerald-700">
                                    {formatNumber(mat.deliveredOrReceivedQty || 0)}
                                  </td>
                                  <td className="px-3 py-2 text-left font-mono text-amber-700 font-bold">
                                    {formatNumber(mat.remainingQty || mat.contractQty)}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500 text-[11px]">{mat.notes || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: PRODUCT DELIVERY COMMITMENTS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <PackageCheck className="w-4 h-4 text-emerald-600" />
                          تعهدات تجاری تحویل محصول نهایی به مشتری (ارسال جنس طبق قرارداد)
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {toPersianDigits(productDeliveries.length)} تعهد محصول
                        </span>
                      </div>

                      {productDeliveries.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-lg">
                          تعهد محصول نهایی به صورت مجزا در این قرارداد درج نشده است.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                          <table className="w-full text-xs text-right">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2">کد محصول</th>
                                <th className="px-3 py-2">عنوان قطعه نهایی</th>
                                <th className="px-3 py-2 text-left font-mono">تیراژ تعهد شده</th>
                                <th className="px-3 py-2 text-left font-mono">تحویل شده تاکنون</th>
                                <th className="px-3 py-2 text-left font-mono">مانده تعهد تحویل</th>
                                <th className="px-3 py-2 text-center">درصد پیشرفت</th>
                                <th className="px-3 py-2">ملاحظات تحویل</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {productDeliveries.map(prod => {
                                const progress = prod.contractQty > 0
                                  ? Math.min(100, Math.round(((prod.deliveredOrReceivedQty || 0) / prod.contractQty) * 100))
                                  : 0;

                                return (
                                  <tr key={prod.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 font-mono text-slate-700">{prod.partCode}</td>
                                    <td className="px-3 py-2 font-medium text-slate-900">{prod.partName}</td>
                                    <td className="px-3 py-2 text-left font-mono text-slate-900 font-bold">
                                      {formatNumber(prod.contractQty)} عدد
                                    </td>
                                    <td className="px-3 py-2 text-left font-mono text-emerald-700 font-bold">
                                      {formatNumber(prod.deliveredOrReceivedQty || 0)} عدد
                                    </td>
                                    <td className="px-3 py-2 text-left font-mono text-purple-700 font-bold">
                                      {formatNumber(prod.remainingQty || prod.contractQty)} عدد
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                          <div
                                            className="h-full bg-emerald-600 rounded-full"
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                        <span>{progress}%</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-slate-500 text-[11px]">{prod.notes || 'تحویل ماهیانه'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: CONNECTED COILS & PACKS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          کلاف‌های ورق و کویل‌پک‌های متصل به این قرارداد
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {toPersianDigits(connectedCoils.length)} کلاف متصل
                        </span>
                      </div>

                      {connectedCoils.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-lg">
                          کلافی به صورت مستقیم به این قرارداد لینک نشده است. با دکمه «تخصیص کلاف» می‌توانید کلاف‌های موجود در انبار را متصل کنید.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {connectedCoils.map((coil, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col justify-between gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-blue-600">{coil.coilId}</span>
                                <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-[10px] text-slate-700 font-mono rounded">
                                  پکینگ: {coil.coilPackNumber || '—'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 space-y-0.5">
                                <div>گرید: {coil.materialGrade || contract.materialGrade}</div>
                                {coil.thicknessMm && <div>ضخامت: {coil.thicknessMm}mm | عرض: {coil.widthMm}mm</div>}
                              </div>
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-500">سهم تخصیصی:</span>
                                <span className="font-bold text-slate-900">{formatNumber(coil.allocatedWeightKg)} kg</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ==================================================================== */}
      {/* SLIDE-OVER DRAWER: CONTRACT EDIT, STATUS & REVISIONS HISTORY          */}
      {/* ==================================================================== */}
      {activeDrawerContract && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[2px] animate-in fade-in duration-150"
          dir="rtl"
          onClick={() => setDrawerContractId(null)}
        >
          <div
            className="w-full max-w-2xl bg-white h-full shadow-2xl border-r border-slate-200 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-xs font-bold">
                    {activeDrawerContract.contractNumber}
                  </span>
                  <h3 className="text-sm font-bold text-white">{activeDrawerContract.title}</h3>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  طرف حساب: {activeDrawerContract.customerName || 'شرکت ساپکو'} · گرید پایه: {activeDrawerContract.materialGrade}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerContractId(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Sub-Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerTab('EDIT')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  drawerTab === 'EDIT'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>۱. ویرایش مشخصات، تیراژ و وضعیت قرارداد</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab('REVISIONS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  drawerTab === 'REVISIONS'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  ۲. تاریخچه تغییرات تیراژ (Revisions) ({toPersianDigits((activeDrawerContract.revisions || []).length)})
                </span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {drawerTab === 'EDIT' ? (
                <>
                  {/* Status Selector Banner */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <label className="block text-xs font-bold text-slate-900">
                      وضعیت اجرایی قرارداد (Contract Status):
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setEditStatus('ACTIVE')}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          editStatus === 'ACTIVE'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>فعال (Active)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditStatus('SUSPENDED')}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          editStatus === 'SUSPENDED'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                        }`}
                      >
                        <PauseCircle className="w-4 h-4" />
                        <span>معلق (Suspended)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditStatus('TERMINATED')}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          editStatus === 'TERMINATED'
                            ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Ban className="w-4 h-4" />
                        <span>خاتمه‌یافته (Terminated)</span>
                      </button>
                    </div>
                  </div>

                  {/* General Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-bold mb-1">عنوان قرارداد:</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">مشتری / طرف حساب:</label>
                      <input
                        type="text"
                        value={editCustomerName}
                        onChange={e => setEditCustomerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">گرید ورق پایه:</label>
                      <input
                        type="text"
                        value={editMaterialGrade}
                        onChange={e => setEditMaterialGrade(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        سهمیه وزنی کل قرارداد (کیلوگرم):
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editAllocatedWeightKg}
                        onChange={e => setEditAllocatedWeightKg(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50/40 font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        مقدار قبلی: {formatNumber(activeDrawerContract.allocatedWeightKg)} kg (هرگونه تغییر در Revisions ثبت می‌شود)
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">بازه زمانی قرارداد:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={e => setEditStartDate(e.target.value)}
                          className="px-2 py-2 rounded-lg border border-slate-300 bg-white font-mono text-[11px]"
                        />
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={e => setEditEndDate(e.target.value)}
                          className="px-2 py-2 rounded-lg border border-slate-300 bg-white font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Commercial Lines Quantity Editor */}
                  {editCommercialLines.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-900">
                        ویرایش تیراژ ردیف‌های تعهد محصول و مواد قرارداد:
                      </label>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                              <th className="py-2 px-3">کد و نام کالا</th>
                              <th className="py-2 px-3">نوع ردیف</th>
                              <th className="py-2 px-3">تیراژ تعهد شده</th>
                              <th className="py-2 px-3">تحویل/دریافت شده</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {editCommercialLines.map((line, idx) => (
                              <tr key={line.id || idx}>
                                <td className="py-2 px-3">
                                  <div className="font-bold text-slate-900">{line.partName}</div>
                                  <div className="text-[10px] font-mono text-slate-500">{line.partCode}</div>
                                </td>
                                <td className="py-2 px-3 text-[11px] text-slate-600">
                                  {line.lineType === 'CUSTOMER_SUPPLIED_MATERIAL' ? 'سهمیه ورق/ماده' : 'تعهد تحویل قطعه'}
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    min={0}
                                    value={line.contractQty}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      setEditCommercialLines(prev =>
                                        prev.map((item, i) => (i === idx ? { ...item, contractQty: val } : item))
                                      );
                                    }}
                                    className="w-28 px-2.5 py-1 rounded border border-slate-300 font-mono font-bold text-slate-900"
                                  />
                                </td>
                                <td className="py-2 px-3 font-mono text-emerald-700">
                                  {formatNumber(line.deliveredOrReceivedQty || 0)} {line.unit === 'KG' ? 'kg' : 'عدد'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Revision Reason & Notes */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-800 font-bold mb-1">
                        علت بازنگری تیراژ / شماره الحاقیه (جهت ثبت در تاریخچه Revisions):
                      </label>
                      <input
                        type="text"
                        value={editRevisionReason}
                        onChange={e => setEditRevisionReason(e.target.value)}
                        placeholder="مثلاً: ابلاغ الحاقیه شماره ۳ ساپکو و افزایش سهمیه ورق کششی..."
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/40 text-slate-900 focus:outline-none focus:border-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">توضیحات کلی قرارداد:</label>
                      <textarea
                        rows={2}
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* TAB 2: QUANTITY REVISIONS HISTORY TIMELINE */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-indigo-950">
                        تاریخچه رسمی تغییرات تیراژ و وضعیت قرارداد (Contract Revisions Log)
                      </div>
                      <div className="text-[11px] text-indigo-700 mt-0.5">
                        تمامی اصلاحیه‌های سهمیه ورق، تیراژ قطعات و تغییرات وضعیت به صورت تغییرناپذیر ثبت می‌شوند.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDrawerTab('EDIT')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold cursor-pointer shrink-0"
                    >
                      + ثبت ویرایش جدید
                    </button>
                  </div>

                  {(activeDrawerContract.revisions || []).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      هنوز هیچ تغییر تیراژی روی این قرارداد ثبت نشده است.
                    </div>
                  ) : (
                    <div className="relative pr-6 border-r-2 border-indigo-200 space-y-4 mr-2">
                      {(activeDrawerContract.revisions || []).map((rev, index) => {
                        const delta = (rev.newQty || 0) - (rev.oldQty || 0);
                        return (
                          <div
                            key={rev.id || index}
                            className="relative bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2"
                          >
                            <span className="absolute -right-[31px] top-4 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow" />
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-indigo-900 text-white font-mono text-[11px] font-bold">
                                  Rev #{toPersianDigits(rev.revisionNumber || index + 1)}
                                </span>
                                <span className="text-xs font-bold text-slate-900">{rev.fieldLabelFa}</span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">{rev.timestamp}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-lg text-xs font-mono">
                              <div>
                                <span className="text-[10px] text-slate-500 block font-sans">تیراژ / سهمیه قبلی:</span>
                                <strong className="text-slate-700">
                                  {formatNumber(rev.oldQty)} {rev.unit}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block font-sans">تیراژ / سهمیه جدید:</span>
                                <strong className="text-slate-900">
                                  {formatNumber(rev.newQty)} {rev.unit}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block font-sans">میزان تغییرات (Delta):</span>
                                <strong
                                  className={
                                    delta > 0
                                      ? 'text-emerald-700'
                                      : delta < 0
                                      ? 'text-rose-700'
                                      : 'text-slate-600'
                                  }
                                >
                                  {delta > 0 ? `+${formatNumber(delta)}` : formatNumber(delta)} {rev.unit}
                                </strong>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1">
                              <div>
                                <strong>علت بازنگری: </strong>
                                <span>{rev.reasonFa}</span>
                              </div>
                              <div className="text-slate-500">
                                ثبت‌کننده: <strong className="text-slate-800">{rev.actor}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDrawerContractId(null)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                بستن کشو
              </button>

              {drawerTab === 'EDIT' && (
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveContractEdit}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>{savingEdit ? 'در حال ثبت تغییرات...' : 'ذخیره تغییرات و ثبت در تاریخچه تیراژ (Revisions)'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contract Create Modal */}
      <ContractCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={async () => {
          await onRefresh();
        }}
        parts={parts}
        coils={coils}
        currentUser={currentUser}
      />

      {/* Quick Allocate Coil Modal */}
      {allocatingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900">تخصیص کلاف به قرارداد</h3>
                <span className="text-[11px] font-mono text-blue-600">{allocatingContract.contractNumber}</span>
              </div>
              <button
                onClick={() => setAllocatingContract(null)}
                className="text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {allocateError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs rounded">
                {allocateError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">انتخاب کلاف موجود در انبار</label>
                <select
                  value={selectedCoilToAllocate}
                  onChange={e => {
                    setSelectedCoilToAllocate(e.target.value);
                    const selected = coils.find(c => c.coilId === e.target.value || c.id === e.target.value);
                    if (selected) {
                      setAllocateWeight(selected.remainingWeightKg);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- انتخاب کلاف و کویل‌پک --</option>
                  {coils.map(c => (
                    <option key={c.id} value={c.coilId}>
                      [{c.coilId}] پکینگ: {c.coilPackNumber} | {c.materialGrade} {c.thicknessMm}mm | مانده: {formatNumber(c.remainingWeightKg)} kg
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  وزن تخصیصی به این قرارداد (کیلوگرم)
                </label>
                <input
                  type="number"
                  min="1"
                  value={allocateWeight}
                  onChange={e => setAllocateWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 font-mono text-left focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  می‌توانید کل وزن کلاف یا بخشی از آن (تخصیص چندقراردادی) را به این قرارداد متصل نمایید.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAllocatingContract(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={!selectedCoilToAllocate || allocateLoading}
                onClick={handleConfirmAllocateCoil}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded cursor-pointer"
              >
                {allocateLoading ? 'در حال ثبت...' : 'تأیید و اتصال کلاف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
