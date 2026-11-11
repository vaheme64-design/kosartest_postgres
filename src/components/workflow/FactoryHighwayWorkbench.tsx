import React, { useState, useMemo, useEffect } from 'react';
import {
  Boxes,
  Hammer,
  Printer,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Cpu,
  RotateCcw,
  Search,
  Plus,
  Edit3,
  Trash2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpRight,
  Compass,
  GitBranch,
  FileCheck2,
  Layers,
  Settings,
  Gauge,
  TrendingUp,
  RefreshCw,
  Tag,
  Pin,
  Star,
  PackageCheck,
  Truck,
  PauseCircle,
  Play,
  Pause,
  Check,
} from 'lucide-react';
import {
  Part,
  Routing,
  Machine,
  DieMold,
  FactoryHall,
  SapcoCoilReceipt,
  PROCESS_DEFINITIONS,
  FACTORY_HALLS,
  ProcessType,
} from '../../types/inventory';
import { TabKey, SubModuleNavParams } from '../Sidebar';
import { InventorySubTab } from '../inventory/InventoryModuleView';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { SearchableSelect, SearchableOption } from '../common/SearchableSelect';
import { OrderDetailsDrawer, DrawerTabKey } from './OrderDetailsDrawer';
import { useEnterpriseUx } from '../../context/EnterpriseUxContext';
import { FormulaTooltip } from '../common/FormulaTooltip';
import { EmptyState } from '../common/EmptyState';
import { MetricTooltip } from '../common/MetricTooltip';
import { loadVipPartsMap, saveVipPartsMap, isPartVip } from '../../utils/qcHoldStore';
import { PreMoWipInspectionModal } from './PreMoWipInspectionModal';
import { SubComponentWipPreflightCard } from './SubComponentWipPreflightCard';
import { useErpRouter } from '../../context/RouterContext';

export interface HighwayOperationStep {
  stepCode: string;
  stepName: string;
  processType?: ProcessType;
  hall: string;
  machineId?: string;
  machineName: string;
  dieId?: string;
  dieName: string;
  cycleTimeSec: number;
  isShared?: boolean;
  sharedWithPart?: string;
  completedGood: number;
  scrapQty: number;
  isFinal: boolean;
}

export interface IssuedCommandLog {
  id: string;
  docNumber: string;
  type: 'MO_CREATED' | 'MATERIAL_ISSUED' | 'OP_LOGGED' | 'FG_RECEIPT';
  title: string;
  timestamp: string;
  qtyOrWeight: string;
  targetStation: string;
}

export interface HighwayPartScenario {
  id: string;
  orderCode: string;
  productionBatchCode: string;
  partId: string;
  partCode: string;
  partName: string;
  carModel: string;
  customerName: string;
  contractCode?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'HALTED' | 'DRAFT';
  isPinned?: boolean;
  isDeleted?: boolean;
  orderQty: number;
  unitWeightKg: number;
  scrapAllowancePct: number;
  rawMaterialPartId?: string;
  rawMaterialCode: string;
  rawMaterialName: string;
  coilNumber?: string;
  heatNumber?: string;
  sapcoBatchNumber?: string;
  isCustomSheetOverride?: boolean;
  warehouseAvailableKg: number;
  materialIssuedVoucherNo?: string;
  finishedReceiptVoucherNo?: string;
  dispatchVoucherNo?: string;
  dispatchedQty?: number;
  bomSubComponents: Array<{
    name: string;
    qtyPerParent: number;
    unit: string;
    stage: string;
  }>;
  operations: HighwayOperationStep[];
  commandLogs?: IssuedCommandLog[];
  notes?: string;
}

export type KpiViewMode = 'OEE' | 'OUTPUT_VS_TARGET' | 'INVENTORY_TURNOVER' | 'CUSTOM';

interface KpiCustomSelection {
  showOee: boolean;
  showOutputVsTarget: boolean;
  showInventoryTurnover: boolean;
}

const INITIAL_SCENARIOS: HighwayPartScenario[] = [
  {
    id: 'SCN-ECU-BRK',
    orderCode: 'MO-1404-2001',
    productionBatchCode: 'BCH-PRD-1404-2001',
    partId: 'PRT-ECU-BRK-01',
    partCode: 'SAPCO-ASY-ECU-BRK-01',
    partName: 'براکت ضدسرقت رایانه موتور (ECU)',
    carModel: 'پژو ۲۰۶',
    customerName: 'ساپکو',
    orderQty: 5000,
    unitWeightKg: 1.45,
    scrapAllowancePct: 5.0,
    rawMaterialCode: 'RM-COIL-DC01A-2.0-1140',
    rawMaterialName: 'رول ورق DC01A ضخامت 2.0 عرض 1140',
    coilNumber: 'MOB-2025-DC01-409',
    heatNumber: 'HT-99412-MOB',
    sapcoBatchNumber: 'BCH-SAP-1404-101',
    warehouseAvailableKg: 18500,
    materialIssuedVoucherNo: 'ISS-1404-881',
    bomSubComponents: [
      { name: 'صفحه اصلی براکت ضدسرقت (WIP-ECU-MAIN)', qtyPerParent: 1, unit: 'عدد', stage: 'برش و پرس' },
      { name: 'قطعه مکمل تقویتی (WIP-ECU-COMP)', qtyPerParent: 1, unit: 'عدد', stage: 'بلنک و پانچ' },
      { name: 'مهره جوشی M6 استاندارد خودرویی', qtyPerParent: 15, unit: 'عدد', stage: 'پرس‌جوش مقاومتی' },
    ],
    operations: [
      {
        stepCode: 'OP10',
        stepName: 'برش ورق خام از رول',
        processType: 'SHEARING',
        hall: 'سالن برشکاری، نواربری و آماده‌سازی بلنک',
        machineName: 'قیچی گیوتین ۶ متری ۱',
        dieName: 'BLD-SHR-01',
        cycleTimeSec: 6,
        completedGood: 5000,
        scrapQty: 25,
        isFinal: false,
      },
      {
        stepCode: 'OP20',
        stepName: 'بلنک‌زنی اولیه صفحه اصلی',
        processType: 'BLANKING',
        hall: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
        machineName: 'پرس ضربه‌ای ۲۵۰ تن ۱',
        dieName: 'DIE-ECU-BLK-01',
        cycleTimeSec: 10,
        completedGood: 3500,
        scrapQty: 30,
        isFinal: false,
      },
      {
        stepCode: 'OP30',
        stepName: 'پرس خمکاری و فرم لبه‌ها',
        processType: 'BENDING',
        hall: 'سالن پرس‌های متوسط و برک CNC (۲۵۰ و ۱۶۰ تن)',
        machineName: 'پرس ۱۶۰ تن خم ۱',
        dieName: 'DIE-ECU-BND-02',
        cycleTimeSec: 12,
        completedGood: 2200,
        scrapQty: 18,
        isFinal: false,
      },
      {
        stepCode: 'OP40',
        stepName: 'پانچ و سوراخ‌کاری دوبل',
        processType: 'PUNCH_FORM',
        hall: 'سالن پرس‌های متوسط و برک CNC (۲۵۰ و ۱۶۰ تن)',
        machineName: 'پرس ۱۶۰ تن پانچ ۲',
        dieName: 'DIE-ECU-PNC-03',
        cycleTimeSec: 12,
        completedGood: 1800,
        scrapQty: 12,
        isFinal: false,
      },
      {
        stepCode: 'OP50',
        stepName: 'پرس‌جوش مهره و تحویل به انبار',
        processType: 'SPOT_WELD',
        hall: 'سالن جوشکاری رباتیک و پرس‌جوش مقاومتی',
        machineName: 'پرس‌جوش مقاومتی ۱۰۰KVA',
        dieName: 'JIG-ECU-NUT15',
        cycleTimeSec: 20,
        completedGood: 1500,
        scrapQty: 5,
        isFinal: true,
      },
    ],
    commandLogs: [
      {
        id: 'CMD-1',
        docNumber: 'MO-1404-2001',
        type: 'MO_CREATED',
        title: 'صدور دستور تولید (MO) متصل به ذوب HT-99412-MOB و بچ BCH-PRD-1404-2001',
        timestamp: '۱۴۰۴/۰۲/۲۰ - ۰۷:۳۰',
        qtyOrWeight: '۵,۰۰۰ عدد',
        targetStation: 'خط تولید و پرس',
      },
      {
        id: 'CMD-2',
        docNumber: 'ISS-1404-881',
        type: 'MATERIAL_ISSUED',
        title: 'حواله کلاف MOB-2025-DC01-409 (ذوب HT-99412-MOB) به سالن برش',
        timestamp: '۱۴۰۴/۰۲/۲۰ - ۰۸:۱۰',
        qtyOrWeight: '۷,۶۱۳ کیلوگرم',
        targetStation: 'سالن برشکاری (OP10)',
      },
    ],
  },
  {
    id: 'SCN-SEAT-LHRH',
    orderCode: 'MO-1404-2002',
    productionBatchCode: 'BCH-PRD-1404-2002',
    partId: 'PRT-SEAT-LH',
    partCode: 'SAPCO-SEAT-BACK-LH',
    partName: 'اسکلت صندلی چپ و راست (قالب ۲ کویته)',
    carModel: 'پژو پارس',
    customerName: 'ساپکو',
    orderQty: 4000,
    unitWeightKg: 2.1,
    scrapAllowancePct: 4.5,
    rawMaterialCode: 'RM-COIL-DC04-1.2-1250',
    rawMaterialName: 'رول ورق کشش عمیق DC04 ضخامت 1.2',
    coilNumber: 'MOB-2025-DC04-512',
    heatNumber: 'HT-88305-MOB',
    sapcoBatchNumber: 'BCH-SAP-1404-102',
    warehouseAvailableKg: 24000,
    materialIssuedVoucherNo: 'ISS-1404-884',
    bomSubComponents: [
      { name: 'بلنک مشترک کشش عمیق (چپ/راست)', qtyPerParent: 1, unit: 'عدد', stage: 'پرس ۸۰۰ تن' },
      { name: 'پوسته صندلی چپ (Split LH)', qtyPerParent: 1, unit: 'عدد', stage: 'دوربری و تفکیک' },
      { name: 'پوسته صندلی راست (Split RH)', qtyPerParent: 1, unit: 'عدد', stage: 'دوربری و تفکیک' },
    ],
    operations: [
      {
        stepCode: 'OP10',
        stepName: 'برش کلاف DC04 ضخامت ۱.۲',
        processType: 'SHEARING',
        hall: 'سالن برشکاری، نواربری و آماده‌سازی بلنک',
        machineName: 'خط برش عرضی ۱',
        dieName: 'BLD-SLT-01',
        cycleTimeSec: 7,
        completedGood: 4000,
        scrapQty: 15,
        isFinal: false,
      },
      {
        stepCode: 'OP20',
        stepName: 'کشش عمیق مشترک (۲ کویته چپ/راست)',
        processType: 'DRAWING',
        hall: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
        machineName: 'پرس هیدرولیک ۸۰۰ تن',
        dieName: 'DIE-SEAT-LHRH-G1',
        cycleTimeSec: 18,
        isShared: true,
        sharedWithPart: 'اسکلت پشت صندلی راست (RH)',
        completedGood: 4000,
        scrapQty: 25,
        isFinal: false,
      },
      {
        stepCode: 'OP30',
        stepName: 'دوربری و تفکیک چپ و راست',
        processType: 'TRIMMING',
        hall: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
        machineName: 'پرس ۴۰۰ تن ۲',
        dieName: 'DIE-SEAT-TRM2',
        cycleTimeSec: 15,
        completedGood: 4000,
        scrapQty: 10,
        isFinal: false,
      },
      {
        stepCode: 'OP40',
        stepName: 'پانچ نهایی و رسید انبار محصول',
        processType: 'PUNCH_FORM',
        hall: 'سالن پرس‌های متوسط و برک CNC (۲۵۰ و ۱۶۰ تن)',
        machineName: 'پرس ۲۵۰ تن ۱',
        dieName: 'DIE-SEAT-CAL3',
        cycleTimeSec: 14,
        completedGood: 3200,
        scrapQty: 4,
        isFinal: true,
      },
    ],
    commandLogs: [
      {
        id: 'CMD-10',
        docNumber: 'MO-1404-2002',
        type: 'MO_CREATED',
        title: 'صدور دستور تولید اسکلت صندلی (ذوب HT-88305-MOB)',
        timestamp: '۱۴۰۴/۰۲/۲۰ - ۰۸:۰۰',
        qtyOrWeight: '۴,۰۰۰ عدد',
        targetStation: 'سالن پرس سنگین',
      },
    ],
  },
  {
    id: 'SCN-BUMP-BEAM',
    orderCode: 'MO-1404-2003',
    productionBatchCode: 'BCH-PRD-1404-2003',
    partId: 'PRT-BUMP-FR',
    partCode: 'SAPCO-BUMP-BEAM-FR',
    partName: 'تیر عرضی سپر جلو (امگا)',
    carModel: 'سمند سورن',
    customerName: 'ایران خودرو',
    orderQty: 2000,
    unitWeightKg: 5.4,
    scrapAllowancePct: 3.5,
    rawMaterialCode: 'RM-COIL-ST37-2.5-1250',
    rawMaterialName: 'ورق ضخیم ST37 ضخامت 2.5 عرض 1250',
    coilNumber: 'FOO-2025-ST37-701',
    heatNumber: 'HT-77190-FOOLAD',
    sapcoBatchNumber: 'BCH-SAP-1404-103',
    warehouseAvailableKg: 32000,
    bomSubComponents: [
      { name: 'پروفیل اصلی امگا تیر سپر', qtyPerParent: 1, unit: 'عدد', stage: 'پرس ۸۰۰ تن' },
      { name: 'قوطی جاذب ضربه چپ Crash Box LH', qtyPerParent: 1, unit: 'عدد', stage: 'جوش رباتیک' },
      { name: 'قوطی جاذب ضربه راست Crash Box RH', qtyPerParent: 1, unit: 'عدد', stage: 'جوش رباتیک' },
    ],
    operations: [
      {
        stepCode: 'OP10',
        stepName: 'برش طولی ورق ضخیم تیر سپر',
        processType: 'SHEARING',
        hall: 'سالن برشکاری، نواربری و آماده‌سازی بلنک',
        machineName: 'گیوتین سنگین ۱',
        dieName: 'BLD-BMP-01',
        cycleTimeSec: 10,
        completedGood: 2000,
        scrapQty: 10,
        isFinal: false,
      },
      {
        stepCode: 'OP20',
        stepName: 'فرم‌دهی پروفیل امگا تیر سپر',
        processType: 'DRAWING',
        hall: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
        machineName: 'پرس ۸۰۰ تن',
        dieName: 'DIE-BMP-OMG',
        cycleTimeSec: 20,
        completedGood: 1200,
        scrapQty: 15,
        isFinal: false,
      },
      {
        stepCode: 'OP30',
        stepName: 'پانچ و خم قوس سپر',
        processType: 'BENDING',
        hall: 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
        machineName: 'پرس ۴۰۰ تن',
        dieName: 'DIE-BMP-ARC',
        cycleTimeSec: 18,
        completedGood: 0,
        scrapQty: 0,
        isFinal: false,
      },
      {
        stepCode: 'OP40',
        stepName: 'جوش رباتیک و تحویل به انبار',
        processType: 'CO2_WELD',
        hall: 'سالن جوشکاری رباتیک و پرس‌جوش مقاومتی',
        machineName: 'ربات جوش CO2',
        dieName: 'JIG-BMP-ROB',
        cycleTimeSec: 25,
        completedGood: 0,
        scrapQty: 0,
        isFinal: true,
      },
    ],
    commandLogs: [
      {
        id: 'CMD-20',
        docNumber: 'MO-1404-2003',
        type: 'MO_CREATED',
        title: 'صدور دستور تولید تیر عرضی سپر جلو (ذوب HT-77190-FOOLAD)',
        timestamp: '۱۴۰۴/۰۲/۲۰ - ۰۸:۳۰',
        qtyOrWeight: '۲,۰۰۰ عدد',
        targetStation: 'سالن برشکاری',
      },
    ],
  },
];

interface FactoryHighwayWorkbenchProps {
  parts?: Part[];
  routings?: Routing[];
  machines?: Machine[];
  dies?: DieMold[];
  halls?: FactoryHall[];
  coils?: SapcoCoilReceipt[];
  summary?: any;
  onNavigateToTab?: (
    tab: TabKey,
    subTab?: InventorySubTab,
    actionModal?: 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER'
  ) => void;
  onNavigateSubModule?: (tab: TabKey, navParams?: SubModuleNavParams) => void;
  onOpenNewVoucher?: (type: string, partId?: string) => void;
  onSubmitVoucher?: (payload: any) => Promise<{ success: boolean; message?: string }>;
  initialOrderId?: string | null;
  initialDrawerTab?: DrawerTabKey | null;
  onOrderDrawerChange?: (orderId: string | null, tab?: DrawerTabKey) => void;
}

export const FactoryHighwayWorkbench: React.FC<FactoryHighwayWorkbenchProps> = ({
  parts = [],
  routings = [],
  machines = [],
  dies = [],
  halls = [],
  coils = [],
  summary,
  onNavigateToTab,
  onNavigateSubModule,
  onSubmitVoucher,
  initialOrderId = null,
  initialDrawerTab = null,
  onOrderDrawerChange,
}) => {
  const { requestConfirm, showUndoToast, recordAudit } = useEnterpriseUx();
  const [scenarios, setScenarios] = useState<HighwayPartScenario[]>(() => {
    try {
      const saved = localStorage.getItem('kpims_highway_scenarios_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            ...item,
            productionBatchCode:
              item.productionBatchCode || `BCH-PRD-1404-${2001 + idx}`,
            coilNumber:
              item.coilNumber || INITIAL_SCENARIOS[idx % INITIAL_SCENARIOS.length].coilNumber,
            heatNumber:
              item.heatNumber || INITIAL_SCENARIOS[idx % INITIAL_SCENARIOS.length].heatNumber,
            sapcoBatchNumber:
              item.sapcoBatchNumber ||
              INITIAL_SCENARIOS[idx % INITIAL_SCENARIOS.length].sapcoBatchNumber,
          }));
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_SCENARIOS;
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [carFilter, setCarFilter] = useState<string>('ALL');

  // Configurable KPI Overview State (Persisted in localStorage)
  const [showKpiPanel, setShowKpiPanel] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kpims_dashboard_kpi_open') === 'true';
    } catch {
      return false;
    }
  });
  const [kpiViewMode, setKpiViewMode] = useState<KpiViewMode>(() => {
    try {
      const saved = localStorage.getItem('kpims_dashboard_kpi_mode') as KpiViewMode | null;
      return saved || 'OEE';
    } catch {
      return 'OEE';
    }
  });
  const [kpiCustomSelection, setKpiCustomSelection] = useState<KpiCustomSelection>(() => {
    try {
      const saved = localStorage.getItem('kpims_dashboard_kpi_custom');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      showOee: true,
      showOutputVsTarget: true,
      showInventoryTurnover: true,
    };
  });

  const handleToggleKpiPanel = () => {
    const next = !showKpiPanel;
    setShowKpiPanel(next);
    try {
      localStorage.setItem('kpims_dashboard_kpi_open', String(next));
    } catch {
      // ignore
    }
  };

  const handleSelectKpiMode = (mode: KpiViewMode) => {
    setKpiViewMode(mode);
    try {
      localStorage.setItem('kpims_dashboard_kpi_mode', mode);
    } catch {
      // ignore
    }
  };

  const handleToggleCustomMetric = (key: keyof KpiCustomSelection) => {
    const next = { ...kpiCustomSelection, [key]: !kpiCustomSelection[key] };
    setKpiCustomSelection(next);
    try {
      localStorage.setItem('kpims_dashboard_kpi_custom', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const [showWarehouseTools, setShowWarehouseTools] = useState(false);

  // Master-Detail Slide-Over Drawer State (SAP Fiori / Dynamics 365 Style)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(initialOrderId || null);
  const [expandedViewMode, setExpandedViewMode] = useState<'OPS' | 'BOM'>('OPS');
  const [drawerTab, setDrawerTab] = useState<DrawerTabKey>(initialDrawerTab || 'TRACEABILITY');

  useEffect(() => {
    if (initialOrderId !== undefined) {
      setExpandedOrderId(initialOrderId);
    }
    if (initialDrawerTab) {
      setDrawerTab(initialDrawerTab);
    }
  }, [initialOrderId, initialDrawerTab]);

  const handleOpenOrderDrawer = (orderId: string, tab: DrawerTabKey = 'TRACEABILITY') => {
    setExpandedOrderId(orderId);
    setDrawerTab(tab);
    if (onOrderDrawerChange) onOrderDrawerChange(orderId, tab);
  };

  // Live Order & Command Tracking Modal (`پیگیری دستور`)
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  // Modal for Logging Production on an Operation
  const [loggingTarget, setLoggingTarget] = useState<{
    orderId: string;
    opIndex: number;
  } | null>(null);
  const [logQtyInput, setLogQtyInput] = useState<string>('');
  const [logScrapInput, setLogScrapInput] = useState<string>('0');

  // Modal for Editing / Creating a Work Order (Connected to Master Data Parts, Routings & BOM!)
  const router = useErpRouter();
  const [editingOrder, setEditingOrder] = useState<HighwayPartScenario | null>(null);
  const [isNewOrderMode, setIsNewOrderMode] = useState(false);
  const [allowManualSheetOverride, setAllowManualSheetOverride] = useState(false);
  // Modal for Pre-Flight Inter-Stage WIP & Sub-Component Inspection
  const [inspectingOrderForWip, setInspectingOrderForWip] = useState<HighwayPartScenario | null>(null);

  // Modal for Editing / Adding a specific Operation Step
  const [editingOpContext, setEditingOpContext] = useState<{
    orderId: string;
    partId: string;
    partCode: string;
    opIndex: number | null;
    stepData: HighwayOperationStep;
  } | null>(null);

  // Toast with direct Tracking button (`پیگیری دستور`)
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    detail: string;
    type: 'success' | 'warning' | 'info';
    trackOrderId?: string;
    navAction?: { label: string; onClick: () => void };
  } | null>(null);

  // Schedule tab filter: ACTIVE | COMPLETED | PINNED | ALL
  const [scheduleTabFilter, setScheduleTabFilter] = useState<'ACTIVE' | 'COMPLETED' | 'PINNED' | 'ALL'>('ACTIVE');

  // Multi-select checkboxes for MO Bulk Actions (Upgrade 4)
  const [selectedMoIds, setSelectedMoIds] = useState<string[]>([]);

  // Shared VIP Parts map synchronized across PartsView, Inventory, MRP, and Dashboard
  const [vipMap, setVipMap] = useState<Record<string, boolean>>(() => loadVipPartsMap());

  useEffect(() => {
    const syncVip = () => setVipMap(loadVipPartsMap());
    window.addEventListener('kpims-vip-parts-changed', syncVip);
    return () => window.removeEventListener('kpims-vip-parts-changed', syncVip);
  }, []);

  const isScenarioVip = (scn: HighwayPartScenario): boolean => {
    return Boolean(scn.isPinned || isPartVip(scn.partId, scn.partCode, parts, vipMap));
  };

  const saveScenarios = (next: HighwayPartScenario[]) => {
    setScenarios(next);
    try {
      localStorage.setItem('kpims_highway_scenarios_v3', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Strictly filter producible parts catalog (NO raw materials or coils!)
  const produciblePartsCatalog = useMemo(() => {
    return parts.filter(
      p =>
        p.category !== 'RAW_MATERIAL' &&
        !p.code.startsWith('RM-') &&
        !p.code.startsWith('SAPCO-COIL')
    );
  }, [parts]);

  // Options array formatted for SearchableSelect
  const partSelectOptions = useMemo<SearchableOption[]>(() => {
    return produciblePartsCatalog.map(p => ({
      value: p.id,
      label: p.name,
      sublabel: `${p.code} | خودرو: ${p.carModel || 'عمومی'}`,
      badge: `وزن: ${p.weightPerUnitKg} ک.گ`,
      meta: p,
    }));
  }, [produciblePartsCatalog]);

  // Sync create-mo and wip-check modal state with URL router
  useEffect(() => {
    if (router.route.modal === 'create-mo') {
      if (!isNewOrderMode) {
        setIsNewOrderMode(true);
        setAllowManualSheetOverride(false);
        const newMoCode = `MO-1404-${Math.floor(2100 + Math.random() * 7000)}`;
        const defaultPart =
          (router.route.modalPartId &&
            produciblePartsCatalog.find(
              p => p.id === router.route.modalPartId || p.code === router.route.modalPartId
            )) ||
          produciblePartsCatalog[0];

        if (defaultPart) {
          setEditingOrder(buildOrderDataFromMasterPart(defaultPart, newMoCode));
        } else {
          const tpl = INITIAL_SCENARIOS[0];
          setEditingOrder({
            ...tpl,
            id: `SCN-${Date.now()}`,
            orderCode: newMoCode,
            productionBatchCode: `BCH-PRD-${newMoCode.replace('MO-', '')}`,
            operations: tpl.operations.map(o => ({ ...o, completedGood: 0, scrapQty: 0 })),
            commandLogs: [],
          });
        }
      }
    } else if (router.route.modal === 'wip-check') {
      if (!inspectingOrderForWip) {
        const target =
          scenarios.find(
            s =>
              s.orderCode === router.route.modalOrderId ||
              s.id === router.route.modalOrderId ||
              s.partCode === router.route.modalPartId
          ) || scenarios[0];
        if (target) {
          setInspectingOrderForWip(target);
        }
      }
    } else {
      if (inspectingOrderForWip && router.route.modal === null) {
        setInspectingOrderForWip(null);
      }
      if (isNewOrderMode && router.route.modal === null) {
        setIsNewOrderMode(false);
        setEditingOrder(null);
      }
    }
  }, [router.route.modal, router.route.modalOrderId, router.route.modalPartId, scenarios, produciblePartsCatalog]);

  const contractSelectOptions: SearchableOption[] = [
    {
      value: 'CNT-SAP-1404-01',
      label: 'قرارداد ساپکو — بدنه و سهمیه قطعات پژو پارس',
      sublabel: 'سقف تعهد: ۴,۰۰۰ عدد | تحویل ماهانه',
      badge: 'ساپکو',
    },
    {
      value: 'CNT-IKCO-1404-02',
      label: 'قرارداد ایران‌خودرو — اسکلت صندلی و قطعات ۲۰۶',
      sublabel: 'سقف تعهد: ۵,۰۰۰ عدد | خط ۱ تهران',
      badge: 'ایران‌خودرو',
    },
    {
      value: 'CNT-SAIPA-1404-03',
      label: 'قرارداد سازه‌گستر — قطعات پرسکاری شاهین و کوییک',
      sublabel: 'سقف تعهد: ۳,۵۰۰ عدد | مگاموتور',
      badge: 'سایپا',
    },
  ];

  // Complete Production & Auto Issue Finished Goods Receipt to Warehouse (Protected by Defensive UX ConfirmDialog + Undo)
  const handleCompleteProduction = (order: HighwayPartScenario) => {
    const lastOp = order.operations[order.operations.length - 1];
    const finishedQty = lastOp && lastOp.completedGood > 0 ? lastOp.completedGood : order.orderQty;

    requestConfirm({
      title: `تایید اتمام تولید و صدور رسید انبار (${order.orderCode})`,
      message: `آیا از اعلام اتمام تولید قطعه «${order.partName}» به تعداد ${formatNumber(finishedQty)} عدد اطمینان دارید؟`,
      consequences: [
        `صدور خودکار سند رسید انبار محصول نهایی برای ${formatNumber(finishedQty)} قطعه سالم`,
        `انتقال دستور کار ${order.orderCode} از برنامه‌های جاری خط به لیست تکمیل‌شده‌ها`,
        `بسته شدن ایستگاه‌های عملیاتی (OP) مرتبط با بچ ${order.productionBatchCode}`,
      ],
      confirmLabel: 'تایید اتمام و صدور رسید انبار',
      variant: 'emerald',
      onConfirm: async () => {
        const previousSnapshot = [...scenarios];
        const fgDocNo = `FG-REC-${Math.floor(1000 + Math.random() * 8999)}`;
        const nowTime = 'امروز - اتمام تولید سیستمی';

        if (onSubmitVoucher) {
          await onSubmitVoucher({
            voucherType: 'RECEIPT',
            partId: order.partId,
            stageId: 'STAGE_FINISHED_STORE',
            quantity: finishedQty,
            referenceDoc: order.orderCode,
            notes: `رسید انبار محصول نهایی از دستور تولید ${order.orderCode} | بچ ${order.productionBatchCode} | شماره ذوب ${order.heatNumber || 'HT-99412'}`,
          }).catch(() => {});
        }

        const newLog: IssuedCommandLog = {
          id: `CMD-${Date.now()}`,
          docNumber: fgDocNo,
          type: 'FG_RECEIPT',
          title: `اتمام کامل تولید دستور ${order.orderCode} و رسید ${formatNumber(finishedQty)} عدد «${order.partName}» به انبار محصول نهایی`,
          timestamp: nowTime,
          qtyOrWeight: `${formatNumber(finishedQty)} عدد`,
          targetStation: 'انبار محصول نهایی',
        };

        const updated = scenarios.map(scn => {
          if (scn.id !== order.id) return scn;
          const updatedOps = scn.operations.map((op, idx) => {
            if (idx === scn.operations.length - 1 && op.completedGood === 0) {
              return { ...op, completedGood: finishedQty };
            }
            return op;
          });
          return {
            ...scn,
            status: 'COMPLETED' as const,
            finishedReceiptVoucherNo: fgDocNo,
            operations: updatedOps,
            commandLogs: [newLog, ...(scn.commandLogs || [])],
          };
        });

        saveScenarios(updated);
        recordAudit({
          entityId: order.id,
          entityCode: order.orderCode,
          moduleName: 'پیشخوان تولید (MO)',
          actionType: 'COMPLETE_MO',
          title: `اتمام تولید دستور ${order.orderCode} و صدور رسید ${fgDocNo}`,
          details: `رسید ${formatNumber(finishedQty)} عدد «${order.partName}» با ذوب ${order.heatNumber} در انبار محصول ثبت شد.`,
        });

        showUndoToast({
          title: `تولید دستور ${order.orderCode} تکمیل و رسید انبار (${fgDocNo}) صادر شد`,
          detail: 'تا ۸ ثانیه امکان لغو اتمام تولید (Undo) و بازگرداندن به خط وجود دارد.',
          variant: 'success',
          onUndo: () => {
            saveScenarios(previousSnapshot);
            recordAudit({
              entityId: order.id,
              entityCode: order.orderCode,
              moduleName: 'پیشخوان تولید (MO)',
              actionType: 'RESTORE_UNDO',
              title: `لغو اتمام تولید (Undo) برای دستور ${order.orderCode}`,
              details: 'دستور کار مجدداً به وضعیت در جریان (ACTIVE) در خط تولید بازگردانده شد.',
            });
          },
        });
      },
    });
  };

  // Dispatch Finished Goods to Customer / SAPCO
  const handleDispatchFinishedGoods = async (order: HighwayPartScenario) => {
    const lastOp = order.operations[order.operations.length - 1];
    const availableFinished = lastOp ? lastOp.completedGood : order.orderQty;
    const dispatchDocNo = `DSP-SAP-${Math.floor(1000 + Math.random() * 8999)}`;

    if (onSubmitVoucher) {
      await onSubmitVoucher({
        voucherType: 'ISSUE',
        partId: order.partId,
        stageId: 'STAGE_FINISHED_STORE',
        quantity: availableFinished,
        referenceDoc: dispatchDocNo,
        notes: `حواله خروج و تحویل به ساپکو از دستور تولید ${order.orderCode} | قرارداد: ${order.contractCode || 'CNT-SAP-1404'} | بچ: ${order.productionBatchCode}`,
      }).catch(() => {});
    }

    const newLog: IssuedCommandLog = {
      id: `CMD-${Date.now()}`,
      docNumber: dispatchDocNo,
      type: 'MATERIAL_ISSUED',
      title: `حواله خروج و ارسال به ساپکو (${formatNumber(availableFinished)} عدد)`,
      timestamp: 'امروز - خروج از انبار',
      qtyOrWeight: `${formatNumber(availableFinished)} عدد`,
      targetStation: `بارگیری و تحویل به ساپکو (${order.customerName})`,
    };

    const updated = scenarios.map(scn => {
      if (scn.id !== order.id) return scn;
      return {
        ...scn,
        dispatchVoucherNo: dispatchDocNo,
        dispatchedQty: availableFinished,
        commandLogs: [newLog, ...(scn.commandLogs || [])],
      };
    });

    saveScenarios(updated);
    setToastMessage({
      type: 'success',
      title: `حواله خروج ${dispatchDocNo} صادر گردید`,
      detail: `تعداد ${formatNumber(availableFinished)} عدد قطعه «${order.partName}» از انبار محصول به ساپکو تحویل داده شد.`,
      trackOrderId: order.id,
    });
  };

  // Toggle Pinned / VIP Status for quick manager control (synced with global VIP Parts system)
  const handleTogglePinOrder = (orderId: string) => {
    const target = scenarios.find(s => s.id === orderId);
    const nextVip = target ? !isScenarioVip(target) : true;
    const updated = scenarios.map(scn => {
      if (scn.id === orderId) {
        return { ...scn, isPinned: nextVip };
      }
      return scn;
    });
    saveScenarios(updated);
    if (target) {
      const nextMap = {
        ...vipMap,
        [target.partId]: nextVip,
        [target.partCode]: nextVip,
      };
      setVipMap(nextMap);
      saveVipPartsMap(nextMap);
    }
  };

  // ============================================================================
  // BULK ACTIONS FOR SELECTED MOs (Upgrade 4: Start, Pause, Complete & Receipt)
  // ============================================================================
  const handleToggleSelectMo = (orderId: string) => {
    setSelectedMoIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleToggleSelectAllVisible = (visibleOrders: HighwayPartScenario[]) => {
    const visibleIds = visibleOrders.map(o => o.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every(id => selectedMoIds.includes(id));
    if (allSelected) {
      setSelectedMoIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedMoIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBulkStartMos = () => {
    const targetOrders = scenarios.filter(s => selectedMoIds.includes(s.id) && s.status !== 'COMPLETED');
    if (targetOrders.length === 0) return;

    requestConfirm({
      title: `شروع گروهی تولید (${toPersianDigits(targetOrders.length)} دستور کار MO)`,
      message: `آیا از شروع همزمان و فعال‌سازی خط تولید برای ${toPersianDigits(targetOrders.length)} دستور کار انتخاب‌شده اطمینان دارید؟`,
      consequences: [
        `تغییر وضعیت ${toPersianDigits(targetOrders.length)} دستور کار (${targetOrders.map(o => o.orderCode).join('، ')}) به حالت در جریان (ACTIVE)`,
        'در صورت صفر بودن پیشرفت ایستگاه اول (OP10)، ثبت استارت اولیه تولید (۲۰٪ پیشرفت ایستگاه اول)',
        'ثبت عملیات شروع گروهی در تاریخچه ممیزی (Audit Trail)',
      ],
      confirmLabel: 'تایید و شروع گروهی تولید',
      variant: 'indigo',
      onConfirm: () => {
        const previousSnapshot = [...scenarios];
        const batchDoc = `BLK-STR-${Math.floor(100 + Math.random() * 899)}`;
        const updated = scenarios.map(scn => {
          if (!selectedMoIds.includes(scn.id) || scn.status === 'COMPLETED') return scn;
          const updatedOps = scn.operations.map((op, idx) => {
            if (idx === 0 && op.completedGood === 0) {
              return { ...op, completedGood: Math.max(100, Math.round(scn.orderQty * 0.25)) };
            }
            return op;
          });
          const logEntry: IssuedCommandLog = {
            id: `CMD-${Date.now()}-${scn.id}`,
            docNumber: batchDoc,
            type: 'OP_LOGGED',
            title: `شروع گروهی دستور تولید ${scn.orderCode} در ایستگاه ${scn.operations[0]?.stepCode || 'OP10'}`,
            timestamp: 'امروز - اکشن گروهی مدیر تولید',
            qtyOrWeight: `${formatNumber(updatedOps[0]?.completedGood || 0)} عدد`,
            targetStation: scn.operations[0]?.hall || 'خط تولید',
          };
          return {
            ...scn,
            status: 'ACTIVE' as const,
            operations: updatedOps,
            commandLogs: [logEntry, ...(scn.commandLogs || [])],
          };
        });

        saveScenarios(updated);
        setSelectedMoIds([]);
        recordAudit({
          entityId: batchDoc,
          entityCode: batchDoc,
          moduleName: 'پیشخوان تولید (MO Bulk Actions)',
          actionType: 'UPDATE',
          title: `شروع گروهی ${toPersianDigits(targetOrders.length)} دستور تولید (${batchDoc})`,
          details: `دستورات: ${targetOrders.map(o => o.orderCode).join('، ')}`,
        });
        showUndoToast({
          title: `${toPersianDigits(targetOrders.length)} دستور تولید به صورت گروهی استارت خورد`,
          detail: 'تا ۸ ثانیه امکان لغو عملیات گروهی (Undo) وجود دارد.',
          variant: 'success',
          onUndo: () => saveScenarios(previousSnapshot),
        });
      },
    });
  };

  const handleBulkPauseMos = () => {
    const targetOrders = scenarios.filter(
      s => selectedMoIds.includes(s.id) && s.status !== 'COMPLETED'
    );
    if (targetOrders.length === 0) return;

    requestConfirm({
      title: `توقف گروهی خط تولید (${toPersianDigits(targetOrders.length)} دستور کار MO)`,
      message: `آیا از اعلام توقف موقت خط (Line Stop) برای ${toPersianDigits(targetOrders.length)} دستور تولید انتخاب‌شده اطمینان دارید؟`,
      consequences: [
        `تغییر وضعیت دستورات (${targetOrders.map(o => o.orderCode).join('، ')}) به حالت توقف خط (HALTED)`,
        'توقف موقت ثبت کارکرد اپراتورها روی ایستگاه‌های مرتبط تا رفع توقف',
        'ثبت لاگ توقف گروهی در Audit Trail کارخانه',
      ],
      confirmLabel: 'بله، ثبت توقف گروهی',
      variant: 'warning',
      onConfirm: () => {
        const previousSnapshot = [...scenarios];
        const batchDoc = `BLK-STP-${Math.floor(100 + Math.random() * 899)}`;
        const updated = scenarios.map(scn => {
          if (!selectedMoIds.includes(scn.id) || scn.status === 'COMPLETED') return scn;
          const logEntry: IssuedCommandLog = {
            id: `CMD-${Date.now()}-${scn.id}`,
            docNumber: batchDoc,
            type: 'OP_LOGGED',
            title: `اعلام توقف گروهی خط (Bulk Line Stop) برای دستور ${scn.orderCode}`,
            timestamp: 'امروز - اکشن گروهی مدیر تولید',
            qtyOrWeight: 'توقف خط',
            targetStation: scn.operations[0]?.hall || 'خط تولید',
          };
          return {
            ...scn,
            status: 'HALTED' as const,
            commandLogs: [logEntry, ...(scn.commandLogs || [])],
          };
        });

        saveScenarios(updated);
        setSelectedMoIds([]);
        recordAudit({
          entityId: batchDoc,
          entityCode: batchDoc,
          moduleName: 'پیشخوان تولید (MO Bulk Actions)',
          actionType: 'LINE_STOP',
          title: `توقف گروهی ${toPersianDigits(targetOrders.length)} دستور کار (${batchDoc})`,
          details: `دستورات متوقف‌شده: ${targetOrders.map(o => o.orderCode).join('، ')}`,
        });
        showUndoToast({
          title: `توقف خط گروهی برای ${toPersianDigits(targetOrders.length)} دستور کار ثبت شد`,
          detail: 'تا ۸ ثانیه امکان لغو توقف گروهی (Undo) وجود دارد.',
          variant: 'warning',
          onUndo: () => saveScenarios(previousSnapshot),
        });
      },
    });
  };

  const handleBulkCompleteMos = () => {
    const targetOrders = scenarios.filter(
      s => selectedMoIds.includes(s.id) && s.status !== 'COMPLETED'
    );
    if (targetOrders.length === 0) return;

    const totalPieces = targetOrders.reduce((sum, o) => sum + o.orderQty, 0);

    requestConfirm({
      title: `اتمام تولید و صدور رسید انبار گروهی (${toPersianDigits(targetOrders.length)} دستور MO)`,
      message: `آیا از اعلام اتمام تولید و صدور خودکار رسید انبار محصول نهایی برای ${toPersianDigits(targetOrders.length)} دستور کار (مجموعاً ${formatNumber(totalPieces)} قطعه) اطمینان دارید؟`,
      consequences: [
        `صدور خودکار اسناد رسید انبار محصول نهایی برای ${toPersianDigits(targetOrders.length)} دستور کار`,
        `افزایش موجودی انبار محصول نهایی به میزان ${formatNumber(totalPieces)} عدد`,
        `تغییر وضعیت دستورات (${targetOrders.map(o => o.orderCode).join('، ')}) به تکمیل‌شده (COMPLETED)`,
      ],
      confirmLabel: 'تایید اتمام و رسید انبار گروهی',
      variant: 'emerald',
      onConfirm: async () => {
        const previousSnapshot = [...scenarios];
        const batchDoc = `FG-BLK-${Math.floor(1000 + Math.random() * 8999)}`;

        for (const order of targetOrders) {
          const lastOp = order.operations[order.operations.length - 1];
          const finishedQty =
            lastOp && lastOp.completedGood > 0 ? lastOp.completedGood : order.orderQty;
          if (onSubmitVoucher) {
            await onSubmitVoucher({
              voucherType: 'RECEIPT',
              partId: order.partId,
              stageId: 'STAGE_FINISHED_STORE',
              quantity: finishedQty,
              referenceDoc: order.orderCode,
              notes: `رسید انبار گروهی (${batchDoc}) از دستور تولید ${order.orderCode} | ذوب ${order.heatNumber || 'HT-99412'}`,
            }).catch(() => {});
          }
        }

        const updated = scenarios.map(scn => {
          if (!selectedMoIds.includes(scn.id) || scn.status === 'COMPLETED') return scn;
          const lastOp = scn.operations[scn.operations.length - 1];
          const finishedQty =
            lastOp && lastOp.completedGood > 0 ? lastOp.completedGood : scn.orderQty;
          const updatedOps = scn.operations.map(op => ({
            ...op,
            completedGood: Math.max(op.completedGood, finishedQty),
          }));
          const logEntry: IssuedCommandLog = {
            id: `CMD-${Date.now()}-${scn.id}`,
            docNumber: batchDoc,
            type: 'FG_RECEIPT',
            title: `اتمام تولید گروهی دستور ${scn.orderCode} و رسید ${formatNumber(finishedQty)} عدد به انبار محصول نهایی`,
            timestamp: 'امروز - رسید گروهی انبار',
            qtyOrWeight: `${formatNumber(finishedQty)} عدد`,
            targetStation: 'انبار محصول نهایی',
          };
          return {
            ...scn,
            status: 'COMPLETED' as const,
            finishedReceiptVoucherNo: batchDoc,
            operations: updatedOps,
            commandLogs: [logEntry, ...(scn.commandLogs || [])],
          };
        });

        saveScenarios(updated);
        setSelectedMoIds([]);
        recordAudit({
          entityId: batchDoc,
          entityCode: batchDoc,
          moduleName: 'پیشخوان تولید (MO Bulk Actions)',
          actionType: 'COMPLETE_MO',
          title: `اتمام تولید و رسید انبار گروهی ${toPersianDigits(targetOrders.length)} دستور (${batchDoc})`,
          details: `دستورات تکمیل‌شده: ${targetOrders.map(o => o.orderCode).join('، ')} | مجموع تیراژ: ${formatNumber(totalPieces)} عدد`,
        });
        showUndoToast({
          title: `${toPersianDigits(targetOrders.length)} دستور تولید تکمیل و رسید انبار (${batchDoc}) صادر شد`,
          detail: 'تا ۸ ثانیه امکان لغو اتمام گروهی (Undo) وجود دارد.',
          variant: 'success',
          onUndo: () => saveScenarios(previousSnapshot),
        });
      },
    });
  };

  // Toggle Line Stop (HALTED vs ACTIVE) Protected by Defensive UX ConfirmDialog + Undo
  const handleToggleLineStop = (order: HighwayPartScenario) => {
    const nextHalted = order.status !== 'HALTED';

    requestConfirm({
      title: nextHalted
        ? `تایید اعلام توقف خط (Line Stop) — ${order.orderCode}`
        : `تایید رفع توقف و راه‌اندازی مجدد خط — ${order.orderCode}`,
      message: nextHalted
        ? `آیا از ثبت توقف موقت خط برای قطعه «${order.partName}» اطمینان دارید؟`
        : `آیا آماده بازگرداندن دستور تولید «${order.partName}» به مدار تولید فعال هستید؟`,
      consequences: nextHalted
        ? [
            'تغییر وضعیت دستور کار به حالت تعلیق / توقف خط (HALTED)',
            'ثبت لاگ توقف خط در تاریخچه تغییرات (Audit Trail) و ایستگاه جاری',
            'توقف موقت ثبت کارکرد تا زمان رفع علت توقف',
          ]
        : [
            'تغییر وضعیت دستور کار به حالت در جریان (ACTIVE)',
            'فعال‌سازی مجدد ایستگاه عملیاتی جاری جهت ثبت کارکرد اپراتور',
          ],
      confirmLabel: nextHalted ? 'بله، ثبت توقف خط' : 'بله، راه‌اندازی مجدد خط',
      variant: nextHalted ? 'warning' : 'emerald',
      onConfirm: () => {
        const previousSnapshot = [...scenarios];
        const docNo = nextHalted
          ? `STOP-${Math.floor(100 + Math.random() * 899)}`
          : `RES-${Math.floor(100 + Math.random() * 899)}`;
        const newLog: IssuedCommandLog = {
          id: `CMD-${Date.now()}`,
          docNumber: docNo,
          type: 'OP_LOGGED',
          title: nextHalted
            ? `اعلام توقف موقت خط (Line Stop) برای دستور ${order.orderCode}`
            : `رفع توقف و راه‌اندازی مجدد خط تولید دستور ${order.orderCode}`,
          timestamp: 'امروز - ثبت سرپرست خط',
          qtyOrWeight: nextHalted ? 'توقف خط' : 'فعال‌سازی مجدد',
          targetStation: order.operations[0]?.hall || 'خط تولید',
        };

        const updated = scenarios.map(scn => {
          if (scn.id !== order.id) return scn;
          return {
            ...scn,
            status: (nextHalted ? 'HALTED' : 'ACTIVE') as HighwayPartScenario['status'],
            commandLogs: [newLog, ...(scn.commandLogs || [])],
          };
        });
        saveScenarios(updated);

        recordAudit({
          entityId: order.id,
          entityCode: order.orderCode,
          moduleName: 'کنترل خط تولید',
          actionType: 'LINE_STOP',
          title: nextHalted
            ? `ثبت توقف خط (${docNo}) برای دستور ${order.orderCode}`
            : `رفع توقف خط (${docNo}) برای دستور ${order.orderCode}`,
          details: `قطعه «${order.partName}» در ایستگاه ${order.operations[0]?.stepCode || 'OP10'}`,
        });

        showUndoToast({
          title: nextHalted
            ? `توقف خط (Line Stop) برای دستور ${order.orderCode} ثبت شد`
            : `دستور تولید ${order.orderCode} مجدداً فعال شد`,
          detail: 'برای بازگردانی وضعیت قبلی دستور کار روی لغو (Undo) کلیک کنید.',
          variant: nextHalted ? 'warning' : 'success',
          onUndo: () => {
            saveScenarios(previousSnapshot);
            recordAudit({
              entityId: order.id,
              entityCode: order.orderCode,
              moduleName: 'کنترل خط تولید',
              actionType: 'RESTORE_UNDO',
              title: `لغو تغییر وضعیت توقف خط (Undo) برای ${order.orderCode}`,
              details: 'وضعیت قبلی دستور کار بازنشانی شد.',
            });
          },
        });
      },
    });
  };

  // Available Raw Materials & SAPCO Coils with Heat Number & Batch Number
  const availableRawSheetsCatalog = useMemo(() => {
    const coilItems = coils.map((c, idx) => ({
      id: c.id,
      code: c.partCode || c.coilNumber,
      name: `${c.partName} (کلاف ${c.coilNumber})`,
      grade: c.materialGrade,
      thicknessMm: c.thicknessMm,
      availableKg: Math.max(0, c.receivedWeightKg - c.consumedWeightKg),
      coilNumber: c.coilNumber,
      heatNumber: c.heatNumber || `HT-${99100 + idx * 117}-MOB`,
      sapcoBatchNumber: c.batchNumber || `BCH-SAP-1404-${101 + idx}`,
    }));

    const rawParts = parts
      .filter(p => p.category === 'RAW_MATERIAL')
      .map((p, idx) => {
        const balances = (summary?.stageBalances || []).filter(
          (sb: any) => sb.partId === p.id || sb.partCode === p.code
        );
        const stockKg =
          balances.reduce((acc: number, sb: any) => acc + (sb.totalKg || sb.usableQty || 0), 0) ||
          18500;
        const matchedCoil = coilItems.find(
          c =>
            c.code === p.code ||
            (p.materialGrade && c.grade.toLowerCase() === p.materialGrade.toLowerCase())
        );
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          grade: p.materialGrade || 'ST12',
          thicknessMm: p.thicknessMm || 1.5,
          availableKg: stockKg,
          coilNumber: matchedCoil?.coilNumber || `MOB-2025-${p.materialGrade || 'ST12'}-${401 + idx}`,
          heatNumber: matchedCoil?.heatNumber || `HT-${98400 + idx * 135}-MOB`,
          sapcoBatchNumber: matchedCoil?.sapcoBatchNumber || `BCH-SAP-1404-${101 + idx}`,
        };
      });

    const fallbackDefaults = [
      {
        id: 'RM-DC01-20',
        code: 'RM-COIL-DC01A-2.0-1140',
        name: 'رول ورق DC01A ضخامت 2.0 عرض 1140',
        grade: 'DC01A',
        thicknessMm: 2.0,
        availableKg: 18500,
        coilNumber: 'MOB-2025-DC01-409',
        heatNumber: 'HT-99412-MOB',
        sapcoBatchNumber: 'BCH-SAP-1404-101',
      },
      {
        id: 'RM-DC04-12',
        code: 'RM-COIL-DC04-1.2-1250',
        name: 'رول ورق کشش عمیق DC04 ضخامت 1.2 عرض 1250',
        grade: 'DC04',
        thicknessMm: 1.2,
        availableKg: 24000,
        coilNumber: 'MOB-2025-DC04-512',
        heatNumber: 'HT-88305-MOB',
        sapcoBatchNumber: 'BCH-SAP-1404-102',
      },
      {
        id: 'RM-ST14-08',
        code: 'RM-COIL-ST14-0.8-1000',
        name: 'رول ورق فوق کشش ST14 ضخامت 0.8 عرض 1000',
        grade: 'ST14',
        thicknessMm: 0.8,
        availableKg: 16200,
        coilNumber: 'MOB-2025-ST14-608',
        heatNumber: 'HT-65310-MOB',
        sapcoBatchNumber: 'BCH-SAP-1404-104',
      },
      {
        id: 'RM-ST37-25',
        code: 'RM-COIL-ST37-2.5-1250',
        name: 'ورق ضخیم ST37 ضخامت 2.5 عرض 1250',
        grade: 'ST37',
        thicknessMm: 2.5,
        availableKg: 32000,
        coilNumber: 'FOO-2025-ST37-701',
        heatNumber: 'HT-77190-FOOLAD',
        sapcoBatchNumber: 'BCH-SAP-1404-103',
      },
    ];

    const combined = [...coilItems, ...rawParts];
    return combined.length > 0 ? combined : fallbackDefaults;
  }, [parts, coils, summary]);

  // Helper: Build Operations (`OP10`, `OP20`...) and Default BOM Sheet + Heat Number for a Selected Part
  const buildOrderDataFromMasterPart = (
    selectedPart: Part,
    currentOrderCode: string
  ): HighwayPartScenario => {
    const matchedRouting = routings.find(
      r => r.partId === selectedPart.id || r.partCode === selectedPart.code
    );

    const correlatedDies = dies.filter(
      d => d.partId === selectedPart.id || d.partCode === selectedPart.code
    );

    let mappedOperations: HighwayOperationStep[] = [];

    if (matchedRouting && matchedRouting.operations && matchedRouting.operations.length > 0) {
      mappedOperations = matchedRouting.operations.map((op, idx) => {
        const matchedMachine = machines.find(m => m.id === op.machineId);
        const matchedDie =
          dies.find(d => d.id === op.dieMoldId) || correlatedDies[idx];
        return {
          stepCode: op.stepCode || `OP${(idx + 1) * 10}`,
          stepName: op.stepName,
          processType: op.processType,
          hall: matchedMachine?.location || 'سالن پرس‌های متوسط و برک CNC (۲۵۰ و ۱۶۰ تن)',
          machineId: op.machineId,
          machineName:
            op.machineName ||
            matchedMachine?.name ||
            machines[idx % Math.max(1, machines.length)]?.name ||
            'پرس ضربه‌ای ۲۵۰ تن',
          dieId: op.dieMoldId || matchedDie?.id,
          dieName:
            op.dieMoldName ||
            matchedDie?.code ||
            `DIE-${selectedPart.code.slice(-6)}-OP${(idx + 1) * 10}`,
          cycleTimeSec: op.standardCycleTimeSec || 12,
          isShared: op.isSharedOperation,
          sharedWithPart: op.sharedPartName,
          completedGood: 0,
          scrapQty: 0,
          isFinal: idx === matchedRouting.operations.length - 1,
        };
      });
    } else {
      const die1 = correlatedDies[0];
      const die2 = correlatedDies[1] || correlatedDies[0];
      const shearMachine =
        machines.find(m => m.processType === 'SHEARING') || machines[0];
      const pressMachine =
        machines.find(m => m.processType === 'BLANKING' || m.processType === 'DRAWING') ||
        machines[1] ||
        machines[0];
      const finalMachine =
        machines.find(m => m.processType === 'PUNCH_FORM' || m.processType === 'SPOT_WELD') ||
        machines[2] ||
        pressMachine;

      mappedOperations = [
        {
          stepCode: 'OP10',
          stepName: `برش و نواربری ورق (${selectedPart.materialGrade || 'ST12'})`,
          processType: 'SHEARING',
          hall: shearMachine?.location || 'سالن برشکاری، نواربری و آماده‌سازی بلنک',
          machineId: shearMachine?.id,
          machineName: shearMachine?.name || 'قیچی گیوتین ۶ متری ۱',
          dieName: 'BLD-SHR-01',
          cycleTimeSec: 6,
          completedGood: 0,
          scrapQty: 0,
          isFinal: false,
        },
        {
          stepCode: 'OP20',
          stepName: die1 ? die1.name : `بلنکینگ و فرم‌دهی اولیه ${selectedPart.name}`,
          processType: die1?.processType || 'BLANKING',
          hall: pressMachine?.location || 'سالن پرس‌های سنگین (۸۰۰ و ۴۰۰ تن)',
          machineId: pressMachine?.id,
          machineName: pressMachine?.name || 'پرس ضربه‌ای ۲۵۰ تن ۱',
          dieId: die1?.id,
          dieName: die1?.code || `DIE-${selectedPart.code}-BLK`,
          cycleTimeSec: 12,
          completedGood: 0,
          scrapQty: 0,
          isFinal: false,
        },
        {
          stepCode: 'OP30',
          stepName: die2 && die2 !== die1 ? die2.name : `پانچ، خم نهایی و تحویل به انبار`,
          processType: die2?.processType || 'PUNCH_FORM',
          hall: finalMachine?.location || 'سالن پرس‌های متوسط و برک CNC (۲۵۰ و ۱۶۰ تن)',
          machineId: finalMachine?.id,
          machineName: finalMachine?.name || 'پرس ۱۶۰ تن پانچ و فرم',
          dieId: die2?.id,
          dieName: die2?.code || `DIE-${selectedPart.code}-FIN`,
          cycleTimeSec: 14,
          completedGood: 0,
          scrapQty: 0,
          isFinal: true,
        },
      ];
    }

    const matchedSheet =
      availableRawSheetsCatalog.find(
        rm =>
          (selectedPart.materialGrade &&
            rm.grade.toLowerCase() === selectedPart.materialGrade.toLowerCase()) ||
          (selectedPart.thicknessMm && rm.thicknessMm === selectedPart.thicknessMm)
      ) || availableRawSheetsCatalog[0];

    const prodBatchCode = `BCH-PRD-${currentOrderCode.replace('MO-', '')}`;

    return {
      id: `SCN-${Date.now()}`,
      orderCode: currentOrderCode,
      productionBatchCode: prodBatchCode,
      partId: selectedPart.id,
      partCode: selectedPart.code,
      partName: selectedPart.name,
      carModel: selectedPart.carModel || 'پژو ۲۰۶',
      customerName: 'ساپکو',
      orderQty: 2000,
      unitWeightKg: selectedPart.weightPerUnitKg || 1.2,
      scrapAllowancePct: 4.5,
      rawMaterialPartId: matchedSheet?.id,
      rawMaterialCode: matchedSheet?.code || 'RM-COIL-ST12-1.5',
      rawMaterialName:
        matchedSheet?.name ||
        `رول ورق ${selectedPart.materialGrade || 'ST12'} ضخامت ${selectedPart.thicknessMm || 1.5}`,
      coilNumber: matchedSheet?.coilNumber || 'MOB-2025-DC01-409',
      heatNumber: matchedSheet?.heatNumber || 'HT-99412-MOB',
      sapcoBatchNumber: matchedSheet?.sapcoBatchNumber || 'BCH-SAP-1404-101',
      isCustomSheetOverride: false,
      warehouseAvailableKg: matchedSheet?.availableKg || 18500,
      bomSubComponents: [
        {
          name: `بلنک ورق برش‌خورده ${selectedPart.name}`,
          qtyPerParent: 1,
          unit: 'عدد',
          stage: mappedOperations[0]?.stepName || 'برش و بلنکینگ',
        },
        {
          name: `قطعه فرم‌دهی‌شده (${selectedPart.code})`,
          qtyPerParent: 1,
          unit: 'عدد',
          stage: mappedOperations[mappedOperations.length - 1]?.stepName || 'پرس نهایی',
        },
      ],
      operations: mappedOperations,
      commandLogs: [],
    };
  };

  // Open Create MO Modal
  const handleOpenCreateNewOrder = () => {
    setIsNewOrderMode(true);
    setAllowManualSheetOverride(false);
    const newMoCode = `MO-1404-${Math.floor(2100 + Math.random() * 7000)}`;
    const defaultPart = produciblePartsCatalog[0];

    if (defaultPart) {
      setEditingOrder(buildOrderDataFromMasterPart(defaultPart, newMoCode));
    } else {
      const tpl = INITIAL_SCENARIOS[0];
      setEditingOrder({
        ...tpl,
        id: `SCN-${Date.now()}`,
        orderCode: newMoCode,
        productionBatchCode: `BCH-PRD-${newMoCode.replace('MO-', '')}`,
        operations: tpl.operations.map(o => ({ ...o, completedGood: 0, scrapQty: 0 })),
        commandLogs: [],
      });
    }
    router.openCreateMoModal();
  };

  // Listen to Contextual Floating Action Menu events
  useEffect(() => {
    const handleContextual = (e: Event) => {
      const custom = e as CustomEvent<{ actionType?: string }>;
      if (custom.detail?.actionType === 'OPEN_CREATE_MO') {
        handleOpenCreateNewOrder();
      } else if (custom.detail?.actionType === 'OPEN_TRACK_FIRST_ORDER') {
        if (scenarios.length > 0) {
          setTrackingOrderId(scenarios[0].id);
        }
      }
    };
    window.addEventListener('kpims:contextual-action', handleContextual);
    return () => window.removeEventListener('kpims:contextual-action', handleContextual);
  }, [scenarios, produciblePartsCatalog, routings, machines, dies]);

  const activeScenarios = useMemo(() => scenarios.filter(s => !s.isDeleted), [scenarios]);
  const activeCount = useMemo(() => activeScenarios.filter(s => s.status !== 'COMPLETED').length, [activeScenarios]);
  const completedCount = useMemo(() => activeScenarios.filter(s => s.status === 'COMPLETED').length, [activeScenarios]);
  const pinnedCount = useMemo(
    () => activeScenarios.filter(s => isScenarioVip(s)).length,
    [activeScenarios, parts, vipMap]
  );

  // Filtered Orders by Search, Car Model, and Schedule Tab (Excludes Soft-Deleted Orders, prioritizes VIP)
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = activeScenarios.filter(scn => {
      if (carFilter !== 'ALL' && scn.carModel !== carFilter) return false;

      const vip = isScenarioVip(scn);
      if (scheduleTabFilter === 'ACTIVE' && scn.status === 'COMPLETED') return false;
      if (scheduleTabFilter === 'COMPLETED' && scn.status !== 'COMPLETED') return false;
      if (scheduleTabFilter === 'PINNED' && !vip) return false;

      if (!q) return true;
      return (
        scn.partName.toLowerCase().includes(q) ||
        scn.partCode.toLowerCase().includes(q) ||
        scn.orderCode.toLowerCase().includes(q) ||
        scn.carModel.toLowerCase().includes(q) ||
        scn.rawMaterialName.toLowerCase().includes(q) ||
        (scn.heatNumber && scn.heatNumber.toLowerCase().includes(q)) ||
        (scn.coilNumber && scn.coilNumber.toLowerCase().includes(q)) ||
        (scn.productionBatchCode && scn.productionBatchCode.toLowerCase().includes(q))
      );
    });
    return [...list].sort((a, b) => Number(isScenarioVip(b)) - Number(isScenarioVip(a)));
  }, [activeScenarios, searchQuery, carFilter, scheduleTabFilter, parts, vipMap]);

  const uniqueCarModels = useMemo(
    () => Array.from(new Set(scenarios.map(s => s.carModel))),
    [scenarios]
  );

  // Aggregate Factory Metrics for the Configurable KPI Overview Section
  const aggregateMetrics = useMemo(() => {
    let totalWarehouseKg = 0;
    let totalConsumedSheetKg = 0;
    let totalOrderQty = 0;
    let totalFinishedQty = 0;
    let totalWipQty = 0;
    let totalGoodAcrossOps = 0;
    let totalScrapAcrossOps = 0;

    scenarios.forEach(scn => {
      totalWarehouseKg += scn.warehouseAvailableKg;
      totalOrderQty += scn.orderQty;
      const lastOp = scn.operations[scn.operations.length - 1];
      const firstOp = scn.operations[0];
      if (lastOp) totalFinishedQty += lastOp.completedGood;
      if (firstOp) {
        totalConsumedSheetKg += Math.round(firstOp.completedGood * scn.unitWeightKg * 1.04);
      }
      scn.operations.forEach((op, idx) => {
        totalGoodAcrossOps += op.completedGood;
        totalScrapAcrossOps += op.scrapQty;
        if (idx > 0) {
          const prev = scn.operations[idx - 1];
          totalWipQty += Math.max(0, prev.completedGood - op.completedGood);
        }
      });
    });

    const availabilityPct = 92.4;
    const performancePct = 94.1;
    const qualityPct =
      totalGoodAcrossOps > 0
        ? Math.round(
            ((totalGoodAcrossOps - totalScrapAcrossOps) / totalGoodAcrossOps) * 1000
          ) / 10
        : 98.5;
    const overallOeePct =
      Math.round(((availabilityPct * performancePct * qualityPct) / 10000) * 10) / 10;

    const outputRealizationPct =
      totalOrderQty > 0 ? Math.round((totalFinishedQty / totalOrderQty) * 1000) / 10 : 0;

    // Inventory Turnover metrics
    const avgInventoryKg = Math.max(1000, totalWarehouseKg);
    const annualizedConsumptionKg = Math.max(15000, totalConsumedSheetKg) * 12;
    const sheetTurnoverRate = Math.round((annualizedConsumptionKg / avgInventoryKg) * 10) / 10;
    const daysOfInventorySupply = Math.max(
      4,
      Math.round(365 / Math.max(1, sheetTurnoverRate))
    );

    return {
      totalWarehouseKg,
      totalConsumedSheetKg,
      totalOrderQty,
      totalFinishedQty,
      totalWipQty,
      availabilityPct,
      performancePct,
      qualityPct,
      overallOeePct,
      outputRealizationPct,
      sheetTurnoverRate,
      daysOfInventorySupply,
    };
  }, [scenarios]);

  // Issue Raw Material Sheet Voucher to Line (With Heat Number & Production Batch traceability!)
  const handleIssueSheetForOrder = async (order: HighwayPartScenario) => {
    const netWeightKg = Math.round(order.orderQty * order.unitWeightKg);
    const grossRequiredKg = Math.round(netWeightKg * (1 + order.scrapAllowancePct / 100));
    const voucherNo = `ISS-1404-${Math.floor(100 + Math.random() * 899)}`;
    const nowTime = 'امروز - ثبت سیستمی';

    if (onSubmitVoucher && order.rawMaterialPartId) {
      await onSubmitVoucher({
        voucherType: 'ISSUE',
        partId: order.rawMaterialPartId,
        stageId: 'STAGE_RAW_STORE',
        targetStageId: 'STAGE_SHEARING',
        quantity: grossRequiredKg,
        referenceDoc: order.orderCode,
        notes: `حواله ورق برای دستور تولید ${order.orderCode} | کلاف: ${order.coilNumber || '—'} | شماره ذوب: ${order.heatNumber || '—'} | بچ تولید: ${order.productionBatchCode}`,
      }).catch(() => {});
    }

    const newLog: IssuedCommandLog = {
      id: `CMD-${Date.now()}`,
      docNumber: voucherNo,
      type: 'MATERIAL_ISSUED',
      title: `حواله کلاف ${order.coilNumber || order.rawMaterialCode} (ذوب ${order.heatNumber || 'HT-99412'}) به بچ تولید ${order.productionBatchCode}`,
      timestamp: nowTime,
      qtyOrWeight: `${formatNumber(grossRequiredKg)} کیلوگرم`,
      targetStation: order.operations[0]?.hall || 'سالن برشکاری',
    };

    const updated = scenarios.map(scn => {
      if (scn.id !== order.id) return scn;
      return {
        ...scn,
        materialIssuedVoucherNo: voucherNo,
        warehouseAvailableKg: Math.max(0, scn.warehouseAvailableKg - grossRequiredKg),
        commandLogs: [newLog, ...(scn.commandLogs || [])],
      };
    });

    saveScenarios(updated);
    setToastMessage({
      type: 'success',
      title: `حواله ورق ${voucherNo} با شماره ذوب ${order.heatNumber || 'HT-99412'} صادر شد`,
      detail: `مقدار ${formatNumber(grossRequiredKg)} کیلوگرم کلاف «${order.coilNumber || order.rawMaterialCode}» به بچ تولید ${order.productionBatchCode} اختصاص یافت.`,
      trackOrderId: order.id,
      navAction: {
        label: 'مشاهده ردیابی ذوب ساپکو',
        onClick: () => onNavigateToTab?.('sapco'),
      },
    });
  };

  // Open Step Logger with Strict Precedence Validation (تقدم و تأخر)
  const handleOpenStepLogger = (order: HighwayPartScenario, opIdx: number) => {
    const targetOp = order.operations[opIdx];
    const prevOp = opIdx > 0 ? order.operations[opIdx - 1] : null;

    if (prevOp && prevOp.completedGood === 0) {
      setToastMessage({
        type: 'warning',
        title: `توقف به دلیل تقدم و تأخر فرآیند (${targetOp.stepCode} قفل است)`,
        detail: `شما نمی‌توانید «${targetOp.stepName}» را شروع کنید زیرا مرحله قبلی (${prevOp.stepCode} — ${prevOp.stepName}) هنوز هیچ خروجی سالمی ثبت نکرده است.`,
        trackOrderId: order.id,
      });
      return;
    }

    const maxAllowedFromPrev = prevOp ? prevOp.completedGood : order.orderQty;
    const remainingToComplete = Math.max(0, maxAllowedFromPrev - targetOp.completedGood);

    setLoggingTarget({ orderId: order.id, opIndex: opIdx });
    setLogQtyInput(
      String(remainingToComplete > 0 ? maxAllowedFromPrev : targetOp.completedGood || 500)
    );
    setLogScrapInput(String(targetOp.scrapQty || 0));
  };

  const handleSaveStepProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingTarget) return;

    const order = scenarios.find(s => s.id === loggingTarget.orderId);
    if (!order) return;

    const opIdx = loggingTarget.opIndex;
    const targetOp = order.operations[opIdx];
    const prevOp = opIdx > 0 ? order.operations[opIdx - 1] : null;
    const newGood = Math.max(0, Number(logQtyInput) || 0);
    const newScrap = Math.max(0, Number(logScrapInput) || 0);

    if (prevOp && newGood > prevOp.completedGood) {
      setToastMessage({
        type: 'warning',
        title: 'خطای سقف مجاز ورودی از مرحله قبل',
        detail: `تعداد ثبت‌شده (${formatNumber(newGood)} عدد) نمی‌تواند از خروجی سالم مرحله قبلی (${formatNumber(prevOp.completedGood)} عدد در ${prevOp.stepCode}) بیشتر باشد.`,
      });
      return;
    }

    const docNo = targetOp.isFinal
      ? `FG-REC-${Math.floor(1000 + Math.random() * 8999)}`
      : `OP-LOG-${Math.floor(1000 + Math.random() * 8999)}`;

    const newLog: IssuedCommandLog = {
      id: `CMD-${Date.now()}`,
      docNumber: docNo,
      type: targetOp.isFinal ? 'FG_RECEIPT' : 'OP_LOGGED',
      title: targetOp.isFinal
        ? `تکمیل ${targetOp.stepCode} و رسید محصول نهایی (بچ ${order.productionBatchCode} / ذوب ${order.heatNumber})`
        : `ثبت تولید ایستگاه ${targetOp.stepCode} (${targetOp.stepName})`,
      timestamp: 'امروز - ثبت کارگاه',
      qtyOrWeight: `${formatNumber(newGood)} عدد سالم (ضایعات: ${formatNumber(newScrap)})`,
      targetStation: targetOp.isFinal
        ? 'انبار محصول نهایی'
        : order.operations[opIdx + 1]?.stepName || targetOp.hall,
    };

    const updated = scenarios.map(scn => {
      if (scn.id !== order.id) return scn;
      const nextOps = scn.operations.map((op, i) => {
        if (i !== opIdx) return op;
        return { ...op, completedGood: newGood, scrapQty: newScrap };
      });
      return {
        ...scn,
        finishedReceiptVoucherNo: targetOp.isFinal ? docNo : scn.finishedReceiptVoucherNo,
        operations: nextOps,
        commandLogs: [newLog, ...(scn.commandLogs || [])],
      };
    });

    saveScenarios(updated);
    setLoggingTarget(null);

    setToastMessage({
      type: 'success',
      title: targetOp.isFinal
        ? `رسید انبار محصول (${docNo}) با شماره ذوب ${order.heatNumber || 'HT-99412'} صادر شد`
        : `کارکرد ${targetOp.stepCode} (${docNo}) ثبت شد`,
      detail: targetOp.isFinal
        ? `${formatNumber(newGood)} عدد «${order.partName}» از بچ تولید ${order.productionBatchCode} در انبار محصول نهایی رسید شد.`
        : `موجودی بافر پای خط بروزرسانی شد و ایستگاه بعدی آماده تولید است.`,
      trackOrderId: order.id,
    });
  };

  // Save Edited or New Work Order
  const handleSaveWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const creationLog: IssuedCommandLog = {
      id: `CMD-${Date.now()}`,
      docNumber: editingOrder.orderCode,
      type: 'MO_CREATED',
      title: isNewOrderMode
        ? `صدور دستور تولید (MO) متصل به ذوب ${editingOrder.heatNumber} و بچ ${editingOrder.productionBatchCode}`
        : `بروزرسانی دستور تولید ${editingOrder.orderCode}`,
      timestamp: 'امروز - ثبت برنامه‌ریزی',
      qtyOrWeight: `${formatNumber(editingOrder.orderQty)} عدد`,
      targetStation: editingOrder.operations[0]?.hall || 'سالن برشکاری',
    };

    const enrichedOrder: HighwayPartScenario = {
      ...editingOrder,
      commandLogs: [creationLog, ...(editingOrder.commandLogs || [])],
    };

    if (isNewOrderMode) {
      const hasSubAssemblies =
        (enrichedOrder.bomSubComponents && enrichedOrder.bomSubComponents.length > 0) ||
        enrichedOrder.partCode.includes('ECU') ||
        enrichedOrder.partCode.includes('ASY') ||
        enrichedOrder.partName.includes('مجموعه');

      if (hasSubAssemblies && !inspectingOrderForWip) {
        setInspectingOrderForWip(enrichedOrder);
        router.openWipCheckModal(enrichedOrder.orderCode, enrichedOrder.partId);
        return;
      }

      saveScenarios([enrichedOrder, ...scenarios]);
      setExpandedOrderId(enrichedOrder.id);
      setExpandedViewMode('OPS');
      recordAudit({
        entityId: enrichedOrder.id,
        entityCode: enrichedOrder.orderCode,
        moduleName: 'پیشخوان تولید (MO)',
        actionType: 'CREATE',
        title: `صدور دستور تولید جدید ${enrichedOrder.orderCode} (${enrichedOrder.partName})`,
        details: `تیراژ ${formatNumber(enrichedOrder.orderQty)} عدد متصل به ذوب ${enrichedOrder.heatNumber}`,
      });
      showUndoToast({
        title: `دستور تولید ${enrichedOrder.orderCode} صادر شد`,
        detail: `کالای «${enrichedOrder.partName}» با ذوب ${enrichedOrder.heatNumber} ثبت شد.`,
        variant: 'success',
      });
      setEditingOrder(null);
      setIsNewOrderMode(false);
      router.closeModal();
      return;
    } else {
      const previousSnapshot = [...scenarios];
      const next = scenarios.map(s => (s.id === enrichedOrder.id ? enrichedOrder : s));
      saveScenarios(next);
      recordAudit({
        entityId: enrichedOrder.id,
        entityCode: enrichedOrder.orderCode,
        moduleName: 'پیشخوان تولید (MO)',
        actionType: 'UPDATE',
        title: `ویرایش دستور تولید ${enrichedOrder.orderCode} در کشو`,
        details: `بروزرسانی مشخصات قطعه «${enrichedOrder.partName}» و تیراژ ${formatNumber(enrichedOrder.orderQty)} عدد`,
      });
      showUndoToast({
        title: `دستور تولید ${enrichedOrder.orderCode} بروزرسانی شد`,
        detail: 'تغییرات دستور ساخت ذخیره گردید.',
        variant: 'success',
        onUndo: () => {
          saveScenarios(previousSnapshot);
        },
      });
    }
    setEditingOrder(null);
    setIsNewOrderMode(false);
    router.closeModal();
  };

  // 1-Click Sub-MO Issuance directly from WIP Pre-Flight Check without page navigation
  const handleCreateSubMoScenario = (subMoData: {
    parentMoId: string;
    parentOrderCode: string;
    componentPartId: string;
    componentPartCode: string;
    componentPartName: string;
    requiredQty: number;
    subRoutingId?: string;
  }) => {
    const targetPart = produciblePartsCatalog.find(
      p => p.id === subMoData.componentPartId || p.code === subMoData.componentPartCode
    );

    const cleanCode = subMoData.componentPartCode.replace(/[^A-Za-z0-9]/g, '').slice(-8);
    const subOrderCode = `SUB-MO-1404-${cleanCode}-${Math.floor(100 + Math.random() * 900)}`;

    let newSubScenario: HighwayPartScenario;
    if (targetPart) {
      newSubScenario = buildOrderDataFromMasterPart(targetPart, subOrderCode);
    } else {
      const baseRouting = routings.find(
        r => r.id === subMoData.subRoutingId || r.partCode === subMoData.componentPartCode
      );
      newSubScenario = {
        id: `SCN-SUB-${Date.now()}`,
        orderCode: subOrderCode,
        productionBatchCode: `BCH-SUB-${Math.floor(1000 + Math.random() * 9000)}`,
        partId: subMoData.componentPartId,
        partCode: subMoData.componentPartCode,
        partName: subMoData.componentPartName,
        carModel: 'پژو ۲۰۶',
        customerName: 'خط مونتاژ و جوش داخلی',
        orderQty: subMoData.requiredQty,
        unitWeightKg: 0.75,
        scrapAllowancePct: 3.0,
        rawMaterialCode: 'RM-COIL-DC01A-2.0-1140',
        rawMaterialName: 'رول ورق روغنی DC01A ضخامت 2mm ابعاد ۲×۱۱۴۰',
        coilNumber: 'MOB-2025-DC01-409',
        heatNumber: 'HT-99412-MOB',
        sapcoBatchNumber: 'BCH-SAP-1404-101',
        warehouseAvailableKg: 18500,
        materialIssuedVoucherNo: `ISS-SUB-${Math.floor(100 + Math.random() * 900)}`,
        bomSubComponents: [],
        operations: baseRouting?.operations?.map((op, idx) => ({
          stepCode: op.stepCode,
          stepName: op.stepName,
          processType: op.processType,
          hall: 'سالن پرس و برش',
          machineName: op.machineName || 'پرس ضربه‌ای ۲۵۰ تن',
          dieName: `DIE-${op.stepCode}`,
          cycleTimeSec: op.standardCycleTimeSec || 10,
          completedGood: 0,
          scrapQty: 0,
          isFinal: idx === (baseRouting.operations?.length || 1) - 1,
        })) || [
          {
            stepCode: 'OP10',
            stepName: 'نواربری و برش شیت اولیه',
            processType: 'SHEARING',
            hall: 'سالن برشکاری',
            machineName: 'خط نواربر رول',
            dieName: 'BLD-SHR-01',
            cycleTimeSec: 6,
            completedGood: 0,
            scrapQty: 0,
            isFinal: false,
          },
          {
            stepCode: 'OP20',
            stepName: 'بلنکینگ فرم اصلی',
            processType: 'BLANKING',
            hall: 'سالن پرس‌های سنگین',
            machineName: 'پرس ۲۵۰ تن',
            dieName: 'DIE-BLK-01',
            cycleTimeSec: 8,
            completedGood: 0,
            scrapQty: 0,
            isFinal: false,
          },
          {
            stepCode: 'OP50',
            stepName: 'پرس‌جوش مقاومتی و تحویل به پای خط مونتاژ',
            processType: 'SPOT_WELD',
            hall: 'سالن جوشکاری و پرس‌جوش',
            machineName: 'دستگاه پرس‌جوش ۷۵kVA',
            dieName: 'JIG-WELD-01',
            cycleTimeSec: 15,
            completedGood: 0,
            scrapQty: 0,
            isFinal: true,
          },
        ],
      };
    }

    newSubScenario.orderQty = subMoData.requiredQty;
    newSubScenario.notes = `دستور ساخت قطعه پیش‌ساخته فرعی (Sub-MO) متصل به دستور مونتاژ اصلی ${subMoData.parentOrderCode}`;

    const creationLog: IssuedCommandLog = {
      id: `CMD-${Date.now()}`,
      docNumber: newSubScenario.orderCode,
      type: 'MO_CREATED',
      title: `صدور خودکار دستور ساخت قطعه پیش‌ساخته (Sub-MO) متصل به ${subMoData.parentOrderCode}`,
      timestamp: 'امروز - برنامه روزانه',
      qtyOrWeight: `${formatNumber(newSubScenario.orderQty)} عدد`,
      targetStation: 'سالن برش و پرس',
    };
    newSubScenario.commandLogs = [creationLog];

    saveScenarios([newSubScenario, ...scenarios]);

    recordAudit({
      entityId: newSubScenario.id,
      entityCode: newSubScenario.orderCode,
      moduleName: 'پیشخوان تولید (Sub-MO)',
      actionType: 'CREATE',
      title: `صدور خودکار دستور ساخت قطعه پیش‌ساخته ${newSubScenario.orderCode} (${subMoData.componentPartName})`,
      details: `تیراژ ${formatNumber(newSubScenario.orderQty)} عدد متصل به دستور مونتاژ ${subMoData.parentOrderCode}`,
    });

    showUndoToast({
      title: `دستور ساخت فرعی ${newSubScenario.orderCode} صادر شد`,
      detail: `قطعه نیمه‌ساخته «${subMoData.componentPartName}» با تیراژ ${formatNumber(newSubScenario.orderQty)} به خط اضافه شد.`,
      variant: 'success',
    });
  };

  // Soft Delete Work Order (Protected by Defensive UX ConfirmDialog + Gmail-style Undo)
  const handleDeleteOrder = (order: HighwayPartScenario) => {
    requestConfirm({
      title: `حذف منطقی (لغو) دستور تولید ${order.orderCode}`,
      message: `آیا از حذف منطقی دستور تولید قطعه «${order.partName}» به تیراژ ${formatNumber(order.orderQty)} عدد اطمینان دارید؟`,
      consequences: [
        `دستور کار ${order.orderCode} به صورت منطقی (Soft Delete) از لیست فعال خارج می‌شود`,
        `سابقه اسناد و ردیابی ذوب (${order.heatNumber}) در تاریخچه ممیزی (Audit Trail) محفوظ می‌ماند`,
        `امکان بازگردانی فوری (Undo) پس از حذف وجود دارد`,
      ],
      confirmLabel: 'تایید حذف منطقی (Soft Delete)',
      variant: 'danger',
      onConfirm: () => {
        const previousSnapshot = [...scenarios];
        const next = scenarios.map(s => (s.id === order.id ? { ...s, isDeleted: true } : s));
        saveScenarios(next);
        if (expandedOrderId === order.id) {
          setExpandedOrderId(null);
        }
        recordAudit({
          entityId: order.id,
          entityCode: order.orderCode,
          moduleName: 'پیشخوان تولید (MO)',
          actionType: 'SOFT_DELETE',
          title: `حذف منطقی (Soft Delete) دستور تولید ${order.orderCode}`,
          details: `قطعه «${order.partName}» از جدول برنامه‌های جاری آرشیو شد.`,
        });
        showUndoToast({
          title: `دستور تولید ${order.orderCode} حذف منطقی شد`,
          detail: `قطعه «${order.partName}» آرشیو شد. برای بازگردانی کلیک کنید.`,
          variant: 'danger',
          onUndo: () => {
            saveScenarios(previousSnapshot);
            recordAudit({
              entityId: order.id,
              entityCode: order.orderCode,
              moduleName: 'پیشخوان تولید (MO)',
              actionType: 'RESTORE_UNDO',
              title: `بازگردانی (Undo) دستور تولید ${order.orderCode}`,
              details: `دستور تولید «${order.partName}» مجدداً به جدول اصلی بازگشت.`,
            });
          },
        });
      },
    });
  };

  // Save Edited or New Operation Step
  const handleSaveOperationStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpContext) return;

    const previousSnapshot = [...scenarios];
    const { orderId, opIndex, stepData } = editingOpContext;
    const next = scenarios.map(scn => {
      if (scn.id !== orderId) return scn;
      let updatedOps = [...scn.operations];
      if (opIndex === null) {
        updatedOps = updatedOps.map(o => ({ ...o, isFinal: false }));
        updatedOps.push({ ...stepData, isFinal: true });
      } else {
        updatedOps[opIndex] = stepData;
      }
      return { ...scn, operations: updatedOps };
    });

    saveScenarios(next);
    setEditingOpContext(null);
    recordAudit({
      entityId: orderId,
      moduleName: 'مسیر تولید (Routing)',
      actionType: opIndex === null ? 'CREATE' : 'UPDATE',
      title: `${opIndex === null ? 'افزودن' : 'ویرایش'} ایستگاه ${stepData.stepCode} (${stepData.stepName})`,
      details: `دستگاه: ${stepData.machineName} | قالب: ${stepData.dieName}`,
    });
    showUndoToast({
      title: opIndex === null ? 'ایستگاه OP جدید اضافه شد' : `ایستگاه ${stepData.stepCode} ویرایش شد`,
      detail: `عملیات روی دستگاه «${stepData.machineName}» ذخیره گردید.`,
      variant: 'success',
      onUndo: () => {
        saveScenarios(previousSnapshot);
      },
    });
  };

  // Delete an Operation Step (Protected by ConfirmDialog + Soft Undo)
  const handleDeleteOperationStep = (orderId: string, opIdx: number) => {
    const targetOrder = scenarios.find(s => s.id === orderId);
    const targetOp = targetOrder?.operations[opIdx];
    if (!targetOrder || !targetOp) return;

    requestConfirm({
      title: `حذف ایستگاه عملیاتی ${targetOp.stepCode} (${targetOp.stepName})`,
      message: `آیا از حذف مرحله «${targetOp.stepCode}» روی دستگاه «${targetOp.machineName}» از مسیر تولید دستور ${targetOrder.orderCode} اطمینان دارید؟`,
      consequences: [
        'بازچینی خودکار ایستگاه پایانی (Final OP) در مسیر تولید قطعه',
        'ثبت تغییر مسیر تولید در تاریخچه ممیزی (Audit Trail)',
      ],
      confirmLabel: 'حذف ایستگاه OP',
      variant: 'danger',
      onConfirm: () => {
        const previousSnapshot = [...scenarios];
        const next = scenarios.map(scn => {
          if (scn.id !== orderId) return scn;
          if (scn.operations.length <= 1) return scn;
          const filtered = scn.operations.filter((_, i) => i !== opIdx);
          const fixed = filtered.map((o, i) => ({
            ...o,
            isFinal: i === filtered.length - 1,
          }));
          return { ...scn, operations: fixed };
        });
        saveScenarios(next);
        recordAudit({
          entityId: orderId,
          entityCode: targetOrder.orderCode,
          moduleName: 'مسیر تولید (Routing)',
          actionType: 'SOFT_DELETE',
          title: `حذف مرحله ${targetOp.stepCode} از دستور ${targetOrder.orderCode}`,
          details: `ایستگاه ${targetOp.stepName} (${targetOp.machineName}) حذف شد.`,
        });
        showUndoToast({
          title: `ایستگاه ${targetOp.stepCode} حذف شد`,
          detail: 'تا ۸ ثانیه امکان بازگردانی مرحله حذف‌شده وجود دارد.',
          variant: 'warning',
          onUndo: () => {
            saveScenarios(previousSnapshot);
          },
        });
      },
    });
  };

  const trackedOrder = useMemo(
    () => scenarios.find(s => s.id === trackingOrderId) || null,
    [scenarios, trackingOrderId]
  );

  const hallsCatalog = useMemo(
    () => (halls.length > 0 ? halls : FACTORY_HALLS),
    [halls]
  );

  const showOeeSection =
    kpiViewMode === 'OEE' || (kpiViewMode === 'CUSTOM' && kpiCustomSelection.showOee);
  const showOutputSection =
    kpiViewMode === 'OUTPUT_VS_TARGET' ||
    (kpiViewMode === 'CUSTOM' && kpiCustomSelection.showOutputVsTarget);
  const showTurnoverSection =
    kpiViewMode === 'INVENTORY_TURNOVER' ||
    (kpiViewMode === 'CUSTOM' && kpiCustomSelection.showInventoryTurnover);

  return (
    <div className="space-y-4 font-sans text-right" dir="rtl">
      {/* ==================================================================== */}
      {/* 1. MINIMALIST TOP BAR (Clean, Non-Crowded, On-Demand Toggles)        */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900">
              پیشخوان دستورهای تولید (MO)، ردیابی ذوب (Heat No) و ایستگاه‌ها (OP)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              تمامی دستورها به کاتالوگ کالا، شماره ذوب کلاف ساپکو، BOM و مسیر تولید (OP) متصل هستند.
            </p>
          </div>

          {/* On-Demand Tool Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleKpiPanel}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showKpiPanel
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>نمای شاخص‌ها (KPI Overview)</span>
              {showKpiPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowWarehouseTools(!showWarehouseTools)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showWarehouseTools
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>ابزارهای انبار و ذوب ورق</span>
              {showWarehouseTools ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleOpenCreateNewOrder}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>صدور دستور تولید (MO)</span>
            </button>
          </div>
        </div>

        {/* Search & Car Filter Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام قطعه، دستور تولید (MO)، شماره ذوب (HT-...)، بچ تولید یا کلاف..."
              className="w-full pr-9 pl-8 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCarFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                carFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              همه خودروها ({toPersianDigits(scenarios.length)})
            </button>
            {uniqueCarModels.map(car => (
              <button
                key={car}
                type="button"
                onClick={() => setCarFilter(car)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  carFilter === car
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                {car}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                saveScenarios(INITIAL_SCENARIOS);
                setToastMessage({
                  type: 'info',
                  title: 'داده‌های نمونه بازنشانی شد',
                  detail: 'فهرست دستورهای تولید به حالت استاندارد اولیه بازگشت.',
                });
              }}
              title="بازنشانی داده‌های نمونه"
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. CONFIGURABLE KPI OVERVIEW SECTION (Toggle between OEE,            */}
      {/*    Production Output vs Target, and Inventory Turnover Rates!)       */}
      {/* ==================================================================== */}
      {showKpiPanel && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-slate-600" />
                <span>پایش قابل تنظیم شاخص‌های کلیدی عملکرد (Configurable KPI Overview)</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                بین شاخص اثربخشی تجهیزات (OEE)، عملکرد تولید در برابر هدف، و نرخ گردش موجودی انبار جابجا شوید.
              </div>
            </div>

            {/* Segmented KPI Mode Switcher */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectKpiMode('OEE')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    kpiViewMode === 'OEE'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>شاخص OEE</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectKpiMode('OUTPUT_VS_TARGET')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    kpiViewMode === 'OUTPUT_VS_TARGET'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>تولید در برابر هدف</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectKpiMode('INVENTORY_TURNOVER')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    kpiViewMode === 'INVENTORY_TURNOVER'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>نرخ گردش موجودی</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectKpiMode('CUSTOM')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    kpiViewMode === 'CUSTOM'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  نمای انتخابی
                </button>
              </div>

              <button
                type="button"
                onClick={handleToggleKpiPanel}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs cursor-pointer"
                title="بستن پنل شاخص‌ها"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Custom Checkboxes if in CUSTOM mode */}
          {kpiViewMode === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-4 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">انتخاب شاخص‌های نمایشی:</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={kpiCustomSelection.showOee}
                  onChange={() => handleToggleCustomMetric('showOee')}
                  className="rounded border-slate-300 text-slate-900"
                />
                <span>شاخص بهره‌وری (OEE)</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={kpiCustomSelection.showOutputVsTarget}
                  onChange={() => handleToggleCustomMetric('showOutputVsTarget')}
                  className="rounded border-slate-300 text-slate-900"
                />
                <span>تولید واقعی در برابر هدف</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={kpiCustomSelection.showInventoryTurnover}
                  onChange={() => handleToggleCustomMetric('showInventoryTurnover')}
                  className="rounded border-slate-300 text-slate-900"
                />
                <span>نرخ گردش موجودی انبار</span>
              </label>
            </div>
          )}

          {/* VIEW A: OEE (Overall Equipment Effectiveness) */}
          {showOeeSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 inline-flex items-center gap-1.5">
                  <span>۱. اثربخشی جامع تجهیزات (OEE = دسترس‌پذیری × کارایی × کیفیت)</span>
                  <FormulaTooltip
                    title="فرمول محاسبه اثربخشی جامع تجهیزات (OEE)"
                    formula="OEE = Availability × Performance × Quality"
                    variables={[
                      {
                        symbol: 'Availability (دسترس‌پذیری)',
                        meaning: 'نسبت زمان کارکرد واقعی پرس به زمان برنامه‌ریزی‌شده شیفت (کسر توقفات قالب و نت)',
                      },
                      {
                        symbol: 'Performance (کارایی سرعت)',
                        meaning: 'نسبت سیکل زمانی استاندارد قطعه به سیکل واقعی ضرب پرس',
                      },
                      {
                        symbol: 'Quality (ضریب کیفیت)',
                        meaning: 'نسبت قطعات سالم تولیدی (Good Qty) به کل ضرب انجام‌شده (کسر ضایعات)',
                      },
                    ]}
                    note="هدف استاندارد کلاس جهانی (World-Class OEE) در خطوط پرسکاری خودرو حداقل ۸۵.۰٪ است."
                  />
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateSubModule?.('reports')}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>تحلیل کامل توقفات و OEE</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">شاخص کل OEE کارخانه</div>
                  <div className="text-xl font-bold text-emerald-700 font-mono mt-1 tabular-nums">
                    {toPersianDigits(aggregateMetrics.overallOeePct)}٪
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">هدف استاندارد جهانی: ۸۵.۰٪</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">ضریب دسترس‌پذیری (Availability)</div>
                  <div className="text-xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
                    {toPersianDigits(aggregateMetrics.availabilityPct)}٪
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">کسر زمان ستاپ قالب و نت</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">ضریب کارایی سرعت (Performance)</div>
                  <div className="text-xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
                    {toPersianDigits(aggregateMetrics.performancePct)}٪
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">نسبت سیکل واقعی به استاندارد</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">ضریب کیفیت سالم (Quality Rate)</div>
                  <div className="text-xl font-bold text-emerald-700 font-mono mt-1 tabular-nums">
                    {toPersianDigits(aggregateMetrics.qualityPct)}٪
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">تولید سالم بدون ضایعات پرس</div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW B: PRODUCTION OUTPUT VS TARGET */}
          {showOutputSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  ۲. عملکرد تولید واقعی در برابر برنامه هدف (Production Output vs. Target)
                </span>
                <span className="font-mono font-bold text-slate-900">
                  تحقق کل: {toPersianDigits(aggregateMetrics.outputRealizationPct)}٪
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">مجموع تیراژ برنامه هدف (Target)</div>
                  <div className="text-lg font-bold text-slate-900 font-mono mt-1 tabular-nums">
                    {formatNumber(aggregateMetrics.totalOrderQty)} عدد
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">محصول نهایی تحویل‌شده (Actual Output)</div>
                  <div className="text-lg font-bold text-emerald-700 font-mono mt-1 tabular-nums">
                    {formatNumber(aggregateMetrics.totalFinishedQty)} عدد
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">مانده تعهد در جریان خط (WIP + Backlog)</div>
                  <div className="text-lg font-bold text-amber-700 font-mono mt-1 tabular-nums">
                    {formatNumber(
                      Math.max(0, aggregateMetrics.totalOrderQty - aggregateMetrics.totalFinishedQty)
                    )}{' '}
                    عدد
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                {scenarios.map(scn => {
                  const lastOp = scn.operations[scn.operations.length - 1];
                  const done = lastOp ? lastOp.completedGood : 0;
                  const pct = Math.min(100, Math.round((done / Math.max(1, scn.orderQty)) * 100));
                  return (
                    <div key={scn.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">
                          {scn.partName} <span className="font-mono text-slate-400">({scn.orderCode})</span>
                        </span>
                        <span className="font-mono text-slate-700 tabular-nums">
                          {formatNumber(done)} از {formatNumber(scn.orderQty)} عدد ({toPersianDigits(pct)}٪)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW C: INVENTORY TURNOVER RATES */}
          {showTurnoverSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  ۳. شاخص‌های نرخ گردش موجودی و سرعت جریان مواد (Inventory Turnover Rates)
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateToTab?.('inventory', 'INQUIRY')}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>مشاهده کاردکس گردش موجودی</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">نرخ گردش موجودی ورق خام</div>
                  <div className="text-xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
                    {toPersianDigits(aggregateMetrics.sheetTurnoverRate)} بار در سال
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    موجودی فعلی: {formatNumber(aggregateMetrics.totalWarehouseKg)} ک.گ
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">روزهای پوشش موجودی ورق (DOH)</div>
                  <div className="text-xl font-bold text-emerald-700 font-mono mt-1 tabular-nums">
                    {toPersianDigits(aggregateMetrics.daysOfInventorySupply)} روز کاری
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">کفایت ذخیره کلاف‌های ساپکو</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">سرعت گردش نیمه‌ساخته (WIP Turnover)</div>
                  <div className="text-xl font-bold text-amber-700 font-mono mt-1 tabular-nums">
                    {toPersianDigits(14.2)} بار در دوره
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    موجودی پای خط: {formatNumber(aggregateMetrics.totalWipQty)} قطعه
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">نرخ خروج محصول نهایی به ساپکو</div>
                  <div className="text-xl font-bold text-indigo-700 font-mono mt-1 tabular-nums">
                    {toPersianDigits(11.6)} بار در دوره
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">میانگین توقف در انبار محصول: ۳.۱ روز</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. ON-DEMAND WAREHOUSE & HEAT NUMBER TOOLS                           */}
      {/* ==================================================================== */}
      {showWarehouseTools && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-slate-800">
              دسترسی سریع به ابزارهای انبار، شماره ذوب (Heat No) و گردش ورق
            </span>
            <button
              type="button"
              onClick={() => setShowWarehouseTools(false)}
              className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <button
              type="button"
              onClick={() => onNavigateToTab?.('sapco')}
              className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-right flex items-center justify-between cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-900">رسید کلاف و رهگیری شماره ذوب (Heat)</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  ثبت شماره ذوب ساپکو و اتصال به بچ تولید
                </div>
              </div>
              <Tag className="w-4 h-4 text-amber-700 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateSubModule?.('inventory', { inventorySubTab: 'INQUIRY' })}
              className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-right flex items-center justify-between cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-900">استعلام موجودی و کاردکس کالا</div>
                <div className="text-[11px] text-slate-500 mt-0.5">گردش ورود، خروج و مانده هر قطعه</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateSubModule?.('inventory', { inventorySubTab: 'COILS' })}
              className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-right flex items-center justify-between cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-900">مدیریت رول‌های ورق و کویل‌پک</div>
                <div className="text-[11px] text-slate-500 mt-0.5">کلاف‌های موجود و ته‌کلاف برگشتی</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() =>
                onNavigateSubModule?.('production', {
                  productionViewMode: 'ERP_WORKBENCH',
                  productionModuleTab: 'DAILY_DISPATCH_SHEET',
                })
              }
              className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-right flex items-center justify-between cursor-pointer"
            >
              <div>
                <div className="font-bold text-slate-900">چاپ برگه کار روزانه شیفت</div>
                <div className="text-[11px] text-slate-500 mt-0.5">خروجی چاپی برنامه ایستگاه‌ها</div>
              </div>
              <Printer className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* COMMAND NOTIFICATION BANNER WITH LIVE TRACKING BUTTON (`پیگیری دستور`) */}
      {/* ==================================================================== */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
              : toastMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-950 border-amber-200'
              : 'bg-slate-100 text-slate-900 border-slate-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {toastMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold">{toastMessage.title}: </span>
              <span className="text-slate-700">{toastMessage.detail}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {toastMessage.trackOrderId && (
              <button
                type="button"
                onClick={() => setTrackingOrderId(toastMessage.trackOrderId!)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer flex items-center gap-1"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>پیگیری دستور</span>
              </button>
            )}
            {toastMessage.navAction && (
              <button
                type="button"
                onClick={toastMessage.navAction.onClick}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer"
              >
                {toastMessage.navAction.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="px-2 py-1 rounded-lg bg-white/80 border border-slate-200 text-slate-600 font-semibold cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. MINIMAL & READABLE WORK ORDERS TABLE (With Batch/Heat Traceability)*/}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden space-y-0">
        {/* Schedule Filter Tabs Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setScheduleTabFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                scheduleTabFilter === 'ACTIVE'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <span>برنامه‌های جاری خط تولید</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-mono">
                {toPersianDigits(activeCount)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setScheduleTabFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                scheduleTabFilter === 'COMPLETED'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>دستورات تکمیل‌شده و رسید انبار</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-mono">
                {toPersianDigits(completedCount)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setScheduleTabFilter('PINNED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                scheduleTabFilter === 'PINNED'
                  ? 'bg-amber-800 text-white shadow-2xs'
                  : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-200'
              }`}
            >
              <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>قطعات کلیدی نشانه‌گذاری‌شده (VIP)</span>
              {pinnedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-mono">
                  {toPersianDigits(pinnedCount)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setScheduleTabFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                scheduleTabFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              همه ({toPersianDigits(scenarios.length)})
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            نمایش: {toPersianDigits(filteredOrders.length)} دستور ساخت
          </div>
        </div>

        {/* Contextual Bulk Action Bar (MO Bulk Actions - Upgrade 4) */}
        {selectedMoIds.length > 0 && (
          <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
                {toPersianDigits(selectedMoIds.length)} دستور تولید (MO) انتخاب شده
              </span>
              <span className="text-slate-300 hidden sm:inline">
                عملیات گروهی همزمان روی دستورات انتخابی خط تولید:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBulkStartMos}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>شروع گروهی (Start)</span>
              </button>

              <button
                type="button"
                onClick={handleBulkPauseMos}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>توقف گروهی (Pause)</span>
              </button>

              <button
                type="button"
                onClick={handleBulkCompleteMos}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>رسید انبار گروهی (Complete)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMoIds([])}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                لغو انتخاب
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/90 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredOrders.length > 0 &&
                      filteredOrders.every(o => selectedMoIds.includes(o.id))
                    }
                    onChange={() => handleToggleSelectAllVisible(filteredOrders)}
                    title="انتخاب همه دستورات تولید نمایش‌داده‌شده"
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-5 font-semibold">
                  <span className="inline-flex items-center">
                    <span>شماره MO</span>
                    <MetricTooltip metric="MO" />
                  </span>
                </th>
                <th className="py-3.5 px-5 font-semibold">
                  <span className="inline-flex items-center">
                    <span>نام قطعه</span>
                    <MetricTooltip metric="BOM" />
                  </span>
                </th>
                <th className="py-3.5 px-5 font-semibold">تیراژ</th>
                <th className="py-3.5 px-5 font-semibold">
                  <span className="inline-flex items-center">
                    <span>وضعیت / پیشرفت</span>
                    <MetricTooltip metric="FTT" />
                  </span>
                </th>
                <th className="py-3.5 px-5 font-semibold text-left w-24">اکشن سریع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center">
                    <EmptyState
                      variant={scheduleTabFilter === 'ALL' && !searchQuery ? 'NO_DATA' : 'FILTER_NO_MATCH'}
                      title={
                        scheduleTabFilter === 'PINNED'
                          ? 'هیچ قطعه‌ای هنوز نشانه‌گذاری نشده است'
                          : scheduleTabFilter === 'COMPLETED'
                          ? 'هیچ دستور کاری در این بخش تکمیل نشده است'
                          : searchQuery
                          ? `دستور کاری با جستجوی «${searchQuery}» یافت نشد`
                          : 'هیچ دستور تولید فعالی در این فیلتر وجود ندارد'
                      }
                      actionLabel={scheduleTabFilter !== 'ALL' || searchQuery ? 'نمایش همه دستورات' : 'ثبت دستور تولید جدید (MO)'}
                      onAction={() => {
                        if (scheduleTabFilter !== 'ALL' || searchQuery) {
                          setScheduleTabFilter('ALL');
                          setSearchQuery('');
                        } else {
                          handleOpenCreateNewOrder();
                        }
                      }}
                      compact
                    />
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isSelected = expandedOrderId === order.id;
                  const isChecked = selectedMoIds.includes(order.id);
                  const isVip = isScenarioVip(order);
                  const isCompleted = order.status === 'COMPLETED';
                  const isHalted = order.status === 'HALTED';
                  const lastOp = order.operations[order.operations.length - 1];
                  const finishedQty = lastOp ? lastOp.completedGood : 0;
                  const progressPct = Math.min(
                    100,
                    Math.round((finishedQty / Math.max(1, order.orderQty)) * 100)
                  );
                  const activeStepIdx = order.operations.findIndex(
                    op => op.completedGood < order.orderQty
                  );
                  const activeStep =
                    activeStepIdx >= 0 ? order.operations[activeStepIdx] : lastOp;
                  const isAtFinalStation =
                    !isCompleted &&
                    !isHalted &&
                    progressPct > 0 &&
                    (Boolean(activeStep?.isFinal) || activeStepIdx === -1);
                  const isZeroOrHalted = !isCompleted && (progressPct === 0 || isHalted);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => handleOpenOrderDrawer(order.id, 'TRACEABILITY')}
                      className={`group transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-50/70 hover:bg-indigo-50'
                          : isSelected
                          ? 'bg-emerald-50/50'
                          : isVip
                          ? 'bg-amber-50/35 hover:bg-amber-50/70'
                          : 'hover:bg-slate-50/90'
                      }`}
                    >
                      {/* 0. Multi-Select Checkbox for Bulk Actions */}
                      <td
                        className="py-4 px-4 text-center whitespace-nowrap"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectMo(order.id)}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      </td>

                      {/* 1. MO Number (Clickable Link) */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenOrderDrawer(order.id, 'TRACEABILITY');
                          }}
                          className="font-mono text-xs font-bold text-indigo-700 group-hover:text-indigo-900 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{order.orderCode}</span>
                          {isVip && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold inline-flex items-center gap-0.5">
                              <Pin className="w-2.5 h-2.5 text-amber-600 fill-amber-500 shrink-0" />
                              <span>VIP</span>
                            </span>
                          )}
                        </button>
                      </td>

                      {/* 2. Part Name (Clean, Without Extra BOM Clutter) */}
                      <td className="py-4 px-5">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{order.partName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {order.carModel} · <span className="font-mono">{order.partCode}</span>
                        </div>
                      </td>

                      {/* 3. Quantity (تیراژ) */}
                      <td className="py-4 px-5 font-mono text-xs font-bold text-slate-800 tabular-nums whitespace-nowrap">
                        {formatNumber(order.orderQty)}{' '}
                        <span className="text-[11px] font-normal text-slate-400">عدد</span>
                      </td>

                      {/* 4. Status / Progress (Minimal Graphical Progress Bar + Colored Badge) */}
                      <td className="py-4 px-5 w-64">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          {isCompleted ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              تکمیل شده
                            </span>
                          ) : isHalted ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                              توقف خط
                            </span>
                          ) : isAtFinalStation ? (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold font-mono">
                              ایستگاه آخر ({activeStep?.stepCode})
                            </span>
                          ) : progressPct === 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold font-mono">
                              آماده شروع ({activeStep?.stepCode || 'OP10'})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold font-mono">
                              {activeStep ? `در جریان (${activeStep.stepCode})` : 'در جریان'}
                            </span>
                          )}
                          <span className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums">
                            {toPersianDigits(progressPct)}٪
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isCompleted
                                ? 'bg-emerald-600'
                                : isHalted
                                ? 'bg-rose-500'
                                : isAtFinalStation
                                ? 'bg-indigo-600'
                                : 'bg-slate-900'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>

                      {/* 5. Contextual Quick Action + Inline Drawer Edit (Pencil) */}
                      <td
                        className="py-4 px-5 text-left whitespace-nowrap"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewOrderMode(false);
                              setAllowManualSheetOverride(Boolean(order.isCustomSheetOverride));
                              setEditingOrder(order);
                            }}
                            title="ویرایش سریع دستور تولید در کشو (Edit MO)"
                            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-white border border-slate-200 hover:border-slate-900 transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setInspectingOrderForWip(order)}
                            title="ارزیابی موجودی بین‌مراحل (WIP) و قطعات پیش‌ساخته"
                            className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                          </button>

                          {isCompleted ? (
                            <button
                              type="button"
                              onClick={() => handleDispatchFinishedGoods(order)}
                              title="تکمیل شده — صدور حواله خروج به ساپکو"
                              className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 transition-colors cursor-pointer inline-flex items-center justify-center"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : isZeroOrHalted ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (isHalted) {
                                  handleToggleLineStop(order);
                                } else {
                                  handleOpenStepLogger(
                                    order,
                                    activeStepIdx >= 0 ? activeStepIdx : 0
                                  );
                                }
                              }}
                              title={
                                isHalted
                                  ? 'شروع مجدد و رفع توقف خط (Play)'
                                  : `شروع تولید و ثبت کارکرد (${activeStep?.stepCode || 'OP10'})`
                              }
                              className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 transition-colors cursor-pointer inline-flex items-center justify-center"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                          ) : isAtFinalStation ? (
                            <button
                              type="button"
                              onClick={() => handleCompleteProduction(order)}
                              title="ایستگاه آخر — تایید اتمام و صدور رسید انبار (Check)"
                              className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 transition-colors cursor-pointer inline-flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleLineStop(order)}
                              title="در جریان تولید — توقف موقت خط (Pause)"
                              className="p-2 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 hover:border-amber-600 transition-colors cursor-pointer inline-flex items-center justify-center"
                            >
                              <Pause className="w-4 h-4 fill-current" />
                            </button>
                          )}
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

      {/* ==================================================================== */}
      {/* SLIDE-OVER DETAILS DRAWER (SAP FIORI / DYNAMICS 365 MASTER-DETAIL)   */}
      {/* ==================================================================== */}
      <OrderDetailsDrawer
        order={scenarios.find(s => s.id === expandedOrderId) || null}
        isOpen={Boolean(expandedOrderId)}
        initialTab={drawerTab}
        onClose={() => {
          setExpandedOrderId(null);
          if (onOrderDrawerChange) onOrderDrawerChange(null);
        }}
        onCompleteProduction={handleCompleteProduction}
        onDispatchFinishedGoods={handleDispatchFinishedGoods}
        onToggleLineStop={handleToggleLineStop}
        onIssueSheet={handleIssueSheetForOrder}
        onOpenStepLogger={(order, opIdx) => handleOpenStepLogger(order, opIdx)}
        onOpenAddOp={order => {
          const nextStepNum = (order.operations.length + 1) * 10;
          const partDies = dies.filter(
            d => d.partId === order.partId || d.partCode === order.partCode
          );
          const defaultMachine = machines[0];
          const defaultDie = partDies[0] || dies[0];
          setEditingOpContext({
            orderId: order.id,
            partId: order.partId,
            partCode: order.partCode,
            opIndex: null,
            stepData: {
              stepCode: `OP${nextStepNum}`,
              stepName: PROCESS_DEFINITIONS[3].name,
              processType: 'PUNCH_FORM',
              hall: defaultMachine?.location || FACTORY_HALLS[3].name,
              machineId: defaultMachine?.id,
              machineName: defaultMachine?.name || 'پرس ضربه‌ای ۲۵۰ تن ۱',
              dieId: defaultDie?.id,
              dieName: defaultDie?.code || `DIE-${order.partCode.slice(-5)}`,
              cycleTimeSec: 12,
              completedGood: 0,
              scrapQty: 0,
              isFinal: true,
            },
          });
        }}
        onOpenEditOp={(order, opIdx, op) =>
          setEditingOpContext({
            orderId: order.id,
            partId: order.partId,
            partCode: order.partCode,
            opIndex: opIdx,
            stepData: { ...op },
          })
        }
        onDeleteOp={handleDeleteOperationStep}
        onOpenTrackModal={orderId => setTrackingOrderId(orderId)}
        onOpenEditOrder={order => {
          setIsNewOrderMode(false);
          setAllowManualSheetOverride(Boolean(order.isCustomSheetOverride));
          setEditingOrder(order);
        }}
        onDeleteOrder={handleDeleteOrder}
        onTogglePin={handleTogglePinOrder}
        onNavigateToSapco={() => onNavigateToTab?.('sapco')}
        onOpenWipInspection={order => setInspectingOrderForWip(order)}
      />

      {/* ==================================================================== */}
      {/* MODAL 1: LOG STEP PRODUCTION                                         */}
      {/* ==================================================================== */}
      {loggingTarget !== null && (() => {
        const order = scenarios.find(s => s.id === loggingTarget.orderId);
        if (!order) return null;
        const op = order.operations[loggingTarget.opIndex];
        const prevOp =
          loggingTarget.opIndex > 0 ? order.operations[loggingTarget.opIndex - 1] : null;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    ثبت آمار تولید ایستگاه — {op.stepCode} ({op.stepName})
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    دستور {order.orderCode} · بچ {order.productionBatchCode} · ذوب {order.heatNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLoggingTarget(null)}
                  className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveStepProduction} className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-slate-700">
                  <div>
                    دستگاه: <strong>{op.machineName}</strong> · قالب: <strong className="font-mono">{op.dieName}</strong>
                  </div>
                  {prevOp ? (
                    <div>
                      سقف مجاز بر اساس خروجی مرحله قبلی ({prevOp.stepCode}):{' '}
                      <strong className="font-mono text-slate-900">
                        {formatNumber(prevOp.completedGood)} عدد
                      </strong>
                    </div>
                  ) : (
                    <div>
                      ورودی از کلاف برش‌خورده ({order.coilNumber || order.rawMaterialCode}):{' '}
                      <strong className="font-mono text-slate-900">
                        {formatNumber(order.orderQty)} عدد
                      </strong>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    تعداد کل قطعات سالم تولیدشده در این مرحله:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={prevOp ? prevOp.completedGood : order.orderQty}
                    value={logQtyInput}
                    onChange={e => setLogQtyInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    تعداد ضایعات ایستگاه:
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={logScrapInput}
                    onChange={e => setLogScrapInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setLoggingTarget(null)}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                  >
                    ثبت و صدور سند کارکرد
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* SLIDE-OVER DRAWER 2: CREATE / EDIT MANUFACTURING ORDER               */}
      {/* ==================================================================== */}
      {editingOrder && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-[2px] flex justify-end animate-in fade-in"
          dir="rtl"
          onClick={() => setEditingOrder(null)}
        >
          <div
            className="bg-white w-full max-w-2xl h-full p-5 shadow-2xl border-r border-slate-200 space-y-4 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs flex items-center justify-between border-b border-slate-100 pb-3 pt-1">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  {isNewOrderMode
                    ? 'صدور دستور تولید جدید (MO) در کشو — متصل به کاتالوگ کالا، ذوب و OP'
                    : `ویرایش کشویی دستور تولید ${editingOrder.orderCode}`}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  بدون خروج از جدول پیشخوان، اطلاعات دستور کار، ورق (BOM) و شماره ذوب را ویرایش کنید.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer p-1.5 rounded-lg border border-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWorkOrder} className="space-y-4 text-xs">
              {/* STEP 1: Select Product / Part from Master Data */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    <span>۱. انتخاب کالا / قطعه تولیدی از اطلاعات پایه:</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    متصل به کاتالوگ قطعات و مسیر تولید
                  </span>
                </div>

                {/* Searchable Part Combobox (Excludes Raw Materials) */}
                <div className="space-y-1">
                  <SearchableSelect
                    options={partSelectOptions}
                    value={editingOrder.partId}
                    onChange={(val, opt) => {
                      const foundPart = opt?.meta || produciblePartsCatalog.find(p => p.id === val);
                      if (foundPart) {
                        const rebuilt = buildOrderDataFromMasterPart(
                          foundPart,
                          editingOrder.orderCode
                        );
                        rebuilt.id = editingOrder.id;
                        rebuilt.orderQty = editingOrder.orderQty;
                        rebuilt.contractCode = editingOrder.contractCode;
                        setEditingOrder(rebuilt);
                        setAllowManualSheetOverride(false);
                      }
                    }}
                    placeholder="برای جستجوی نام قطعه، کد یا مدل خودرو تایپ کنید..."
                    searchPlaceholder="جستجو در کاتالوگ قطعات قابل تولید (مثلاً: ECU، صندلی، 206)..."
                    required
                  />
                </div>

                {/* Contract & Customer Quota Selection */}
                <div className="pt-1">
                  <label className="block text-[11px] text-slate-600 mb-1 font-semibold">
                    اتصال به قرارداد / تعهد ساپکو (اختیاری):
                  </label>
                  <SearchableSelect
                    options={contractSelectOptions}
                    value={editingOrder.contractCode || 'CNT-SAP-1404-01'}
                    onChange={(val) => {
                      setEditingOrder({ ...editingOrder, contractCode: val });
                    }}
                    placeholder="انتخاب قرارداد مشتری..."
                    searchPlaceholder="جستجوی شماره قرارداد یا نام مشتری..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      شماره دستور تولید (MO):
                    </label>
                    <input
                      type="text"
                      value={editingOrder.orderCode}
                      onChange={e =>
                        setEditingOrder({ ...editingOrder, orderCode: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      شماره بچ تولید (Production Batch):
                    </label>
                    <input
                      type="text"
                      value={editingOrder.productionBatchCode}
                      onChange={e =>
                        setEditingOrder({
                          ...editingOrder,
                          productionBatchCode: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-indigo-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      تیراژ دستور تولید (عدد):
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingOrder.orderQty}
                      onChange={e =>
                        setEditingOrder({
                          ...editingOrder,
                          orderQty: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-slate-900"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* STEP 1.5: Pre-Flight Inter-Stage WIP & Sub-Components Stock Check */}
              <SubComponentWipPreflightCard
                order={editingOrder}
                onOpenFullInspectionModal={() => setInspectingOrderForWip(editingOrder)}
                onQuickIssueSubMo={(partCode, partName, requiredQty) => {
                  handleCreateSubMoScenario({
                    parentMoId: editingOrder.id,
                    parentOrderCode: editingOrder.orderCode,
                    componentPartId: partCode,
                    componentPartCode: partCode,
                    componentPartName: partName,
                    requiredQty,
                  });
                }}
              />

              {/* STEP 2: BOM Raw Material Sheet + SAPCO Coil & Heat Number Link */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>۲. ورق مصرفی (BOM) و اتصال به شماره ذوب کلاف ساپکو (Heat No):</span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowManualSheetOverride}
                      onChange={e => setAllowManualSheetOverride(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900"
                    />
                    <span>تغییر اختیاری ورق / انتخاب کلاف و ذوب دیگر به اختیار کاربر</span>
                  </label>
                </div>

                {!allowManualSheetOverride ? (
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {editingOrder.rawMaterialName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        کلاف: <strong>{editingOrder.coilNumber || 'MOB-2025-DC01-409'}</strong> · شماره ذوب:{' '}
                        <strong className="text-amber-800">{editingOrder.heatNumber || 'HT-99412-MOB'}</strong>
                      </div>
                    </div>
                    <div className="text-left font-mono">
                      <div className="text-xs font-bold text-slate-900">
                        نیاز ناخالص:{' '}
                        {formatNumber(
                          Math.round(
                            editingOrder.orderQty *
                              editingOrder.unitWeightKg *
                              (1 + editingOrder.scrapAllowancePct / 100)
                          )
                        )}{' '}
                        ک.گ
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        موجودی انبار: {formatNumber(editingOrder.warehouseAvailableKg)} ک.گ
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-[11px] text-amber-800 font-semibold">
                      انتخاب کلاف ساپکو و شماره ذوب جایگزین از موجودی انبار (اختیار کاربر):
                    </label>
                    <select
                      value={editingOrder.rawMaterialCode}
                      onChange={e => {
                        const chosen = availableRawSheetsCatalog.find(
                          rm => rm.code === e.target.value
                        );
                        if (chosen) {
                          setEditingOrder({
                            ...editingOrder,
                            rawMaterialPartId: chosen.id,
                            rawMaterialCode: chosen.code,
                            rawMaterialName: chosen.name,
                            coilNumber: chosen.coilNumber,
                            heatNumber: chosen.heatNumber,
                            sapcoBatchNumber: chosen.sapcoBatchNumber,
                            warehouseAvailableKg: chosen.availableKg,
                            isCustomSheetOverride: true,
                          });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-amber-300 text-slate-900 font-semibold cursor-pointer"
                    >
                      {availableRawSheetsCatalog.map(rm => (
                        <option key={rm.code + rm.coilNumber} value={rm.code}>
                          {rm.name} | ذوب: {rm.heatNumber} | کلاف: {rm.coilNumber} | موجودی:{' '}
                          {formatNumber(rm.availableKg)} ک.گ
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* STEP 3: Preview of Connected Routing & OP Steps */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-emerald-600" />
                    <span>
                      ۳. مراحل عملیات تولید (OP) بارگذاری‌شده از مسیر تولید قطعه (
                      {toPersianDigits(editingOrder.operations.length)} ایستگاه):
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    قابل ویرایش و افزودن OP در جدول
                  </span>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {editingOrder.operations.map((op, i) => (
                    <div
                      key={op.stepCode + i}
                      className="px-3 py-2 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold">
                          {op.stepCode}
                        </span>
                        <span className="font-semibold text-slate-900">{op.stepName}</span>
                        <span className="text-slate-400">({op.hall})</span>
                      </div>
                      <div className="text-slate-600 font-mono">
                        {op.machineName} · {op.dieName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInspectingOrderForWip(editingOrder)}
                  className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                >
                  <Boxes className="w-4 h-4 text-indigo-600" />
                  <span>ارزیابی موجودی بین‌مراحل (WIP) 🔍</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOrder(null);
                      setIsNewOrderMode(false);
                      router.closeModal();
                    }}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    انصراف
                  </button>
                  {editingOrder &&
                    ((editingOrder.bomSubComponents && editingOrder.bomSubComponents.length > 0) ||
                      editingOrder.partCode.includes('ECU') ||
                      editingOrder.partCode.includes('ASY')) && (
                      <button
                        type="button"
                        onClick={() => {
                          setInspectingOrderForWip(editingOrder);
                          router.openWipCheckModal(editingOrder.orderCode, editingOrder.partId);
                        }}
                        className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold cursor-pointer border border-indigo-200 flex items-center gap-1.5"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>ارزیابی درختی WIP</span>
                      </button>
                    )}
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                  >
                    {isNewOrderMode ? 'صدور دستور تولید و ابلاغ به خط' : 'ذخیره تغییرات دستور تولید'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: EDIT OR ADD OPERATION STEP (100% CONNECTED TO MASTER DATA)  */}
      {/* ==================================================================== */}
      {editingOpContext && (() => {
        const correlatedDies = dies.filter(
          d =>
            d.partId === editingOpContext.partId ||
            d.partCode === editingOpContext.partCode
        );
        const otherDies = dies.filter(
          d =>
            d.partId !== editingOpContext.partId &&
            d.partCode !== editingOpContext.partCode
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {editingOpContext.opIndex === null
                      ? 'افزودن مرحله عملیاتی (OP) متصل به اطلاعات پایه'
                      : `ویرایش ایستگاه ${editingOpContext.stepData.stepCode}`}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    انتخاب عملیات، سالن، دستگاه پرس و قالب مرتبط با قطعه از بانک اطلاعات پایه
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingOpContext(null)}
                  className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveOperationStep} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      کد مرحله (OP):
                    </label>
                    <select
                      value={editingOpContext.stepData.stepCode}
                      onChange={e =>
                        setEditingOpContext({
                          ...editingOpContext,
                          stepData: { ...editingOpContext.stepData, stepCode: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white cursor-pointer"
                    >
                      {['OP10', 'OP20', 'OP30', 'OP40', 'OP50', 'OP60', 'OP70', 'OP80'].map(
                        code => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      نوع فرآیند استاندارد (از بانک عملیات تولید):
                    </label>
                    <select
                      value={editingOpContext.stepData.processType || 'PUNCH_FORM'}
                      onChange={e => {
                        const procCode = e.target.value as ProcessType;
                        const procDef = PROCESS_DEFINITIONS.find(p => p.code === procCode);
                        const compatibleMachine = machines.find(
                          m =>
                            m.processType === procCode ||
                            (m.capabilities && m.capabilities.includes(procCode))
                        );
                        setEditingOpContext({
                          ...editingOpContext,
                          stepData: {
                            ...editingOpContext.stepData,
                            processType: procCode,
                            stepName: procDef ? procDef.name : editingOpContext.stepData.stepName,
                            machineId: compatibleMachine?.id || editingOpContext.stepData.machineId,
                            machineName:
                              compatibleMachine?.name || editingOpContext.stepData.machineName,
                            hall:
                              compatibleMachine?.location || editingOpContext.stepData.hall,
                          },
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white font-semibold cursor-pointer"
                    >
                      {PROCESS_DEFINITIONS.map(proc => (
                        <option key={proc.id} value={proc.code}>
                          {proc.name} ({proc.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    شرح دقیق عملیات در برگه کار ایستگاه:
                  </label>
                  <input
                    type="text"
                    value={editingOpContext.stepData.stepName}
                    onChange={e =>
                      setEditingOpContext({
                        ...editingOpContext,
                        stepData: { ...editingOpContext.stepData, stepName: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      سالن تولید (از اطلاعات پایه):
                    </label>
                    <select
                      value={editingOpContext.stepData.hall}
                      onChange={e =>
                        setEditingOpContext({
                          ...editingOpContext,
                          stepData: { ...editingOpContext.stepData, hall: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white cursor-pointer"
                    >
                      {hallsCatalog.map(h => (
                        <option key={h.id} value={h.name}>
                          {h.name}
                        </option>
                      ))}
                      {!hallsCatalog.some(h => h.name === editingOpContext.stepData.hall) && (
                        <option value={editingOpContext.stepData.hall}>
                          {editingOpContext.stepData.hall}
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      دستگاه / پرس (از لیست ماشین‌آلات):
                    </label>
                    <select
                      value={editingOpContext.stepData.machineName}
                      onChange={e => {
                        const mch = machines.find(m => m.name === e.target.value);
                        setEditingOpContext({
                          ...editingOpContext,
                          stepData: {
                            ...editingOpContext.stepData,
                            machineId: mch?.id,
                            machineName: e.target.value,
                            hall: mch?.location || editingOpContext.stepData.hall,
                          },
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white cursor-pointer"
                    >
                      {machines.map(m => (
                        <option key={m.id} value={m.name}>
                          {m.name} ({m.code}{m.tonnage ? ` · ${m.tonnage} تن` : ''})
                        </option>
                      ))}
                      {!machines.some(
                        m => m.name === editingOpContext.stepData.machineName
                      ) && (
                        <option value={editingOpContext.stepData.machineName}>
                          {editingOpContext.stepData.machineName}
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    قالب / فیکسچر متصل به قطعه (از بانک قالب‌ها):
                  </label>
                  <select
                    value={editingOpContext.stepData.dieName}
                    onChange={e => {
                      const d = dies.find(x => x.code === e.target.value);
                      setEditingOpContext({
                        ...editingOpContext,
                        stepData: {
                          ...editingOpContext.stepData,
                          dieId: d?.id,
                          dieName: e.target.value,
                        },
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 bg-white cursor-pointer"
                  >
                    {correlatedDies.length > 0 && (
                      <optgroup label="★ قالب‌های اختصاصی مرتبط با همین قطعه">
                        {correlatedDies.map(d => (
                          <option key={d.id} value={d.code}>
                            {d.code} — {d.name} ({d.requiredTonnage} تن)
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherDies.length > 0 && (
                      <optgroup label="سایر قالب‌ها و ابزارهای عمومی کارخانه">
                        {otherDies.map(d => (
                          <option key={d.id} value={d.code}>
                            {d.code} — {d.name} ({d.partName})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {!dies.some(d => d.code === editingOpContext.stepData.dieName) && (
                      <option value={editingOpContext.stepData.dieName}>
                        {editingOpContext.stepData.dieName}
                      </option>
                    )}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingOpContext(null)}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                  >
                    ذخیره ایستگاه کاری (OP)
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* MODAL 4: LIVE ORDER & COMMAND TRACKER (`پیگیری دستور`)               */}
      {/* ==================================================================== */}
      {trackedOrder && (() => {
        const lastOp = trackedOrder.operations[trackedOrder.operations.length - 1];
        const finishedQty = lastOp ? lastOp.completedGood : 0;
        const netWeightKg = Math.round(trackedOrder.orderQty * trackedOrder.unitWeightKg);
        const grossRequiredKg = Math.round(
          netWeightKg * (1 + trackedOrder.scrapAllowancePct / 100)
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-2xl w-full p-5 shadow-xl border border-slate-200 space-y-4 my-8 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Compass className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      زنجیره پیگیری دستور تولید {trackedOrder.orderCode} (بچ {trackedOrder.productionBatchCode})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {trackedOrder.partName} · کلاف: <strong className="font-mono">{trackedOrder.coilNumber}</strong> · شماره ذوب: <strong className="font-mono text-amber-800">{trackedOrder.heatNumber}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTrackingOrderId(null)}
                  className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 3-Stage End-to-End Traceability Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Stage A: Raw Material Voucher & Heat Number */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500">۱. کلاف ورق و شماره ذوب (Heat)</div>
                    <div className="font-bold text-slate-900 mt-1">
                      {trackedOrder.rawMaterialName}
                    </div>
                    <div className="text-[11px] font-mono text-amber-800 font-bold mt-0.5">
                      ذوب: {trackedOrder.heatNumber} · نیاز: {formatNumber(grossRequiredKg)} ک.گ
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                    {trackedOrder.materialIssuedVoucherNo ? (
                      <span className="font-mono font-bold text-emerald-700">
                        سند: {trackedOrder.materialIssuedVoucherNo}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleIssueSheetForOrder(trackedOrder)}
                        className="px-2.5 py-1 rounded bg-slate-900 text-white font-semibold cursor-pointer"
                      >
                        صدور حواله ورق
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingOrderId(null);
                        onNavigateToTab?.('sapco');
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      شجره‌نامه ذوب ⟵
                    </button>
                  </div>
                </div>

                {/* Stage B: Shop-Floor OP Execution */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500">۲. وضعیت در ایستگاه‌های OP</div>
                    <div className="font-bold text-slate-900 mt-1">
                      {toPersianDigits(trackedOrder.operations.length)} ایستگاه کاری متصل
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      ایستگاه اول: {trackedOrder.operations[0]?.completedGood || 0} عدد تولیدشده
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingOrderId(null);
                        setExpandedOrderId(trackedOrder.id);
                        setExpandedViewMode('OPS');
                      }}
                      className="text-slate-900 font-bold hover:underline cursor-pointer"
                    >
                      باز کردن جدول OPها
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingOrderId(null);
                        onNavigateSubModule?.('production', {
                          productionViewMode: 'ERP_WORKBENCH',
                          productionModuleTab: 'LIVE_WIP_OP_TRACKER',
                        });
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      رهگیری WIP ⟵
                    </button>
                  </div>
                </div>

                {/* Stage C: Finished Goods Receipt */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500">۳. رسید انبار محصول نهایی</div>
                    <div className="font-bold text-emerald-700 font-mono text-sm mt-1">
                      {formatNumber(finishedQty)} از {formatNumber(trackedOrder.orderQty)} عدد
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {trackedOrder.finishedReceiptVoucherNo
                        ? `سند رسید: ${trackedOrder.finishedReceiptVoucherNo}`
                        : 'پس از ثبت مرحله آخر صادر می‌شود'}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                    <span className="text-slate-500 font-mono">{trackedOrder.productionBatchCode}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingOrderId(null);
                        onNavigateSubModule?.('production', {
                          productionViewMode: 'ERP_WORKBENCH',
                          productionModuleTab: 'DAILY_DISPATCH_SHEET',
                        });
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      برگه شیفت ⟵
                    </button>
                  </div>
                </div>
              </div>

              {/* Operation Steps Progress Table inside Tracker */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-800">
                  وضعیت لحظه‌ای ایستگاه‌های کاری (OP) این دستور:
                </div>
                <div className="divide-y divide-slate-100">
                  {trackedOrder.operations.map((op, i) => {
                    const prev = i > 0 ? trackedOrder.operations[i - 1] : null;
                    const locked = prev !== null && prev.completedGood === 0;
                    const wipInBuffer = prev
                      ? Math.max(0, prev.completedGood - op.completedGood)
                      : Math.max(0, trackedOrder.orderQty - op.completedGood);

                    return (
                      <div
                        key={op.stepCode + i}
                        className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold">
                            {op.stepCode}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{op.stepName}</div>
                            <div className="text-[11px] text-slate-500">
                              {op.hall} · {op.machineName} · قالب {op.dieName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center font-mono">
                          <span className="text-slate-600">
                            بافر ورودی: <strong>{formatNumber(wipInBuffer)}</strong>
                          </span>
                          <span className="text-emerald-700 font-bold">
                            تولید سالم: {formatNumber(op.completedGood)}
                          </span>
                          {locked ? (
                            <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[11px]">
                              قفل تقدم ({prev?.stepCode})
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setTrackingOrderId(null);
                                handleOpenStepLogger(trackedOrder, i);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-sans font-semibold cursor-pointer"
                            >
                              ثبت کارکرد
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Issued Documents & Command Audit Log */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-slate-600" />
                  <span>تاریخچه دستورات و اسناد صادرشده برای این دستور کار:</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {(trackedOrder.commandLogs || []).length === 0 ? (
                    <div className="p-3 text-center text-slate-400">
                      هنوز سندی برای این دستور ثبت نشده است.
                    </div>
                  ) : (
                    (trackedOrder.commandLogs || []).map(log => (
                      <div
                        key={log.id}
                        className="px-3.5 py-2 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900 ml-2">
                            [{log.docNumber}]
                          </span>
                          <span className="font-semibold text-slate-800">{log.title}</span>
                          <span className="text-slate-400 mr-2">({log.targetStation})</span>
                        </div>
                        <div className="font-mono text-slate-600 shrink-0">
                          {log.qtyOrWeight} · {log.timestamp}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setTrackingOrderId(null)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                >
                  بستن پنجره پیگیری
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* MODAL 4: PRE-FLIGHT WIP & SUB-COMPONENT INSPECTION MODAL             */}
      {/* ==================================================================== */}
      {inspectingOrderForWip && (
        <PreMoWipInspectionModal
          isOpen={true}
          onClose={() => {
            setInspectingOrderForWip(null);
            router.closeModal();
          }}
          order={inspectingOrderForWip}
          onConfirmIssueOrder={updatedOrder => {
            const finalOrder = updatedOrder || inspectingOrderForWip;
            if (isNewOrderMode) {
              saveScenarios([finalOrder, ...scenarios]);
              setExpandedOrderId(finalOrder.id);
              setExpandedViewMode('OPS');
              showUndoToast({
                title: `دستور تولید ${finalOrder.orderCode} صادر شد`,
                detail: `کالای «${finalOrder.partName}» پس از تایید ارزیابی موازنه WIP ثبت شد.`,
                variant: 'success',
              });
              setIsNewOrderMode(false);
              setEditingOrder(null);
            }
            setInspectingOrderForWip(null);
            router.closeModal();
          }}
          onIssueSubMo={subMoData => {
            handleCreateSubMoScenario(subMoData);
          }}
        />
      )}
    </div>
  );
};
