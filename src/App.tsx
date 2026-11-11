import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabKey, SubModuleNavParams, MachineSubTabKey } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsVouchersView } from './components/TransactionsVouchersView';
import { InventoryModuleView, InventorySubTab } from './components/inventory/InventoryModuleView';
import { MasterDataHubView, MasterSubSection } from './components/MasterDataHubView';
import { MachinesView } from './components/MachinesView';
import { UserManagementView } from './components/UserManagementView';
import { SapcoMaterialsView } from './components/SapcoMaterialsView';
import { ProductionWipModuleView } from './components/wip/ProductionWipModuleView';
import { ProductionPlanningModuleView, PlanningSubTabKey } from './components/planning/ProductionPlanningModuleView';
import { ErpProductionWorkbenchView, ProductionWorkbenchSubTab } from './components/production/ErpProductionWorkbenchView';
import { ManagementReportsModuleView } from './components/reports/ManagementReportsModuleView';
import { SalesContractsModuleView } from './components/contracts/SalesContractsModuleView';
import { ErpSyncModal } from './components/ErpSyncModal';
import { TemplateSwitcherModal } from './components/TemplateSwitcherModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { ContextualActionMenu } from './components/common/ContextualActionMenu';
import { OfflineIndicator } from './components/pwa/PWAInstallButton';
import { AiActionPayload } from './types/ai';
import { ErpLayoutTemplate, ErpColorTheme } from './types/theme';
import { EnterpriseUxProvider } from './context/EnterpriseUxContext';
import { ErpRouterProvider, useErpRouter } from './context/RouterContext';

import {
  Part,
  Machine,
  Routing,
  InventoryTransaction,
  UserRoleProfile,
  VoucherType,
  DieMold,
  Operator,
  FactoryHall,
  ProductionPlan,
  SapcoCoilReceipt,
} from './types/inventory';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

function AppContent() {
  const router = useErpRouter();
  const [activeTab, setActiveTab] = useState<TabKey>(router.route.tab);
  const [activeInventorySubTab, setActiveInventorySubTab] = useState<InventorySubTab>(router.route.inventorySubTab);
  const [pendingInventoryModal, setPendingInventoryModal] = useState<
    'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER' | null
  >(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiReceiptDraft, setAiReceiptDraft] = useState<any>(null);
  const [aiIssueDraft, setAiIssueDraft] = useState<any>(null);
  const [productionViewMode, setProductionViewMode] = useState<'ERP_WORKBENCH' | 'VOUCHERS'>(
    router.route.productionViewMode
  );
  const [activeProductionModuleTab, setActiveProductionModuleTab] = useState<ProductionWorkbenchSubTab>(
    router.route.productionModuleTab
  );
  const [activePlanningSubTab, setActivePlanningSubTab] = useState<PlanningSubTabKey>(
    router.route.planningSubTab
  );
  const [activeMachineSubTab, setActiveMachineSubTab] = useState<MachineSubTabKey>(
    router.route.machineSubTab
  );
  const [activeMasterSubSection, setActiveMasterSubSection] = useState<MasterSubSection>(
    router.route.masterSubSection || 'PARTS'
  );

  // Synchronize state when URL changes (Browser Back / Forward buttons or deep links)
  useEffect(() => {
    setActiveTab(router.route.tab);
    setActiveInventorySubTab(router.route.inventorySubTab);
    setProductionViewMode(router.route.productionViewMode);
    setActiveProductionModuleTab(router.route.productionModuleTab);
    setActivePlanningSubTab(router.route.planningSubTab);
    setActiveMachineSubTab(router.route.machineSubTab);
    if (router.route.masterSubSection) {
      setActiveMasterSubSection(router.route.masterSubSection);
    }
  }, [router.route]);

  // Multi-Template & Color Theme Engine (Persisted in localStorage)
  const [layoutTemplate, setLayoutTemplate] = useState<ErpLayoutTemplate>(() => {
    const saved = localStorage.getItem('kpims_layout_template') as ErpLayoutTemplate | null;
    return saved || 'HUB_WORKSPACE';
  });
  const [colorTheme, setColorTheme] = useState<ErpColorTheme>(() => {
    const saved = localStorage.getItem('kpims_color_theme') as ErpColorTheme | null;
    return saved || 'EMERALD_KOSAR';
  });
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const handleSelectTemplate = (tpl: ErpLayoutTemplate) => {
    setLayoutTemplate(tpl);
    localStorage.setItem('kpims_layout_template', tpl);
    if (tpl === 'ODOO_ENTERPRISE') {
      setColorTheme('ODOO_PLUM');
      localStorage.setItem('kpims_color_theme', 'ODOO_PLUM');
    } else if (tpl === 'HUB_WORKSPACE' || tpl === 'TABBED_WORKBENCH') {
      setColorTheme('EMERALD_KOSAR');
      localStorage.setItem('kpims_color_theme', 'EMERALD_KOSAR');
    }
  };

  const handleSelectColor = (clr: ErpColorTheme) => {
    setColorTheme(clr);
    localStorage.setItem('kpims_color_theme', clr);
  };

  const [initialVoucherType, setInitialVoucherType] = useState<VoucherType>('RECEIPT');
  const [initialPartId, setInitialPartId] = useState<string | undefined>(undefined);
  const [initialStageId, setInitialStageId] = useState<string | undefined>(undefined);
  const [isErpModalOpen, setIsErpModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Core Data
  const [parts, setParts] = useState<Part[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [routings, setRoutings] = useState<Routing[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [dies, setDies] = useState<DieMold[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [halls, setHalls] = useState<FactoryHall[]>([]);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [coils, setCoils] = useState<SapcoCoilReceipt[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Auth & Role
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserRoleProfile>({
    uid: 'USR-PROD-01',
    email: 'admin.factory@sapco-supplier.ir',
    displayName: 'مهندس حسینی (مدیر تولید)',
    role: 'ADMIN',
    active: true,
    createdAt: new Date().toISOString(),
  });

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      user => {
        setFirebaseUser(user);
        if (user) {
          setCurrentUser(prev => ({
            ...prev,
            uid: user.uid,
            email: user.email || prev.email,
            displayName: user.displayName || prev.displayName,
          }));
        }
      },
      () => {
        setFirebaseUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch all data from server with Offline Factory Floor Cache fallback
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        sumRes,
        txRes,
        partsRes,
        machinesRes,
        routingsRes,
        diesRes,
        opsRes,
        hallsRes,
        plansRes,
        coilsRes,
      ] = await Promise.all([
        fetch('/api/inventory/summary').then(r => r.json()),
        fetch('/api/inventory/transactions').then(r => r.json()),
        fetch('/api/parts').then(r => r.json()),
        fetch('/api/machines').then(r => r.json()),
        fetch('/api/routings').then(r => r.json()),
        fetch('/api/dies').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/operators').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/halls').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/planning').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/sapco/coils').then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (txRes.success) setTransactions(txRes.data);
      if (partsRes.success) setParts(partsRes.data);
      if (machinesRes.success) setMachines(machinesRes.data);
      if (routingsRes.success) setRoutings(routingsRes.data);
      if (diesRes.success) setDies(diesRes.data);
      if (opsRes.success) setOperators(opsRes.data);
      if (hallsRes.success) setHalls(hallsRes.data);
      if (plansRes.success) setPlans(plansRes.data);
      if (coilsRes.success) setCoils(coilsRes.data);

      try {
        localStorage.setItem(
          'kpims_offline_erp_snapshot',
          JSON.stringify({
            summary: sumRes.data,
            transactions: txRes.data,
            parts: partsRes.data,
            machines: machinesRes.data,
            routings: routingsRes.data,
            dies: diesRes.data,
            operators: opsRes.data,
            halls: hallsRes.data,
            plans: plansRes.data,
            coils: coilsRes.data,
          })
        );
      } catch {
        // ignore quota errors
      }
    } catch (err) {
      console.warn('Network unavailable — loading factory data from offline snapshot:', err);
      try {
        const cached = localStorage.getItem('kpims_offline_erp_snapshot');
        if (cached) {
          const snap = JSON.parse(cached);
          if (snap.summary) setSummary(snap.summary);
          if (snap.transactions) setTransactions(snap.transactions);
          if (snap.parts) setParts(snap.parts);
          if (snap.machines) setMachines(snap.machines);
          if (snap.routings) setRoutings(snap.routings);
          if (snap.dies) setDies(snap.dies);
          if (snap.operators) setOperators(snap.operators);
          if (snap.halls) setHalls(snap.halls);
          if (snap.plans) setPlans(snap.plans);
          if (snap.coils) setCoils(snap.coils);
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Global Ctrl+Space Shortcut for Context-Aware AI Assistant (Upgrade 5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        setIsAiModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Voucher Submission (Online + Offline Queue Support)
  const handleSubmitVoucher = async (payload: any) => {
    try {
      const enrichedPayload = {
        ...payload,
        createdByUid: currentUser.uid,
        createdByName: currentUser.displayName,
      };

      const res = await fetch('/api/inventory/validate-and-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در ثبت سند در سرور');
      }

      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        try {
          const q = JSON.parse(localStorage.getItem('kpims_offline_voucher_queue') || '[]');
          q.push({ ...payload, queuedAt: new Date().toISOString() });
          localStorage.setItem('kpims_offline_voucher_queue', JSON.stringify(q));
        } catch {
          // ignore
        }
        return {
          success: true,
          message: 'سند در صف آفلاین کارگاه ذخیره شد و به محض اتصال به شبکه همگام‌سازی می‌شود.',
        };
      }
      return {
        success: false,
        message: err instanceof Error ? err.message : 'خطای ارتباط با سرور',
      };
    }
  };

  // Master Data Save/Update (with optimistic VIP / isPinned sync across all modules)
  const handleSavePart = async (partData: Partial<Part>) => {
    if (partData.id) {
      setParts(prev =>
        prev.map(p =>
          p.id === partData.id
            ? {
                ...p,
                ...partData,
                isVIP: partData.isVIP !== undefined ? partData.isVIP : partData.isPinned ?? p.isVIP,
                isPinned:
                  partData.isPinned !== undefined ? partData.isPinned : partData.isVIP ?? p.isPinned,
              }
            : p
        )
      );
    }
    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت قطعه');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت قطعه';
      return { success: false, error: msg };
    }
  };

  const handleSaveMachine = async (mchData: Partial<Machine>) => {
    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mchData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت ماشین');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت ماشین';
      return { success: false, error: msg };
    }
  };

  const handleSaveDie = async (dieData: Partial<DieMold>) => {
    try {
      const res = await fetch('/api/dies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dieData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت قالب');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت قالب';
      return { success: false, error: msg };
    }
  };

  const handleDeleteDie = async (id: string) => {
    try {
      const res = await fetch(`/api/dies/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در حذف قالب');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف قالب';
      return { success: false, error: msg };
    }
  };

  const handleSaveOperator = async (opData: Partial<Operator>) => {
    try {
      const res = await fetch('/api/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت اپراتور');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت اپراتور';
      return { success: false, error: msg };
    }
  };

  const handleDeleteOperator = async (opId: string) => {
    try {
      const res = await fetch(`/api/operators/${opId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در حذف اپراتور');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف اپراتور';
      return { success: false, error: msg };
    }
  };

  const handleSaveHall = async (hallData: Partial<FactoryHall>) => {
    try {
      const res = await fetch('/api/halls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hallData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت سالن');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت سالن';
      return { success: false, error: msg };
    }
  };

  const handleSaveRouting = async (routingData: Partial<Routing>) => {
    try {
      const res = await fetch('/api/routings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routingData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ثبت مسیر تولید');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت مسیر تولید';
      return { success: false, error: msg };
    }
  };

  const handleDeleteRouting = async (routingId: string) => {
    try {
      const res = await fetch(`/api/routings/${routingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در حذف مسیر');
      await loadAllData();
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف مسیر';
      return { success: false, error: msg };
    }
  };

  // Demo Data Reset & Clean Handlers
  const handleSeedDemo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/demo-data/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanDemo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/demo-data/clean', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVoucherWithType = (type: string, partId?: string, stageId?: string) => {
    setInitialVoucherType(type as VoucherType);
    setInitialPartId(partId);
    setInitialStageId(stageId);
    setActiveTab('production');
  };

  const handleDeepNavigate = (
    tab: any,
    subTab?: InventorySubTab,
    actionModal?: 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER'
  ) => {
    let resolvedTab: TabKey = 'dashboard';
    if (tab === 'vouchers') {
      resolvedTab = 'production';
      setProductionViewMode('VOUCHERS');
      router.navigate({ tab: 'production', productionViewMode: 'VOUCHERS', moId: null });
    } else if (tab === 'parts') {
      resolvedTab = 'master_data';
      router.navigate({ tab: 'master_data', moId: null });
    } else if (tab === 'audit') {
      resolvedTab = 'reports';
      router.navigate({ tab: 'reports', moId: null });
    } else if (tab === 'users') {
      resolvedTab = 'settings';
      router.navigate({ tab: 'settings', moId: null });
    } else {
      resolvedTab = tab;
      router.navigate({ tab, inventorySubTab: subTab, moId: null });
    }
    setActiveTab(resolvedTab);

    if (subTab) {
      setActiveInventorySubTab(subTab);
    }
    if (actionModal) {
      setPendingInventoryModal(actionModal);
    }
  };

  const handleSubModuleNavigate = (tab: TabKey, navParams?: SubModuleNavParams) => {
    setActiveTab(tab);
    if (!navParams) {
      router.navigate({ tab, moId: null });
      return;
    }
    if (navParams.inventorySubTab) setActiveInventorySubTab(navParams.inventorySubTab);
    if (navParams.productionViewMode) setProductionViewMode(navParams.productionViewMode);
    if (navParams.productionModuleTab) setActiveProductionModuleTab(navParams.productionModuleTab);
    if (navParams.planningSubTab) setActivePlanningSubTab(navParams.planningSubTab);
    if (navParams.machineSubTab) setActiveMachineSubTab(navParams.machineSubTab);
    if (navParams.masterSubSection) setActiveMasterSubSection(navParams.masterSubSection);
    router.navigate({
      tab,
      inventorySubTab: navParams.inventorySubTab,
      productionViewMode: navParams.productionViewMode,
      productionModuleTab: navParams.productionModuleTab,
      planningSubTab: navParams.planningSubTab,
      machineSubTab: navParams.machineSubTab,
      masterSubSection: navParams.masterSubSection,
      moId: null,
    });
  };

  const handleExecuteAiAction = (action: AiActionPayload) => {
    // Explicitly reset any pending inventory modal popups
    setPendingInventoryModal(null);

    if (action.actionType === 'OPEN_RECEIPT') {
      setActiveTab('inventory');
      setActiveInventorySubTab('DASHBOARD');
      if (action.prefillReceipt) {
        setAiReceiptDraft(action.prefillReceipt);
      }
      setPendingInventoryModal('RECEIPT');
    } else if (action.actionType === 'OPEN_ISSUE') {
      setActiveTab('inventory');
      setActiveInventorySubTab('DASHBOARD');
      if (action.prefillIssue) {
        setAiIssueDraft(action.prefillIssue);
      }
      setPendingInventoryModal('ISSUE');
    } else if (action.actionType === 'OPEN_CREATE_MO') {
      setActiveTab('production');
      setProductionViewMode('ERP_WORKBENCH');
      setActiveProductionModuleTab('MULTI_PART_SCHEDULER');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('kpims:contextual-action', { detail: { actionType: 'OPEN_CREATE_MO' } }));
      }, 120);
    } else if (action.actionType === 'OPEN_TRACK_ORDER') {
      setActiveTab('production');
      setProductionViewMode('ERP_WORKBENCH');
      setActiveProductionModuleTab('MULTI_PART_SCHEDULER');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('kpims:contextual-action', { detail: { actionType: 'OPEN_TRACK_FIRST_ORDER' } }));
      }, 120);
    } else if (action.actionType === 'OPEN_HEAT_TRACEABILITY') {
      setActiveTab('sapco');
    } else if (action.actionType === 'CHECK_REORDER') {
      setActiveTab('inventory');
      setActiveInventorySubTab('ALERTS');
    } else if (action.actionType === 'NAVIGATE' && action.targetTab) {
      const target = action.targetTab as TabKey;
      setActiveTab(target);
      if (target === 'inventory' && action.targetSubTab) {
        setActiveInventorySubTab(action.targetSubTab as InventorySubTab);
      } else if (target === 'machines' && action.targetSubTab) {
        setActiveMachineSubTab(action.targetSubTab as any);
      } else if (target === 'production') {
        setProductionViewMode('ERP_WORKBENCH');
        if (action.targetSubTab) {
          setActiveProductionModuleTab(action.targetSubTab as any);
        }
      } else if (target === 'planning' && action.targetSubTab) {
        setActivePlanningSubTab(action.targetSubTab as any);
      }
    } else if (action.actionType === 'QUERY_STOCK') {
      setActiveTab('inventory');
      setActiveInventorySubTab('INQUIRY');
    }
  };

  // Compute top-level reorder alert summary counts for Navbar & Sidebar badges
  const stageBalancesList: any[] = summary?.stageBalances || [];
  let reorderAlertsCount = 0;
  let criticalAlertsCount = 0;
  parts.forEach(part => {
    if (typeof part.minStock === 'number' && part.minStock > 0) {
      const matchingStages = stageBalancesList.filter(
        sb => (sb.partId === part.id || sb.partCode === part.code) && sb.stageId !== 'STAGE_SCRAP_YARD'
      );
      const currentStock = matchingStages.reduce(
        (sum, sb) => sum + (part.unit === 'KG' ? sb.totalKg || sb.usableQty : sb.usableQty),
        0
      );
      if (currentStock < part.minStock) {
        reorderAlertsCount++;
        const coverage = Math.round((currentStock / part.minStock) * 100);
        if (currentStock <= 0 || coverage <= 25) {
          criticalAlertsCount++;
        }
      }
    }
  });

  // In HUB_WORKSPACE (Image 1), the dark sidebar spans full height on the right while the white navbar sits over the main workspace.
  // In TABBED_WORKBENCH (Image 2), ODOO_ENTERPRISE, and CLASSIC_COMMAND, the navbar spans full width across the top.
  const isSidebarFullHeight = layoutTemplate === 'HUB_WORKSPACE';

  const navbarElement = (
    <Navbar
      activeTab={activeTab}
      layoutTemplate={layoutTemplate}
      colorTheme={colorTheme}
      currentUser={currentUser}
      parts={parts}
      coilsCount={coils.length}
      reorderAlertsCount={reorderAlertsCount}
      criticalAlertsCount={criticalAlertsCount}
      onRoleChange={role => setCurrentUser(prev => ({ ...prev, role }))}
      onNavigate={handleDeepNavigate}
      onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
      onQuickTemplateChange={handleSelectTemplate}
      onOpenAiAssistant={() => setIsAiModalOpen(true)}
      onSeedDemo={handleSeedDemo}
      onCleanDemo={handleCleanDemo}
      onOpenErpModal={() => setIsErpModalOpen(true)}
      loading={loading}
    />
  );

  const sidebarElement = (
    <Sidebar
      activeTab={activeTab}
      activeInventorySubTab={activeInventorySubTab}
      activeProductionViewMode={productionViewMode}
      activeProductionModuleTab={activeProductionModuleTab}
      activePlanningSubTab={activePlanningSubTab}
      activeMachineSubTab={activeMachineSubTab}
      activeMasterSubSection={activeMasterSubSection}
      layoutTemplate={layoutTemplate}
      colorTheme={colorTheme}
      onTabChange={(tab, navParams) => {
        setActiveTab(tab);
        if (!navParams) {
          router.navigate({ tab, moId: null });
          return;
        }
        if (typeof navParams === 'string') {
          setActiveInventorySubTab(navParams as InventorySubTab);
          router.navigate({ tab, inventorySubTab: navParams as InventorySubTab, moId: null });
          return;
        }
        if (navParams.inventorySubTab) setActiveInventorySubTab(navParams.inventorySubTab);
        if (navParams.productionViewMode) setProductionViewMode(navParams.productionViewMode);
        if (navParams.productionModuleTab) setActiveProductionModuleTab(navParams.productionModuleTab);
        if (navParams.planningSubTab) setActivePlanningSubTab(navParams.planningSubTab);
        if (navParams.machineSubTab) setActiveMachineSubTab(navParams.machineSubTab);
        if (navParams.masterSubSection) setActiveMasterSubSection(navParams.masterSubSection);
        router.navigate({
          tab,
          inventorySubTab: navParams.inventorySubTab,
          productionViewMode: navParams.productionViewMode,
          productionModuleTab: navParams.productionModuleTab,
          planningSubTab: navParams.planningSubTab,
          machineSubTab: navParams.machineSubTab,
          masterSubSection: navParams.masterSubSection,
          moId: null,
        });
      }}
      onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
      onOpenAiAssistant={() => setIsAiModalOpen(true)}
      currentRole={currentUser.role}
      partsCount={parts.length}
      txCount={transactions.length}
      plansCount={plans.length}
      coilsCount={coils.length}
      reorderAlertsCount={reorderAlertsCount}
    />
  );

  const mainContentElement = (
    <main className="flex-1 p-5 md:p-7 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
      {/* 1. Dashboard */}
      {activeTab === 'dashboard' && (
        <DashboardView
          currentUser={currentUser}
          summary={summary}
          recentTransactions={transactions}
          machines={machines}
          parts={parts}
          routings={routings}
          dies={dies}
          halls={halls}
          coils={coils}
          onNavigateToTab={handleDeepNavigate}
          onNavigateSubModule={handleSubModuleNavigate}
          onOpenNewVoucher={handleOpenVoucherWithType}
          onSubmitVoucher={handleSubmitVoucher}
          initialOrderId={router.route.moId}
          initialDrawerTab={router.route.drawerTab}
          onOrderDrawerChange={(orderId, tab) => {
            if (orderId) {
              router.openMoDrawer(orderId, tab);
            } else {
              router.closeMoDrawer();
            }
          }}
        />
      )}

      {/* 2. Master Data Hub (Supports both Image 1 Card Hub & Image 2 Tabbed Workbench) */}
      {activeTab === 'master_data' && (
        <MasterDataHubView
          layoutTemplate={layoutTemplate}
          colorTheme={colorTheme}
          initialSection={activeMasterSubSection}
          onSectionChange={setActiveMasterSubSection}
          parts={parts}
          routings={routings}
          machines={machines}
          dies={dies}
          operators={operators}
          halls={halls}
          coils={coils}
          onSavePart={handleSavePart}
          onSaveRouting={handleSaveRouting}
          onDeleteRouting={handleDeleteRouting}
          onSaveMachine={handleSaveMachine}
          onSaveDie={handleSaveDie}
          onDeleteDie={handleDeleteDie}
          onSaveOperator={handleSaveOperator}
          onSaveHall={handleSaveHall}
          onDirectProduce={partId => {
            handleOpenVoucherWithType('PRODUCTION_OUTPUT', partId);
          }}
          onRefresh={loadAllData}
          onNavigateToInventoryCoils={() => {
            setActiveTab('inventory');
            setActiveInventorySubTab('COILS');
          }}
          onNavigateToPlanning={() => setActiveTab('planning')}
        />
      )}

      {/* 2.5 Sales & Contracts Module (Contract -> MRP -> MO Chain) */}
      {activeTab === 'contracts' && (
        <SalesContractsModuleView
          parts={parts}
          currentUser={currentUser}
          onNavigateToTab={handleDeepNavigate}
          onNavigateSubModule={handleSubModuleNavigate}
          onGlobalRefresh={loadAllData}
        />
      )}

      {/* 3. Inventory Management Module */}
      {activeTab === 'inventory' && (
        <InventoryModuleView
          parts={parts}
          stageBalances={summary?.stageBalances || []}
          currentUser={{
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            role: currentUser.role,
          }}
          initialSubTab={activeInventorySubTab}
          initialActionModal={pendingInventoryModal}
          initialReceiptDraft={aiReceiptDraft}
          initialIssueDraft={aiIssueDraft}
          onClearInitialAction={() => {
            setPendingInventoryModal(null);
            setAiReceiptDraft(null);
            setAiIssueDraft(null);
          }}
          onGlobalRefresh={loadAllData}
          onNavigateToPlanning={() => setActiveTab('planning')}
          onSubTabChange={subTab => {
            setActiveInventorySubTab(subTab);
            router.navigate({ inventorySubTab: subTab });
          }}
        />
      )}

          {/* 4. Production */}
          {activeTab === 'production' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setProductionViewMode('ERP_WORKBENCH')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      productionViewMode === 'ERP_WORKBENCH'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    میز کار و برنامه تولید
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductionViewMode('VOUCHERS')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      productionViewMode === 'VOUCHERS'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ثبت قبض تکی کارگاه
                  </button>
                </div>
              </div>

              {productionViewMode === 'ERP_WORKBENCH' ? (
                <ErpProductionWorkbenchView
                  parts={parts}
                  routings={routings}
                  machines={machines}
                  initialModuleTab={activeProductionModuleTab}
                  onModuleTabChange={tab => {
                    setActiveProductionModuleTab(tab);
                    router.navigate({ productionModuleTab: tab });
                  }}
                  initialMoId={router.route.moId}
                  onMoSelect={moId => {
                    if (moId) {
                      router.openMoDrawer(moId);
                    } else {
                      router.closeMoDrawer();
                    }
                  }}
                  onRefreshData={loadAllData}
                />
              ) : (
                <TransactionsVouchersView
                  parts={parts}
                  machines={machines}
                  dies={dies}
                  operators={operators}
                  stageBalances={summary?.stageBalances || []}
                  initialVoucherType={initialVoucherType}
                  initialPartId={initialPartId}
                  initialStageId={initialStageId}
                  onSubmitVoucher={handleSubmitVoucher}
                  onTrackVoucher={() => handleDeepNavigate('inventory', 'MOVEMENT')}
                />
              )}
            </div>
          )}

          {/* 5. Production Execution & WIP Module */}
          {activeTab === 'wip' && (
            <ProductionWipModuleView
              parts={parts}
              machines={machines}
              operators={operators}
              stageBalances={summary?.stageBalances || []}
              onGlobalRefresh={loadAllData}
            />
          )}

          {/* 6. Production Planning Engine */}
          {activeTab === 'planning' && (
            <ProductionPlanningModuleView
              parts={parts}
              routings={routings}
              machines={machines}
              dies={dies}
              initialSubTab={activePlanningSubTab}
              onSubTabChange={subTab => {
                setActivePlanningSubTab(subTab);
                router.navigate({ planningSubTab: subTab });
              }}
              onGlobalRefresh={loadAllData}
            />
          )}

          {/* 7. Machines and Capacity */}
          {activeTab === 'machines' && (
            <MachinesView
              machines={machines}
              dies={dies}
              operators={operators}
              halls={halls}
              parts={parts}
              initialSubTab={activeMachineSubTab}
              onSubTabChange={subTab => {
                setActiveMachineSubTab(subTab);
                router.navigate({ machineSubTab: subTab });
              }}
              onSaveMachine={handleSaveMachine}
              onSaveDie={handleSaveDie}
              onDeleteDie={handleDeleteDie}
              onSaveOperator={handleSaveOperator}
              onDeleteOperator={handleDeleteOperator}
              onSaveHall={handleSaveHall}
            />
          )}

          {/* 8. SAPCO Materials */}
          {activeTab === 'sapco' && (
            <SapcoMaterialsView
              coils={coils}
              parts={parts}
              onRefresh={loadAllData}
              loading={loading}
            />
          )}

          {/* 9. Management Reporting & Control Module */}
          {activeTab === 'reports' && (
            <ManagementReportsModuleView
              parts={parts}
              machines={machines}
            />
          )}

          {/* 10. Users and Settings */}
          {activeTab === 'settings' && (
            <UserManagementView
              currentUser={currentUser}
              onRoleChange={role => setCurrentUser(prev => ({ ...prev, role }))}
              firebaseUser={firebaseUser}
            />
          )}
    </main>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-emerald-700 selection:text-white">
      {isSidebarFullHeight ? (
        /* Layout A (Image 1 / ERPNext Workspace): Dark Right Sidebar spans full height, White Top Bar sits above main workspace */
        <div className="flex-1 flex flex-col md:flex-row min-h-screen">
          {sidebarElement}
          <div className="flex-1 flex flex-col min-w-0">
            {navbarElement}
            {mainContentElement}
          </div>
        </div>
      ) : (
        /* Layout B (Image 2 / Odoo / Classic): Full-width Top Header spans across top, Right Sidebar + Main Content below */
        <>
          {navbarElement}
          <div className="flex-1 flex flex-col md:flex-row">
            {sidebarElement}
            {mainContentElement}
          </div>
        </>
      )}

      {/* Contextual Action Floating Menu (Bottom-Right of Each View) */}
      <ContextualActionMenu
        activeTab={activeTab}
        onNavigate={handleDeepNavigate}
        onSubModuleNavigate={handleSubModuleNavigate}
        onOpenNewVoucher={handleOpenVoucherWithType}
      />

      {/* Offline Mode Indicator for Factory Floor Operations */}
      <OfflineIndicator />

      {/* Template & Color Theme Switcher + UX/UI Analysis Modal */}
      <TemplateSwitcherModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        activeTemplate={layoutTemplate}
        activeColor={colorTheme}
        onSelectTemplate={handleSelectTemplate}
        onSelectColor={handleSelectColor}
        onPreviewMasterData={() => setActiveTab('master_data')}
      />

      {/* ERP Sync Modal */}
      <ErpSyncModal
        isOpen={isErpModalOpen}
        onClose={() => setIsErpModalOpen(false)}
        partsCount={parts.length}
        txCount={transactions.length}
      />

      {/* AI Assistant Modal (Context-Aware Voice & Text with Ctrl+Space) */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        parts={parts}
        currentPageTab={activeTab}
        coils={coils}
        summary={summary}
        onExecuteAction={handleExecuteAiAction}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErpRouterProvider>
      <EnterpriseUxProvider>
        <AppContent />
      </EnterpriseUxProvider>
    </ErpRouterProvider>
  );
}

