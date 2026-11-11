import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Disc,
  ListTree,
  GitBranch,
  Settings2,
  Warehouse,
  Ruler,
  Clock,
  Users,
  Wrench,
  RefreshCw,
  Plus,
  Edit3,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  Table2,
  Search,
  CheckCircle2,
  X,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  Check,
  GitFork,
  Car,
  FolderTree,
  Copy,
} from 'lucide-react';
import {
  Part,
  Machine,
  Routing,
  DieMold,
  Operator,
  FactoryHall,
  SapcoCoilReceipt,
  WarehouseDefinition,
  UnitDefinition,
  CustomerDefinition,
  ShiftDefinition,
  CarModel,
  OperationDefinition,
} from '../types/inventory';
import { ErpColorTheme, ErpLayoutTemplate, COLOR_THEMES } from '../types/theme';
import { PartsView } from './PartsView';
import { RoutingsView } from './RoutingsView';
import { MachinesView } from './MachinesView';
import { AdvancedBomModuleView } from './bom/AdvancedBomModuleView';
import { ProductStructureView } from './bom/ProductStructureView';
import { ParallelProductionFlowView } from './wip/ParallelProductionFlowView';
import { TraceabilityTagModal } from './wip/TraceabilityTagModal';
import { toPersianDigits } from '../utils/formatters';
import { MasterDataSkeleton } from './ui/Skeleton';

export type MasterSubSection =
  | 'HUB'
  | 'PARTS'
  | 'RAW_MATERIALS'
  | 'BOM'
  | 'PRODUCT_STRUCTURE'
  | 'PARALLEL_FLOWS'
  | 'ROUTINGS'
  | 'OPERATIONS'
  | 'WAREHOUSES'
  | 'UNITS'
  | 'SHIFTS'
  | 'CUSTOMERS'
  | 'MACHINES'
  | 'DIES'
  | 'CAR_MODELS'
  | 'ORDERS';

interface RawSheetSpec {
  id: string;
  code: string;
  name: string;
  grade: string;
  thicknessMm: number;
  dimensionsMm: string;
  sheetWeightKg: number;
  unit: string;
  contractsCount: number;
  active: boolean;
}

const INITIAL_RAW_SHEETS: RawSheetSpec[] = [
  {
    id: 'RM-1',
    code: 'SHT-ST12-0.7',
    name: 'ورق سرد ST12 ضخامت ۰/۷',
    grade: 'ST12',
    thicknessMm: 0.7,
    dimensionsMm: '۱,۰۰۰ × ۲,۰۰۰',
    sheetWeightKg: 11.0,
    unit: 'کیلوگرم',
    contractsCount: 0,
    active: true,
  },
  {
    id: 'RM-2',
    code: 'SHT-ST12-0.8',
    name: 'ورق سرد ST12 ضخامت ۰/۸',
    grade: 'ST12',
    thicknessMm: 0.8,
    dimensionsMm: '۱,۰۰۰ × ۲,۰۰۰',
    sheetWeightKg: 12.6,
    unit: 'کیلوگرم',
    contractsCount: 1,
    active: true,
  },
  {
    id: 'RM-3',
    code: 'SHT-ST12-1.0',
    name: 'ورق سرد ST12 ضخامت ۱/۰',
    grade: 'ST12',
    thicknessMm: 1.0,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 24.5,
    unit: 'کیلوگرم',
    contractsCount: 1,
    active: true,
  },
  {
    id: 'RM-4',
    code: 'SHT-ST12-1.2',
    name: 'ورق سرد ST12 ضخامت ۱/۲',
    grade: 'ST12',
    thicknessMm: 1.2,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 29.4,
    unit: 'کیلوگرم',
    contractsCount: 1,
    active: true,
  },
  {
    id: 'RM-5',
    code: 'SHT-ST12-1.5',
    name: 'ورق سرد ST12 ضخامت ۱/۵',
    grade: 'ST12',
    thicknessMm: 1.5,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 36.8,
    unit: 'کیلوگرم',
    contractsCount: 0,
    active: true,
  },
  {
    id: 'RM-6',
    code: 'SHT-ST12-2.0',
    name: 'ورق سرد ST12 ضخامت ۲/۰',
    grade: 'ST12',
    thicknessMm: 2.0,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 49.0,
    unit: 'کیلوگرم',
    contractsCount: 0,
    active: true,
  },
  {
    id: 'RM-7',
    code: 'SHT-ST13-1.5',
    name: 'ورق سرد ST13 ضخامت ۱/۵ (کشش)',
    grade: 'ST13',
    thicknessMm: 1.5,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 36.8,
    unit: 'کیلوگرم',
    contractsCount: 1,
    active: true,
  },
  {
    id: 'RM-8',
    code: 'SHT-ST14-0.8',
    name: 'ورق فوق کشش ST14 ضخامت ۰/۸',
    grade: 'ST14',
    thicknessMm: 0.8,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 19.6,
    unit: 'کیلوگرم',
    contractsCount: 2,
    active: true,
  },
];

interface MasterDataHubViewProps {
  layoutTemplate: ErpLayoutTemplate;
  colorTheme: ErpColorTheme;
  parts: Part[];
  routings: Routing[];
  machines: Machine[];
  dies: DieMold[];
  operators: Operator[];
  halls: FactoryHall[];
  coils: SapcoCoilReceipt[];
  onSavePart: (part: Partial<Part>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveRouting: (routing: Partial<Routing>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteRouting: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveMachine: (mch: Partial<Machine>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveDie: (die: Partial<DieMold>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteDie: (id: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveOperator: (op: Partial<Operator>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSaveHall: (hall: Partial<FactoryHall>) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDirectProduce: (partId: string) => void;
  onRefresh: () => Promise<void>;
  onNavigateToInventoryCoils?: () => void;
  onNavigateToPlanning?: () => void;
}

export const MasterDataHubView: React.FC<MasterDataHubViewProps> = ({
  layoutTemplate,
  colorTheme,
  parts,
  routings,
  machines,
  dies,
  operators,
  halls,
  coils,
  onSavePart,
  onSaveRouting,
  onDeleteRouting,
  onSaveMachine,
  onSaveDie,
  onDeleteDie,
  onSaveOperator,
  onSaveHall,
  onDirectProduce,
  onRefresh,
  onNavigateToInventoryCoils,
  onNavigateToPlanning,
}) => {
  const themeMeta = COLOR_THEMES[colorTheme];

  // View mode: 'CARDS_HUB' (Image 1 / ERPNext) vs 'SEGMENTED_TABS' (Image 2)
  const [viewMode, setViewMode] = useState<'CARDS_HUB' | 'SEGMENTED_TABS'>(
    layoutTemplate === 'HUB_WORKSPACE' || layoutTemplate === 'ODOO_ENTERPRISE'
      ? 'CARDS_HUB'
      : 'SEGMENTED_TABS'
  );

  // Sync automatically when user switches global template
  useEffect(() => {
    if (layoutTemplate === 'HUB_WORKSPACE') {
      setViewMode('CARDS_HUB');
      setActiveSection('HUB');
    } else if (layoutTemplate === 'TABBED_WORKBENCH') {
      setViewMode('SEGMENTED_TABS');
      setActiveSection(prev => (prev === 'HUB' ? 'RAW_MATERIALS' : prev));
    }
  }, [layoutTemplate]);

  const [activeSection, setActiveSection] = useState<MasterSubSection>(
    layoutTemplate === 'TABBED_WORKBENCH' ? 'RAW_MATERIALS' : 'HUB'
  );

  useEffect(() => {
    const handleContextual = (e: Event) => {
      const custom = e as CustomEvent<{ actionType?: string }>;
      if (custom.detail?.actionType === 'OPEN_ADD_PART') {
        setActiveSection('PARTS');
      } else if (custom.detail?.actionType === 'OPEN_ADD_ROUTING') {
        setActiveSection('ROUTINGS');
      }
    };
    window.addEventListener('kpims:contextual-action', handleContextual);
    return () => window.removeEventListener('kpims:contextual-action', handleContextual);
  }, []);

  const [rawSheets, setRawSheets] = useState<RawSheetSpec[]>(INITIAL_RAW_SHEETS);
  const [sheetSearch, setSheetSearch] = useState('');
  const [editingSheet, setEditingSheet] = useState<RawSheetSpec | null>(null);
  const [isNewSheetModalOpen, setIsNewSheetModalOpen] = useState(false);
  const [sheetForm, setSheetForm] = useState<Partial<RawSheetSpec>>({
    code: '',
    name: '',
    grade: 'ST12',
    thicknessMm: 1.0,
    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
    sheetWeightKg: 24.5,
    unit: 'کیلوگرم',
    contractsCount: 1,
    active: true,
  });

  // Dynamic Master Data CRUD States
  const [warehousesList, setWarehousesList] = useState<WarehouseDefinition[]>([]);
  const [unitsList, setUnitsList] = useState<UnitDefinition[]>([]);
  const [customersList, setCustomersList] = useState<CustomerDefinition[]>([]);
  const [shiftsList, setShiftsList] = useState<ShiftDefinition[]>([]);
  const [carModelsList, setCarModelsList] = useState<CarModel[]>([]);

  // Sub-modals for Master Data CRUD
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseDefinition | null>(null);
  const [warehouseForm, setWarehouseForm] = useState<Partial<WarehouseDefinition>>({
    code: '',
    name: '',
    type: 'RAW_MATERIALS',
    managerName: '',
    locations: ['LOC-RAW-01'],
  });

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitDefinition | null>(null);
  const [unitForm, setUnitForm] = useState<Partial<UnitDefinition>>({
    symbol: '',
    title: '',
    description: '',
    conversionFactorToKg: 1,
    isBaseUnit: false,
  });

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDefinition | null>(null);
  const [customerForm, setCustomerForm] = useState<Partial<CustomerDefinition>>({
    code: '',
    name: '',
    contractType: 'تامین قطعات پرسی بدنه',
    phone: '',
    email: '',
    address: '',
    isDefault: false,
  });

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftDefinition | null>(null);
  const [shiftForm, setShiftForm] = useState<Partial<ShiftDefinition>>({
    code: '',
    name: '',
    startTime: '07:00',
    endTime: '14:30',
    netWorkMinutes: 450,
    status: 'ACTIVE',
    hasOvertime: true,
    overtimeStartTime: '15:00',
    overtimeEndTime: '17:00',
    overtimeMinutes: 120,
    overtimeDaysDescription: 'شنبه تا چهارشنبه',
    thursdayStatus: 'OVERTIME_15_17',
  });

  const [isCarModelModalOpen, setIsCarModelModalOpen] = useState(false);
  const [editingCarModel, setEditingCarModel] = useState<CarModel | null>(null);
  const [carModelForm, setCarModelForm] = useState<Partial<CarModel>>({
    code: '',
    name: '',
    oem: 'ساپکو (ایران‌خودرو)',
    description: '',
    active: true,
  });

  // Operations CRUD States
  const [operationsList, setOperationsList] = useState<OperationDefinition[]>([]);
  const [operationSearch, setOperationSearch] = useState('');
  const [operationCategoryFilter, setOperationCategoryFilter] = useState<string>('ALL');
  const [isOperationModalOpen, setIsOperationModalOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState<OperationDefinition | null>(null);
  const [operationForm, setOperationForm] = useState<Partial<OperationDefinition>>({
    code: '',
    name: '',
    stationType: '',
    cycleTimeSec: 4.5,
    setupTimeMin: 20,
    category: 'STAMPING',
    description: '',
    active: true,
  });

  const loadDynamicMasterData = async () => {
    try {
      const [wRes, uRes, cRes, sRes, cmRes, opRes] = await Promise.all([
        fetch('/api/warehouses').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/units').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/customers').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/shifts').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/car-models').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/operations').then(r => r.json()).catch(() => ({ success: false })),
      ]);
      if (wRes.success && wRes.data) setWarehousesList(wRes.data);
      if (uRes.success && uRes.data) setUnitsList(uRes.data);
      if (cRes.success && cRes.data) setCustomersList(cRes.data);
      if (sRes.success && sRes.data) setShiftsList(sRes.data);
      if (cmRes.success && cmRes.data) setCarModelsList(cmRes.data);
      if (opRes.success && opRes.data) setOperationsList(opRes.data);
    } catch (e) {
      console.error('Error loading dynamic master data:', e);
    }
  };

  useEffect(() => {
    loadDynamicMasterData();
  }, []);

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warehouseForm),
      });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
        setIsWarehouseModalOpen(false);
        setEditingWarehouse(null);
      } else {
        alert(data.error || 'خطا در ثبت انبار');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!confirm('آیا از حذف این انبار اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/warehouses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
      } else {
        alert(data.error || 'خطا در حذف انبار');
      }
    } catch {
      alert('خطا در حذف انبار');
    }
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unitForm),
      });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
        setIsUnitModalOpen(false);
        setEditingUnit(null);
      } else {
        alert(data.error || 'خطا در ثبت واحد');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('آیا از حذف این واحد اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/units/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
      } else {
        alert(data.error || 'خطا در حذف واحد');
      }
    } catch {
      alert('خطا در حذف واحد');
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm),
      });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
        setIsCustomerModalOpen(false);
        setEditingCustomer(null);
      } else {
        alert(data.error || 'خطا در ثبت مشتری');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('آیا از حذف این مشتری اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
      } else {
        alert(data.error || 'خطا در حذف مشتری');
      }
    } catch {
      alert('خطا در حذف مشتری');
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftForm),
      });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
        setIsShiftModalOpen(false);
        setEditingShift(null);
      } else {
        alert(data.error || 'خطا در ثبت شیفت');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('آیا از حذف این شیفت اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
      } else {
        alert(data.error || 'خطا در حذف شیفت');
      }
    } catch {
      alert('خطا در حذف شیفت');
    }
  };

  const handleSaveCarModel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/car-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carModelForm),
      });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
        setIsCarModelModalOpen(false);
        setEditingCarModel(null);
      } else {
        alert(data.error || 'خطا در ثبت مدل خودرو');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleDeleteCarModel = async (id: string) => {
    if (!confirm('آیا از حذف این مدل خودرو اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/car-models/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
      } else {
        alert(data.error || 'خطا در حذف مدل خودرو');
      }
    } catch {
      alert('خطا در حذف مدل خودرو');
    }
  };

  const handleSaveOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operationForm),
      });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
        setIsOperationModalOpen(false);
        setEditingOperation(null);
      } else {
        alert(data.error || 'خطا در ثبت عملیات');
      }
    } catch {
      alert('خطای ارتباط با سرور');
    }
  };

  const handleDeleteOperation = async (id: string) => {
    if (!confirm('آیا از حذف این عملیات استاندارد اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/operations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadDynamicMasterData();
      } else {
        alert(data.error || 'خطا در حذف عملیات');
      }
    } catch {
      alert('خطا در حذف عملیات');
    }
  };

  // Hub Cards exactly matching Uploaded Image 1 (1_1da4846f.jpg)
  const hubCards: {
    id: MasterSubSection;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    countBadge?: string;
  }[] = [
    {
      id: 'PARTS',
      title: 'قطعات (کالا)',
      description: 'تعریف قطعه، واحد پایه، وزن استاندارد، ماده اصلی و مشتری',
      icon: Boxes,
      countBadge: `${toPersianDigits(parts.length)} قطعه`,
    },
    {
      id: 'RAW_MATERIALS',
      title: 'مواد اولیه و کویل',
      description: 'ورق/کویل/رنگ با گرید، ابعاد، وزن واحد و تامین‌کننده',
      icon: Disc,
      countBadge: `${toPersianDigits(rawSheets.length)} گرید ورق`,
    },
    {
      id: 'BOM',
      title: 'درخت محصول و اجزا (BOM)',
      description: 'ساختار چندسطحی قطعات مرکب، ورق‌های مختلف، پیچ و مهره و قطعات لاستیکی',
      icon: ListTree,
      countBadge: 'درخت محصول چندسطحی',
    },
    {
      id: 'PRODUCT_STRUCTURE',
      title: 'ساختار درختی کالا (Product Structure)',
      description: 'مدل ساختار بازگشتی کالا، تخصیص زیرمجموعه‌ها و ضرایب مصرف مانند براکت ضدسرقت',
      icon: FolderTree,
      countBadge: 'ساختار درختی بازگشتی',
    },
    {
      id: 'PARALLEL_FLOWS',
      title: 'تولید موازی و انشعاب',
      description: 'منطق قالب‌های دوگانه چپ/راست، انشعاب ورق و الحاق در جوشکاری',
      icon: GitFork,
      countBadge: 'قالب‌های مشترک و ادغام',
    },
    {
      id: 'ROUTINGS',
      title: 'مسیرهای تولید',
      description: 'نسخه‌بندی مسیر و ترتیب عملیات، ماشین و قالب هر مرحله',
      icon: GitBranch,
      countBadge: `${toPersianDigits(routings.length)} مسیر`,
    },
    {
      id: 'OPERATIONS',
      title: 'عملیات تولید',
      description: 'برش، خالی‌بری، خم، پرس، جوش، رنگ و مونتاژ با زمان‌های استاندارد',
      icon: Settings2,
      countBadge: `${toPersianDigits(operationsList.length)} ایستگاه و عملیات`,
    },
    {
      id: 'WAREHOUSES',
      title: 'انبارها و موقعیت‌ها',
      description: 'انبارهای مواد/WIP/محصول/ضایعات و قفسه‌ها',
      icon: Warehouse,
      countBadge: '۵ انبار فعال',
    },
    {
      id: 'UNITS',
      title: 'واحدهای شمارش',
      description: 'عدد، کیلوگرم، متر، مترمربع و برگ',
      icon: Ruler,
      countBadge: '۵ واحد پایه',
    },
    {
      id: 'SHIFTS',
      title: 'شیفت‌های کاری',
      description: 'ساعت شروع و پایان شیفت‌ها — مبنای تقویم ظرفیت',
      icon: Clock,
      countBadge: '۳ شیفت کاری',
    },
    {
      id: 'CUSTOMERS',
      title: 'مشتریان',
      description: 'شرکت‌های خودروساز و اطلاعات تماس',
      icon: Users,
      countBadge: 'ساپکو / سازه‌گستر',
    },
    {
      id: 'MACHINES',
      title: 'ماشین‌آلات و ظرفیت',
      description: 'پرس‌ها و ایستگاه‌ها، توانمندی‌ها، قالب‌ها و ظرفیت',
      icon: Wrench,
      countBadge: `${toPersianDigits(machines.length)} دستگاه`,
    },
    {
      id: 'DIES',
      title: 'قالب‌های پرس و فیکسچرها',
      description: 'شناسنامه قالب، تناژ مورد نیاز، پرس‌های سازگار، کنترل ضرب و وضعیت PM',
      icon: Wrench,
      countBadge: `${toPersianDigits(dies.length)} قالب فعال`,
    },
    {
      id: 'CAR_MODELS',
      title: 'مدل‌های خودرو و خانواده محصول',
      description: 'پژو ۲۰۶، ۲۰۷، تارا، دنا پلاس، شاهین، کوییک و ارتباط با خودروساز',
      icon: Car,
      countBadge: `${toPersianDigits(carModelsList.length)} مدل خودرو`,
    },
  ];

  // Segmented Tabs exactly matching Uploaded Image 2 (2_5080a2ed.jpg)
  const segmentedTabs: { id: MasterSubSection; label: string }[] = [
    { id: 'PARTS', label: 'قطعات' },
    { id: 'RAW_MATERIALS', label: 'ماده اولیه' },
    { id: 'BOM', label: 'درخت محصول (BOM)' },
    { id: 'PRODUCT_STRUCTURE', label: 'ساختار درختی کالا' },
    { id: 'PARALLEL_FLOWS', label: 'تولید موازی و چپ/راست' },
    { id: 'ROUTINGS', label: 'مسیر تولید' },
    { id: 'OPERATIONS', label: 'عملیات' },
    { id: 'MACHINES', label: 'ماشین‌آلات' },
    { id: 'DIES', label: 'قالب‌ها' },
    { id: 'CAR_MODELS', label: 'مدل خودرو' },
    { id: 'WAREHOUSES', label: 'انبارها' },
    { id: 'CUSTOMERS', label: 'مشتریان' },
    { id: 'ORDERS', label: 'سفارشات' },
  ];

  const handleSaveSheetSpec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetForm.code || !sheetForm.name) return;

    if (editingSheet) {
      setRawSheets(prev =>
        prev.map(item =>
          item.id === editingSheet.id
            ? ({ ...item, ...sheetForm } as RawSheetSpec)
            : item
        )
      );
      setEditingSheet(null);
    } else {
      const newSpec: RawSheetSpec = {
        id: `RM-${Date.now()}`,
        code: sheetForm.code,
        name: sheetForm.name,
        grade: sheetForm.grade || 'ST12',
        thicknessMm: Number(sheetForm.thicknessMm) || 1.0,
        dimensionsMm: sheetForm.dimensionsMm || '۱,۲۵۰ × ۲,۵۰۰',
        sheetWeightKg: Number(sheetForm.sheetWeightKg) || 24.5,
        unit: sheetForm.unit || 'کیلوگرم',
        contractsCount: Number(sheetForm.contractsCount) || 0,
        active: sheetForm.active !== false,
      };
      setRawSheets(prev => [newSpec, ...prev]);
    }

    // Automatically sync with global parts catalog as RAW_MATERIAL
    try {
      await onSavePart({
        code: sheetForm.code,
        name: sheetForm.name,
        category: 'RAW_MATERIAL',
        unit: 'KG',
        materialGrade: sheetForm.grade || 'ST12',
        thicknessMm: Number(sheetForm.thicknessMm) || 1.0,
        weightPerUnitKg: Number(sheetForm.sheetWeightKg) || 24.5,
      });
    } catch (err) {
      console.warn('Could not auto-sync sheet with parts catalog:', err);
    }

    setIsNewSheetModalOpen(false);
  };

  const filteredRawSheets = rawSheets.filter(
    s =>
      !sheetSearch.trim() ||
      s.code.toLowerCase().includes(sheetSearch.toLowerCase()) ||
      s.name.toLowerCase().includes(sheetSearch.toLowerCase()) ||
      s.grade.toLowerCase().includes(sheetSearch.toLowerCase())
  );

  if (parts.length === 0 && machines.length === 0) {
    return <MasterDataSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Grafana-Inspired Header & Flat Section Selector (Zero Nested Tabs) */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">اطلاعات پایه کارخانه</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                مدیریت یکپارچه قطعات، ورق‌ها، درخت محصول (BOM)، مسیر تولید، ماشین‌آلات، انبارها و مشتریان
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setViewMode('CARDS_HUB');
                  setActiveSection('HUB');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'CARDS_HUB' && activeSection === 'HUB'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-orange-600" />
                <span>فهرست کارتی</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('SEGMENTED_TABS');
                  if (activeSection === 'HUB') setActiveSection('RAW_MATERIALS');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeSection !== 'HUB'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table2 className="w-3.5 h-3.5 text-slate-600" />
                <span>نمای جدولی مستقیم</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
              <span>به‌روزرسانی</span>
            </button>
          </div>
        </div>

        {/* Single Flat Section Selector Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <span className="text-slate-500 font-medium">انتخاب جدول پایه:</span>
              <select
                value={activeSection}
                onChange={e => {
                  const val = e.target.value as MasterSubSection;
                  setActiveSection(val);
                  if (val !== 'HUB') setViewMode('SEGMENTED_TABS');
                }}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="HUB">پیشخوان همه جداول اطلاعات پایه (۱۳ بخش)</option>
                {segmentedTabs.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
                <option value="UNITS">واحدهای شمارش</option>
                <option value="SHIFTS">شیفت‌های کاری</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'PARTS', label: 'قطعات' },
                { id: 'RAW_MATERIALS', label: 'ورق و کویل' },
                { id: 'BOM', label: 'درخت محصول (BOM)' },
                { id: 'ROUTINGS', label: 'مسیر تولید' },
                { id: 'MACHINES', label: 'ماشین‌آلات' },
                { id: 'DIES', label: 'قالب‌ها' },
                { id: 'CAR_MODELS', label: 'مدل‌های خودرو' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(tab.id as MasterSubSection);
                    setViewMode('SEGMENTED_TABS');
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer border ${
                    activeSection === tab.id
                      ? 'bg-orange-50 text-orange-900 border-orange-200 font-bold'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeSection !== 'HUB' && (
            <button
              type="button"
              onClick={() => {
                setViewMode('CARDS_HUB');
                setActiveSection('HUB');
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>بازگشت به فهرست کارتی</span>
            </button>
          )}
        </div>
      </div>

      {/* MODE 1: WORKSPACE CARD HUB */}
      {activeSection === 'HUB' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {hubCards.map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    setActiveSection(card.id);
                    setViewMode('SEGMENTED_TABS');
                  }}
                  className="group bg-white hover:bg-slate-50/60 border border-slate-200/90 hover:border-orange-300 rounded-xl p-5 flex flex-col justify-between transition-all cursor-pointer shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200/60 text-orange-600 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-700 transition-colors">
                          {card.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed min-h-[38px]">
                      {card.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {card.countBadge ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                        {card.countBadge}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-orange-600 transition-colors">
                      <span>مشاهده</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          ACTIVE SUB-SECTION CONTENT
         ===================================================================== */}

      {/* 1. RAW MATERIALS & SHEET SPECS (Matches Table in Image 2: 2_5080a2ed.jpg) */}
      {activeSection === 'RAW_MATERIALS' && (
        <div className="space-y-3">
          {/* Informative banner addressing user domain question */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-start justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">🔗 اتصال و یکپارچگی مواد اولیه با انبار قطعات (Master Item Catalog):</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {toPersianDigits(parts.filter(p => p.category === 'RAW_MATERIAL').length)} قلم ماده اولیه در انبار کالا
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                در خطوط پرسکاری بدنه خودرو، کلیه اجناس اعم از <strong>مواد اولیه (ورق و رول)</strong>، <strong>قطعات نیمه‌ساخته (WIP)</strong> و <strong>محصول نهایی</strong> دارای هویت واحد به عنوان کالا هستند. این جدول مشخصات مهندسی ابعاد شیت (ضخامت، طول/عرض برش و وزن هر برگ برای موازنه خطوط پرس) را تنظیم می‌کند و هر ردیف آن مستقیماً با کاتالوگ قطعات همگام است.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('PARTS')}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-[11px] whitespace-nowrap cursor-pointer shrink-0"
            >
              مشاهده در انبار قطعات ←
            </button>
          </div>

          {/* Action Row above table matching Image 2 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEditingSheet(null);
                  setSheetForm({
                    code: `SHT-ST12-${(rawSheets.length + 1) * 0.2}`,
                    name: '',
                    grade: 'ST12',
                    thicknessMm: 1.0,
                    dimensionsMm: '۱,۲۵۰ × ۲,۵۰۰',
                    sheetWeightKg: 24.5,
                    unit: 'کیلوگرم',
                    contractsCount: 1,
                    active: true,
                  });
                  setIsNewSheetModalOpen(true);
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${themeMeta.buttonPrimaryClass}`}
              >
                <Plus className="w-4 h-4" />
                <span>ماده اولیه جدید</span>
              </button>
              <span className="text-xs font-semibold text-slate-500">
                {toPersianDigits(filteredRawSheets.length)} ماده
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={sheetSearch}
                  onChange={e => setSheetSearch(e.target.value)}
                  placeholder="جستجوی کد ورق، گرید (ST12/ST13) یا ضخامت..."
                  className="bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 w-64"
                />
              </div>
              {onNavigateToInventoryCoils && (
                <button
                  type="button"
                  onClick={onNavigateToInventoryCoils}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  رهگیری کویل‌پک‌ها در انبار ({toPersianDigits(coils.length)} رول) ←
                </button>
              )}
            </div>
          </div>

          {/* High-Contrast Right-Bordered Table exactly like Image 2 */}
          <div
            className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs ${themeMeta.borderAccentClass}`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold">
                  <tr>
                    <th className="py-3.5 px-4">کد ماده</th>
                    <th className="py-3.5 px-4">نام</th>
                    <th className="py-3.5 px-4">گرید</th>
                    <th className="py-3.5 px-4">ضخامت (mm)</th>
                    <th className="py-3.5 px-4">ابعاد ورق (mm)</th>
                    <th className="py-3.5 px-4">وزن ورق (kg)</th>
                    <th className="py-3.5 px-4">واحد</th>
                    <th className="py-3.5 px-4">قراردادها</th>
                    <th className="py-3.5 px-4">وضعیت</th>
                    <th className="py-3.5 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredRawSheets.map(sheet => (
                    <tr
                      key={sheet.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums">
                        {sheet.code}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {sheet.name}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {sheet.grade}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-medium">
                        {toPersianDigits(sheet.thicknessMm.toString().replace('.', '/'))}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-slate-600">
                        {sheet.dimensionsMm}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-semibold text-slate-800">
                        {toPersianDigits(sheet.sheetWeightKg.toFixed(1).replace('.', '/'))}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{sheet.unit}</td>
                      <td className="py-3.5 px-4 tabular-nums font-bold text-slate-700">
                        {toPersianDigits(sheet.contractsCount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                          {sheet.active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSheet(sheet);
                            setSheetForm(sheet);
                            setIsNewSheetModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>ویرایش</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. PARTS (قطعات / کالا) */}
      {activeSection === 'PARTS' && (
        <PartsView parts={parts} onSavePart={onSavePart} />
      )}

      {/* 3. ROUTINGS (مسیرهای تولید) */}
      {activeSection === 'ROUTINGS' && (
        <RoutingsView
          routings={routings}
          parts={parts}
          machines={machines}
          dies={dies}
          onSaveRouting={onSaveRouting}
          onDeleteRouting={onDeleteRouting}
          onDirectProduce={onDirectProduce}
          onSaveMachine={onSaveMachine}
          onSaveDie={onSaveDie}
        />
      )}

      {/* 4. MACHINES & DIES (ماشین‌آلات و قالب‌ها) */}
      {(activeSection === 'MACHINES' || activeSection === 'DIES') && (
        <MachinesView
          machines={machines}
          dies={dies}
          operators={operators}
          halls={halls}
          parts={parts}
          initialSubTab={activeSection === 'DIES' ? 'dies' : 'machines'}
          onSaveMachine={onSaveMachine}
          onSaveDie={onSaveDie}
          onDeleteDie={onDeleteDie}
          onSaveOperator={onSaveOperator}
          onSaveHall={onSaveHall}
        />
      )}

      {/* 5. BOM (درخت محصول پیشرفته چندسطحی) */}
      {activeSection === 'BOM' && (
        <AdvancedBomModuleView
          parts={parts}
          onNavigateToParallelFlow={() => setActiveSection('PARALLEL_FLOWS')}
        />
      )}

      {/* 5.0. PRODUCT STRUCTURE (ساختار درختی بازگشتی کالا) */}
      {activeSection === 'PRODUCT_STRUCTURE' && (
        <ProductStructureView parts={parts} />
      )}

      {/* 5.1. PARALLEL PRODUCTION & CO-PRODUCTION FLOWS */}
      {activeSection === 'PARALLEL_FLOWS' && (
        <ParallelProductionFlowView
          onNavigateToBom={() => setActiveSection('BOM')}
        />
      )}

      {/* 6. OPERATIONS (عملیات تولید استاندارد - کاملاً پویا با قابلیت افزودن، ویرایش و حذف) */}
      {activeSection === 'OPERATIONS' && (
        <div
          className={`bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs ${themeMeta.borderAccentClass}`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  ایستگاه‌ها و عملیات استاندارد تولید (Standard Operations)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {toPersianDigits(operationsList.length)} عملیات تعریف‌شده
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                بانک اطلاعاتی عملیات استاندارد برش رول، بلنکینگ، کشش، خم، پرس‌جوش مهره، جوش CO2، پوشش الکتروفورز (ED) و بازرسی نهایی
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingOperation(null);
                setOperationForm({
                  code: `OP-${(operationsList.length + 1) * 10}`,
                  name: '',
                  stationType: '',
                  cycleTimeSec: 4.5,
                  setupTimeMin: 20,
                  category: 'STAMPING',
                  description: '',
                  active: true,
                });
                setIsOperationModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer text-white shadow-xs ${themeMeta.buttonPrimaryClass}`}
            >
              <Plus className="w-4 h-4" />
              <span>تعریف عملیات جدید</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو در کد، نام عملیات، ایستگاه یا توضیحات..."
                value={operationSearch}
                onChange={e => setOperationSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
              />
              {operationSearch && (
                <button
                  type="button"
                  onClick={() => setOperationSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'همه دسته‌ها' },
                { id: 'SHEARING', label: 'برش و نواربری' },
                { id: 'STAMPING', label: 'پرسکاری و کشش' },
                { id: 'BENDING', label: 'خم‌کاری' },
                { id: 'WELDING', label: 'جوش مقاومتی و CO2' },
                { id: 'SURFACE_FINISH', label: 'رنگ و فسفاته' },
                { id: 'QC_PACK', label: 'کنترل کیفی و پکینگ' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setOperationCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    operationCategoryFilter === cat.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Operations Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">کد عملیات</th>
                  <th className="py-3 px-4">عنوان عملیات</th>
                  <th className="py-3 px-4">نوع ایستگاه / تجهیزات</th>
                  <th className="py-3 px-4">دسته فرآیندی</th>
                  <th className="py-3 px-4">زمان چرخه (ثانیه)</th>
                  <th className="py-3 px-4">زمان تعویض قالب (دقیقه)</th>
                  <th className="py-3 px-4">وضعیت</th>
                  <th className="py-3 px-4 text-center">اقدامات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {operationsList
                  .filter(op => {
                    const matchCat =
                      operationCategoryFilter === 'ALL' || op.category === operationCategoryFilter;
                    const q = operationSearch.trim().toLowerCase();
                    const matchSearch =
                      !q ||
                      op.code.toLowerCase().includes(q) ||
                      op.name.toLowerCase().includes(q) ||
                      op.stationType.toLowerCase().includes(q) ||
                      (op.description && op.description.toLowerCase().includes(q));
                    return matchCat && matchSearch;
                  })
                  .map(op => {
                    const categoryLabels: Record<string, { label: string; color: string }> = {
                      SHEARING: { label: 'برشکاری', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                      STAMPING: { label: 'پرسکاری', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                      BENDING: { label: 'خم‌کاری', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
                      WELDING: { label: 'جوشکاری', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                      SURFACE_FINISH: { label: 'رنگ و پوشش', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                      QC_PACK: { label: 'کنترل و بسته‌بندی', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    };
                    const catMeta = categoryLabels[op.category] || { label: op.category, color: 'bg-slate-100 text-slate-700 border-slate-200' };

                    return (
                      <tr key={op.id || op.code} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{op.code}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{op.name}</div>
                          {op.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{op.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{op.stationType}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catMeta.color}`}>
                            {catMeta.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums font-bold text-slate-900">
                          {toPersianDigits(op.cycleTimeSec)} ثانیه
                        </td>
                        <td className="py-3 px-4 tabular-nums text-slate-700">
                          {toPersianDigits(op.setupTimeMin)} دقیقه
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              op.active !== false
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {op.active !== false ? 'فعال' : 'غیرفعال'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOperation(op);
                                setOperationForm({ ...op });
                                setIsOperationModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                            >
                              ویرایش
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOperation(null);
                                setOperationForm({
                                  ...op,
                                  id: undefined,
                                  code: `${op.code}-COPY`,
                                  name: `${op.name} (کپی)`,
                                });
                                setIsOperationModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-900 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="کپی‌گیری سریع (Duplicate) برای ایجاد عملیات مشابه"
                            >
                              <Copy className="w-3 h-3" />
                              <span>کپی‌گیری</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOperation(op.id || op.code)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {operationsList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      عملیاتی یافت نشد. جهت تعریف مرحله جدید دکمه «تعریف عملیات جدید» را بزنید.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. WAREHOUSES, UNITS, SHIFTS, CUSTOMERS, CAR_MODELS, ORDERS */}
      {(activeSection === 'WAREHOUSES' ||
        activeSection === 'UNITS' ||
        activeSection === 'SHIFTS' ||
        activeSection === 'CUSTOMERS' ||
        activeSection === 'CAR_MODELS' ||
        activeSection === 'ORDERS') && (
        <div
          className={`bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs ${themeMeta.borderAccentClass}`}
        >
          {activeSection === 'WAREHOUSES' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">انبارها و موقعیت‌های استقرار مواد و قطعات</h3>
                  <p className="text-xs text-slate-500 mt-0.5">مدیریت انبارهای مواد اولیه، پای خط (WIP)، محصول نهایی و ضایعات</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingWarehouse(null);
                    setWarehouseForm({
                      code: `WH-${Date.now().toString().slice(-4)}`,
                      name: '',
                      type: 'RAW_MATERIALS',
                      managerName: '',
                      locations: ['LOC-01'],
                    });
                    setIsWarehouseModalOpen(true);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>تعریف انبار جدید</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {warehousesList.map(w => (
                  <div key={w.id || w.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 relative group hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{w.name}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {w.type === 'RAW_MATERIALS' ? 'مواد اولیه' : w.type === 'WIP' ? 'پای کار (WIP)' : w.type === 'FINISHED_GOODS' ? 'محصول نهایی' : w.type === 'SCRAP' ? 'ضایعات' : 'ابزار/قالب'}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      کد انبار: <span className="font-mono font-bold text-slate-800">{w.code}</span>
                      {w.managerName && <span> — مسوول: {w.managerName}</span>}
                    </div>
                    {w.locations && w.locations.length > 0 && (
                      <div className="text-slate-500 text-[11px] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>موقعیت‌ها: {w.locations.join(' ، ')}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWarehouse(w);
                          setWarehouseForm({ ...w });
                          setIsWarehouseModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWarehouse(w.id || w.code)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
                {warehousesList.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-400">
                    هیچ انباری تعریف نشده است. جهت ایجاد انبار دکمه «تعریف انبار جدید» را بزنید.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'UNITS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">واحدهای شمارش و ضرایب تبدیل مهندسی</h3>
                  <p className="text-xs text-slate-500 mt-0.5">واحدهای پایه شمارش قطعات، وزن کلاف و تبدیل برگه به کیلوگرم</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUnit(null);
                    setUnitForm({ symbol: '', title: '', description: '', conversionFactorToKg: 1, isBaseUnit: false });
                    setIsUnitModalOpen(true);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>تعریف واحد جدید</span>
                </button>
              </div>

              {/* Informative helper box on conversion factors */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <span className="font-bold text-amber-700 shrink-0 mt-0.5">💡 راهنمای مهندسی واحدها:</span>
                <div className="space-y-1 text-[11px] leading-relaxed text-amber-800">
                  <p>
                    <strong>ضریب تبدیل به کیلوگرم:</strong> نشان‌دهنده وزن معادل هر یک واحد به کیلوگرم است (مثلاً برای «برگ ورق ST12» برابر با ۲۴/۵ کیلوگرم و برای «رول استاندارد» برابر با ۵,۰۰۰ کیلوگرم). این ضریب در محاسبات موازنه جرم آهن (Mass Balance) و محاسبه کسری کلاف در MRP مبنای تبدیل است.
                  </p>
                  <p>
                    <strong>واحد مبنای سیستم:</strong> واحدی است که تمامی گزارش‌های کاردکس و تراز انبار بر اساس آن همگن‌سازی می‌شوند (کیلوگرم برای مواد وزنی و عدد برای قطعات پرس).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {unitsList.map(u => (
                  <div key={u.id || u.symbol} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-mono font-bold text-emerald-700">{u.symbol}</div>
                      {u.isBaseUnit && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">واحد مبنا</span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900">{u.title}</div>
                    <div className="text-slate-500 text-[11px] leading-relaxed">{u.description}</div>
                    {u.conversionFactorToKg !== undefined && (
                      <div className="text-[11px] text-slate-700 font-medium bg-white px-2 py-1 rounded border border-slate-200 mt-1">
                        ضریب به کیلوگرم: <span className="font-mono font-bold text-slate-900">{u.conversionFactorToKg}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUnit(u);
                          setUnitForm({ ...u });
                          setIsUnitModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUnit(u.id || u.symbol)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'SHIFTS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">شیفت‌های کاری، اضافه‌کاری و تقویم ظرفیت تولید</h3>
                  <p className="text-xs text-slate-500 mt-0.5">تعریف ساعات کاری شیفت‌ها، زمان خالص کارکرد و برنامه‌ریزی MRP</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingShift(null);
                    setShiftForm({
                      code: `SHIFT-${Date.now().toString().slice(-3)}`,
                      name: '',
                      startTime: '07:00',
                      endTime: '14:30',
                      netWorkMinutes: 450,
                      status: 'ACTIVE',
                      hasOvertime: true,
                      overtimeStartTime: '15:00',
                      overtimeEndTime: '17:00',
                      overtimeMinutes: 120,
                      overtimeDaysDescription: 'شنبه تا چهارشنبه',
                      thursdayStatus: 'OVERTIME_15_17',
                    });
                    setIsShiftModalOpen(true);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>تعریف شیفت جدید</span>
                </button>
              </div>

              {/* Weekly Shift Scenario Banner */}
              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-sm">📅 سناریوی زمان‌بندی و تقویم ظرفیت شیفت کارخانه:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                    مجموع ظرفیت هفتگی: ۳۷/۵ ساعت کار عادی + ۱۰ تا ۱۲ ساعت اضافه‌کاری
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-blue-900">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100 space-y-1">
                    <span className="font-bold text-blue-800">۱. شیفت عادی (شنبه تا چهارشنبه):</span>
                    <p className="text-slate-600">ساعت ۰۷:۰۰ صبح تا ۱۴:۳۰ بعدازظهر (۷ ساعت کار خالص مفید + ۳۰ دقیقه ناهار = ۴۵۰ دقیقه ظرفیت مفید اسمی)</p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100 space-y-1">
                    <span className="font-bold text-blue-800">۲. اضافه‌کاری عادی (شنبه تا چهارشنبه):</span>
                    <p className="text-slate-600">ساعت ۱۵:۰۰ تا ۱۷:۰۰ بعدازظهر (۲ ساعت معادل ۱۲۰ دقیقه اضافه‌کاری خطوط پرس و مونتاژ)</p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100 space-y-1">
                    <span className="font-bold text-blue-800">۳. مدیریت منعطف روز پنجشنبه:</span>
                    <p className="text-slate-600">تنظیم پویا در تقویم: ۱. تعطیل کامل | ۲. فقط اضافه‌کاری ۱۵ الی ۱۷ | ۳. شیفت کامل عادی</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {shiftsList.map(sh => (
                  <div key={sh.id || sh.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{sh.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sh.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {sh.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-700">
                        <span>ساعات عادی:</span>
                        <span className="font-mono font-bold text-slate-900">{sh.startTime} الی {sh.endTime}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>کار مفید عادی:</span>
                        <span className="font-bold text-emerald-700">{toPersianDigits(sh.netWorkMinutes)} دقیقه (۷ ساعت کار + ۳۰ دقیقه ناهار)</span>
                      </div>
                    </div>

                    {sh.hasOvertime && (
                      <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/70 space-y-1 text-[11px]">
                        <div className="flex justify-between text-amber-900 font-semibold">
                          <span>اضافه‌کاری روزانه:</span>
                          <span className="font-mono font-bold">{sh.overtimeStartTime || '15:00'} الی {sh.overtimeEndTime || '17:00'}</span>
                        </div>
                        <div className="flex justify-between text-amber-800">
                          <span>روزها:</span>
                          <span>{sh.overtimeDaysDescription || 'شنبه تا چهارشنبه'} ({toPersianDigits(sh.overtimeMinutes || 120)} دقیقه)</span>
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] flex items-center justify-between bg-slate-100 p-2 rounded-lg">
                      <span className="text-slate-600">وضعیت پنجشنبه:</span>
                      <span className="font-bold text-slate-900">
                        {sh.thursdayStatus === 'OFF'
                          ? 'تعطیل کامل'
                          : sh.thursdayStatus === 'OVERTIME_15_17'
                          ? 'اضافه‌کاری ۱۵ الی ۱۷'
                          : 'شیفت کامل کاری'}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingShift(sh);
                          setShiftForm({ ...sh });
                          setIsShiftModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
                      >
                        ویرایش زمان‌بندی
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteShift(sh.id || sh.code)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'CAR_MODELS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">مدل‌های خودرو و خانواده محصول (Car Models & Platforms)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تعریف خانواده محصولات و خودروهای طرف قرارداد (ایران‌خودرو، سایپا و...) جهت انتساب یکپارچه به قطعات، فیلترهای مسیر تولید و سفارشات
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCarModel(null);
                    setCarModelForm({
                      code: `MDL-${Date.now().toString().slice(-4)}`,
                      name: '',
                      oem: 'ساپکو (ایران‌خودرو)',
                      description: '',
                      active: true,
                    });
                    setIsCarModelModalOpen(true);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>تعریف مدل خودرو جدید</span>
                </button>
              </div>

              {/* Car Models Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <tr>
                      <th className="py-3 px-4">کد شناسه</th>
                      <th className="py-3 px-4">نام مدل خودرو</th>
                      <th className="py-3 px-4">خودروساز / OEM</th>
                      <th className="py-3 px-4">توضیحات و پلتفرم</th>
                      <th className="py-3 px-4 text-center">قطعات متصل در کاتالوگ</th>
                      <th className="py-3 px-4 text-center">وضعیت</th>
                      <th className="py-3 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {carModelsList.map(m => {
                      const connectedPartsCount = parts.filter(
                        p => p.carModel === m.name || p.carModel?.includes(m.name)
                      ).length;
                      return (
                        <tr key={m.id || m.code} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{m.code}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                          <td className="py-3 px-4 font-semibold text-slate-700">{m.oem}</td>
                          <td className="py-3 px-4 text-slate-600">{m.description || '—'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                              {toPersianDigits(connectedPartsCount)} قطعه
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                m.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {m.active ? 'فعال' : 'غیرفعال'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCarModel(m);
                                  setCarModelForm({ ...m });
                                  setIsCarModelModalOpen(true);
                                }}
                                className="text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer"
                              >
                                ویرایش
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCarModel(m.id || m.code)}
                                className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === 'CUSTOMERS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">مشتریان و شرکت‌های خودروساز طرف قرارداد</h3>
                  <p className="text-xs text-slate-500 mt-0.5">فهرست مشتریان، قراردادهای ورق امانی و تحویل قطعات</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCustomer(null);
                    setCustomerForm({ code: `CUST-${Date.now().toString().slice(-4)}`, name: '', contractType: 'تامین قطعات پرسی بدنه', phone: '', email: '', isDefault: false });
                    setIsCustomerModalOpen(true);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>تعریف مشتری جدید</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {customersList.map(c => (
                  <div key={c.id || c.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                      {c.isDefault && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">پیش‌فرض سیستم</span>
                      )}
                    </div>
                    <div className="text-slate-600">{c.contractType}</div>
                    {c.phone && <div className="text-slate-500 text-[11px] flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /><span>تلفن: {c.phone}</span></div>}
                    {c.email && <div className="text-slate-500 text-[11px] flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /><span>ایمیل: {c.email}</span></div>}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCustomer(c);
                          setCustomerForm({ ...c });
                          setIsCustomerModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer(c.id || c.code)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'ORDERS' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  سفارشات مشتریان و برنامه‌های تحویل (Sales & Delivery Orders)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  سفارشات مشتریان به صورت یکپارچه در موتور برنامه‌ریزی تولید و نیازسنجی مواد (MRP) مدیریت و به قراردادهای ورق متصل می‌شوند.
                </p>
              </div>
              {onNavigateToPlanning && (
                <button
                  type="button"
                  onClick={onNavigateToPlanning}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer shrink-0 ${themeMeta.buttonPrimaryClass}`}
                >
                  باز کردن سفارشات در ماژول برنامه‌ریزی تولید (MRP) ←
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal for Adding / Editing Raw Sheet Spec */}
      {isNewSheetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingSheet ? 'ویرایش مشخصات ورق / ماده اولیه' : 'تعریف ماده اولیه و ورق جدید'}
              </h3>
              <button
                type="button"
                onClick={() => setIsNewSheetModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSheetSpec} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">کد ماده (انگلیسی)</label>
                  <input
                    type="text"
                    required
                    value={sheetForm.code || ''}
                    onChange={e => setSheetForm({ ...sheetForm, code: e.target.value })}
                    placeholder="مثلا SHT-ST12-1.5"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">گرید / جنس ورق</label>
                  <select
                    value={sheetForm.grade || 'ST12'}
                    onChange={e => setSheetForm({ ...sheetForm, grade: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="ST12">ST12 (ورق سرد معمولی)</option>
                    <option value="ST13">ST13 (ورق سرد کششی)</option>
                    <option value="ST14">ST14 (ورق فوق کشش)</option>
                    <option value="ST37">ST37 (ورق گرم ساختمانی)</option>
                    <option value="GALV">گالوانیزه</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نام کامل ماده اولیه</label>
                <input
                  type="text"
                  required
                  value={sheetForm.name || ''}
                  onChange={e => setSheetForm({ ...sheetForm, name: e.target.value })}
                  placeholder="مثلا ورق سرد ST12 ضخامت ۱/۵"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ضخامت (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={sheetForm.thicknessMm ?? 1.0}
                    onChange={e =>
                      setSheetForm({ ...sheetForm, thicknessMm: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ابعاد ورق (mm)</label>
                  <input
                    type="text"
                    value={sheetForm.dimensionsMm || ''}
                    onChange={e => setSheetForm({ ...sheetForm, dimensionsMm: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">وزن هر برگ (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={sheetForm.sheetWeightKg ?? 24.5}
                    onChange={e =>
                      setSheetForm({ ...sheetForm, sheetWeightKg: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSheetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  ذخیره مشخصات ورق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Warehouse Modal */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 shadow-xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingWarehouse ? 'ویرایش مشخصات انبار' : 'تعریف انبار جدید'}
              </h3>
              <button onClick={() => setIsWarehouseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveWarehouse} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">کد انبار *</label>
                  <input
                    type="text"
                    required
                    value={warehouseForm.code || ''}
                    onChange={e => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">نوع انبار *</label>
                  <select
                    value={warehouseForm.type || 'RAW_MATERIALS'}
                    onChange={e => setWarehouseForm({ ...warehouseForm, type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                  >
                    <option value="RAW_MATERIALS">انبار مواد اولیه و رول</option>
                    <option value="WIP">انبار پای خط (WIP)</option>
                    <option value="FINISHED_GOODS">انبار محصول نهایی</option>
                    <option value="SCRAP">انبار ضایعات آهن و پرت</option>
                    <option value="TOOLING">انبار قالب و ابزار</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">نام انبار *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: انبار مرکزی رول و ورق مواد اولیه"
                  value={warehouseForm.name || ''}
                  onChange={e => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">نام مسوول انبار</label>
                  <input
                    type="text"
                    value={warehouseForm.managerName || ''}
                    onChange={e => setWarehouseForm({ ...warehouseForm, managerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">موقعیت‌ها (با کاما جدا کنید)</label>
                  <input
                    type="text"
                    value={warehouseForm.locations?.join(', ') || ''}
                    onChange={e =>
                      setWarehouseForm({
                        ...warehouseForm,
                        locations: e.target.value.split(/[,،]/).map(s => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="LOC-A1, LOC-A2, LOC-B1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold text-white cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  {editingWarehouse ? 'ثبت تغییرات انبار' : 'ایجاد انبار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Unit Modal */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 shadow-xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingUnit ? 'ویرایش واحد سنجش' : 'تعریف واحد سنجش جدید'}
              </h3>
              <button onClick={() => setIsUnitModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUnit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">نماد واحد (لاتین) *</label>
                  <input
                    type="text"
                    required
                    placeholder="KG, PCS, SHEET, ROLL"
                    value={unitForm.symbol || ''}
                    onChange={e => setUnitForm({ ...unitForm, symbol: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">عنوان واحد (فارسی) *</label>
                  <input
                    type="text"
                    required
                    placeholder="کیلوگرم، عدد، برگ، رول"
                    value={unitForm.title || ''}
                    onChange={e => setUnitForm({ ...unitForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">توضیحات و کاربرد</label>
                <input
                  type="text"
                  placeholder="واحد پایه کلاف، شمارش قطعه و..."
                  value={unitForm.description || ''}
                  onChange={e => setUnitForm({ ...unitForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ضریب تبدیل به کیلوگرم</label>
                  <input
                    type="number"
                    step="any"
                    value={unitForm.conversionFactorToKg ?? 1}
                    onChange={e => setUnitForm({ ...unitForm, conversionFactorToKg: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isBaseUnitCheck"
                    checked={unitForm.isBaseUnit || false}
                    onChange={e => setUnitForm({ ...unitForm, isBaseUnit: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="isBaseUnitCheck" className="text-slate-800 font-medium">واحد مبنای سیستم</label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold text-white cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  {editingUnit ? 'ثبت تغییرات واحد' : 'ایجاد واحد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 shadow-xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCustomer ? 'ویرایش مشتری' : 'تعریف مشتری جدید'}
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">کد مشتری *</label>
                  <input
                    type="text"
                    required
                    value={customerForm.code || ''}
                    onChange={e => setCustomerForm({ ...customerForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">نوع رابطه / قرارداد</label>
                  <input
                    type="text"
                    value={customerForm.contractType || ''}
                    onChange={e => setCustomerForm({ ...customerForm, contractType: e.target.value })}
                    placeholder="امانی / خرید قطعه"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">نام مشتری / شرکت خودروساز *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً شرکت ساپکو، سازه‌گستر، بهمن موتور"
                  value={customerForm.name || ''}
                  onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">تلفن تماس</label>
                  <input
                    type="text"
                    value={customerForm.phone || ''}
                    onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ایمیل یا وب‌سایت</label>
                  <input
                    type="text"
                    value={customerForm.email || ''}
                    onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefaultCustCheck"
                  checked={customerForm.isDefault || false}
                  onChange={e => setCustomerForm({ ...customerForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="isDefaultCustCheck" className="text-slate-800 font-medium">مشتری پیش‌فرض در فرم‌های ثبت رسید و قرارداد</label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold text-white cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  {editingCustomer ? 'ثبت تغییرات مشتری' : 'ایجاد مشتری'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 shadow-xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingShift ? 'ویرایش شیفت کاری و زمان‌بندی' : 'تعریف شیفت کاری جدید'}
              </h3>
              <button onClick={() => setIsShiftModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveShift} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">کد شیفت *</label>
                  <input
                    type="text"
                    required
                    value={shiftForm.code || ''}
                    onChange={e => setShiftForm({ ...shiftForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">نام شیفت *</label>
                  <input
                    type="text"
                    required
                    placeholder="شیفت صبح (A)"
                    value={shiftForm.name || ''}
                    onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800">ساعات کاری عادی:</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">ساعت شروع</label>
                    <input
                      type="time"
                      value={shiftForm.startTime || '07:00'}
                      onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 font-mono text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">ساعت پایان</label>
                    <input
                      type="time"
                      value={shiftForm.endTime || '14:30'}
                      onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 font-mono text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">کار مفید (دقیقه)</label>
                    <input
                      type="number"
                      value={shiftForm.netWorkMinutes ?? 450}
                      onChange={e => setShiftForm({ ...shiftForm, netWorkMinutes: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 font-mono text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  معادل ۷ ساعت کارکرد خالص به انضمام ۳۰ دقیقه استراحت/ناهار (ساعت ۷:۰۰ صبح تا ۱۴:۳۰).
                </p>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasOvertimeCheck"
                      checked={shiftForm.hasOvertime || false}
                      onChange={e => setShiftForm({ ...shiftForm, hasOvertime: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <label htmlFor="hasOvertimeCheck" className="text-amber-950 font-bold">
                      تعریف اضافه‌کاری روزانه ثابت (شنبه تا چهارشنبه)
                    </label>
                  </div>
                </div>

                {shiftForm.hasOvertime && (
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block text-slate-600 text-[11px] mb-1">شروع اضافه‌کاری</label>
                      <input
                        type="time"
                        value={shiftForm.overtimeStartTime || '15:00'}
                        onChange={e => setShiftForm({ ...shiftForm, overtimeStartTime: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[11px] mb-1">پایان اضافه‌کاری</label>
                      <input
                        type="time"
                        value={shiftForm.overtimeEndTime || '17:00'}
                        onChange={e => setShiftForm({ ...shiftForm, overtimeEndTime: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[11px] mb-1">مدت (دقیقه)</label>
                      <input
                        type="number"
                        value={shiftForm.overtimeMinutes ?? 120}
                        onChange={e => setShiftForm({ ...shiftForm, overtimeMinutes: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-mono text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">وضعیت کاری روز پنجشنبه</label>
                <select
                  value={shiftForm.thursdayStatus || 'OVERTIME_15_17'}
                  onChange={e => setShiftForm({ ...shiftForm, thursdayStatus: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                >
                  <option value="OVERTIME_15_17">فقط اضافه‌کاری بعدازظهر (ساعت ۱۵:۰۰ تا ۱۷:۰۰)</option>
                  <option value="OFF">کلاً تعطیل (روز استراحت)</option>
                  <option value="FULL_SHIFT">شیفت کامل عادی (ساعت ۰۷:۰۰ تا ۱۴:۳۰)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold text-white cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  {editingShift ? 'ثبت تغییرات شیفت' : 'ایجاد شیفت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. Car Model Modal */}
      {isCarModelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 shadow-xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCarModel ? 'ویرایش مدل خودرو' : 'تعریف مدل خودرو جدید'}
              </h3>
              <button onClick={() => setIsCarModelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCarModel} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">کد شناسه پلتفرم *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً IKCO-206"
                    value={carModelForm.code || ''}
                    onChange={e => setCarModelForm({ ...carModelForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">نام مدل خودرو *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً پژو ۲۰۶"
                    value={carModelForm.name || ''}
                    onChange={e => setCarModelForm({ ...carModelForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">خودروساز / شرکت مادر (OEM) *</label>
                <input
                  type="text"
                  required
                  placeholder="ساپکو (ایران‌خودرو)، سازه‌گستر (سایپا)، بهمن موتور"
                  value={carModelForm.oem || ''}
                  onChange={e => setCarModelForm({ ...carModelForm, oem: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">توضیحات و تیپ‌ها</label>
                <input
                  type="text"
                  placeholder="مثلاً هاچ‌بک و صندوق‌دار تیپ ۲ و ۵"
                  value={carModelForm.description || ''}
                  onChange={e => setCarModelForm({ ...carModelForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isCarModelActiveCheck"
                  checked={carModelForm.active !== false}
                  onChange={e => setCarModelForm({ ...carModelForm, active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="isCarModelActiveCheck" className="text-slate-800 font-medium">مدل فعال در چرخه تولید</label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCarModelModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold text-white cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  {editingCarModel ? 'ثبت تغییرات مدل' : 'ایجاد مدل خودرو'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13. Operation Modal */}
      {isOperationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 shadow-xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingOperation ? 'ویرایش عملیات استاندارد تولید' : 'تعریف عملیات استاندارد تولید جدید'}
              </h3>
              <button
                type="button"
                onClick={() => setIsOperationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOperation} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">کد عملیات *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً OP-10 یا OP-WELD-NUT"
                    value={operationForm.code || ''}
                    onChange={e => setOperationForm({ ...operationForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">دسته فرآیندی *</label>
                  <select
                    value={operationForm.category || 'STAMPING'}
                    onChange={e =>
                      setOperationForm({
                        ...operationForm,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white font-medium"
                  >
                    <option value="SHEARING">برشکاری و نواربری (Shearing)</option>
                    <option value="STAMPING">پرسکاری و کشش (Stamping / Drawing)</option>
                    <option value="BENDING">خم‌کاری و لبه‌زنی (Bending / Flanging)</option>
                    <option value="WELDING">جوش مقاومتی و CO2 (Welding)</option>
                    <option value="SURFACE_FINISH">رنگ و پوشش کاتافورز (ED Paint)</option>
                    <option value="QC_PACK">کنترل کیفی و بسته‌بندی (QC & Pack)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">عنوان کامل عملیات *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً بلنک و سوراخ‌کاری ورق، پرس‌جوش مهره، خم لبه‌ها..."
                  value={operationForm.name || ''}
                  onChange={e => setOperationForm({ ...operationForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">نوع ایستگاه کاری / دستگاه مورد استفاده *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً خط برش کویل، پرس ضربه‌ای ۲۵۰ تن، دستگاه پرس‌جوش M6، ایستگاه جوش CO2..."
                  value={operationForm.stationType || ''}
                  onChange={e => setOperationForm({ ...operationForm, stationType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">زمان چرخه استاندارد هر ضرب (ثانیه) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={operationForm.cycleTimeSec ?? 4.5}
                    onChange={e =>
                      setOperationForm({
                        ...operationForm,
                        cycleTimeSec: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">زمان ستاپ / تعویض قالب (دقیقه) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={operationForm.setupTimeMin ?? 20}
                    onChange={e =>
                      setOperationForm({
                        ...operationForm,
                        setupTimeMin: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">دستورالعمل و توضیحات فرآیندی</label>
                <textarea
                  rows={2}
                  placeholder="شرح نکات کنترلی، تلرانس ابعادی، فیکسچر مورد استفاده و پارامترهای فنی..."
                  value={operationForm.description || ''}
                  onChange={e => setOperationForm({ ...operationForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isOperationActiveCheck"
                  checked={operationForm.active !== false}
                  onChange={e => setOperationForm({ ...operationForm, active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="isOperationActiveCheck" className="text-slate-800 font-medium">
                  عملیات فعال در تقویم ظرفیت و مسیرهای تولید
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOperationModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold text-white cursor-pointer ${themeMeta.buttonPrimaryClass}`}
                >
                  {editingOperation ? 'ثبت تغییرات عملیات' : 'ایجاد عملیات جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
