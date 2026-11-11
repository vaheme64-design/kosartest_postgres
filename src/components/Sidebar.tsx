import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  Layers,
  Boxes,
  Hammer,
  GitCommit,
  CalendarDays,
  Cpu,
  ScrollText,
  FileSpreadsheet,
  Settings,
  Search,
  FileSignature,
  Upload,
  PanelRightClose,
  PanelRightOpen,
  Filter,
  BellRing,
  FileText,
  ChevronDown,
  ChevronLeft,
  X,
  Truck,
  Palette,
  Sparkles,
  Wrench,
  Printer,
  Gauge,
  TrendingUp,
  UserCheck,
  Activity,
  CheckCircle2,
  Clock,
  Building,
  BookOpen,
  Disc,
  AlertTriangle,
} from 'lucide-react';
import { UserRoleProfile } from '../types/inventory';
import {
  ErpLayoutTemplate,
  ErpColorTheme,
  COLOR_THEMES,
} from '../types/theme';
import { InventorySubTab } from './inventory/InventoryModuleView';

const DYNAMIC_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ScrollText,
  Boxes,
  FileSignature,
  CalendarDays,
  Hammer,
  Wrench,
  FileSpreadsheet,
  Cpu,
  Layers,
  GitCommit,
  Printer,
  Sparkles,
  Truck,
  Disc,
  BellRing,
  Search,
  Database: ScrollText,
  Sliders: Settings,
  CheckCircle2,
  AlertTriangle,
  FileText,
};
import { ProductionWorkbenchSubTab } from './production/ErpProductionWorkbenchView';
import { PlanningSubTabKey } from './planning/ProductionPlanningModuleView';
import { toPersianDigits } from '../utils/formatters';

export type TabKey =
  | 'dashboard'
  | 'master_data'
  | 'contracts'
  | 'inventory'
  | 'production'
  | 'wip'
  | 'planning'
  | 'machines'
  | 'sapco'
  | 'reports'
  | 'settings';

export type MachineSubTabKey =
  | 'machines'
  | 'maintenance'
  | 'oee'
  | 'utilization'
  | 'dies'
  | 'halls'
  | 'operators';

export interface SubModuleNavParams {
  inventorySubTab?: InventorySubTab;
  productionViewMode?: 'ERP_WORKBENCH' | 'VOUCHERS';
  productionModuleTab?: ProductionWorkbenchSubTab;
  planningSubTab?: PlanningSubTabKey;
  machineSubTab?: MachineSubTabKey;
}

export interface SubModuleLink {
  id: string;
  tab: TabKey;
  inventorySubTab?: InventorySubTab;
  navParams?: SubModuleNavParams;
  label: string;
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeHighlight?: boolean;
}

interface SidebarProps {
  activeTab: TabKey;
  activeInventorySubTab?: InventorySubTab;
  activeProductionViewMode?: 'ERP_WORKBENCH' | 'VOUCHERS';
  activeProductionModuleTab?: ProductionWorkbenchSubTab;
  activePlanningSubTab?: PlanningSubTabKey;
  activeMachineSubTab?: MachineSubTabKey;
  layoutTemplate: ErpLayoutTemplate;
  colorTheme: ErpColorTheme;
  onTabChange: (tab: TabKey, navParams?: SubModuleNavParams | InventorySubTab) => void;
  onOpenTemplateModal?: () => void;
  onOpenAiAssistant?: () => void;
  currentRole: UserRoleProfile['role'];
  partsCount: number;
  txCount: number;
  plansCount: number;
  coilsCount: number;
  reorderAlertsCount?: number;
}

interface NavGroup {
  id: string;
  groupTitle: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  items: {
    id: string;
    tab: TabKey;
    inventorySubTab?: InventorySubTab;
    defaultNavParams?: SubModuleNavParams;
    label: string;
    flatLabel: string;
    keywords: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: string;
    badgeHighlight?: boolean;
    roles: Array<UserRoleProfile['role']>;
    subModules?: SubModuleLink[];
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  activeInventorySubTab,
  activeProductionViewMode,
  activeProductionModuleTab,
  activePlanningSubTab,
  activeMachineSubTab,
  layoutTemplate,
  colorTheme,
  onTabChange,
  onOpenTemplateModal,
  onOpenAiAssistant,
  currentRole,
  partsCount,
  txCount,
  plansCount,
  coilsCount,
  reorderAlertsCount = 0,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showAllForRole, setShowAllForRole] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const [dbMenus, setDbMenus] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/menus/tree')
      .then(res => res.json())
      .then(json => {
        if (isMounted && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setDbMenus(json.data);
        }
      })
      .catch(err => {
        console.warn('[Sidebar] Dynamic menu fetch failed, using fallback:', err?.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    core: true,
    planning_prod: true,
    master_reports: true,
  });

  const themeMeta = COLOR_THEMES[colorTheme];
  const isDarkSidebar = false;
  const isFlatListMode = true;

  // 1. Inventory Sub-Modules (انبار و موجودی - بدون تکرار)
  const inventorySubModules: SubModuleLink[] = useMemo(
    () => [
      {
        id: 'sub-inv-inquiry',
        tab: 'inventory',
        inventorySubTab: 'INQUIRY',
        navParams: { inventorySubTab: 'INQUIRY' },
        label: 'موجودی و کاردکس کالا',
        keywords: 'استعلام موجودی فیلتر ضخامت جنس ورق کویل پک کاردکس کالا',
        icon: Search,
      },
      {
        id: 'sub-inv-coils',
        tab: 'inventory',
        inventorySubTab: 'COILS',
        navParams: { inventorySubTab: 'COILS' },
        label: 'رول‌های ورق و کویل‌پک',
        keywords: 'رول ورق کویل پک کلاف برش برگشت از خط تسهیم',
        icon: Layers,
        badge: coilsCount > 0 ? toPersianDigits(coilsCount) : undefined,
      },
      {
        id: 'sub-inv-dashboard',
        tab: 'inventory',
        inventorySubTab: 'DASHBOARD',
        navParams: { inventorySubTab: 'DASHBOARD' },
        label: 'ثبت رسید و حواله انبار',
        keywords: 'پیشخوان انبار رسید حواله برگشت انتقال',
        icon: Boxes,
      },
      {
        id: 'sub-inv-contracts',
        tab: 'inventory',
        inventorySubTab: 'CONTRACTS',
        navParams: { inventorySubTab: 'CONTRACTS' },
        label: 'قراردادها و سهمیه ساپکو',
        keywords: 'قرارداد ساپکو مشتری امانی سهمیه تخصیص شناسه',
        icon: FileSignature,
      },
      {
        id: 'sub-inv-sapco-heat',
        tab: 'sapco',
        label: 'رسید کلاف و شماره ذوب (Heat)',
        keywords: 'رسید کلاف ساپکو شماره ذوب heat number بچ تولید ردیابی',
        icon: Disc,
      },
      {
        id: 'sub-inv-alerts',
        tab: 'inventory',
        inventorySubTab: 'ALERTS',
        navParams: { inventorySubTab: 'ALERTS' },
        label: 'هشدار کسری موجودی',
        keywords: 'هشدار کسری نقطه سفارش حداقل موجودی اطمینان شارژ',
        icon: BellRing,
        badge: reorderAlertsCount > 0 ? toPersianDigits(reorderAlertsCount) : undefined,
        badgeHighlight: reorderAlertsCount > 0,
      },
    ],
    [coilsCount, reorderAlertsCount]
  );

  // 2. Production Sub-Modules (اجرای خط تولید و ایستگاه‌ها - بدون تکرار)
  const productionSubModules: SubModuleLink[] = useMemo(
    () => [
      {
        id: 'sub-prod-scheduler',
        tab: 'production',
        navParams: {
          productionViewMode: 'ERP_WORKBENCH',
          productionModuleTab: 'MULTI_PART_SCHEDULER',
        },
        label: 'برنامه و مراحل تولید (OP)',
        keywords: 'زمان بندی ماتریس 20 قطعه پرسکاری شیفت صبح عصر شب انتقال مانده',
        icon: CalendarDays,
      },
      {
        id: 'sub-prod-dispatch',
        tab: 'production',
        navParams: {
          productionViewMode: 'ERP_WORKBENCH',
          productionModuleTab: 'DAILY_DISPATCH_SHEET',
        },
        label: 'برگه کار روزانه شیفت',
        keywords: 'کاربرگ دیسپچ پرینت چاپ برگه شیفت اپراتور تحویل کارگاهی',
        icon: Printer,
      },
      {
        id: 'sub-prod-wip-tracker',
        tab: 'production',
        navParams: {
          productionViewMode: 'ERP_WORKBENCH',
          productionModuleTab: 'LIVE_WIP_OP_TRACKER',
        },
        label: 'موجودی پای خط (WIP)',
        keywords: 'رهگیری کار در جریان wip op گلوگاه انباشت پالت پای خط رسید خودکار',
        icon: GitCommit,
      },
      {
        id: 'sub-prod-vouchers',
        tab: 'production',
        navParams: {
          productionViewMode: 'VOUCHERS',
        },
        label: 'ثبت قبض تکی کارگاه',
        keywords: 'اسناد کارگاهی ثبت تولید سالم ورود ورق ضایعات قبض حواله کارگاه ایستگاهی',
        icon: Hammer,
      },
    ],
    []
  );

  // 3. Production Planning Sub-Modules (برنامه‌ریزی و نیازسنجی MRP - بدون تکرار)
  const planningSubModules: SubModuleLink[] = useMemo(
    () => [
      {
        id: 'sub-plan-mrp',
        tab: 'planning',
        navParams: { planningSubTab: 'mrp' },
        label: 'انفجار BOM و نیاز ورق',
        keywords: 'انفجار مواد bom mrp نیاز ناخالص خالص کسری قطعات ساخت ساختار درختی',
        icon: Cpu,
      },
      {
        id: 'sub-plan-capacity',
        tab: 'planning',
        navParams: { planningSubTab: 'capacity_planning' },
        label: 'تقویم ظرفیت ماشین‌آلات',
        keywords: 'تقویم ظرفیت ماشین آلات گانت چارت تایم لاین تداخل زمانی پرس capacity planning',
        icon: CalendarDays,
      },
      {
        id: 'sub-plan-orders',
        tab: 'planning',
        navParams: { planningSubTab: 'orders' },
        label: 'سفارشات تحویل مشتری',
        keywords: 'سفارش مشتری ساپکو قرارداد تعهدات تحویل ماهانه',
        icon: Truck,
      },
      {
        id: 'sub-plan-recommendations',
        tab: 'planning',
        navParams: { planningSubTab: 'recommendations' },
        label: 'پیشنهاد برنامه و پرس‌ها',
        keywords: 'پیشنهاد خرید مواد تخصیص پرس ها سفارش کویل ماشین آلات',
        icon: Sparkles,
      },
    ],
    []
  );

  // 4. Equipment & Maintenance Sub-Modules (ماشین‌آلات و تعمیرات PM - بدون تکرار)
  const machineSubModules: SubModuleLink[] = useMemo(
    () => [
      {
        id: 'sub-mach-machines',
        tab: 'machines',
        navParams: { machineSubTab: 'machines' },
        label: 'پرس‌ها و خطوط تولید',
        keywords: 'پرس هیدرولیک ضربه ای تناژ ابعاد میز تناژ ضربه قیچی گیوتین خط برش مشخصات فنی',
        icon: Cpu,
      },
      {
        id: 'sub-mach-maintenance',
        tab: 'machines',
        navParams: { machineSubTab: 'maintenance' },
        label: 'تعمیرات و نگهداری (PM)',
        keywords: 'تعمیرات نگهداری نت tpm pm کارتابل خرابی قطعات یدکی پیشگیرانه کانبان mtbf mttr بازرسی چک لیست',
        icon: Wrench,
      },
      {
        id: 'sub-mach-dies',
        tab: 'machines',
        navParams: { machineSubTab: 'dies' },
        label: 'قالب‌ها و سنبه/ماتریس',
        keywords: 'قالب سنبه ماتریس کشش برش خم کالیبره عمر ضربه سقف ضربات',
        icon: Layers,
      },
    ],
    []
  );

  const isSubItemActive = (sub: SubModuleLink) => {
    if (activeTab !== sub.tab) return false;
    if (sub.tab === 'inventory') {
      const target = sub.navParams?.inventorySubTab || sub.inventorySubTab;
      return activeInventorySubTab === target;
    }
    if (sub.tab === 'production') {
      if (sub.navParams?.productionViewMode === 'VOUCHERS') {
        return activeProductionViewMode === 'VOUCHERS';
      }
      return (
        (activeProductionViewMode === 'ERP_WORKBENCH' || !activeProductionViewMode) &&
        activeProductionModuleTab === (sub.navParams?.productionModuleTab || 'MULTI_PART_SCHEDULER')
      );
    }
    if (sub.tab === 'planning') {
      return activePlanningSubTab === (sub.navParams?.planningSubTab || 'mrp');
    }
    if (sub.tab === 'machines') {
      return activeMachineSubTab === (sub.navParams?.machineSubTab || 'machines');
    }
    return false;
  };

  const handleTriggerNavigation = (
    tab: TabKey,
    params?: SubModuleNavParams | InventorySubTab
  ) => {
    onTabChange(tab, params);
  };

  // Minimal 7-Module Navigation (Zero Duplication)
  const flatTenItems: NavGroup['items'] = useMemo(
    () => [
      {
        id: 'flat-dashboard',
        tab: 'dashboard' as TabKey,
        label: 'پیشخوان کارخانه',
        flatLabel: 'پیشخوان کارخانه',
        keywords: 'داشبورد خانه پیشخوان خلاصه وضعیت روزانه',
        icon: LayoutDashboard,
        roles: ['ADMIN', 'WAREHOUSE_KEEPER', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR', 'QC_INSPECTOR'] as UserRoleProfile['role'][],
      },
      {
        id: 'flat-master',
        tab: 'master_data' as TabKey,
        label: 'اطلاعات پایه و BOM',
        flatLabel: 'اطلاعات پایه و BOM',
        keywords: 'اطلاعات پایه کالا قطعه ضخامت جنس ورق مسیر ساخت فرمول bom حداقل موجودی شیفت انبار مشتری ساختار درختی محصول',
        icon: ScrollText,
        count: toPersianDigits(partsCount),
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_KEEPER'] as UserRoleProfile['role'][],
      },
      {
        id: 'flat-inventory',
        tab: 'inventory' as TabKey,
        inventorySubTab: 'INQUIRY' as InventorySubTab,
        defaultNavParams: { inventorySubTab: 'INQUIRY' as InventorySubTab },
        label: 'انبار و رول ورق',
        flatLabel: 'انبار و رول ورق',
        keywords: 'انبار موجودی ورق رول کویل پک قرارداد کاردکس اکسل کسری نقطه سفارش استعلام موجودی کالا ساپکو',
        icon: Boxes,
        count: coilsCount > 0 ? `${toPersianDigits(coilsCount)} رول` : undefined,
        roles: ['ADMIN', 'WAREHOUSE_KEEPER', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR', 'QC_INSPECTOR'] as UserRoleProfile['role'][],
        subModules: inventorySubModules,
      },
      {
        id: 'flat-contracts',
        tab: 'contracts' as TabKey,
        label: 'قراردادها و سفارشات (Sales & Contracts)',
        flatLabel: 'قراردادها و سفارشات (Sales & Contracts)',
        keywords: 'قراردادها و سفارشات sales contracts فروش مشتری ساپکو تعهدات تحویل سهمیه زنجیره mrp صدور mo',
        icon: FileSignature,
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_KEEPER'] as UserRoleProfile['role'][],
      },
      {
        id: 'flat-planning',
        tab: 'planning' as TabKey,
        defaultNavParams: {
          planningSubTab: 'mrp',
        },
        label: 'برنامه‌ریزی و MRP',
        flatLabel: 'برنامه‌ریزی و MRP',
        keywords: 'برنامه ریزی تولید نیازسنجی مواد سفارشات مشتری ساپکو تخصیص ماشین آلات mrp انفجار مواد',
        icon: CalendarDays,
        count: plansCount > 0 ? toPersianDigits(plansCount) : undefined,
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_KEEPER'] as UserRoleProfile['role'][],
        subModules: planningSubModules,
      },
      {
        id: 'flat-production',
        tab: 'production' as TabKey,
        defaultNavParams: {
          productionViewMode: 'ERP_WORKBENCH',
          productionModuleTab: 'MULTI_PART_SCHEDULER',
        },
        label: 'خط تولید و مراحل (OP)',
        flatLabel: 'خط تولید و مراحل (OP)',
        keywords: 'تولید فرآیند جامع سفارش تا برنامه روزانه مانده کار ثبت تکی اسناد کارگاهی پرسکاری wip دیسپچ',
        icon: Hammer,
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR', 'QC_INSPECTOR'] as UserRoleProfile['role'][],
        subModules: productionSubModules,
      },
      {
        id: 'flat-machines',
        tab: 'machines' as TabKey,
        defaultNavParams: {
          machineSubTab: 'machines',
        },
        label: 'ماشین‌آلات و نت (PM)',
        flatLabel: 'ماشین‌آلات و نت (PM)',
        keywords: 'تجهیزات ماشین آلات تعمیرات نگهداری نت tpm pm cm خرابی توقف دستگاه پرس قالب سنبه ماتریس',
        icon: Wrench,
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'LINE_SUPERVISOR'] as UserRoleProfile['role'][],
        subModules: machineSubModules,
      },
      {
        id: 'flat-reports',
        tab: 'reports' as TabKey,
        label: 'گزارش‌ها و شاخص OEE',
        flatLabel: 'گزارش‌ها و شاخص OEE',
        keywords: 'گزارش مدیریتی بهای تمام شده راندمان oee ضایعات تحلیل انحراف برنامه توقفات نت',
        icon: FileSpreadsheet,
        roles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_KEEPER', 'QC_INSPECTOR'] as UserRoleProfile['role'][],
      },
    ],
    [
      partsCount,
      coilsCount,
      plansCount,
      inventorySubModules,
      productionSubModules,
      planningSubModules,
      machineSubModules,
    ]
  );

  // Dynamic Menu Mapping from Database (Prisma Menu Table)
  const displayNavItems: NavGroup['items'] = useMemo(() => {
    if (dbMenus.length === 0) {
      return flatTenItems;
    }

    return flatTenItems.map(staticItem => {
      const dbMatch = dbMenus.find((m: any) => {
        if (staticItem.tab === 'dashboard' && m.path === '/dashboard') return true;
        if (staticItem.tab === 'master_data' && m.path === '/master-data') return true;
        if (staticItem.tab === 'production' && m.path === '/production') return true;
        if (staticItem.tab === 'inventory' && m.path === '/inventory') return true;
        return m.path?.includes(staticItem.tab);
      });

      if (!dbMatch) return staticItem;

      const IconComponent =
        dbMatch.icon && DYNAMIC_ICON_MAP[dbMatch.icon]
          ? DYNAMIC_ICON_MAP[dbMatch.icon]
          : staticItem.icon;

      // Always prioritize fully functional and configured subModules for production, planning, inventory and machines
      let dynamicSubs = staticItem.subModules;
      if (!dynamicSubs && dbMatch.children && Array.isArray(dbMatch.children) && dbMatch.children.length > 0) {
        dynamicSubs = dbMatch.children.map((child: any) => {
          const ChildIcon =
            child.icon && DYNAMIC_ICON_MAP[child.icon]
              ? DYNAMIC_ICON_MAP[child.icon]
              : Layers;
          return {
            id: child.id,
            tab: staticItem.tab,
            label: child.title,
            keywords: `${child.title} ${child.path || ''}`,
            icon: ChildIcon,
            navParams: {
              productionViewMode: child.path?.includes('logs') ? 'VOUCHERS' : 'ERP_WORKBENCH',
              productionModuleTab: child.path?.includes('wip') ? 'LIVE_WIP_OP_TRACKER' : 'MULTI_PART_SCHEDULER',
            },
          };
        });
      }

      return {
        ...staticItem,
        label: dbMatch.title || staticItem.label,
        flatLabel: dbMatch.title || staticItem.flatLabel,
        icon: IconComponent,
        subModules: dynamicSubs,
      };
    });
  }, [dbMenus, flatTenItems]);

  const navGroups: NavGroup[] = useMemo(
    () => [
      {
        id: 'core',
        groupTitle: 'ماژول‌های اصلی کارخانه',
        defaultOpen: true,
        items: displayNavItems,
      },
    ],
    [displayNavItems]
  );

  const isRoleFiltered = currentRole !== 'ADMIN' && !showAllForRole;
  const searchNormalized = moduleSearch.trim().toLowerCase();

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <aside
      style={
        isDarkSidebar
          ? { backgroundColor: themeMeta.sidebarDarkHex }
          : undefined
      }
      className={`${
        collapsed ? 'w-full md:w-18' : 'w-full md:w-64 lg:w-68'
      } ${
        isDarkSidebar
          ? 'text-slate-200 border-b md:border-b-0 md:border-l border-slate-800'
          : 'bg-white text-slate-800 border-b md:border-b-0 md:border-l border-slate-200'
      } p-3.5 shrink-0 flex flex-col justify-between transition-all select-none`}
    >
      <div className="space-y-3.5">
        {/* In Template 1 (HUB_WORKSPACE - Image 1), render the KPIMS + KP emerald logo header at the top of the dark sidebar */}
        {isDarkSidebar ? (
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                  style={{ backgroundColor: themeMeta.primaryHex }}
                >
                  KP
                </div>
                <div>
                  <div className="text-sm font-bold text-white tracking-tight">KPIMS</div>
                  <div className="text-[11px] text-slate-400">سامانه تولید و موجودی کوثر</div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'باز کردن منوی کناری' : 'جمع کردن منوی کناری'}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-1.5">
            {!collapsed && (
              <span className="text-[11px] font-bold text-slate-500">
                {layoutTemplate === 'TABBED_WORKBENCH' ? 'منوی اصلی سامانه' : 'دسترسی سریع ماژول‌ها'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'باز کردن منوی کناری' : 'جمع کردن منوی کناری'}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Instant Module & Sub-Module Search Input */}
        {!collapsed && (
          <div className="relative">
            <Search
              className={`w-3.5 h-3.5 absolute right-3 top-2.5 pointer-events-none ${
                isDarkSidebar ? 'text-slate-400' : 'text-slate-400'
              }`}
            />
            <input
              type="text"
              value={moduleSearch}
              onChange={e => setModuleSearch(e.target.value)}
              placeholder="جستجوی ماژول یا زیرماژول..."
              className={`w-full rounded-xl pr-8 pl-7 py-1.5 text-xs focus:outline-none transition-colors ${
                isDarkSidebar
                  ? 'bg-white/8 border border-white/10 text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-emerald-400'
                  : 'bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            {moduleSearch && (
              <button
                type="button"
                onClick={() => setModuleSearch('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* AI Assistant Quick Tool (Quiet & Professional) */}
        {onOpenAiAssistant && (
          <button
            type="button"
            onClick={onOpenAiAssistant}
            title="دستیار هوشمند کارخانه (کلید میانبر Ctrl + Space)"
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              {!collapsed && <span>دستیار هوشمند کارخانه</span>}
            </span>
            {!collapsed && (
              <span className="px-1.5 py-0.5 rounded bg-white text-[9px] font-mono text-slate-500 border border-slate-200">
                Ctrl+Space
              </span>
            )}
          </button>
        )}

        {/* =================================================================
            FLAT CLEAN NAVIGATION (ODOO 17 / SAP FIORI STYLE)
           ================================================================= */}
        {isFlatListMode && !searchNormalized ? (
          <nav className="space-y-1">
            {displayNavItems.map(item => {
              const isMainActive = activeTab === item.tab;
              const Icon = item.icon;
              const showSubModules =
                !collapsed &&
                item.subModules &&
                item.subModules.length > 0 &&
                activeTab === item.tab;

              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleTriggerNavigation(item.tab, item.defaultNavParams || item.inventorySubTab)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      collapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 rounded-lg text-xs transition-colors cursor-pointer text-right ${
                      isMainActive
                        ? 'bg-slate-900 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isMainActive ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && item.tab === 'inventory' && reorderAlertsCount > 0 && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                        isMainActive ? 'bg-amber-400 text-slate-950' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {toPersianDigits(reorderAlertsCount)}
                      </span>
                    )}
                  </button>

                  {/* Sub-Modules under Active Tab */}
                  {showSubModules && (
                    <div className="mr-3 pr-2 border-r border-slate-200 space-y-0.5 py-1">
                      {item.subModules?.map(sub => {
                        const isSubActive = isSubItemActive(sub);
                        const SubIcon = sub.icon;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleTriggerNavigation(sub.tab, sub.navParams || sub.inventorySubTab)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer text-right ${
                              isSubActive
                                ? 'bg-slate-100 text-slate-950 font-bold border-r-2 border-slate-900'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-slate-900' : 'text-slate-400'}`} />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            {sub.badge && (
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                                  sub.badgeHighlight
                                    ? 'bg-amber-400 text-slate-950'
                                    : isDarkSidebar
                                    ? 'bg-white/10 text-slate-300'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {sub.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        ) : (
          /* =================================================================
              GROUPED NAVIGATION OR SEARCH RESULTS
             ================================================================= */
          <div className="space-y-3">
            {navGroups.map(group => {
              const roleItems = isRoleFiltered
                ? group.items.filter(item => item.roles.includes(currentRole))
                : group.items;

              const filteredItems = roleItems
                .map(item => {
                  if (!searchNormalized) return { ...item, matchedSubs: item.subModules || [] };

                  const itemMatches =
                    item.label.toLowerCase().includes(searchNormalized) ||
                    item.keywords.toLowerCase().includes(searchNormalized);

                  const matchedSubs = (item.subModules || []).filter(
                    sub =>
                      sub.label.toLowerCase().includes(searchNormalized) ||
                      sub.keywords.toLowerCase().includes(searchNormalized)
                  );

                  if (itemMatches || matchedSubs.length > 0) {
                    return {
                      ...item,
                      matchedSubs: matchedSubs.length > 0 ? matchedSubs : item.subModules || [],
                    };
                  }
                  return null;
                })
                .filter(Boolean) as Array<
                (typeof group.items)[number] & { matchedSubs: SubModuleLink[] }
              >;

              if (filteredItems.length === 0) return null;

              const isGroupHasActiveTab = filteredItems.some(item => item.tab === activeTab);
              const isGroupExpanded =
                !group.collapsible ||
                Boolean(searchNormalized) ||
                isGroupHasActiveTab ||
                expandedGroups[group.id];

              return (
                <div key={group.id} className="space-y-1">
                  {!collapsed && (
                    <button
                      type="button"
                      onClick={() => group.collapsible && toggleGroup(group.id)}
                      className={`w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold ${
                        isDarkSidebar
                          ? 'text-slate-400 hover:text-white'
                          : group.collapsible
                          ? 'text-slate-500 hover:text-slate-800 cursor-pointer rounded-lg hover:bg-slate-50'
                          : 'text-slate-400 cursor-default'
                      }`}
                    >
                      <span>{group.groupTitle}</span>
                      {group.collapsible && (
                        <span>
                          {isGroupExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronLeft className="w-3.5 h-3.5" />
                          )}
                        </span>
                      )}
                    </button>
                  )}

                  {isGroupExpanded && (
                    <nav className="space-y-1">
                      {filteredItems.map(item => {
                        const isMainActive = activeTab === item.tab;
                        const Icon = item.icon;
                        const showSubModules =
                          !collapsed &&
                          item.matchedSubs &&
                          item.matchedSubs.length > 0 &&
                          (activeTab === item.tab || Boolean(searchNormalized));

                        return (
                          <div key={item.id} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => handleTriggerNavigation(item.tab, item.defaultNavParams || item.inventorySubTab)}
                              title={collapsed ? item.label : undefined}
                              style={
                                isMainActive
                                  ? { backgroundColor: themeMeta.primaryHex }
                                  : undefined
                              }
                              className={`w-full flex items-center ${
                                collapsed ? 'justify-center px-2' : 'justify-between px-3'
                              } py-2 rounded-xl text-xs transition-colors cursor-pointer text-right ${
                                isMainActive
                                  ? 'text-white font-semibold shadow-2xs'
                                  : isDarkSidebar
                                  ? 'text-slate-300 hover:text-white hover:bg-white/10'
                                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon
                                  className={`w-4 h-4 shrink-0 transition-colors ${
                                    isMainActive
                                      ? 'text-white'
                                      : isDarkSidebar
                                      ? 'text-slate-400'
                                      : 'text-slate-400'
                                  }`}
                                />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                              </div>
                              {!collapsed && item.count && (
                                <span
                                  className={`text-[11px] shrink-0 tabular-nums ${
                                    isMainActive ? 'text-white/80' : 'text-slate-400'
                                  }`}
                                >
                                  {item.count}
                                </span>
                              )}
                            </button>

                            {showSubModules && (
                              <div
                                className={`mr-3.5 pr-2.5 border-r space-y-0.5 py-0.5 ${
                                  isDarkSidebar ? 'border-slate-700' : 'border-slate-200'
                                }`}
                              >
                                {item.matchedSubs.map(sub => {
                                  const isSubActive = isSubItemActive(sub);
                                  const SubIcon = sub.icon;

                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => handleTriggerNavigation(sub.tab, sub.navParams || sub.inventorySubTab)}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer text-right ${
                                        isSubActive
                                          ? isDarkSidebar
                                            ? 'bg-white/15 text-white font-bold'
                                            : 'bg-emerald-50 text-emerald-950 font-bold border-r-2 border-emerald-600'
                                          : isDarkSidebar
                                          ? 'text-slate-400 hover:text-white hover:bg-white/5'
                                          : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{sub.label}</span>
                                      </div>
                                      {sub.badge && (
                                        <span
                                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                                            sub.badgeHighlight
                                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                              : 'bg-slate-100 text-slate-600'
                                          }`}
                                        >
                                          {sub.badge}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </nav>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Profile Card (Matches Image 1 Dark Sidebar Footer) or Role Filter */}
      <div
        className={`mt-6 pt-3 border-t space-y-2.5 ${
          isDarkSidebar ? 'border-slate-800' : 'border-slate-100'
        }`}
      >
        {!collapsed && onOpenTemplateModal && (
          <button
            type="button"
            onClick={onOpenTemplateModal}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isDarkSidebar
                ? 'bg-white/5 hover:bg-white/10 text-emerald-300 border-white/10'
                : 'bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 border-emerald-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              <span>تغییر قالب و رنگ‌بندی (۴ قالب)</span>
            </span>
          </button>
        )}

        {!collapsed && isDarkSidebar ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold">
                  م
                </div>
                <div className="leading-tight">
                  <div className="text-xs font-bold text-white">مدیر سامانه (نمونه)</div>
                  <div className="text-[10px] text-slate-400">مدیر سامانه</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-300 hover:text-white cursor-pointer">
                خروج
              </span>
            </div>
            <div className="text-[10px] text-slate-500 text-center">
              نسخه ۰/۶/۰ — فازهای ۰ تا ۶
            </div>
          </div>
        ) : (
          !collapsed && (
            <>
              {currentRole !== 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setShowAllForRole(!showAllForRole)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-[11px] text-slate-600 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <span>
                      {showAllForRole ? 'نمایش منوی تخصصی نقش من' : 'نمایش همه منوهای سیستم'}
                    </span>
                  </span>
                </button>
              )}
              <div className="px-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="font-semibold text-[10px]">KPIMS ERP</span>
                <span>تقویم شمسی فعال</span>
              </div>
            </>
          )
        )}
      </div>
    </aside>
  );
};
