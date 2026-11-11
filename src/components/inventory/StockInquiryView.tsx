import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Download,
  Building2,
  RefreshCw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Layers,
  Boxes,
  BookmarkCheck,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Pin,
  ShieldAlert,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  DetailedStockBalance,
  Part,
  WarehouseDefinition,
  StockOwnership,
  InventoryDocument,
} from '../../types/inventory';
import {
  formatNumber,
  formatWeightKg,
  toPersianDigits,
  formatDateTime,
  exportToCsv,
} from '../../utils/formatters';
import { CoilSlittingGenealogyPanel } from './CoilSlittingGenealogyPanel';
import { useEnterpriseUx } from '../../context/EnterpriseUxContext';
import { FormulaTooltip } from '../common/FormulaTooltip';
import {
  loadQcHoldMap,
  saveQcHoldMap,
  loadVipPartsMap,
  isPartVip,
  QcHoldRecord,
} from '../../utils/qcHoldStore';

export type StockGroupingKey =
  | 'NONE'
  | 'PART'
  | 'WAREHOUSE'
  | 'OWNERSHIP'
  | 'CONTRACT'
  | 'COIL_PACK'
  | 'GRADE'
  | 'THICKNESS';

interface StockInquiryViewProps {
  balances: DetailedStockBalance[];
  parts: Part[];
  warehouses: WarehouseDefinition[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const DEFAULT_VISIBLE_COLUMNS = {
  partCode: true,
  partName: true,
  warehouse: true,
  lotNumber: true,
  contract: true,
  ownership: true,
  physicalQty: true,
  availableQty: true,
  reservedQty: true,
  blockedQty: false,
  physicalKg: true,
  lastTx: false,
};

export const StockInquiryView: React.FC<StockInquiryViewProps> = ({
  balances: rawBalances,
  parts,
  warehouses,
  loading,
  onRefresh,
}) => {
  const { requestConfirm, showUndoToast, recordAudit } = useEnterpriseUx();
  const [qcHoldMap, setQcHoldMap] = useState<Record<string, QcHoldRecord>>(() => loadQcHoldMap());
  const [vipMap, setVipMap] = useState<Record<string, boolean>>(() => loadVipPartsMap());

  useEffect(() => {
    const onHoldChange = () => setQcHoldMap(loadQcHoldMap());
    const onVipChange = () => setVipMap(loadVipPartsMap());
    window.addEventListener('kpims-qc-hold-changed', onHoldChange);
    window.addEventListener('kpims-vip-parts-changed', onVipChange);
    return () => {
      window.removeEventListener('kpims-qc-hold-changed', onHoldChange);
      window.removeEventListener('kpims-vip-parts-changed', onVipChange);
    };
  }, []);

  // Apply QC Hold overrides directly to balances so Available (ATP) = Physical - Reserved - QCHold
  const balances = useMemo(() => {
    return rawBalances.map(b => {
      const hold =
        qcHoldMap[b.id] ||
        (b.lotNumber ? qcHoldMap[b.lotNumber] : undefined) ||
        qcHoldMap[`${b.partId}-${b.warehouseId}`];
      if (!hold || !hold.isHeld) return b;
      const heldQty = Number(hold.heldQty || b.physicalQty || 0);
      const effectiveBlocked = Math.min(b.physicalQty, Math.max(b.qualityBlockedQty || 0, heldQty));
      const newAvailableQty = Math.max(0, b.physicalQty - b.reservedQty - effectiveBlocked);
      const unitWeight = b.physicalQty > 0 ? b.physicalKg / b.physicalQty : 1;
      return {
        ...b,
        qualityBlockedQty: effectiveBlocked,
        availableQty: newAvailableQty,
        availableKg: Math.round(newAvailableQty * unitWeight * 100) / 100,
      };
    });
  }, [rawBalances, qcHoldMap]);

  // Mandatory QC Hold Reason Modal State
  const [qcHoldTargetBalance, setQcHoldTargetBalance] = useState<DetailedStockBalance | null>(null);
  const [qcHoldReasonText, setQcHoldReasonText] = useState('');
  const [qcHoldReasonError, setQcHoldReasonError] = useState('');

  const STOCK_QC_HOLD_PRESETS: string[] = [
    'زنگ‌زدگی سطحی یا اکسیداسیون ورق در انبار',
    'مغایرت ابعادی / ضخامت با نقشه فنی ساپکو',
    'عدم تأیید آزمایشگاه متالورژی (گواهی ذوب)',
    'آسیب فیزیکی پالت یا لبه کلاف در جابجایی',
    'مشکوک به مخلوط شدن بچ تولیدی (نیاز به سورتینگ ۱۰۰٪)',
  ];

  const executeBalanceQcHoldChange = async (
    b: DetailedStockBalance,
    nextHeld: boolean,
    mandatoryReasonFa?: string
  ) => {
    const holdKey = b.id;
    const qtyToHold = b.physicalQty;
    const weightToHold = b.physicalKg || b.physicalQty;
    const finalReason = (mandatoryReasonFa || '').trim() || 'قرنطینه کیفی در جدول موجودی انبار (QC Hold)';

    const prevMap = { ...qcHoldMap };
    const updatedMap = { ...qcHoldMap };

    if (nextHeld) {
      const rec: QcHoldRecord = {
        key: holdKey,
        partId: b.partId,
        partCode: b.partCode,
        partName: b.partName,
        lotNumber: b.lotNumber,
        warehouseName: b.warehouseName,
        isHeld: true,
        heldQty: qtyToHold,
        heldWeightKg: weightToHold,
        unit: b.unit === 'KG' ? 'KG' : 'PCS',
        reasonFa: finalReason,
        updatedAt: new Date().toLocaleString('fa-IR'),
        actor: 'مدیریت کنترل کیفیت (QC)',
      };
      updatedMap[holdKey] = rec;
      if (b.lotNumber) updatedMap[b.lotNumber] = rec;
    } else {
      delete updatedMap[holdKey];
      if (b.lotNumber) delete updatedMap[b.lotNumber];
    }

    setQcHoldMap(updatedMap);
    saveQcHoldMap(updatedMap);

    try {
      await fetch('/api/inventory/qc-hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: holdKey,
          partId: b.partId,
          partCode: b.partCode,
          materialGrade: b.materialGrade,
          lotNumber: b.lotNumber,
          isHeld: nextHeld,
          heldQty: qtyToHold,
          heldWeightKg: weightToHold,
          reasonFa: finalReason,
        }),
      });
      await onRefresh();
    } catch {
      // local state already updated
    }

    recordAudit({
      actionType: 'STATUS_CHANGE',
      module: 'انبار و قرنطینه کیفی (QC Hold)',
      entityId: b.id,
      entityCode: b.lotNumber || b.partCode,
      summaryFa: nextHeld
        ? `قرنطینه کیفی (QC Hold) «${b.partName}» به مقدار ${formatNumber(qtyToHold)} ${b.unit} — علت: ${finalReason}`
        : `رفع قرنطینه کیفی «${b.partName}» و بازگشت به موجودی آزاد (ATP)`,
      details: nextHeld
        ? `علت قرنطینه (QC Hold Reason): ${finalReason} | کسر مستقیم از ATP در انبار و MRP`
        : `آزادسازی موجودی ${b.partName} و بازگشت به ATP`,
      beforeSnapshot: { availableQty: b.availableQty, qualityBlockedQty: b.qualityBlockedQty },
      afterSnapshot: {
        availableQty: nextHeld ? 0 : b.physicalQty - b.reservedQty,
        qualityBlockedQty: nextHeld ? qtyToHold : 0,
        qcHoldReason: nextHeld ? finalReason : null,
      },
    });

    showUndoToast({
      title: nextHeld
        ? `🔒 «${b.partName}» در قرنطینه کیفی (QC Hold) قرار گرفت`
        : `🔓 قرنطینه کیفی «${b.partName}» آزاد شد`,
      description: nextHeld
        ? `علت: ${finalReason} | مقدار ${formatNumber(qtyToHold)} ${b.unit === 'KG' ? 'kg' : 'عدد'} از ATP کسر گردید.`
        : 'موجودی به چرخه آزاد تولید بازگشت.',
      onUndo: () => {
        setQcHoldMap(prevMap);
        saveQcHoldMap(prevMap);
      },
    });
  };

  const handleToggleQcHoldOnBalance = (b: DetailedStockBalance) => {
    const holdKey = b.id;
    const isCurrentlyHeld = Boolean(
      qcHoldMap[holdKey]?.isHeld ||
        (b.lotNumber && qcHoldMap[b.lotNumber]?.isHeld) ||
        b.qualityBlockedQty > 0
    );
    const nextHeld = !isCurrentlyHeld;
    const qtyToHold = b.physicalQty;

    if (nextHeld) {
      setQcHoldTargetBalance(b);
      setQcHoldReasonText('');
      setQcHoldReasonError('');
      return;
    }

    requestConfirm({
      title: `رفع قرنطینه کیفی (Release QC Hold) «${b.partName}»`,
      description: `آیا از تایید کیفی و آزادسازی موجودی «${b.lotNumber || b.partCode}» اطمینان دارید؟`,
      consequenceText: `مقدار ${formatNumber(qtyToHold)} ${
        b.unit === 'KG' ? 'کیلوگرم' : 'عدد'
      } مجدداً به «موجودی آزاد قابل برنامه‌ریزی (ATP)» در انبار و MRP اضافه خواهد شد.`,
      severity: 'info',
      confirmLabel: 'تأیید رفع قرنطینه',
      onConfirm: async () => {
        await executeBalanceQcHoldChange(b, false);
      },
    });
  };

  const handleConfirmStockQcHoldModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcHoldTargetBalance) return;
    const trimmed = qcHoldReasonText.trim();
    if (!trimmed) {
      setQcHoldReasonError('ثبت «علت قرنطینه (QC Hold Reason)» پیش از فریز کردن موجودی الزامی است.');
      return;
    }
    const target = qcHoldTargetBalance;
    setQcHoldTargetBalance(null);
    setQcHoldReasonText('');
    setQcHoldReasonError('');
    await executeBalanceQcHoldChange(target, true, trimmed);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartFilter, setSelectedPartFilter] = useState('ALL');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('ALL');
  const [selectedOwnershipFilter, setSelectedOwnershipFilter] = useState<'ALL' | StockOwnership>('ALL');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [selectedContractFilter, setSelectedContractFilter] = useState('ALL');
  const [selectedLotFilter, setSelectedLotFilter] = useState('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // View Mode: ANALYTICAL_TABLE vs PART_CARDEX vs COIL_SLITTING
  const [inquiryMode, setInquiryMode] = useState<'PART_CARDEX' | 'ANALYTICAL_TABLE' | 'COIL_SLITTING'>('PART_CARDEX');
  const [onlyBelowReorderPoint, setOnlyBelowReorderPoint] = useState(false);
  const [selectedCardexPartId, setSelectedCardexPartId] = useState<string>('');
  const [partSearchQuery, setPartSearchQuery] = useState<string>('');
  const [allDocuments, setAllDocuments] = useState<InventoryDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState<boolean>(false);

  // Grouping & Expandable Details
  const [groupBy, setGroupBy] = useState<StockGroupingKey>('NONE');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [savedViewNotice, setSavedViewNotice] = useState(false);

  // Fetch inventory documents for Cardex calculation
  useEffect(() => {
    setDocsLoading(true);
    fetch('/api/inventory/documents?limit=500')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setAllDocuments(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [balances]);

  // Select default part for Cardex
  useEffect(() => {
    if (!selectedCardexPartId && parts.length > 0) {
      const partWithStock = parts.find(p => balances.some(b => b.partId === p.id || b.partCode === p.code));
      setSelectedCardexPartId((partWithStock || parts[0]).id);
    }
  }, [parts, balances, selectedCardexPartId]);

  // Saved Column Preferences
  const [visibleCols, setVisibleCols] = useState<typeof DEFAULT_VISIBLE_COLUMNS>(() => {
    if (typeof window === 'undefined') return DEFAULT_VISIBLE_COLUMNS;
    try {
      const saved = window.localStorage.getItem('kpims_stock_inquiry_cols_v2');
      return saved ? { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) } : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Sorting
  const [sortField, setSortField] = useState<keyof DetailedStockBalance>('physicalKg');
  const [sortAsc, setSortAsc] = useState(false);

  // Unique material grades
  const grades = useMemo(() => {
    const set = new Set<string>();
    parts.forEach(p => {
      if (p.materialGrade) set.add(p.materialGrade);
    });
    balances.forEach(b => {
      if (b.materialGrade) set.add(b.materialGrade);
    });
    return Array.from(set);
  }, [parts, balances]);

  // Unique contracts
  const contractNumbers = useMemo(() => {
    const set = new Set<string>();
    balances.forEach(b => {
      if (b.contractNumber) set.add(b.contractNumber);
    });
    return Array.from(set);
  }, [balances]);

  // Unique coil-packs / lot numbers dynamically matching current part/grade
  const matchingPacksOrLots = useMemo(() => {
    let list = balances;
    if (selectedPartFilter !== 'ALL') {
      list = list.filter(b => b.partId === selectedPartFilter);
    }
    if (selectedGradeFilter !== 'ALL') {
      list = list.filter(b => b.materialGrade === selectedGradeFilter);
    }
    if (selectedContractFilter !== 'ALL') {
      list = list.filter(b => b.contractNumber === selectedContractFilter);
    }
    const set = new Set<string>();
    list.forEach(b => {
      if (b.lotNumber) set.add(b.lotNumber);
    });
    return Array.from(set);
  }, [balances, selectedPartFilter, selectedGradeFilter, selectedContractFilter]);

  const filteredBalances = useMemo(() => {
    return balances
      .filter(item => {
        if (selectedPartFilter !== 'ALL' && item.partId !== selectedPartFilter) return false;
        if (selectedWarehouseFilter !== 'ALL' && item.warehouseId !== selectedWarehouseFilter) return false;
        if (selectedOwnershipFilter !== 'ALL' && item.ownership !== selectedOwnershipFilter) return false;
        if (selectedGradeFilter !== 'ALL' && item.materialGrade !== selectedGradeFilter) return false;
        if (selectedContractFilter !== 'ALL' && item.contractNumber !== selectedContractFilter) return false;
        if (selectedLotFilter !== 'ALL' && item.lotNumber !== selectedLotFilter) return false;
        if (onlyAvailable && item.availableQty <= 0) return false;

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchesName = item.partName.toLowerCase().includes(q);
          const matchesCode = item.partCode.toLowerCase().includes(q);
          const matchesLot = item.lotNumber ? item.lotNumber.toLowerCase().includes(q) : false;
          const matchesHeat = item.heatNumber ? item.heatNumber.toLowerCase().includes(q) : false;
          const matchesContract = item.contractNumber ? item.contractNumber.toLowerCase().includes(q) : false;
          const matchesGrade = item.materialGrade ? item.materialGrade.toLowerCase().includes(q) : false;
          const matchesWh = item.warehouseName.toLowerCase().includes(q);
          if (
            !matchesName &&
            !matchesCode &&
            !matchesLot &&
            !matchesHeat &&
            !matchesContract &&
            !matchesGrade &&
            !matchesWh
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [
    balances,
    searchTerm,
    selectedPartFilter,
    selectedWarehouseFilter,
    selectedOwnershipFilter,
    selectedGradeFilter,
    selectedContractFilter,
    selectedLotFilter,
    onlyAvailable,
    sortField,
    sortAsc,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedPartFilter,
    selectedWarehouseFilter,
    selectedOwnershipFilter,
    selectedGradeFilter,
    selectedContractFilter,
    selectedLotFilter,
    onlyAvailable,
    groupBy,
  ]);

  // Aggregate stats (strictly physical without duplication)
  const totalPhysicalKg = filteredBalances.reduce((sum, b) => sum + b.physicalKg, 0);
  const totalAvailableKg = filteredBalances.reduce((sum, b) => sum + b.availableKg, 0);
  const totalReservedKg = filteredBalances.reduce((sum, b) => sum + b.reservedKg, 0);
  const totalSapcoKg = filteredBalances
    .filter(b => b.ownership === 'SAPCO_SUPPLIER_OWNED')
    .reduce((sum, b) => sum + b.physicalKg, 0);

  // Grouped View Calculation
  const groupedData = useMemo(() => {
    if (groupBy === 'NONE') return [];
    const map = new Map<
      string,
      {
        groupKey: string;
        groupTitle: string;
        items: DetailedStockBalance[];
        totalPhysicalKg: number;
        totalAvailableKg: number;
        coilsCount: number;
      }
    >();

    filteredBalances.forEach(item => {
      let key = 'نامشخص';
      let title = 'نامشخص';
      if (groupBy === 'PART') {
        key = item.partId;
        title = `${item.partName} (${item.partCode})`;
      } else if (groupBy === 'WAREHOUSE') {
        key = item.warehouseId;
        title = item.warehouseName;
      } else if (groupBy === 'OWNERSHIP') {
        key = item.ownership;
        title = item.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'ورق و اقلام امانی ساپکو' : 'مالکیت شرکت کوثر';
      } else if (groupBy === 'CONTRACT') {
        key = item.contractNumber || 'FREE';
        title = item.contractNumber ? `قرارداد شماره ${item.contractNumber}` : 'آزاد / بدون قرارداد مشخص';
      } else if (groupBy === 'COIL_PACK') {
        key = item.lotNumber || 'NO_LOT';
        title = item.lotNumber ? `کویل‌پک / بچ: ${item.lotNumber}` : 'بدون شماره کویل‌پک';
      } else if (groupBy === 'GRADE') {
        key = item.materialGrade || 'OTHER';
        title = item.materialGrade ? `جنس / گرید ورق: ${item.materialGrade}` : 'سایر اقلام (پیچ، مهره، لاستیک و قطعات)';
      } else if (groupBy === 'THICKNESS') {
        key = item.thicknessMm ? `${item.thicknessMm}` : 'NO_THICK';
        title = item.thicknessMm ? `ضخامت ورق: ${item.thicknessMm} میلی‌متر` : 'اقلام غیرورق (بدون ضخامت)';
      }

      const existing = map.get(key) || {
        groupKey: key,
        groupTitle: title,
        items: [],
        totalPhysicalKg: 0,
        totalAvailableKg: 0,
        coilsCount: 0,
      };
      existing.items.push(item);
      existing.totalPhysicalKg += item.physicalKg;
      existing.totalAvailableKg += item.availableKg;
      if (item.lotNumber) existing.coilsCount += 1;
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalPhysicalKg - a.totalPhysicalKg);
  }, [filteredBalances, groupBy]);

  const totalPages = Math.max(1, Math.ceil(filteredBalances.length / pageSize));
  const paginatedBalances = filteredBalances.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSaveViewPreferences = () => {
    try {
      window.localStorage.setItem('kpims_stock_inquiry_cols_v2', JSON.stringify(visibleCols));
      setSavedViewNotice(true);
      setTimeout(() => setSavedViewNotice(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'کد کالا',
      'عنوان کالا / ورق',
      'جنس/گرید ورق',
      'ضخامت (mm)',
      'انبار',
      'جایگاه',
      'شماره کویل‌پک / بچ',
      'شماره ذوب',
      'شماره قرارداد',
      'نوع مالکیت',
      'موجودی فیزیکی',
      'موجودی قابل استفاده (آزاد)',
      'رزرو شده',
      'قرنطینه کیفی',
      'واحد',
      'وزن کل (کیلوگرم)',
      'وزن آزاد (کیلوگرم)',
      'آخرین گردش',
    ];

    const rows = filteredBalances.map(b => [
      b.partCode,
      b.partName,
      b.materialGrade || '—',
      b.thicknessMm ? `${b.thicknessMm}` : '—',
      b.warehouseName,
      b.locationCode,
      b.lotNumber || '—',
      b.heatNumber || '—',
      b.contractNumber || '—',
      b.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو' : 'ملکی کارخانه',
      b.physicalQty,
      b.availableQty,
      b.reservedQty,
      b.qualityBlockedQty,
      b.unit === 'KG' ? 'کیلوگرم' : 'عدد',
      b.physicalKg,
      b.availableKg,
      formatDateTime(b.lastTransactionAt),
    ]);

    exportToCsv(`گزارش_موجودی_انبار_${Date.now()}`, headers, rows);
  };

  const handleSort = (field: keyof DetailedStockBalance) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Helper to get effective Reorder Point (نقطه سفارش) for any Part
  const getPartReorderPoint = (part?: Part, unit?: string, category?: string): number => {
    if (part && typeof part.minStock === 'number' && part.minStock > 0) {
      return part.minStock;
    }
    const effectiveUnit = part?.unit || unit || 'PCS';
    const effectiveCategory = part?.category || category || 'RAW_MATERIAL';
    if (effectiveUnit === 'KG' || effectiveCategory === 'RAW_MATERIAL') {
      return 3500; // Default 3,500 kg reorder threshold for coils/sheets
    }
    return 1000; // Default 1,000 pcs reorder threshold for components
  };

  // Master-Detail Part List with aggregated stock & Reorder Point status for PART_CARDEX mode
  const catalogPartsWithStock = useMemo(() => {
    const q = partSearchQuery.trim().toLowerCase();
    return parts
      .map(p => {
        const pBalances = balances.filter(b => b.partId === p.id || b.partCode === p.code);
        const physicalTotal = pBalances.reduce((s, b) => s + b.physicalQty, 0);
        const availableTotal = pBalances.reduce((s, b) => s + b.availableQty, 0);
        const lotsCount = pBalances.length;
        const reorderPoint = getPartReorderPoint(p);
        const needsPurchase = availableTotal < reorderPoint;
        const isCriticalShortage = availableTotal <= reorderPoint * 0.5;
        const isVIP = isPartVip(p, vipMap);
        const blockedTotal = pBalances.reduce((s, b) => s + (b.qualityBlockedQty || 0), 0);
        return {
          part: { ...p, isVIP, isPinned: isVIP },
          isVIP,
          physicalTotal,
          availableTotal,
          blockedTotal,
          lotsCount,
          balances: pBalances,
          reorderPoint,
          needsPurchase,
          isCriticalShortage,
        };
      })
      .filter(item => {
        if (onlyBelowReorderPoint && !item.needsPurchase) return false;
        if (!q) return true;
        return (
          item.part.name.toLowerCase().includes(q) ||
          item.part.code.toLowerCase().includes(q) ||
          (item.part.materialGrade && item.part.materialGrade.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        // Priority 1: VIP parts with shortage first!
        if (a.isVIP && a.needsPurchase && !(b.isVIP && b.needsPurchase)) return -1;
        if (b.isVIP && b.needsPurchase && !(a.isVIP && a.needsPurchase)) return 1;
        // Priority 2: VIP parts in general
        if (a.isVIP !== b.isVIP) return a.isVIP ? -1 : 1;
        // Priority 3: Any part needing purchase
        if (a.needsPurchase !== b.needsPurchase) return a.needsPurchase ? -1 : 1;
        return b.physicalTotal - a.physicalTotal;
      });
  }, [parts, balances, partSearchQuery, onlyBelowReorderPoint, vipMap]);

  const activeCardexPartSummary =
    catalogPartsWithStock.find(
      c => c.part.id === selectedCardexPartId || c.part.code === selectedCardexPartId
    ) || catalogPartsWithStock[0];

  // Compute chronological Cardex (ورود، خروج و مانده لحظه‌ای) for the selected part
  const selectedPartCardexRows = useMemo(() => {
    if (!activeCardexPartSummary) return [];
    const targetPart = activeCardexPartSummary.part;

    const matchingTx: Array<{
      id: string;
      docId: string;
      docNumber: string;
      docDate: string;
      docType: string;
      warehouseName: string;
      lotNumber: string;
      contractNumber: string;
      referenceNumber: string;
      inQty: number;
      outQty: number;
      unit: string;
      notes: string;
    }> = [];

    // Sort documents ascending by date to compute running balance accurately
    const sortedDocs = [...allDocuments]
      .filter(d => d.postingStatus === 'POSTED')
      .sort((a, b) => new Date(a.documentDate).getTime() - new Date(b.documentDate).getTime());

    for (const doc of sortedDocs) {
      for (const line of doc.lines || []) {
        if (line.partId !== targetPart.id && line.partCode !== targetPart.code) continue;
        const qty = Number(line.quantity) || 0;
        const docTypeStr = String(doc.documentType);
        const isReceipt =
          docTypeStr === 'OPENING_BALANCE' ||
          docTypeStr === 'RECEIPT_RAW_MATERIAL' ||
          docTypeStr === 'RECEIPT_FINISHED_GOODS' ||
          docTypeStr === 'PRODUCTION_RECEIPT' ||
          docTypeStr === 'RETURN_FROM_PRODUCTION';

        const isIssue =
          docTypeStr === 'ISSUE_RAW_MATERIAL' ||
          docTypeStr === 'ISSUE_FINISHED_GOODS' ||
          docTypeStr === 'DELIVERY_CUSTOMER' ||
          docTypeStr === 'SHIPMENT_CUSTOMER' ||
          docTypeStr === 'ISSUE_TO_PRODUCTION' ||
          docTypeStr === 'DELIVERY_TO_CUSTOMER';

        matchingTx.push({
          id: `${doc.id}-${line.id || line.lineNumber}`,
          docId: doc.id,
          docNumber: doc.documentNumber,
          docDate: doc.documentDate,
          docType: doc.documentType,
          warehouseName: doc.warehouseName,
          lotNumber: line.lotNumber || 'عمومی',
          contractNumber: line.contractNumber || doc.contractNumber || 'آزاد',
          referenceNumber: doc.referenceNumber || '—',
          inQty: isReceipt ? qty : 0,
          outQty: isIssue ? qty : 0,
          unit: line.unit || targetPart.unit,
          notes: line.notes || doc.auditNote || '',
        });
      }
    }

    let runningBalance = 0;
    const withRunning = matchingTx.map(tx => {
      runningBalance = Math.max(0, Number((runningBalance + tx.inQty - tx.outQty).toFixed(3)));
      return {
        ...tx,
        runningBalance,
      };
    });

    // Return newest first for display
    return withRunning.reverse();
  }, [activeCardexPartSummary, allDocuments]);

  const getDocTypeBadge = (docType: string) => {
    switch (docType) {
      case 'OPENING_BALANCE':
        return { label: 'موجودی اول دوره', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'RECEIPT_RAW_MATERIAL':
        return { label: 'رسید ورود به انبار', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'RECEIPT_FINISHED_GOODS':
      case 'PRODUCTION_RECEIPT':
        return { label: 'رسید تولید از خط', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'ISSUE_RAW_MATERIAL':
      case 'ISSUE_TO_PRODUCTION':
        return { label: 'حواله ارسال به خط تولید', color: 'bg-amber-50 text-amber-900 border-amber-200' };
      case 'ISSUE_FINISHED_GOODS':
      case 'DELIVERY_CUSTOMER':
      case 'SHIPMENT_CUSTOMER':
      case 'DELIVERY_TO_CUSTOMER':
        return { label: 'حواله تحویل به مشتری', color: 'bg-rose-50 text-rose-800 border-rose-200' };
      default:
        return { label: docType, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-slate-700" />
            <span>جستجو، استعلام موجودی و کاردکس اختصاصی هر کالا / ورق</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            انتخاب هر قطعه یا رول ورق جهت مشاهده همزمان «موجودی تفکیکی در انبارها» و «کاردکس کامل گردش ورود و خروج»
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {inquiryMode === 'ANALYTICAL_TABLE' && (
            <button
              type="button"
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>تنظیم ستون‌ها</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>دانلود اکسل (CSV)</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher Bar: Part Stock + Cardex vs Analytical Table vs Coil Slitting Genealogy */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2 shadow-2xs">
        <button
          type="button"
          onClick={() => setInquiryMode('PART_CARDEX')}
          className={`flex-1 min-w-[210px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            inquiryMode === 'PART_CARDEX'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4 text-amber-400" />
          <span>۱. فهرست قطعات + موجودی، نقطه سفارش و کاردکس</span>
        </button>

        <button
          type="button"
          onClick={() => setInquiryMode('ANALYTICAL_TABLE')}
          className={`flex-1 min-w-[210px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            inquiryMode === 'ANALYTICAL_TABLE'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>۲. جدول تحلیلی کل موجودی انبارها و نقطه سفارش</span>
        </button>

        <button
          type="button"
          onClick={() => setInquiryMode('COIL_SLITTING')}
          className={`flex-1 min-w-[210px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            inquiryMode === 'COIL_SLITTING'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <GitBranch className="w-4 h-4 text-indigo-400" />
          <span>۳. شجره‌نامه برش کلاف (Parent ➔ Child Slitting)</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* MODE 3: VISUAL COIL SLITTING GENEALOGY (شجره‌نامه برش کلاف)           */}
      {/* ==================================================================== */}
      {inquiryMode === 'COIL_SLITTING' ? (
        <CoilSlittingGenealogyPanel />
      ) : inquiryMode === 'PART_CARDEX' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Right Sidebar: Searchable List of Parts */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">فهرست قطعات، ورق‌ها و ملزومات</h3>
                <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                  {toPersianDigits(catalogPartsWithStock.length)} کالا
                </span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={partSearchQuery}
                  onChange={e => setPartSearchQuery(e.target.value)}
                  placeholder="جستجوی نام قطعه، کد کالا یا گرید ورق..."
                  className="w-full bg-white border border-slate-300 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-rose-700 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={onlyBelowReorderPoint}
                  onChange={e => setOnlyBelowReorderPoint(e.target.checked)}
                  className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                />
                <span>فقط اقلام زیر نقطه سفارش (نیاز به خرید)</span>
              </label>
            </div>

            <div className="max-h-[640px] overflow-y-auto divide-y divide-slate-100">
              {catalogPartsWithStock.map(item => {
                const isSelected =
                  activeCardexPartSummary?.part.id === item.part.id;
                return (
                  <button
                    key={item.part.id}
                    type="button"
                    onClick={() => setSelectedCardexPartId(item.part.id)}
                    className={`w-full text-right p-3.5 transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/90 border-r-4 border-amber-600'
                        : item.isVIP
                        ? 'bg-amber-50/35 hover:bg-amber-50/70 border-r-2 border-amber-400'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{item.part.name}</span>
                        {item.isVIP && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-extrabold">
                            <Pin className="w-2.5 h-2.5 fill-slate-950" />
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200">
                          {item.part.code}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {item.part.category === 'RAW_MATERIAL'
                            ? 'ماده اولیه / ورق'
                            : item.part.category === 'WIP_PART'
                            ? 'نیمه‌ساخته'
                            : 'محصول نهایی'}
                        </span>
                        {item.blockedTotal > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <Lock className="w-2.5 h-2.5" />
                            قرنطینه کیفی (QC Hold)
                          </span>
                        )}
                        {item.needsPurchase && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              item.isCriticalShortage
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                            title={`موجودی آزاد (${formatNumber(item.availableTotal)}) کمتر از نقطه سفارش (${formatNumber(item.reorderPoint)}) است`}
                          >
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                            {item.isVIP ? 'کسری اولویت اول (VIP)' : 'نیاز به خرید'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div
                        className={`text-xs font-mono font-bold ${
                          item.needsPurchase
                            ? item.isCriticalShortage
                              ? 'text-rose-600'
                              : 'text-amber-700'
                            : item.availableTotal > 0
                            ? 'text-emerald-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {formatNumber(item.availableTotal)}{' '}
                        <span className="text-[10px] font-sans">
                          {item.part.unit === 'KG' ? 'kg' : 'عدد'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        حداقل: {formatNumber(item.reorderPoint)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left Main Panel: Selected Part Stock Breakdown + Chronological Cardex */}
          <div className="lg:col-span-8 space-y-4">
            {activeCardexPartSummary ? (
              <>
                {/* Part Header & Total Stock KPIs */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded bg-slate-900 text-white font-mono text-xs font-bold">
                          {activeCardexPartSummary.part.code}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {activeCardexPartSummary.part.name}
                        </h3>
                        {activeCardexPartSummary.needsPurchase ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              activeCardexPartSummary.isCriticalShortage
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            نیاز به خرید (زیر نقطه سفارش: {formatNumber(activeCardexPartSummary.reorderPoint)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            موجودی ایمن (بالای نقطه سفارش: {formatNumber(activeCardexPartSummary.reorderPoint)})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        واحد سنجش:{' '}
                        <strong>
                          {activeCardexPartSummary.part.unit === 'KG' ? 'کیلوگرم (KG)' : 'عدد (PCS)'}
                        </strong>
                        {activeCardexPartSummary.part.materialGrade && (
                          <span>
                            {' '}
                            · جنس/گرید: <strong>{activeCardexPartSummary.part.materialGrade}</strong>
                          </span>
                        )}
                        {activeCardexPartSummary.part.thicknessMm && (
                          <span>
                            {' '}
                            · ضخامت: <strong>{activeCardexPartSummary.part.thicknessMm} mm</strong>
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl">
                      <div>
                        <span className="text-[11px] text-emerald-800 block">
                          موجودی قابل استفاده در کل انبارها:
                        </span>
                        <strong className="font-mono text-lg text-emerald-700">
                          {formatNumber(activeCardexPartSummary.availableTotal)}{' '}
                          <span className="text-xs font-sans">
                            {activeCardexPartSummary.part.unit === 'KG' ? 'کیلوگرم' : 'عدد'}
                          </span>
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Section A: Warehouse & Coil-Pack Balances for this Part */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-blue-600" />
                      <span>
                        الف) تفکیک موجودی فعلی این کالا در انبارها و کویل‌پک‌ها (
                        {toPersianDigits(activeCardexPartSummary.balances.length)} ردیف):
                      </span>
                    </h4>

                    {activeCardexPartSummary.balances.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                        در حال حاضر هیچ موجودی فعالی برای این قطعه در انبارها ثبت نشده است.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                              <th className="py-2.5 px-3">انبار و جایگاه</th>
                              <th className="py-2.5 px-3">شماره کویل‌پک / بچ</th>
                              <th className="py-2.5 px-3">قرارداد مرتبط</th>
                              <th className="py-2.5 px-3">مالکیت</th>
                              <th className="py-2.5 px-3">موجودی فیزیکی</th>
                              <th className="py-2.5 px-3 text-rose-700">قرنطینه کیفی</th>
                              <th className="py-2.5 px-3 text-emerald-700">
                                <span className="inline-flex items-center">
                                  <span>موجودی آزاد (ATP)</span>
                                  <FormulaTooltip
                                    title="فرمول موجودی آزاد قابل تخصیص (ATP)"
                                    formula="ATP = OnHand - Reserved - QCHold"
                                    description="هر کالایی که در وضعیت قرنطینه کیفی (QC Hold) قرار گیرد، بلافاصله از موجودی آزاد و محاسبات MRP کسر می‌گردد."
                                    badgeColor="emerald"
                                  />
                                </span>
                              </th>
                              <th className="py-2.5 px-3 text-center">کنترل کیفیت (QC Hold)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activeCardexPartSummary.balances.map(b => {
                              const isHeld = b.qualityBlockedQty > 0;
                              return (
                                <tr
                                  key={b.id}
                                  className={isHeld ? 'bg-rose-50/70 hover:bg-rose-50' : 'hover:bg-slate-50'}
                                >
                                  <td className="py-2.5 px-3 font-medium text-slate-900">
                                    {b.warehouseName}{' '}
                                    <span className="text-[10px] font-mono text-slate-400">
                                      ({b.locationCode})
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                    {b.lotNumber || 'عمومی'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-700">
                                    {b.contractNumber || 'آزاد'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {b.ownership === 'SAPCO_SUPPLIER_OWNED' ? (
                                      <span className="text-amber-800 font-semibold">امانی ساپکو</span>
                                    ) : (
                                      <span className="text-slate-700">ملکی شرکت</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                    {formatNumber(b.physicalQty)} {b.unit === 'KG' ? 'kg' : 'عدد'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                                    {b.qualityBlockedQty > 0
                                      ? `${formatNumber(b.qualityBlockedQty)} ${b.unit === 'KG' ? 'kg' : 'عدد'}`
                                      : '—'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                    {formatNumber(b.availableQty)} {b.unit === 'KG' ? 'kg' : 'عدد'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleQcHoldOnBalance(b)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border transition-colors cursor-pointer ${
                                        isHeld
                                          ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                                          : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                                      }`}
                                      title={
                                        isHeld
                                          ? 'کلیک جهت رفع قرنطینه کیفی و بازگشت به ATP'
                                          : 'قرنطینه کیفی این ردیف و کسر مستقیم از موجودی آزاد (ATP) در MRP'
                                      }
                                    >
                                      {isHeld ? <Unlock className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                      <span>{isHeld ? 'رفع قرنطینه (QC)' : 'قرنطینه کیفی / QC Hold'}</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section B: Chronological Stock Cardex (کاردکس جامع ورود و خروج قطعه) */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <History className="w-4 h-4 text-amber-600" />
                      <span>
                        ب) کاردکس رسمی گردش کالا (تاریخچه ورود، خروج و مانده لحظه‌ای «
                        {activeCardexPartSummary.part.name}»)
                      </span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      تعداد اسناد گردش:{' '}
                      <strong className="font-mono text-slate-900">
                        {toPersianDigits(selectedPartCardexRows.length)}
                      </strong>{' '}
                      تراکنش قطعی
                    </span>
                  </div>

                  {docsLoading ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      در حال بارگذاری کاردکس گردش کالا...
                    </div>
                  ) : selectedPartCardexRows.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      هنوز هیچ سند ورود یا خروجی برای این کالا در کاردکس ثبت نشده است.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="py-2.5 px-3">تاریخ و ساعت</th>
                            <th className="py-2.5 px-3">شماره سند</th>
                            <th className="py-2.5 px-3">نوع عملیات</th>
                            <th className="py-2.5 px-3">انبار</th>
                            <th className="py-2.5 px-3">کویل‌پک / بچ</th>
                            <th className="py-2.5 px-3 text-emerald-700">وارده (+)</th>
                            <th className="py-2.5 px-3 text-rose-700">صادره (-)</th>
                            <th className="py-2.5 px-3 bg-slate-100 font-bold text-slate-900">
                              مانده پس از سند
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedPartCardexRows.map(tx => {
                            const badge = getDocTypeBadge(tx.docType);
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                  {formatDateTime(tx.docDate)}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                  <div>{tx.docNumber}</div>
                                  {tx.referenceNumber !== '—' && (
                                    <div className="text-[10px] text-slate-500">
                                      مرجع: {tx.referenceNumber}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${badge.color}`}
                                  >
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-700">{tx.warehouseName}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-800">
                                  {tx.lotNumber}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                  {tx.inQty > 0 ? (
                                    <span className="flex items-center gap-0.5">
                                      <ArrowDownLeft className="w-3.5 h-3.5" />+
                                      {formatNumber(tx.inQty)}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                                  {tx.outQty > 0 ? (
                                    <span className="flex items-center gap-0.5">
                                      <ArrowUpRight className="w-3.5 h-3.5" />-
                                      {formatNumber(tx.outQty)}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 bg-slate-50/80">
                                  {formatNumber(tx.runningBalance)}{' '}
                                  <span className="text-[10px] font-normal text-slate-500">
                                    {tx.unit === 'KG' ? 'kg' : 'عدد'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <>

      {/* Column Visibility Customizer Drawer */}
      {showColumnPicker && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-800">انتخاب ستون‌های قابل نمایش در جدول موجودی:</span>
            <div className="flex items-center gap-2">
              {savedViewNotice && (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>نمای دلخواه شما ذخیره شد</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveViewPreferences}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-medium cursor-pointer"
              >
                ذخیره به عنوان پیش‌فرض من
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {[
              { key: 'partCode', label: 'کد کالا' },
              { key: 'partName', label: 'نام و مشخصات فنی' },
              { key: 'warehouse', label: 'انبار و جایگاه' },
              { key: 'lotNumber', label: 'کویل‌پک / ذوب' },
              { key: 'contract', label: 'شماره قرارداد' },
              { key: 'ownership', label: 'نوع مالکیت' },
              { key: 'physicalQty', label: 'موجودی فیزیکی' },
              { key: 'availableQty', label: 'موجودی قابل استفاده' },
              { key: 'reservedQty', label: 'رزرو شده' },
              { key: 'blockedQty', label: 'قرنطینه کیفی' },
              { key: 'physicalKg', label: 'وزن کل (کیلوگرم)' },
              { key: 'lastTx', label: 'تاریخ آخرین گردش' },
            ].map(col => (
              <label key={col.key} className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={(visibleCols as any)[col.key]}
                  onChange={e => setVisibleCols(prev => ({ ...prev, [col.key]: e.target.checked }))}
                  className="rounded border-slate-300 text-slate-900"
                />
                <span>{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500">موجودی فیزیکی کل (نتایج فیلترشده)</span>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {formatWeightKg(totalPhysicalKg)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500">موجودی قابل استفاده (آزاد جهت تولید)</span>
          <div className="text-lg font-bold text-emerald-700 mt-1 font-mono tabular-nums">
            {formatWeightKg(totalAvailableKg)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500">ورق و اقلام امانی ساپکو</span>
          <div className="text-lg font-bold text-amber-700 mt-1 font-mono tabular-nums">
            {formatWeightKg(totalSapcoKg)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500">رزرو شده جهت خطوط تولید</span>
          <div className="text-lg font-bold text-blue-700 mt-1 font-mono tabular-nums">
            {formatWeightKg(totalReservedKg)}
          </div>
        </div>
      </div>

      {/* Filter & Grouping Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجوی نام کالا، کد، کویل‌پک، شماره قرارداد..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900"
            />
          </div>

          {/* Part Filter */}
          <select
            value={selectedPartFilter}
            onChange={e => setSelectedPartFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900"
          >
            <option value="ALL">همه کالاها (ورق، پیچ و مهره، لاستیک، قطعه)</option>
            {parts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={selectedGradeFilter}
            onChange={e => {
              setSelectedGradeFilter(e.target.value);
              setSelectedLotFilter('ALL');
            }}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900"
          >
            <option value="ALL">همه جنس‌ها و گریدهای ورق</option>
            {grades.map(g => (
              <option key={g} value={g}>
                جنس / گرید ورق: {g}
              </option>
            ))}
          </select>

          {/* Dynamic Coil Pack Filter */}
          <select
            value={selectedLotFilter}
            onChange={e => setSelectedLotFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-slate-900"
          >
            <option value="ALL">همه کویل‌پک‌ها و بچ‌ها ({toPersianDigits(matchingPacksOrLots.length)})</option>
            {matchingPacksOrLots.map(lot => (
              <option key={lot} value={lot}>
                {lot}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Warehouse Filter */}
          <select
            value={selectedWarehouseFilter}
            onChange={e => setSelectedWarehouseFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900"
          >
            <option value="ALL">همه انبارهای کارخانه</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Contract Filter */}
          <select
            value={selectedContractFilter}
            onChange={e => setSelectedContractFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900"
          >
            <option value="ALL">همه قراردادها</option>
            {contractNumbers.map(cn => (
              <option key={cn} value={cn}>
                قرارداد: {cn}
              </option>
            ))}
          </select>

          {/* Ownership Filter */}
          <select
            value={selectedOwnershipFilter}
            onChange={e => setSelectedOwnershipFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-900"
          >
            <option value="ALL">همه انواع مالکیت</option>
            <option value="SAPCO_SUPPLIER_OWNED">فقط امانی ساپکو / مشتری</option>
            <option value="COMPANY_OWNED">فقط ملکی کارخانه کوثر</option>
          </select>

          {/* Grouping Selector */}
          <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200 rounded-lg px-3 py-1.5">
            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-[11px] font-semibold text-blue-900 whitespace-nowrap">گروه‌بندی:</span>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as StockGroupingKey)}
              className="w-full bg-transparent text-xs font-bold text-blue-950 focus:outline-none cursor-pointer"
            >
              <option value="NONE">بدون گروه‌بندی (لیست تفضیلی)</option>
              <option value="THICKNESS">بر اساس ضخامت ورق (mm)</option>
              <option value="GRADE">بر اساس جنس / گرید ورق</option>
              <option value="COIL_PACK">بر اساس شماره کویل‌پک</option>
              <option value="CONTRACT">بر اساس شماره قرارداد</option>
              <option value="PART">بر اساس نام کالا</option>
              <option value="WAREHOUSE">بر اساس انبار</option>
              <option value="OWNERSHIP">بر اساس نوع مالکیت</option>
            </select>
          </div>
        </div>

        {/* Dynamic Matching Coil Pack Quick Tags */}
        {matchingPacksOrLots.length > 0 &&
          (selectedPartFilter !== 'ALL' || selectedGradeFilter !== 'ALL' || selectedContractFilter !== 'ALL') && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 text-[11px]">
              <span className="text-slate-500 font-medium">کویل‌پک‌های موجود برای این فیلتر (کلیک جهت انتخاب):</span>
              {matchingPacksOrLots.map(lot => (
                <button
                  key={lot}
                  type="button"
                  onClick={() => setSelectedLotFilter(selectedLotFilter === lot ? 'ALL' : lot)}
                  className={`px-2.5 py-0.5 rounded-md font-mono text-[11px] transition-colors border cursor-pointer ${
                    selectedLotFilter === lot
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lot}
                </button>
              ))}
            </div>
          )}

        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={e => setOnlyAvailable(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span>فقط نمایش رول‌ها و کالاهای دارای موجودی قابل استفاده (&gt; 0)</span>
          </label>

          <div className="text-xs text-slate-500">
            تعداد رکوردهای منطبق: <strong className="text-slate-900 font-mono">{formatNumber(filteredBalances.length)}</strong>
          </div>
        </div>
      </div>

      {/* Grouped View OR Detailed Table View */}
      {groupBy !== 'NONE' ? (
        <div className="space-y-3">
          {groupedData.map(group => (
            <div key={group.groupKey} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <strong className="text-slate-900 text-sm">{group.groupTitle}</strong>
                  <span className="text-slate-500">
                    ({toPersianDigits(group.items.length)} ردیف موجودی
                    {group.coilsCount > 0 ? ` · ${toPersianDigits(group.coilsCount)} کویل/بچ` : ''})
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-slate-600">
                    وزن فیزیکی گروه: <strong className="text-slate-900">{formatWeightKg(group.totalPhysicalKg)}</strong>
                  </span>
                  <span className="text-emerald-700">
                    قابل استفاده: <strong>{formatWeightKg(group.totalAvailableKg)}</strong>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-white border-b border-slate-100 text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">کالا / ورق</th>
                      <th className="py-2.5 px-3">انبار و جایگاه</th>
                      <th className="py-2.5 px-3">شماره کویل‌پک / بچ</th>
                      <th className="py-2.5 px-3">شماره قرارداد</th>
                      <th className="py-2.5 px-3">موجودی فیزیکی</th>
                      <th className="py-2.5 px-3 text-emerald-700">موجودی قابل استفاده</th>
                      <th className="py-2.5 px-3">وزن کل (کیلوگرم)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {item.partName} <span className="text-slate-400 font-mono">({item.partCode})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.warehouseName} · <span className="font-mono">{item.locationCode}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                          {item.lotNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {item.contractNumber || 'آزاد'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 tabular-nums">
                          {formatNumber(item.physicalQty)} {item.unit === 'KG' ? 'kg' : 'عدد'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 tabular-nums">
                          {formatNumber(item.availableQty)} {item.unit === 'KG' ? 'kg' : 'عدد'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 tabular-nums">
                          {formatWeightKg(item.physicalKg)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Standard Table with Expandable Details */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                  <th className="py-3 px-3 w-8" />
                  {visibleCols.partCode && <th className="py-3 px-3">کد کالا</th>}
                  {visibleCols.partName && <th className="py-3 px-3">نام کالا و مشخصات فنی</th>}
                  {visibleCols.warehouse && <th className="py-3 px-3">انبار و جایگاه</th>}
                  {visibleCols.lotNumber && <th className="py-3 px-3">شماره کویل‌پک / ذوب</th>}
                  {visibleCols.contract && <th className="py-3 px-3">شماره قرارداد</th>}
                  {visibleCols.ownership && <th className="py-3 px-3">نوع مالکیت</th>}
                  {visibleCols.physicalQty && (
                    <th
                      onClick={() => handleSort('physicalQty')}
                      className="py-3 px-3 cursor-pointer hover:text-slate-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>موجودی فیزیکی</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  )}
                  {visibleCols.availableQty && (
                    <th
                      onClick={() => handleSort('availableQty')}
                      className="py-3 px-3 cursor-pointer hover:text-emerald-800 text-emerald-700"
                    >
                      <div className="flex items-center gap-1">
                        <span>موجودی قابل استفاده</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  )}
                  {visibleCols.reservedQty && <th className="py-3 px-3 text-blue-700">رزرو شده</th>}
                  {visibleCols.blockedQty && <th className="py-3 px-3 text-rose-700">قرنطینه کیفی</th>}
                  {visibleCols.physicalKg && (
                    <th
                      onClick={() => handleSort('physicalKg')}
                      className="py-3 px-3 cursor-pointer hover:text-slate-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>وزن کل (کیلوگرم)</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  )}
                  {visibleCols.lastTx && <th className="py-3 px-3">آخرین گردش</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {paginatedBalances.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-10 text-center text-slate-500">
                      <div className="font-semibold text-slate-700 mb-1">
                        هیچ موجودی منطبق با فیلترهای انتخابی یافت نشد.
                      </div>
                      <div className="text-[11px] text-slate-400">
                        پیشنهاد: فیلترهای بالا را روی «همه» قرار دهید یا از طریق دکمه «ثبت رسید کالا / رول» موجودی جدید وارد کنید.
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedBalances.map(item => {
                    const isExpanded = expandedRowId === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                          className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-3 text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </td>
                          {visibleCols.partCode && (
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">{item.partCode}</td>
                          )}
                          {visibleCols.partName && (
                            <td className="py-3 px-3 font-medium text-slate-900">
                              <div>{item.partName}</div>
                              {item.materialGrade && (
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  جنس {item.materialGrade}
                                  {item.thicknessMm ? ` · ضخامت ${item.thicknessMm} میلی‌متر` : ''}
                                </div>
                              )}
                            </td>
                          )}
                          {visibleCols.warehouse && (
                            <td className="py-3 px-3 text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>{item.warehouseName}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">{item.locationCode}</div>
                            </td>
                          )}
                          {visibleCols.lotNumber && (
                            <td className="py-3 px-3 font-mono">
                              {item.lotNumber ? (
                                <div>
                                  <div className="text-slate-900 font-semibold">{item.lotNumber}</div>
                                  {item.heatNumber && (
                                    <div className="text-[10px] text-slate-500">ذوب: {item.heatNumber}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          )}
                          {visibleCols.contract && (
                            <td className="py-3 px-3 font-mono text-slate-700">
                              {item.contractNumber || 'آزاد / عمومی'}
                            </td>
                          )}
                          {visibleCols.ownership && (
                            <td className="py-3 px-3 text-slate-700">
                              {item.ownership === 'SAPCO_SUPPLIER_OWNED' ? (
                                <span className="text-amber-800 font-semibold">امانی ساپکو</span>
                              ) : (
                                <span className="text-slate-700">ملکی شرکت</span>
                              )}
                            </td>
                          )}
                          {visibleCols.physicalQty && (
                            <td className="py-3 px-3 font-bold text-slate-900 font-mono tabular-nums">
                              {formatNumber(item.physicalQty)} <span className="text-[10px] font-normal text-slate-500">{item.unit === 'KG' ? 'kg' : 'عدد'}</span>
                            </td>
                          )}
                          {visibleCols.availableQty && (
                            <td className="py-3 px-3 font-bold text-emerald-700 font-mono tabular-nums">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>
                                  {formatNumber(item.availableQty)}{' '}
                                  <span className="text-[10px] font-normal text-emerald-600">
                                    {item.unit === 'KG' ? 'kg' : 'عدد'}
                                  </span>
                                </span>
                                {(() => {
                                  const matchedPart = parts.find(
                                    p => p.id === item.partId || p.code === item.partCode
                                  );
                                  const reorderThreshold = getPartReorderPoint(matchedPart, item.unit);
                                  if (item.availableQty < reorderThreshold) {
                                    const isCrit = item.availableQty <= reorderThreshold * 0.5;
                                    return (
                                      <span
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold border ${
                                          isCrit
                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                            : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}
                                        title={`نقطه سفارش: ${formatNumber(reorderThreshold)} ${item.unit === 'KG' ? 'kg' : 'عدد'}`}
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                        نیاز به خرید
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </td>
                          )}
                          {visibleCols.reservedQty && (
                            <td className="py-3 px-3 font-mono text-blue-700 tabular-nums">
                              {item.reservedQty > 0 ? formatNumber(item.reservedQty) : '—'}
                            </td>
                          )}
                          {visibleCols.blockedQty && (
                            <td className="py-3 px-3 font-mono text-rose-700 tabular-nums">
                              {item.qualityBlockedQty > 0 ? formatNumber(item.qualityBlockedQty) : '—'}
                            </td>
                          )}
                          {visibleCols.physicalKg && (
                            <td className="py-3 px-3 font-bold text-slate-800 font-mono tabular-nums">
                              {formatWeightKg(item.physicalKg)}
                            </td>
                          )}
                          {visibleCols.lastTx && (
                            <td className="py-3 px-3 text-slate-500 text-[11px] font-mono">
                              {formatDateTime(item.lastTransactionAt)}
                            </td>
                          )}
                          <td className="py-3 px-3 text-left" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleToggleQcHoldOnBalance(item)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border transition-colors cursor-pointer ${
                                item.qualityBlockedQty > 0
                                  ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                                  : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                              }`}
                            >
                              <ShieldAlert className="w-3 h-3" />
                              <span>{item.qualityBlockedQty > 0 ? 'رفع قرنطینه' : 'قرنطینه کیفی / QC Hold'}</span>
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Details Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90">
                            <td colSpan={13} className="p-4 border-t border-slate-200">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                  <span className="text-slate-500 block">تفکیک وضعیت موجودی این ردیف:</span>
                                  <div className="mt-1.5 space-y-1 font-mono">
                                    <div className="flex justify-between">
                                      <span>فیزیکی کل:</span>
                                      <strong>{formatNumber(item.physicalQty)} {item.unit}</strong>
                                    </div>
                                    <div className="flex justify-between text-emerald-700">
                                      <span>قابل استفاده (آزاد):</span>
                                      <strong>{formatNumber(item.availableQty)} {item.unit}</strong>
                                    </div>
                                    <div className="flex justify-between text-blue-700">
                                      <span>رزرو تولید:</span>
                                      <strong>{formatNumber(item.reservedQty)} {item.unit}</strong>
                                    </div>
                                    <div className="flex justify-between text-rose-700">
                                      <span>قرنطینه کیفی:</span>
                                      <strong>{formatNumber(item.qualityBlockedQty)} {item.unit}</strong>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                  <span className="text-slate-500 block">ردیابی کویل‌پک و ذوب:</span>
                                  <div className="mt-1.5 space-y-1">
                                    <div>
                                      کویل‌پک / بچ: <strong className="font-mono text-slate-900">{item.lotNumber || 'ثبت نشده'}</strong>
                                    </div>
                                    <div>
                                      شماره ذوب: <strong className="font-mono text-slate-900">{item.heatNumber || '—'}</strong>
                                    </div>
                                    <div>
                                      جنس و ضخامت: <strong>{item.materialGrade || '—'} {item.thicknessMm ? `(${item.thicknessMm} mm)` : ''}</strong>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                  <span className="text-slate-500 block">اطلاعات مالکیت و قرارداد:</span>
                                  <div className="mt-1.5 space-y-1">
                                    <div>
                                      مالکیت: <strong>{item.ownership === 'SAPCO_SUPPLIER_OWNED' ? 'امانی ساپکو / مشتری' : 'ملکی شرکت کوثر'}</strong>
                                    </div>
                                    <div>
                                      شماره قرارداد: <strong className="font-mono text-slate-900">{item.contractNumber || 'آزاد / بدون قرارداد'}</strong>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                  <span className="text-slate-500 block">موقعیت مکانی و آخرین گردش:</span>
                                  <div className="mt-1.5 space-y-1">
                                    <div>
                                      انبار: <strong>{item.warehouseName}</strong>
                                    </div>
                                    <div>
                                      جایگاه / پالت: <strong className="font-mono">{item.locationCode}</strong>
                                    </div>
                                    <div>
                                      آخرین سند: <span className="font-mono">{formatDateTime(item.lastTransactionAt)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  قبلی
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  بعدی
                </button>
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* Mandatory QC Hold Reason Modal (ثبت اجباری علت قرنطینه کیفی در انبار) */}
      {qcHoldTargetBalance && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setQcHoldTargetBalance(null)}
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
                    ثبت اجباری علت قرنطینه کیفی (QC Hold) — {qcHoldTargetBalance.partName}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    کویل‌پک / بچ: <span className="font-mono font-bold text-slate-700">{qcHoldTargetBalance.lotNumber || qcHoldTargetBalance.partCode}</span> | مقدار درگیر:{' '}
                    <span className="font-mono font-bold text-rose-700">
                      {formatNumber(qcHoldTargetBalance.physicalQty)} {qcHoldTargetBalance.unit}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQcHoldTargetBalance(null)}
                className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmStockQcHoldModal} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
                <strong>هشدار کنترل کیفیت و کسر از ATP:</strong> با فریز و قرنطینه کردن این ردیف، مقدار{' '}
                <strong className="font-mono">
                  {formatNumber(qcHoldTargetBalance.physicalQty)} {qcHoldTargetBalance.unit}
                </strong>{' '}
                بلافاصله از موجودی آزاد (ATP) در انبار و ماژول MRP کسر می‌گردد. ثبت علت دقیق قرنطینه جهت درج در لاگ حسابرسی (Audit Trail) اجباری است.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  انتخاب سریع از دلایل متداول عدم انطباق کیفی:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STOCK_QC_HOLD_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setQcHoldReasonText(preset);
                        setQcHoldReasonError('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] border transition cursor-pointer ${
                        qcHoldReasonText === preset
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
                  value={qcHoldReasonText}
                  onChange={e => {
                    setQcHoldReasonText(e.target.value);
                    if (e.target.value.trim()) setQcHoldReasonError('');
                  }}
                  placeholder="علت دقیق قرنطینه کیفی یا شماره گزارش عدم انطباق (NCR) را وارد نمایید..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                />
                {qcHoldReasonError && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1">{qcHoldReasonError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQcHoldTargetBalance(null)}
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
