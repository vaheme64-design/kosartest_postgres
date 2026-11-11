import React, { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  ClipboardCheck,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  PackageCheck,
  ShieldAlert,
  Boxes,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Lock,
  Pin,
  ShoppingCart,
  GitBranch,
  Plus,
  Trash2,
  X,
  Edit3,
} from 'lucide-react';
import {
  MrpRunResult,
  MrpMaterialRow,
  MrpPartRow,
  MoMaterialCheckResult,
} from '../../types/mrp';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { ReportModuleSkeleton } from '../common/Skeleton';
import { FormulaTooltip } from '../common/FormulaTooltip';
import { useEnterpriseUx } from '../../context/EnterpriseUxContext';
import {
  loadQcHoldMap,
  loadVipPartsMap,
  QcHoldRecord,
} from '../../utils/qcHoldStore';

interface TechDocResolution {
  partId: string;
  partCode: string;
  hasBom: boolean;
  hasRouting: boolean;
  materialGrade: string;
  thicknessMm: number;
  unitWeightKg: number;
  scrapAllowancePct: number;
  hardwareComponentName?: string;
  hardwareQtyPerUnit?: number;
  operations: Array<{
    stepCode: string;
    stepName: string;
    machineName: string;
    cycleTimeSec: number;
  }>;
  updatedAt: string;
}

interface IssuedPrRecord {
  prNumber: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  createdAt: string;
}

interface MrpModuleViewProps {
  onRefreshGlobal?: () => Promise<void>;
}

export const MrpModuleView: React.FC<MrpModuleViewProps> = ({ onRefreshGlobal }) => {
  const { requestConfirm, showUndoToast, recordAudit } = useEnterpriseUx();
  const [activeTab, setActiveTab] = useState<'materials' | 'pre_issue' | 'parts' | 'simulation'>('materials');
  const [rawMrpData, setMrpData] = useState<MrpRunResult | null>(null);
  const [qcHoldMap, setQcHoldMap] = useState<Record<string, QcHoldRecord>>(() => loadQcHoldMap());
  const [vipMap, setVipMap] = useState<Record<string, boolean>>(() => loadVipPartsMap());

  // Persisted Technical Docs Resolutions (BOM & Routing defined inline via MRP Drawer)
  const [techDocsMap, setTechDocsMap] = useState<Record<string, TechDocResolution>>(() => {
    try {
      const saved = localStorage.getItem('kpims_mrp_tech_docs_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persisted Purchase Requisitions (PR) issued for shortage rows
  const [issuedPrMap, setIssuedPrMap] = useState<Record<string, IssuedPrRecord>>(() => {
    try {
      const saved = localStorage.getItem('kpims_mrp_issued_prs_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Inline Slide-Over Drawer State for defining BOM / Routing directly inside MRP
  const [bomRoutingDrawerPart, setBomRoutingDrawerPart] = useState<MrpPartRow | null>(null);
  const [drawerFocusSection, setDrawerFocusSection] = useState<'BOM' | 'ROUTING'>('BOM');
  const [drawerBomGrade, setDrawerBomGrade] = useState<string>('DC04');
  const [drawerBomThickness, setDrawerBomThickness] = useState<string>('1.2');
  const [drawerBomUnitWeight, setDrawerBomUnitWeight] = useState<string>('1.45');
  const [drawerBomScrapPct, setDrawerBomScrapPct] = useState<string>('12');
  const [drawerBomHardware, setDrawerBomHardware] = useState<string>('مهره جوشی چهارگوش M8 DIN 928');
  const [drawerBomHardwareQty, setDrawerBomHardwareQty] = useState<string>('2');
  const [drawerOps, setDrawerOps] = useState<
    Array<{ stepCode: string; stepName: string; machineName: string; cycleTimeSec: number }>
  >([
    { stepCode: 'OP-10', stepName: 'برش ورق و بلنک‌زنی اولیه', machineName: 'قیچی گیوتین ۶ متری ۱', cycleTimeSec: 6 },
    { stepCode: 'OP-20', stepName: 'کشش عمیق و فرم‌دهی اصلی', machineName: 'پرس هیدرولیک ۴۰۰ تن ۱', cycleTimeSec: 12 },
    { stepCode: 'OP-30', stepName: 'پانچ، دوربری و کالیبره نهایی', machineName: 'پرس ضربه‌ای ۲۵۰ تن ۱', cycleTimeSec: 10 },
  ]);

  // Simulation Parameters
  const [simGrowth, setSimGrowth] = useState<number>(0);
  const [simHorizon, setSimHorizon] = useState<number>(30);
  const [simIncludeWip, setSimIncludeWip] = useState<boolean>(true);
  const [simIncludeConsignment, setSimIncludeConsignment] = useState<boolean>(true);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const onHold = () => {
      setQcHoldMap(loadQcHoldMap());
    };
    const onVip = () => {
      setVipMap(loadVipPartsMap());
    };
    window.addEventListener('kpims-qc-hold-changed', onHold);
    window.addEventListener('kpims-vip-parts-changed', onVip);
    return () => {
      window.removeEventListener('kpims-qc-hold-changed', onHold);
      window.removeEventListener('kpims-vip-parts-changed', onVip);
    };
  }, []);

  // Dynamically recompute MRP ATP, VIP priority, and Inline BOM/Routing Resolutions
  const mrpData = React.useMemo<MrpRunResult | null>(() => {
    if (!rawMrpData) return null;

    const updatedParts = rawMrpData.parts
      .map(p => {
        const isVIP = Boolean(p.isVIP || vipMap[p.partId] || vipMap[p.partCode]);
        const resolvedDoc = techDocsMap[p.partId] || techDocsMap[p.partCode];
        const partHoldQty = Object.values(qcHoldMap)
          .filter(h => h.isHeld && (h.partId === p.partId || h.partCode === p.partCode))
          .reduce((s, h) => s + (h.heldQty || 0), 0);
        const effectiveFgStock = Math.max(0, p.coveredByFgStock - partHoldQty);
        const netRequirement = Math.max(
          0,
          p.grossDemand - effectiveFgStock - p.coveredByWip - p.coveredByActiveMos
        );
        return {
          ...p,
          isVIP,
          hasBom: Boolean(p.hasBom || resolvedDoc?.hasBom),
          hasRouting: Boolean(p.hasRouting || resolvedDoc?.hasRouting),
          coveredByFgStock: effectiveFgStock,
          netRequirement,
        };
      })
      .sort((a, b) => {
        if (Boolean(a.isVIP) !== Boolean(b.isVIP)) return a.isVIP ? -1 : 1;
        return b.netRequirement - a.netRequirement;
      });

    const updatedMaterials = rawMrpData.materials.map(m => {
      const extraHoldKg = Object.values(qcHoldMap)
        .filter(h => {
          if (!h.isHeld) return false;
          const matchCode = h.partCode === m.materialCode || (h.lotNumber && m.matchingCoils?.some(c => c.coilNumber === h.lotNumber || c.coilId === h.key));
          const matchName = h.partName && m.materialGrade && h.partName.toLowerCase().includes(m.materialGrade.toLowerCase());
          return Boolean(matchCode || matchName);
        })
        .reduce((s, h) => s + (h.heldWeightKg || h.heldQty || 0), 0);

      const effectiveQuarantined = Math.max(m.onHandQuarantined || 0, extraHoldKg);
      const totalPhysical = (m.onHandOwned || 0) + (simIncludeConsignment ? m.onHandConsignment || 0 : 0);
      // Direct subtraction of QC Hold (onHandQuarantined) from Free Available (ATP):
      const netAvailable = Math.max(0, totalPhysical - (m.reservedActive || 0) - effectiveQuarantined);
      const shortageQuantity = Math.max(0, Math.round((m.requiredWeightKg - netAvailable) * 10) / 10);
      const coveredByContract = Math.min(shortageQuantity, m.openContractQuantity || 0);
      const hardShortageQuantity = Math.max(0, Math.round((shortageQuantity - coveredByContract) * 10) / 10);

      let severity: MrpMaterialRow['severity'] = 'OK';
      if (shortageQuantity > 0) {
        severity = hardShortageQuantity === 0 ? 'SHORTAGE_COVERED_BY_CONTRACT' : 'HARD_SHORTAGE';
      }

      return {
        ...m,
        onHandQuarantined: effectiveQuarantined,
        netAvailable,
        shortageQuantity,
        coveredByContract,
        hardShortageQuantity,
        severity,
      };
    });

    updatedMaterials.sort((a, b) => {
      const aVip = a.demandedByParts.some(dp => vipMap[dp.partId] || vipMap[dp.partCode]);
      const bVip = b.demandedByParts.some(dp => vipMap[dp.partId] || vipMap[dp.partCode]);
      if (aVip && a.severity !== 'OK' && !(bVip && b.severity !== 'OK')) return -1;
      if (bVip && b.severity !== 'OK' && !(aVip && a.severity !== 'OK')) return 1;
      const sevScore = { HARD_SHORTAGE: 3, SHORTAGE_COVERED_BY_CONTRACT: 2, OK: 1 };
      return sevScore[b.severity] - sevScore[a.severity] || b.shortageQuantity - a.shortageQuantity;
    });

    return {
      ...rawMrpData,
      parts: updatedParts,
      materials: updatedMaterials,
      summary: {
        ...rawMrpData.summary,
        ok: updatedMaterials.filter(m => m.severity === 'OK').length,
        contractCovered: updatedMaterials.filter(m => m.severity === 'SHORTAGE_COVERED_BY_CONTRACT').length,
        hardShortages: updatedMaterials.filter(m => m.severity === 'HARD_SHORTAGE').length,
        totalShortageWeightKg: updatedMaterials.reduce((s, m) => s + m.hardShortageQuantity, 0),
      },
    };
  }, [rawMrpData, qcHoldMap, vipMap, simIncludeConsignment, techDocsMap]);

  // Open Inline Slide-Over Drawer for defining missing BOM or Routing without leaving MRP
  const handleOpenBomRoutingDrawer = (part: MrpPartRow, section: 'BOM' | 'ROUTING') => {
    const existing = techDocsMap[part.partId] || techDocsMap[part.partCode];
    setBomRoutingDrawerPart(part);
    setDrawerFocusSection(section);
    setDrawerBomGrade(existing?.materialGrade || (part.partName.includes('گالوانیزه') ? 'DX51D' : 'DC04'));
    setDrawerBomThickness(String(existing?.thicknessMm || 1.2));
    setDrawerBomUnitWeight(String(existing?.unitWeightKg || 1.45));
    setDrawerBomScrapPct(String(existing?.scrapAllowancePct || 12));
    setDrawerBomHardware(existing?.hardwareComponentName || 'مهره جوشی چهارگوش M8 DIN 928');
    setDrawerBomHardwareQty(String(existing?.hardwareQtyPerUnit ?? 2));
    if (existing?.operations && existing.operations.length > 0) {
      setDrawerOps(existing.operations);
    } else {
      setDrawerOps([
        { stepCode: 'OP-10', stepName: 'برش ورق و بلنک‌زنی اولیه', machineName: 'قیچی گیوتین ۶ متری ۱', cycleTimeSec: 6 },
        { stepCode: 'OP-20', stepName: `کشش و فرم‌دهی ${part.partName}`, machineName: 'پرس هیدرولیک ۴۰۰ تن ۱', cycleTimeSec: 12 },
        { stepCode: 'OP-30', stepName: 'پانچ، خم نهایی و کنترل کیفیت', machineName: 'پرس ضربه‌ای ۲۵۰ تن ۱', cycleTimeSec: 10 },
      ]);
    }
  };

  const handleSaveBomRoutingFromDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomRoutingDrawerPart) return;
    const prevDocs = { ...techDocsMap };
    const resolution: TechDocResolution = {
      partId: bomRoutingDrawerPart.partId,
      partCode: bomRoutingDrawerPart.partCode,
      hasBom: true,
      hasRouting: drawerOps.length > 0,
      materialGrade: drawerBomGrade,
      thicknessMm: Math.max(0.4, parseFloat(drawerBomThickness) || 1.2),
      unitWeightKg: Math.max(0.05, parseFloat(drawerBomUnitWeight) || 1.2),
      scrapAllowancePct: Math.max(0, parseFloat(drawerBomScrapPct) || 10),
      hardwareComponentName: drawerBomHardware,
      hardwareQtyPerUnit: Math.max(0, parseInt(drawerBomHardwareQty, 10) || 0),
      operations: drawerOps,
      updatedAt: new Date().toLocaleString('fa-IR'),
    };

    const nextDocs = {
      ...techDocsMap,
      [bomRoutingDrawerPart.partId]: resolution,
      [bomRoutingDrawerPart.partCode]: resolution,
    };
    setTechDocsMap(nextDocs);
    try {
      localStorage.setItem('kpims_mrp_tech_docs_v1', JSON.stringify(nextDocs));
    } catch {
      // ignore
    }

    // Also persist to backend APIs if available
    try {
      await Promise.all([
        fetch('/api/parts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: bomRoutingDrawerPart.partId,
            code: bomRoutingDrawerPart.partCode,
            name: bomRoutingDrawerPart.partName,
            category: 'FINISHED_GOOD',
            unit: 'PCS',
            materialGrade: resolution.materialGrade,
            thicknessMm: resolution.thicknessMm,
            weightPerUnitKg: resolution.unitWeightKg,
          }),
        }).catch(() => {}),
        fetch('/api/routings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partId: bomRoutingDrawerPart.partId,
            partCode: bomRoutingDrawerPart.partCode,
            partName: bomRoutingDrawerPart.partName,
            operations: resolution.operations.map((op, i) => ({
              stepNumber: (i + 1) * 10,
              stepCode: op.stepCode,
              stepName: op.stepName,
              processType: i === 0 ? 'SHEARING' : 'STAMPING',
              machineName: op.machineName,
              standardCycleTimeSec: op.cycleTimeSec,
            })),
          }),
        }).catch(() => {}),
      ]);
      if (onRefreshGlobal) await onRefreshGlobal();
    } catch {
      // local state updated
    }

    const savedPartName = bomRoutingDrawerPart.partName;
    const savedPartCode = bomRoutingDrawerPart.partCode;
    setBomRoutingDrawerPart(null);

    recordAudit({
      actionType: 'UPDATE',
      module: 'ماژول برنامه‌ریزی و MRP (رفع بن‌بست فنی)',
      entityId: resolution.partId,
      entityCode: savedPartCode,
      summaryFa: `تعریف و تایید درجا (Inline) درخت محصول (BOM: ورق ${resolution.materialGrade} ضخامت ${resolution.thicknessMm}mm) و مسیر تولید (${resolution.operations.length} ایستگاه OP) برای «${savedPartName}»`,
    });

    showUndoToast({
      title: `BOM و مسیر تولید «${savedPartName}» ثبت و تأیید شد`,
      description: 'وضعیت مستندات فنی در جدول تقاضای قطعات بدون خروج از MRP به «تأییدشده» تغییر یافت.',
      variant: 'success',
      onUndo: () => {
        setTechDocsMap(prevDocs);
        try {
          localStorage.setItem('kpims_mrp_tech_docs_v1', JSON.stringify(prevDocs));
        } catch {
          // ignore
        }
      },
    });
  };

  // Issue Purchase Requisition (PR) for a material row with shortage (🛒 صدور درخواست خرید)
  const handleIssuePurchaseRequisition = (
    materialCode: string,
    materialName: string,
    shortageQty: number,
    unit: string = 'kg',
    grade?: string
  ) => {
    const reqQty = Math.max(100, Math.ceil(shortageQty));
    requestConfirm({
      title: `صدور درخواست خرید رسمی (PR) — «${materialName}»`,
      description: `آیا از صدور درخواست خرید (Purchase Requisition) به مقدار ${formatNumber(reqQty)} ${unit} برای جبران کسری موجودی «${materialName}» اطمینان دارید؟`,
      consequences: [
        `ثبت سند رسمی درخواست خرید (PR) به مقدار ${formatNumber(reqQty)} ${unit} و ارسال به واحد بازرگانی / تامین ساپکو`,
        `رزرو سفارش خرید در موازنه نیازمندی‌های مواد (MRP) برای جلوگیری از توقف خط پرس`,
        'ثبت رویداد در لاگ ممیزی (Audit Trail) با قابلیت لغو فوری (Undo)',
      ],
      confirmLabel: 'تأیید و صدور درخواست خرید (PR)',
      variant: 'indigo',
      onConfirm: () => {
        const prevPrs = { ...issuedPrMap };
        const prNumber = `PR-1404-${Math.floor(1000 + Math.random() * 8999)}`;
        const newPr: IssuedPrRecord = {
          prNumber,
          materialCode,
          materialName,
          quantity: reqQty,
          unit,
          createdAt: new Date().toLocaleString('fa-IR'),
        };
        const nextPrs = { ...issuedPrMap, [materialCode]: newPr };
        setIssuedPrMap(nextPrs);
        try {
          localStorage.setItem('kpims_mrp_issued_prs_v1', JSON.stringify(nextPrs));
        } catch {
          // ignore
        }

        recordAudit({
          actionType: 'CREATE',
          module: 'ماژول برنامه‌ریزی و MRP (تدارکات و خرید)',
          entityId: prNumber,
          entityCode: materialCode,
          summaryFa: `صدور درخواست خرید (${prNumber}) برای «${materialName}» (${grade || materialCode}) به مقدار ${formatNumber(reqQty)} ${unit}`,
        });

        setNotice(
          `درخواست خرید شماره ${prNumber} برای «${materialName}» به مقدار ${formatNumber(reqQty)} ${unit} با موفقیت صادر و به واحد تدارکات/ساپکو ارسال شد.`
        );

        showUndoToast({
          title: `🛒 درخواست خرید ${prNumber} صادر شد`,
          description: `مقدار ${formatNumber(reqQty)} ${unit} «${materialName}» در صف تامین بازرگانی ثبت گردید.`,
          variant: 'success',
          onUndo: () => {
            setIssuedPrMap(prevPrs);
            try {
              localStorage.setItem('kpims_mrp_issued_prs_v1', JSON.stringify(prevPrs));
            } catch {
              // ignore
            }
          },
        });
      },
    });
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters for materials table
  const [materialSearch, setMaterialSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'HARD_SHORTAGE' | 'SHORTAGE_COVERED_BY_CONTRACT' | 'OK'>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');

  // Pre-Issue Check State
  const [moList, setMoList] = useState<{ id: string; moNumber: string; partCode: string; partName: string; targetQuantity: number; status: string }[]>([]);
  const [selectedMoId, setSelectedMoId] = useState<string>('');
  const [moCheckResult, setMoCheckResult] = useState<MoMaterialCheckResult | null>(null);
  const [checkingMo, setCheckingMo] = useState(false);
  const [reservingMo, setReservingMo] = useState(false);

  // Detail Modal / Popover for parts demanded
  const [expandedMaterialCode, setExpandedMaterialCode] = useState<string | null>(null);

  const loadMrp = useCallback(async (params?: { growth?: number; horizon?: number; includeWip?: boolean; includeConsignment?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (params?.growth !== undefined) q.append('growth', String(params.growth));
      if (params?.horizon !== undefined) q.append('horizonDays', String(params.horizon));
      if (params?.includeWip !== undefined) q.append('includeWip', String(params.includeWip));
      if (params?.includeConsignment !== undefined) q.append('includeConsignment', String(params.includeConsignment));

      const res = await fetch(`/api/mrp/run?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setMrpData(json.data);
      } else {
        setError(json.error || 'خطا در بارگذاری محاسبات MRP');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoList = useCallback(async () => {
    try {
      const res = await fetch('/api/mrp/mos');
      const json = await res.json();
      if (json.success && json.data) {
        setMoList(json.data);
        if (json.data.length > 0 && !selectedMoId) {
          setSelectedMoId(json.data[0].id);
        }
      }
    } catch {
      // ignore
    }
  }, [selectedMoId]);

  useEffect(() => {
    loadMrp();
    loadMoList();
  }, [loadMrp, loadMoList]);

  // Run Pre-issue check when selected MO changes
  const runMoCheck = async (moIdToTest?: string) => {
    const targetId = moIdToTest || selectedMoId;
    if (!targetId) return;
    setCheckingMo(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/mrp/mos/${encodeURIComponent(targetId)}/check`);
      const json = await res.json();
      if (json.success && json.data) {
        setMoCheckResult(json.data);
      } else {
        setError(json.error || 'خطا در بررسی مواد دستور کار');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در بررسی مواد');
    } finally {
      setCheckingMo(false);
    }
  };

  useEffect(() => {
    if (selectedMoId && activeTab === 'pre_issue') {
      runMoCheck(selectedMoId);
    }
  }, [selectedMoId, activeTab]);

  const handleAutoReserve = async () => {
    if (!selectedMoId) return;
    setReservingMo(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/mrp/mos/${encodeURIComponent(selectedMoId)}/reserve`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        const count = json.data?.reserved?.length || 0;
        setNotice(`موجودی آزاد با موفقیت برای دستور کار ${json.data?.moNumber} رزرو شد (${toPersianDigits(count)} ردیف رزرو جدید).`);
        await runMoCheck(selectedMoId);
        await loadMrp();
        if (onRefreshGlobal) await onRefreshGlobal();
      } else {
        setError(json.error || 'خطا در رزرو خودکار مواد');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در انجام عملیات رزرو');
    } finally {
      setReservingMo(false);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setError(null);
    try {
      await loadMrp({
        growth: simGrowth,
        horizon: simHorizon,
        includeWip: simIncludeWip,
        includeConsignment: simIncludeConsignment,
      });
      setActiveTab('materials');
    } finally {
      setSimulating(false);
    }
  };

  const handleExportCsv = () => {
    if (!mrpData) return;
    const headers = [
      'کد ماده اولیه',
      'عنوان ماده',
      'گرید',
      'ضخامت (mm)',
      'واحد',
      'نیاز کل ناخالص',
      'نیاز وزنی (kg)',
      'موجودی ملکی',
      'موجودی امانی ساپکو',
      'قرنطینه کیفی',
      'رزرو فعال',
      'موجودی خالص آزاد (ATP)',
      'قرارداد باز ساپکو',
      'کسری کل',
      'پوشش با قرارداد',
      'کسری قطعی',
      'وضعیت نهایی',
    ];

    const rows = mrpData.materials.map(m => [
      m.materialCode,
      `"${m.materialName.replace(/"/g, '""')}"`,
      m.materialGrade,
      m.thicknessMm,
      m.unitCode,
      m.requiredQuantity,
      m.requiredWeightKg,
      m.onHandOwned,
      m.onHandConsignment,
      m.onHandQuarantined,
      m.reservedActive,
      m.netAvailable,
      m.openContractQuantity,
      m.shortageQuantity,
      m.coveredByContract,
      m.hardShortageQuantity,
      m.severity === 'OK' ? 'پوشش کامل' : m.severity === 'SHORTAGE_COVERED_BY_CONTRACT' ? 'پوشش با قرارداد' : 'کسری قطعی',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MRP_Material_Forecast_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered materials
  const filteredMaterials = (mrpData?.materials || []).filter(m => {
    if (severityFilter !== 'ALL' && m.severity !== severityFilter) return false;
    if (gradeFilter !== 'ALL' && !m.materialGrade.toLowerCase().includes(gradeFilter.toLowerCase())) return false;
    if (materialSearch.trim()) {
      const q = materialSearch.toLowerCase();
      const matchCode = m.materialCode.toLowerCase().includes(q);
      const matchName = m.materialName.toLowerCase().includes(q);
      const matchGrade = m.materialGrade.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchGrade) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Unified Light Header & Dropdown List Selector */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
              <Calculator className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                پیش‌بینی نیازمندی مواد و موازنه کلاف (MRP)
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ATP & BOM Explosion
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                انفجار درخت محصول (BOM)، کسر موجودی آزاد ملکی و امانی ساپکو، حذف قرنطینه و پیش‌بینی پوشش قراردادها
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {mrpData && (
              <div className="text-[11px] text-slate-500 font-mono hidden lg:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>آخرین محاسبه:</span>
                <span className="text-slate-900 font-bold">{mrpData.ranAtFa}</span>
              </div>
            )}

            <button
              onClick={() => loadMrp()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>محاسبه مجدد</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={!mrpData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>خروجی اکسل</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ رسمی</span>
            </button>
          </div>
        </div>

        {/* Unified Dropdown List Selector + Quick Chips */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-semibold text-slate-500">زیربخش MRP:</span>
              <select
                value={activeTab}
                onChange={e => setActiveTab(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-1 pl-4 py-0.5"
              >
                <option value="materials">۱. موازنه و کسری مواد اولیه و کلاف‌ها ({toPersianDigits(mrpData?.materials.length || 0)})</option>
                <option value="pre_issue">۲. بررسی پیش از حواله دستور کار (Pre-Issue ATP)</option>
                <option value="parts">۳. موازنه تقاضای قطعات خودرویی ({toPersianDigits(mrpData?.parts.length || 0)})</option>
                <option value="simulation">۴. شبیه‌ساز سناریوی تقاضا (What-If)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'materials', label: 'موازنه کلاف‌ها' },
                { id: 'pre_issue', label: 'کنترل پیش از حواله (ATP)' },
                { id: 'parts', label: 'تقاضای قطعات' },
                { id: 'simulation', label: 'شبیه‌ساز What-If' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer border ${
                    activeTab === t.id
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
                      : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error & Notice Banners */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 text-xs cursor-pointer">بستن</button>
        </div>
      )}

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-800 text-xs cursor-pointer">بستن</button>
        </div>
      )}

      {/* Skeleton Loading State */}
      {loading && !mrpData && (
        <ReportModuleSkeleton kpiCount={6} showChart={false} tableRows={6} tableColumns={9} theme="light" />
      )}

      {/* KPI Cards Summary */}
      {mrpData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 text-right shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold block font-sans">تعداد مواد و کلاف‌ها</span>
            <div className="text-xl font-black text-slate-900 font-mono mt-1">
              {toPersianDigits(mrpData.summary.materialsConsidered)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">اقلام فعال در BOM</span>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-3.5 text-right shadow-2xs">
            <span className="text-[11px] text-emerald-700 font-semibold block font-sans flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              پوشش کامل با موجودی
            </span>
            <div className="text-xl font-black text-emerald-700 font-mono mt-1">
              {toPersianDigits(mrpData.summary.ok)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">تأمین تضمین‌شده</span>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl p-3.5 text-right shadow-2xs">
            <span className="text-[11px] text-amber-700 font-semibold block font-sans flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              پوشش با قرارداد باز
            </span>
            <div className="text-xl font-black text-amber-700 font-mono mt-1">
              {toPersianDigits(mrpData.summary.contractCovered)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">در انتظار تحویل سهمیه</span>
          </div>

          <div className="bg-white border border-rose-200 rounded-xl p-3.5 text-right shadow-2xs">
            <span className="text-[11px] text-rose-700 font-semibold block font-sans flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              کسری قطعی مواد
            </span>
            <div className="text-xl font-black text-rose-600 font-mono mt-1">
              {toPersianDigits(mrpData.summary.hardShortages)}
            </div>
            <span className="text-[10px] text-rose-600 mt-1 block font-bold">هشدار توقف پرس</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 text-right shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold block font-sans">کل وزن ناخالص مواد</span>
            <div className="text-lg font-black text-slate-900 font-mono mt-1">
              {formatNumber(mrpData.summary.totalGrossWeightKg)} <span className="text-xs font-normal text-slate-500">kg</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">شامل نرم ضایعات</span>
          </div>

          <div className="bg-white border border-rose-200 rounded-xl p-3.5 text-right shadow-2xs">
            <span className="text-[11px] text-rose-700 font-semibold block font-sans">کسری وزنی کل کلاف‌ها</span>
            <div className="text-lg font-black text-rose-600 font-mono mt-1">
              {formatNumber(mrpData.summary.totalShortageWeightKg)} <span className="text-xs font-normal text-rose-600">kg</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">نیاز به خرید / حواله</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 1: MATERIALS NETTING MATRIX
          ========================================================================= */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در کد، نام کلاف یا گرید..."
                  value={materialSearch}
                  onChange={e => setMaterialSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">همه گریدها</option>
                <option value="DC04">DC04 (کشش عمیق)</option>
                <option value="ST14">ST14 (روغنی فرم‌دهی)</option>
                <option value="DX51">DX51D (گالوانیزه)</option>
                <option value="ST37">ST37 (شیت سیاه)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] text-slate-400 font-sans ml-1">فیلتر وضعیت:</span>
              <button
                onClick={() => setSeverityFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition ${
                  severityFilter === 'ALL'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                همه ({toPersianDigits(mrpData?.materials.length || 0)})
              </button>

              <button
                onClick={() => setSeverityFilter('HARD_SHORTAGE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1 ${
                  severityFilter === 'HARD_SHORTAGE'
                    ? 'bg-rose-500 text-white font-bold'
                    : 'bg-slate-50 text-rose-600 hover:bg-rose-50 border border-rose-200'
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                کسری قطعی ({toPersianDigits(mrpData?.summary.hardShortages || 0)})
              </button>

              <button
                onClick={() => setSeverityFilter('SHORTAGE_COVERED_BY_CONTRACT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1 ${
                  severityFilter === 'SHORTAGE_COVERED_BY_CONTRACT'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-50 text-amber-700 hover:bg-amber-50 border border-amber-200'
                }`}
              >
                <Info className="w-3 h-3" />
                پوشش با قرارداد ({toPersianDigits(mrpData?.summary.contractCovered || 0)})
              </button>

              <button
                onClick={() => setSeverityFilter('OK')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1 ${
                  severityFilter === 'OK'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                کافی ({toPersianDigits(mrpData?.summary.ok || 0)})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl printable-area">
            {/* Print Header shown only during print */}
            <div className="hidden print:block p-4 border-b border-slate-300 text-center">
              <span className="text-xs text-slate-600 block">شرکت تولیدی قطعات خودرو (زنجیره تامین ساپکو)</span>
              <h2 className="text-base font-bold text-slate-900 mt-1">گزارش رسمی پیش‌بینی نیازمندی مواد و موازنه کلاف (MRP)</h2>
              <span className="text-[10px] text-slate-500 font-mono">تاریخ موازنه: {mrpData?.ranAtFa || 'امروز'}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold text-[11px]">
                  <tr>
                    <th className="py-3 px-3">کد و عنوان ماده اولیه</th>
                    <th className="py-3 px-3 text-center">گرید و ضخامت</th>
                    <th className="py-3 px-3 text-center text-indigo-700 font-bold">
                      <span className="inline-flex items-center">
                        <span>نیاز کل (kg)</span>
                        <FormulaTooltip
                          title="فرمول نیاز ناخالص ماده اولیه (BOM Explosion)"
                          formula="GrossKg = Σ (NetPartDemand × UnitWeight × (1 + ScrapPct))"
                          description="حاصل‌ضرب نیاز خالص تولید هر قطعه در وزن استاندارد واحد به علاوه ضریب پرت و ضایعات مصوب."
                          badgeColor="indigo"
                        />
                      </span>
                    </th>
                    <th className="py-3 px-3 text-center text-slate-800">موجودی ملکی</th>
                    <th className="py-3 px-3 text-center text-emerald-700">امانی ساپکو</th>
                    <th className="py-3 px-3 text-center text-rose-600">قرنطینه (QC Hold)</th>
                    <th className="py-3 px-3 text-center text-amber-700">رزرو فعال</th>
                    <th className="py-3 px-3 text-center text-emerald-800 font-bold">
                      <span className="inline-flex items-center">
                        <span>موجودی آزاد (ATP)</span>
                        <FormulaTooltip
                          title="فرمول موجودی آزاد قابل برنامه‌ریزی (ATP)"
                          formula="ATP = (Owned + Consignment) - Reserved - QCHold"
                          description="هر کالا یا رول ورقی که در قرنطینه کیفی (QC Hold) قرار گیرد، مستقیماً از موجودی آزاد (ATP) کسر شده و در تولید لحاظ نمی‌گردد."
                          badgeColor="emerald"
                        />
                      </span>
                    </th>
                    <th className="py-3 px-3 text-center text-indigo-700">قرارداد باز</th>
                    <th className="py-3 px-3 text-center text-rose-700 font-black">
                      <span className="inline-flex items-center">
                        <span>کسری قطعی</span>
                        <FormulaTooltip
                          title="فرمول کسری قطعی (Hard Shortage)"
                          formula="HardShortage = max(0, (RequiredKg - ATP) - OpenContractKg)"
                          description="مقدار کسری ماده اولیه که نه با موجودی آزاد انبار (ATP) و نه با سهمیه قراردادهای باز ساپکو پوشش داده نمی‌شود."
                          badgeColor="rose"
                        />
                      </span>
                    </th>
                    <th className="py-3 px-3 text-center">وضعیت تأمین</th>
                    <th className="py-3 px-3 text-center no-print">اکشن سریع تدارکات (PR)</th>
                    <th className="py-3 px-3 text-center no-print">قطعات متقاضی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredMaterials.map(m => {
                    const isExpanded = expandedMaterialCode === m.materialCode;
                    const hasVipDemand = m.demandedByParts.some(dp => vipMap[dp.partId] || vipMap[dp.partCode]);
                    const issuedPr = issuedPrMap[m.materialCode];
                    const effectiveShortage = m.hardShortageQuantity > 0 ? m.hardShortageQuantity : m.shortageQuantity;
                    return (
                      <React.Fragment key={m.materialId}>
                        <tr
                          className={`transition ${
                            hasVipDemand ? 'bg-amber-50/45 hover:bg-amber-50/80' : 'hover:bg-slate-100'
                          }`}
                        >
                          <td className="py-3 px-3 font-sans">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span>{m.materialName}</span>
                              {hasVipDemand && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-extrabold">
                                  <Pin className="w-2.5 h-2.5 fill-slate-950" />
                                  مورد نیاز قطعه VIP
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{m.materialCode}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px]">
                              {m.materialGrade}
                            </span>
                            {m.thicknessMm > 0 && (
                              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                {toPersianDigits(m.thicknessMm)} mm
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-indigo-400 font-bold text-sm">
                            {formatNumber(m.requiredWeightKg)}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-700">
                            {formatNumber(m.onHandOwned)}
                          </td>
                          <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                            {formatNumber(m.onHandConsignment)}
                          </td>
                          <td className="py-3 px-3 text-center text-rose-400/80">
                            {m.onHandQuarantined > 0 ? (
                              <span className="text-rose-400 font-bold underline" title="خارج از چرخه تخصیص">
                                {formatNumber(m.onHandQuarantined)}
                              </span>
                            ) : (
                              '۰'
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-amber-400">
                            {formatNumber(m.reservedActive)}
                          </td>
                          <td className="py-3 px-3 text-center text-emerald-700 font-bold text-sm bg-emerald-950/20">
                            {formatNumber(m.netAvailable)}
                          </td>
                          <td className="py-3 px-3 text-center text-indigo-700">
                            {formatNumber(m.openContractQuantity)}
                          </td>
                          <td className="py-3 px-3 text-center font-black text-sm">
                            {m.hardShortageQuantity > 0 ? (
                              <span className="text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                                {formatNumber(m.hardShortageQuantity)}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-sans">
                            {m.severity === 'OK' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                پوشش کامل
                              </span>
                            )}
                            {m.severity === 'SHORTAGE_COVERED_BY_CONTRACT' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                پوشش قرارداد
                              </span>
                            )}
                            {m.severity === 'HARD_SHORTAGE' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" />
                                کسری قطعی
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-sans no-print">
                            {issuedPr ? (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold">
                                  ✓ {issuedPr.prNumber}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {formatNumber(issuedPr.quantity)} {issuedPr.unit}
                                </span>
                              </div>
                            ) : effectiveShortage > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleIssuePurchaseRequisition(
                                    m.materialCode,
                                    m.materialName,
                                    effectiveShortage,
                                    'kg',
                                    m.materialGrade
                                  )
                                }
                                title="صدور فوری درخواست خرید (Purchase Requisition) برای جبران کسری"
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer whitespace-nowrap"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>صدور درخواست خرید (PR)</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">نیاز ندارد</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setExpandedMaterialCode(isExpanded ? null : m.materialCode)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-100 text-slate-700 text-[11px] font-sans inline-flex items-center gap-1 cursor-pointer transition"
                            >
                              <span>{toPersianDigits(m.demandedByParts.length)} قطعه</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Drawer for Demanded Parts & Matching Coils */}
                        {isExpanded && (
                          <tr className="bg-slate-50 border-b border-slate-200 font-sans">
                            <td colSpan={13} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {/* Demanded by Parts */}
                                <div className="bg-white border border-slate-200 rounded-xl p-3">
                                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                    <Boxes className="w-4 h-4 text-indigo-400" />
                                    قطعات متقاضی این متریال در برنامه:
                                  </h4>
                                  <div className="space-y-2">
                                    {m.demandedByParts.map((dp, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
                                      >
                                        <div>
                                          <div className="font-bold text-slate-700">{dp.partName}</div>
                                          <div className="text-[10px] text-slate-500 font-mono">{dp.partCode}</div>
                                        </div>
                                        <div className="text-left font-mono">
                                          <div className="text-indigo-400 font-bold">
                                            {formatNumber(dp.weightKg)} <span className="text-[10px] font-sans text-slate-400">kg</span>
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            ({formatNumber(dp.requiredQuantity)} عدد)
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Physical Matching Coils in Plant */}
                                <div className="bg-white border border-slate-200 rounded-xl p-3">
                                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-emerald-400" />
                                    کلاف‌ها و رول‌های فیزیکی منطبق پای پرس:
                                  </h4>
                                  {m.matchingCoils.length > 0 ? (
                                    <div className="space-y-2">
                                      {m.matchingCoils.map((c, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
                                        >
                                          <div>
                                            <div className="font-bold text-slate-700 font-mono">{c.coilNumber}</div>
                                            <div className="text-[10px] text-slate-500">
                                              {c.ownership === 'SAPCO_CONSIGNMENT' ? 'امانی ساپکو' : 'ملکی کارخانه'} • {c.warehouseLocation}
                                            </div>
                                          </div>
                                          <div className="text-left font-mono">
                                            <span className="text-emerald-400 font-bold text-sm">
                                              {formatNumber(c.remainingWeightKg)} kg
                                            </span>
                                            <span className="block text-[10px] text-slate-400">
                                              ضخامت {toPersianDigits(c.thicknessMm)}mm
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-slate-500 text-[11px] p-3 text-center bg-slate-50 rounded-lg">
                                      هیچ رول فیزیکی با این مشخصات در انبار ثبت نشده است.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PRE-ISSUE CHECK & AUTO-RESERVE (بررسی پیش از حواله)
          ========================================================================= */}
      {activeTab === 'pre_issue' && (
        <div className="space-y-5">
          {/* MO Selector & ATP Status Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  انتخاب دستور کار ساخت (MO) جهت بررسی موجودی مواد پیش از صدور حواله:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMoId}
                    onChange={e => setSelectedMoId(e.target.value)}
                    className="flex-1 max-w-xl bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {moList.map(mo => (
                      <option key={mo.id} value={mo.id}>
                        {mo.moNumber} — {mo.partName} ({formatNumber(mo.targetQuantity)} عدد) [وضعیت: {mo.status}]
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => runMoCheck(selectedMoId)}
                    disabled={checkingMo}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-xs font-bold text-slate-900 border border-slate-200 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingMo ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>بررسی در لحظه</span>
                  </button>
                </div>
              </div>

              {moCheckResult && (
                <div className="flex items-center gap-3">
                  <div className={`p-4 rounded-xl border ${
                    moCheckResult.readyToIssue
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-700'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-700'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {moCheckResult.readyToIssue ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>آماده صدور حواله خروج پای پرس</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-rose-400" />
                          <span>دارای کسری مواد / عدم امکان حواله</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {moCheckResult.readyToIssue
                        ? 'کلیه ورق‌ها و قطعات این دستور کار در انبار آزاد و موجود است.'
                        : 'یک یا چند قلم متریال در انبار آزاد نبوده و نیازمند حواله یا تأمین است.'}
                    </p>
                  </div>

                  <button
                    onClick={handleAutoReserve}
                    disabled={reservingMo}
                    className="px-5 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50 flex flex-col items-center justify-center gap-1 text-center"
                  >
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4" />
                      <span>رزرو خودکار موجودی آزاد (ATP)</span>
                    </div>
                    <span className="text-[10px] text-emerald-100 font-normal">
                      قفل کردن مواد در انبار برای این دستور کار
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BOM Materials Availability Table */}
          {moCheckResult && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-slate-900">
                    جدول موازنه اقلام BOM دستور کار {moCheckResult.moNumber} ({moCheckResult.partName})
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  تیراژ مصوب: {formatNumber(moCheckResult.targetQuantity)} عدد
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-400 border-b border-slate-200 font-mono text-[11px]">
                    <tr>
                      <th className="py-3 px-3">کد و عنوان قطعه / ماده در BOM</th>
                      <th className="py-3 px-3 text-center">واحد</th>
                      <th className="py-3 px-3 text-center text-indigo-400">کل نیاز سفارش</th>
                      <th className="py-3 px-3 text-center text-slate-400">حواله شده قبلی</th>
                      <th className="py-3 px-3 text-center text-slate-900 font-bold">باقیمانده نیاز</th>
                      <th className="py-3 px-3 text-center text-slate-700">موجودی انبار</th>
                      <th className="py-3 px-3 text-center text-amber-400">رزرو همین MO</th>
                      <th className="py-3 px-3 text-center text-rose-400/80">رزرو سایر MOها</th>
                      <th className="py-3 px-3 text-center text-emerald-700 font-bold">آزاد برای این MO</th>
                      <th className="py-3 px-3 text-center text-rose-400 font-black">کسری</th>
                      <th className="py-3 px-3 text-center">وضعیت ردیف</th>
                      <th className="py-3 px-3 text-center">اکشن سریع خرید (PR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {moCheckResult.lines.map((l, idx) => {
                      const linePr = issuedPrMap[l.materialCode];
                      return (
                        <tr key={idx} className="hover:bg-slate-100 transition">
                          <td className="py-3 px-3 font-sans">
                            <div className="font-bold text-slate-900">{l.materialName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{l.materialCode}</div>
                            {l.notes.length > 0 && (
                              <div className="text-[10px] text-slate-500 mt-0.5">{l.notes.join(' • ')}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-400">{l.unitCode}</td>
                          <td className="py-3 px-3 text-center text-indigo-400 font-bold">{formatNumber(l.requiredQuantity)}</td>
                          <td className="py-3 px-3 text-center text-slate-400">{formatNumber(l.alreadyIssuedQuantity)}</td>
                          <td className="py-3 px-3 text-center text-slate-900 font-bold">{formatNumber(l.remainingRequired)}</td>
                          <td className="py-3 px-3 text-center text-slate-700">{formatNumber(l.onHandApproved)}</td>
                          <td className="py-3 px-3 text-center text-amber-400 font-bold">{formatNumber(l.reservedForThisMo)}</td>
                          <td className="py-3 px-3 text-center text-rose-400/80">{formatNumber(l.reservedForOthers)}</td>
                          <td className="py-3 px-3 text-center text-emerald-700 font-bold text-sm bg-emerald-950/20">
                            {formatNumber(l.availableForThisMo)}
                          </td>
                          <td className="py-3 px-3 text-center font-black">
                            {l.shortageQuantity > 0 ? (
                              <span className="text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                                {formatNumber(l.shortageQuantity)}
                              </span>
                            ) : (
                              <span className="text-slate-500">۰</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-sans">
                            {l.status === 'READY' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                آماده حواله
                              </span>
                            )}
                            {l.status === 'SHORTAGE' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                کسری موجودی
                              </span>
                            )}
                            {l.status === 'NOT_REQUIRED' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                                تأمین کامل شده
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-sans">
                            {linePr ? (
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold">
                                ✓ {linePr.prNumber}
                              </span>
                            ) : l.shortageQuantity > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleIssuePurchaseRequisition(
                                    l.materialCode,
                                    l.materialName,
                                    l.shortageQuantity,
                                    l.unitCode
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
                              >
                                <ShoppingCart className="w-3 h-3" />
                                <span>صدور درخواست خرید (PR)</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: PARTS DEMAND NETTING (موازنه تقاضای قطعات - با دکمه کشوی تعریف درجا BOM/مسیر)
          ========================================================================= */}
      {activeTab === 'parts' && mrpData && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-400" />
                موازنه تیراژ قطعات نهایی خودرویی (تقاضای باز مشتریان نسبت به موجودی و WIP)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                بر روی وضعیت‌های <strong className="text-rose-600">«فاقد BOM»</strong> یا <strong className="text-amber-600">«فاقد مسیر»</strong> کلیک کنید تا کشوی جانبی تعریف سریع مستندات فنی باز شود (بدون خروج از ماژول MRP).
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {toPersianDigits(mrpData.parts.length)} محصول
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-400 border-b border-slate-200 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-3">کد و نام قطعه خودرویی</th>
                  <th className="py-3 px-3">خودرو</th>
                  <th className="py-3 px-3 text-center text-indigo-400 font-bold">تقاضای ناخالص</th>
                  <th className="py-3 px-3 text-center text-emerald-400">موجودی محصول نهایی</th>
                  <th className="py-3 px-3 text-center text-amber-400">رزرو محصول</th>
                  <th className="py-3 px-3 text-center text-purple-400">کار در جریان (WIP)</th>
                  <th className="py-3 px-3 text-center text-blue-400">دستور کار باز (MO)</th>
                  <th className="py-3 px-3 text-center text-rose-400 font-black">نیاز خالص تولید</th>
                  <th className="py-3 px-3 text-center">وضعیت مستندات فنی (کلیک برای تکمیل در کشو)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {mrpData.parts.map(p => (
                  <tr
                    key={p.partId}
                    className={`transition ${
                      p.isVIP ? 'bg-amber-50/60 hover:bg-amber-100/60' : 'hover:bg-slate-100'
                    }`}
                  >
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{p.partName}</span>
                        {p.isVIP && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold border border-amber-500">
                            <Pin className="w-2.5 h-2.5 fill-slate-950" />
                            قطعه کلیدی (VIP)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.partCode}</div>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-700">{p.carModel || '-'}</td>
                    <td className="py-3 px-3 text-center text-indigo-400 font-bold text-sm">
                      {formatNumber(p.grossDemand)}
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                      {formatNumber(p.coveredByFgStock)}
                    </td>
                    <td className="py-3 px-3 text-center text-amber-400">
                      {formatNumber(p.coveredByFgReservations)}
                    </td>
                    <td className="py-3 px-3 text-center text-purple-400 font-bold">
                      {formatNumber(p.coveredByWip)}
                    </td>
                    <td className="py-3 px-3 text-center text-blue-400">
                      {formatNumber(p.coveredByActiveMos)}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-sm">
                      {p.netRequirement > 0 ? (
                        <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {formatNumber(p.netRequirement)}
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold">پوشش کامل (۰)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenBomRoutingDrawer(p, 'BOM')}
                          title={
                            p.hasBom
                              ? 'مشاهده یا ویرایش درخت محصول (BOM) در کشوی جانبی'
                              : 'کلیک جهت تعریف سریع BOM در کشوی جانبی بدون خروج از MRP'
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                            p.hasBom
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-700 shadow-2xs animate-pulse'
                          }`}
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>{p.hasBom ? 'BOM تأییدشده' : 'فاقد BOM (تعریف +)'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenBomRoutingDrawer(p, 'ROUTING')}
                          title={
                            p.hasRouting
                              ? 'مشاهده یا ویرایش مسیر تولید (Routing) در کشوی جانبی'
                              : 'کلیک جهت تعریف سریع مسیر تولید در کشوی جانبی بدون خروج از MRP'
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                            p.hasRouting
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-600 shadow-2xs'
                          }`}
                        >
                          <GitBranch className="w-2.5 h-2.5" />
                          <span>{p.hasRouting ? 'مسیر ساخت' : 'فاقد مسیر (تعریف +)'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: DEMAND SIMULATION (شبیه‌ساز سناریوی تقاضا)
          ========================================================================= */}
      {activeTab === 'simulation' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              شبیه‌ساز پیش‌بینی نیازمندی مواد و سناریوی رشد تقاضا (What-If Simulation)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              تنظیم سناریوهای رشد تقاضای ساپکو، افق زمانی برنامه‌ریزی، و سنجش میزان کسری کلاف قبل از تعهد تجاری
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                درصد رشد تقاضای سفارشات:
              </label>
              <div className="flex items-center gap-2">
                {[0, 15, 25, 50].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setSimGrowth(pct)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      simGrowth === pct
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white text-slate-400 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {pct === 0 ? 'مبنا (۰٪)' : `+${toPersianDigits(pct)}٪`}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                افق زمانی برنامه‌ریزی:
              </label>
              <div className="flex items-center gap-2">
                {[7, 14, 30, 90].map(days => (
                  <button
                    key={days}
                    onClick={() => setSimHorizon(days)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      simHorizon === days
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-white text-slate-400 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {toPersianDigits(days)} روزه
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                ملاحظات چرخه ساخت و موجودی:
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simIncludeWip}
                    onChange={e => setSimIncludeWip(e.target.checked)}
                    className="accent-purple-600 rounded"
                  />
                  <span>لحاظ کردن موجودی کار در جریان (WIP)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simIncludeConsignment}
                    onChange={e => setSimIncludeConsignment(e.target.checked)}
                    className="accent-purple-600 rounded"
                  />
                  <span>شمارش موجودی امانی ساپکو</span>
                </label>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-black text-white shadow-lg shadow-purple-600/30 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>اجرای شبیه‌سازی سناریو</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SLIDE-OVER DRAWER FOR INLINE BOM & ROUTING DEFINITION INSIDE MRP
          ========================================================================= */}
      {bomRoutingDrawerPart && (
        <div
          className="fixed inset-0 z-[85] flex justify-end bg-slate-900/45 backdrop-blur-[2px] animate-in fade-in"
          dir="rtl"
          onClick={() => setBomRoutingDrawerPart(null)}
        >
          <div
            className="relative w-full max-w-xl bg-white h-full shadow-2xl border-r border-slate-200 flex flex-col justify-between overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-block mb-1">
                  حل بن‌بست فنی درجا (Inline MRP Technical Resolution)
                </span>
                <h3 className="text-sm font-bold text-white">
                  تعریف BOM و مسیر تولید: {bomRoutingDrawerPart.partName}
                </h3>
                <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                  {bomRoutingDrawerPart.partCode} | تقاضای خالص: {formatNumber(bomRoutingDrawerPart.netRequirement)} عدد
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBomRoutingDrawerPart(null)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section Switcher Tabs */}
            <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDrawerFocusSection('BOM')}
                className={`px-3.5 py-2 rounded-t-xl font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  drawerFocusSection === 'BOM'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>۱. ساختار درخت محصول (BOM ورق و اقلام)</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerFocusSection('ROUTING')}
                className={`px-3.5 py-2 rounded-t-xl font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  drawerFocusSection === 'ROUTING'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>۲. مسیر تولید و ایستگاه‌ها (Routing / OP)</span>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveBomRoutingFromDrawer} className="flex-1 p-5 space-y-5 text-xs">
              {/* BOM Section */}
              <div
                className={`p-4 rounded-2xl border space-y-3.5 ${
                  drawerFocusSection === 'BOM'
                    ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>مشخصات ماده اولیه و درخت محصول (BOM)</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200">
                    انفجار خودکار در MRP
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">گرید ورق فولادی (Grade):</label>
                    <select
                      value={drawerBomGrade}
                      onChange={e => setDrawerBomGrade(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold"
                    >
                      <option value="DC04">DC04 (ورق روغنی کشش عمیق ساپکو)</option>
                      <option value="ST14">ST14 (ورق روغنی فوق کشش)</option>
                      <option value="ST12">ST12 (ورق سرد معمولی)</option>
                      <option value="DX51D">DX51D (ورق گالوانیزه ضدخوردگی)</option>
                      <option value="S355MC">S355MC (ورق استحکام بالا شاسی)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ضخامت ورق (mm):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.4"
                      max="6.0"
                      value={drawerBomThickness}
                      onChange={e => setDrawerBomThickness(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">وزن خالص قطعه (kg):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      value={drawerBomUnitWeight}
                      onChange={e => setDrawerBomUnitWeight(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ضریب پرت و ضایعات برش (%):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="40"
                      value={drawerBomScrapPct}
                      onChange={e => setDrawerBomScrapPct(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">قطعه/یراق مونتاژی فرعی (Sub-Component):</label>
                    <input
                      type="text"
                      value={drawerBomHardware}
                      onChange={e => setDrawerBomHardware(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ضریب مصرف در واحد:</label>
                    <input
                      type="number"
                      min="0"
                      value={drawerBomHardwareQty}
                      onChange={e => setDrawerBomHardwareQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Routing Section */}
              <div
                className={`p-4 rounded-2xl border space-y-3.5 ${
                  drawerFocusSection === 'ROUTING'
                    ? 'bg-blue-50/40 border-blue-200 ring-1 ring-blue-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-blue-600" />
                    <span>ایستگاه‌های مسیر تولید (Routing Operations)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDrawerOps(prev => [
                        ...prev,
                        {
                          stepCode: `OP-${(prev.length + 1) * 10}`,
                          stepName: 'ایستگاه عملیاتی جدید',
                          machineName: 'پرس ضربه‌ای ۱۶۰ تن ۱',
                          cycleTimeSec: 10,
                        },
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span>افزودن ایستگاه OP</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {drawerOps.map((op, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={op.stepCode}
                          onChange={e =>
                            setDrawerOps(prev =>
                              prev.map((item, i) => (i === idx ? { ...item, stepCode: e.target.value } : item))
                            )
                          }
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] font-bold text-indigo-700"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={op.stepName}
                          onChange={e =>
                            setDrawerOps(prev =>
                              prev.map((item, i) => (i === idx ? { ...item, stepName: e.target.value } : item))
                            )
                          }
                          placeholder="شرح عملیات"
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={op.machineName}
                          onChange={e =>
                            setDrawerOps(prev =>
                              prev.map((item, i) => (i === idx ? { ...item, machineName: e.target.value } : item))
                            )
                          }
                          placeholder="ماشین / پرس"
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min="1"
                          value={op.cycleTimeSec}
                          onChange={e =>
                            setDrawerOps(prev =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, cycleTimeSec: Number(e.target.value) || 8 } : item
                              )
                            )
                          }
                          title="زمان سیکل (ثانیه)"
                          className="w-12 px-1.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-center"
                        />
                        {drawerOps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDrawerOps(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 pt-4 pb-2 bg-white border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBomRoutingDrawerPart(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-sm"
                >
                  ذخیره مستندات فنی و بروزرسانی درجا در MRP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
