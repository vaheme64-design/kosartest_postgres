import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { TabKey, MachineSubTabKey } from '../components/Sidebar';
import { InventorySubTab } from '../components/inventory/InventoryModuleView';
import { ProductionWorkbenchSubTab } from '../components/production/ErpProductionWorkbenchView';
import { PlanningSubTabKey } from '../components/planning/ProductionPlanningModuleView';
import { DrawerTabKey } from '../components/workflow/OrderDetailsDrawer';
import { MasterSubSection } from '../components/MasterDataHubView';

export type ErpModalType = 'create-mo' | 'wip-check' | 'edit-mo' | 'timeline' | 'log-step' | null;

export interface RouteState {
  tab: TabKey;
  productionViewMode: 'ERP_WORKBENCH' | 'VOUCHERS';
  productionModuleTab: ProductionWorkbenchSubTab;
  inventorySubTab: InventorySubTab;
  planningSubTab: PlanningSubTabKey;
  machineSubTab: MachineSubTabKey;
  masterSubSection?: MasterSubSection;
  moId: string | null;
  drawerTab: DrawerTabKey | null;
  timelineMoId: string | null;
  modal: ErpModalType;
  modalOrderId?: string | null;
  modalPartId?: string | null;
}

export interface RouteNavigateParams {
  tab?: TabKey;
  productionViewMode?: 'ERP_WORKBENCH' | 'VOUCHERS';
  productionModuleTab?: ProductionWorkbenchSubTab;
  inventorySubTab?: InventorySubTab;
  planningSubTab?: PlanningSubTabKey;
  machineSubTab?: MachineSubTabKey;
  masterSubSection?: MasterSubSection;
  moId?: string | null;
  drawerTab?: DrawerTabKey | null;
  timelineMoId?: string | null;
  modal?: ErpModalType;
  modalOrderId?: string | null;
  modalPartId?: string | null;
}

interface RouterContextType {
  route: RouteState;
  navigate: (params: RouteNavigateParams, options?: { replace?: boolean }) => void;
  openCreateMoModal: (partId?: string) => void;
  openWipCheckModal: (orderId?: string, partId?: string) => void;
  closeModal: () => void;
  openMoDrawer: (moId: string, drawerTab?: DrawerTabKey) => void;
  closeMoDrawer: () => void;
  openTimeline: (moId: string) => void;
  closeTimeline: () => void;
  setProductionSubTab: (subTab: ProductionWorkbenchSubTab) => void;
  buildShareableUrl: (params?: RouteNavigateParams) => string;
}

const DEFAULT_ROUTE: RouteState = {
  tab: 'dashboard',
  productionViewMode: 'ERP_WORKBENCH',
  productionModuleTab: 'MULTI_PART_SCHEDULER',
  inventorySubTab: 'DASHBOARD',
  planningSubTab: 'erp_workbench',
  machineSubTab: 'machines',
  masterSubSection: 'PARTS',
  moId: null,
  drawerTab: null,
  timelineMoId: null,
  modal: null,
  modalOrderId: null,
  modalPartId: null,
};

const RouterContext = createContext<RouterContextType | null>(null);

// Production SubTab slug mapping for clean URLs like /#/production/matrix or /#/production/wip
const PROD_SLUG_TO_SUBTAB: Record<string, ProductionWorkbenchSubTab> = {
  matrix: 'MULTI_PART_SCHEDULER',
  scheduler: 'MULTI_PART_SCHEDULER',
  ops: 'MULTI_PART_SCHEDULER',
  dispatch: 'DAILY_DISPATCH_SHEET',
  daily: 'DAILY_DISPATCH_SHEET',
  wip: 'LIVE_WIP_OP_TRACKER',
  tracker: 'LIVE_WIP_OP_TRACKER',
  oee: 'KPI_OEE_REPORTS',
  reports: 'KPI_OEE_REPORTS',
  projections: 'MATERIAL_REQUIREMENT_PROJECTION',
  mrp: 'MATERIAL_REQUIREMENT_PROJECTION',
  timeline: 'TREE_TIMELINE_REPORT',
  workflow: 'SAP_PP_WORKFLOW',
};

const PROD_SUBTAB_TO_SLUG: Record<ProductionWorkbenchSubTab, string> = {
  MULTI_PART_SCHEDULER: 'matrix',
  DAILY_DISPATCH_SHEET: 'dispatch',
  LIVE_WIP_OP_TRACKER: 'wip',
  KPI_OEE_REPORTS: 'oee',
  MATERIAL_REQUIREMENT_PROJECTION: 'projections',
  TREE_TIMELINE_REPORT: 'timeline',
  SAP_PP_WORKFLOW: 'workflow',
};

// Inventory SubTab slug mapping
const INV_SLUG_TO_SUBTAB: Record<string, InventorySubTab> = {
  dashboard: 'DASHBOARD',
  inquiry: 'INQUIRY',
  stock: 'INQUIRY',
  movement: 'MOVEMENT',
  vouchers: 'MOVEMENT',
  coils: 'COILS',
  sapco: 'SAPCO',
  alerts: 'ALERTS',
  contracts: 'CONTRACTS',
  reports: 'CUSTOM_REPORTS',
  custom_reports: 'CUSTOM_REPORTS',
  import_export: 'IMPORT_EXPORT',
  stages: 'STAGES',
};

const INV_SUBTAB_TO_SLUG: Record<InventorySubTab, string> = {
  DASHBOARD: 'dashboard',
  INQUIRY: 'inquiry',
  MOVEMENT: 'movement',
  COILS: 'coils',
  ALERTS: 'alerts',
  CONTRACTS: 'contracts',
  CUSTOM_REPORTS: 'reports',
  IMPORT_EXPORT: 'import_export',
  SAPCO: 'sapco',
  STAGES: 'stages',
};

// Planning SubTab slug mapping
const PLAN_SLUG_TO_SUBTAB: Record<string, PlanningSubTabKey> = {
  workbench: 'erp_workbench',
  mrp: 'mrp',
  capacity: 'capacity_planning',
  schedule: 'daily_schedule',
  orders: 'orders',
  approved: 'approved_plans',
  consumables: 'consumables',
  recommendations: 'recommendations',
  dashboard: 'dashboard',
  workflow: 'workflow_doc',
};

const PLAN_SUBTAB_TO_SLUG: Record<PlanningSubTabKey, string> = {
  erp_workbench: 'workbench',
  mrp: 'mrp',
  capacity_planning: 'capacity',
  daily_schedule: 'schedule',
  orders: 'orders',
  approved_plans: 'approved',
  consumables: 'consumables',
  recommendations: 'recommendations',
  dashboard: 'dashboard',
  workflow_doc: 'workflow',
};

function parseUrlToRoute(): RouteState {
  if (typeof window === 'undefined') return DEFAULT_ROUTE;

  const hash = window.location.hash || '';
  const hashPathAndSearch = hash.replace(/^#\/?/, '');
  const [hashPath = '', hashSearch = ''] = hashPathAndSearch.split('?');

  const searchParams = new URLSearchParams(hashSearch || window.location.search);
  const pathSegments = hashPath.split('/').filter(Boolean);
  const primaryPath = (pathSegments[0] || window.location.pathname.replace(/^\//, '')).split('/')[0].toLowerCase();
  const secondaryPath = (pathSegments[1] || '').toLowerCase();

  const VALID_TABS: Record<string, TabKey> = {
    dashboard: 'dashboard',
    workbench: 'dashboard',
    master_data: 'master_data',
    parts: 'master_data',
    contracts: 'contracts',
    sales: 'contracts',
    inventory: 'inventory',
    stock: 'inventory',
    production: 'production',
    manufacturing: 'production',
    wip: 'wip',
    planning: 'planning',
    mrp: 'planning',
    machines: 'machines',
    equipment: 'machines',
    sapco: 'sapco',
    coils: 'sapco',
    reports: 'reports',
    oee: 'reports',
    settings: 'settings',
    users: 'settings',
  };

  let tab: TabKey = VALID_TABS[primaryPath] || (searchParams.get('module') && VALID_TABS[searchParams.get('module')!]) || 'dashboard';

  // Sub-tabs & parameters
  const rawProdViewMode = searchParams.get('viewMode') || searchParams.get('mode');
  const productionViewMode: 'ERP_WORKBENCH' | 'VOUCHERS' =
    rawProdViewMode === 'VOUCHERS' ? 'VOUCHERS' : 'ERP_WORKBENCH';

  // Determine production module tab from subpath (e.g. /#/production/matrix or /#/production/wip) or search param
  let productionModuleTab: ProductionWorkbenchSubTab = 'MULTI_PART_SCHEDULER';
  if (tab === 'production' && secondaryPath && PROD_SLUG_TO_SUBTAB[secondaryPath]) {
    productionModuleTab = PROD_SLUG_TO_SUBTAB[secondaryPath];
  } else if (searchParams.get('tab') && PROD_SLUG_TO_SUBTAB[searchParams.get('tab')!]) {
    productionModuleTab = PROD_SLUG_TO_SUBTAB[searchParams.get('tab')!];
  } else if (searchParams.get('prodTab')) {
    const raw = searchParams.get('prodTab') as ProductionWorkbenchSubTab;
    if (Object.values(PROD_SLUG_TO_SUBTAB).includes(raw)) {
      productionModuleTab = raw;
    }
  }

  // Determine inventory subtab from subpath (e.g. /#/inventory/inquiry) or search param
  let inventorySubTab: InventorySubTab = 'DASHBOARD';
  if (tab === 'inventory' && secondaryPath && INV_SLUG_TO_SUBTAB[secondaryPath]) {
    inventorySubTab = INV_SLUG_TO_SUBTAB[secondaryPath];
  } else if (searchParams.get('subTab') && INV_SLUG_TO_SUBTAB[searchParams.get('subTab')!]) {
    inventorySubTab = INV_SLUG_TO_SUBTAB[searchParams.get('subTab')!];
  }

  // Determine planning subtab from subpath (e.g. /#/planning/mrp) or search param
  let planningSubTab: PlanningSubTabKey = 'erp_workbench';
  if (tab === 'planning' && secondaryPath && PLAN_SLUG_TO_SUBTAB[secondaryPath]) {
    planningSubTab = PLAN_SLUG_TO_SUBTAB[secondaryPath];
  } else if (searchParams.get('subTab') && PLAN_SLUG_TO_SUBTAB[searchParams.get('subTab')!]) {
    planningSubTab = PLAN_SLUG_TO_SUBTAB[searchParams.get('subTab')!];
  }

  const rawMachineSubTab = searchParams.get('mchTab') || searchParams.get('subTab');
  const validMachineSubTabs: MachineSubTabKey[] = [
    'machines',
    'maintenance',
    'oee',
    'utilization',
    'dies',
    'halls',
    'operators',
  ];
  const machineSubTab: MachineSubTabKey = validMachineSubTabs.includes(rawMachineSubTab as any)
    ? (rawMachineSubTab as MachineSubTabKey)
    : 'machines';

  const moId = searchParams.get('mo') || searchParams.get('orderId') || null;
  const rawDrawerTab = searchParams.get('drawerTab');
  const validDrawerTabs: DrawerTabKey[] = ['TRACEABILITY', 'ROUTING', 'ACTIONS', 'AUDIT_TRAIL', 'WIP_INSPECTION'];
  const drawerTab: DrawerTabKey | null = validDrawerTabs.includes(rawDrawerTab as any)
    ? (rawDrawerTab as DrawerTabKey)
    : moId
    ? 'TRACEABILITY'
    : null;

  const timelineMoId = searchParams.get('timeline') || searchParams.get('timelineMo') || null;

  // Modal Parameter (e.g. ?modal=create-mo or ?modal=wip-check)
  const rawModal = searchParams.get('modal');
  let modal: ErpModalType = null;
  if (rawModal === 'create-mo' || rawModal === 'wip-check' || rawModal === 'edit-mo' || rawModal === 'timeline' || rawModal === 'log-step') {
    modal = rawModal as ErpModalType;
  }

  const modalOrderId = searchParams.get('orderId') || searchParams.get('mo') || null;
  const modalPartId = searchParams.get('partId') || null;

  const rawMasterSubSection = searchParams.get('masterSubSection') || searchParams.get('section');
  const masterSubSection: MasterSubSection = (rawMasterSubSection as MasterSubSection) || 'PARTS';

  return {
    tab,
    productionViewMode,
    productionModuleTab,
    inventorySubTab,
    planningSubTab,
    machineSubTab,
    masterSubSection,
    moId,
    drawerTab,
    timelineMoId,
    modal,
    modalOrderId,
    modalPartId,
  };
}

function serializeRouteToHash(state: RouteState): string {
  let basePath = `#/${state.tab}`;

  if (state.tab === 'production') {
    const slug = PROD_SUBTAB_TO_SLUG[state.productionModuleTab] || 'matrix';
    basePath = `#/production/${slug}`;
  } else if (state.tab === 'inventory') {
    const slug = INV_SUBTAB_TO_SLUG[state.inventorySubTab] || 'dashboard';
    basePath = `#/inventory/${slug}`;
  } else if (state.tab === 'planning') {
    const slug = PLAN_SUBTAB_TO_SLUG[state.planningSubTab] || 'workbench';
    basePath = `#/planning/${slug}`;
  }

  const params = new URLSearchParams();

  if (state.tab === 'production' && state.productionViewMode !== 'ERP_WORKBENCH') {
    params.set('viewMode', state.productionViewMode);
  }

  if (state.modal) {
    params.set('modal', state.modal);
    if (state.modalOrderId) {
      params.set('orderId', state.modalOrderId);
    }
    if (state.modalPartId) {
      params.set('partId', state.modalPartId);
    }
  }

  if (state.moId) {
    params.set('mo', state.moId);
    if (state.drawerTab && state.drawerTab !== 'TRACEABILITY') {
      params.set('drawerTab', state.drawerTab);
    }
  }

  if (state.tab === 'master_data' && state.masterSubSection && state.masterSubSection !== 'PARTS') {
    params.set('section', state.masterSubSection);
  }

  if (state.timelineMoId) {
    params.set('timeline', state.timelineMoId);
  }

  const queryString = params.toString();
  return `${basePath}${queryString ? `?${queryString}` : ''}`;
}

export const ErpRouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<RouteState>(parseUrlToRoute);

  // Sync state whenever hash or popstate changes (Browser Back / Forward button support)
  useEffect(() => {
    const handleLocationChange = () => {
      const parsed = parseUrlToRoute();
      setRoute(parsed);
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    // Initial normalize if URL is bare
    if (typeof window !== 'undefined' && !window.location.hash) {
      const initialHash = serializeRouteToHash(route);
      window.history.replaceState(null, '', initialHash);
    }

    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigate = useCallback((params: RouteNavigateParams, options?: { replace?: boolean }) => {
    setRoute(prev => {
      const next: RouteState = {
        ...prev,
        ...params,
        productionViewMode:
          params.productionViewMode !== undefined
            ? params.productionViewMode
            : params.productionModuleTab
            ? 'ERP_WORKBENCH'
            : prev.productionViewMode,
        moId: params.moId !== undefined ? params.moId : params.tab && params.tab !== prev.tab ? null : prev.moId,
        drawerTab: params.drawerTab !== undefined ? params.drawerTab : params.moId ? 'TRACEABILITY' : prev.drawerTab,
        modal: params.modal !== undefined ? params.modal : prev.modal,
        modalOrderId: params.modalOrderId !== undefined ? params.modalOrderId : prev.modalOrderId,
        modalPartId: params.modalPartId !== undefined ? params.modalPartId : prev.modalPartId,
      };

      const newHash = serializeRouteToHash(next);
      if (typeof window !== 'undefined') {
        if (options?.replace) {
          window.history.replaceState(null, '', newHash);
        } else {
          window.history.pushState(null, '', newHash);
        }
      }

      return next;
    });
  }, []);

  const openCreateMoModal = useCallback((partId?: string) => {
    navigate({
      modal: 'create-mo',
      modalPartId: partId || null,
    });
  }, [navigate]);

  const openWipCheckModal = useCallback((orderId?: string, partId?: string) => {
    navigate({
      modal: 'wip-check',
      modalOrderId: orderId || null,
      modalPartId: partId || null,
    });
  }, [navigate]);

  const closeModal = useCallback(() => {
    navigate({
      modal: null,
      modalOrderId: null,
      modalPartId: null,
    });
  }, [navigate]);

  const openMoDrawer = useCallback((moId: string, drawerTab: DrawerTabKey = 'TRACEABILITY') => {
    navigate({ moId, drawerTab });
  }, [navigate]);

  const closeMoDrawer = useCallback(() => {
    navigate({ moId: null, drawerTab: null });
  }, [navigate]);

  const openTimeline = useCallback((timelineMoId: string) => {
    navigate({ timelineMoId });
  }, [navigate]);

  const closeTimeline = useCallback(() => {
    navigate({ timelineMoId: null });
  }, [navigate]);

  const setProductionSubTab = useCallback((subTab: ProductionWorkbenchSubTab) => {
    navigate({
      tab: 'production',
      productionViewMode: 'ERP_WORKBENCH',
      productionModuleTab: subTab,
    });
  }, [navigate]);

  const buildShareableUrl = useCallback((params?: RouteNavigateParams) => {
    if (typeof window === 'undefined') return '';
    const targetState: RouteState = { ...route, ...params };
    const hash = serializeRouteToHash(targetState);
    return `${window.location.origin}${window.location.pathname}${hash}`;
  }, [route]);

  const contextValue = useMemo<RouterContextType>(() => ({
    route,
    navigate,
    openCreateMoModal,
    openWipCheckModal,
    closeModal,
    openMoDrawer,
    closeMoDrawer,
    openTimeline,
    closeTimeline,
    setProductionSubTab,
    buildShareableUrl,
  }), [
    route,
    navigate,
    openCreateMoModal,
    openWipCheckModal,
    closeModal,
    openMoDrawer,
    closeMoDrawer,
    openTimeline,
    closeTimeline,
    setProductionSubTab,
    buildShareableUrl,
  ]);

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
};

export function useErpRouter(): RouterContextType {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error('useErpRouter must be used within an ErpRouterProvider');
  }
  return ctx;
}
