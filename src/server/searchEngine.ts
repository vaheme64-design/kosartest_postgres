import { GlobalSearchHit, GlobalSearchResultGroup, GlobalSearchResponse } from '../types/search';
import {
  INITIAL_PARTS,
  INITIAL_MACHINES,
  INITIAL_ROUTINGS,
  INITIAL_DIES_MOLDS,
  INITIAL_SAPCO_COILS,
} from './sampleData';
import {
  INITIAL_INVENTORY_DOCUMENTS,
  INITIAL_SAPCO_CONTRACTS,
} from './inventorySampleData';
import { customerOrdersStore } from './productionPlanningEngine';
import { manufacturingOrdersStore } from './productionWipEngine';
import { TabKey } from '../components/Sidebar';
import { InventorySubTab } from '../components/inventory/InventoryModuleView';

interface ModuleNavDefinition {
  title: string;
  subtitle: string;
  keywords: string[];
  targetTab: TabKey;
  targetSubTab?: InventorySubTab;
}

const SYSTEM_MODULES: ModuleNavDefinition[] = [
  { title: 'داشبورد مدیریتی و شاخص‌های کلیدی کارخانه', subtitle: 'Executive Dashboard & KPI Hub', keywords: ['داشبورد', 'میزکار', 'شاخص', 'kpi', 'home'], targetTab: 'dashboard' },
  { title: 'اطلاعات پایه و تعاریف مهندسی محصول (BOM، قطعات، مسیرها)', subtitle: 'Master Data Hub & Engineering Specs', keywords: ['اطلاعات پایه', 'مهندسی', 'قطعه', 'bom', 'ساختار محصول', 'مسیر ساخت'], targetTab: 'master_data' },
  { title: 'پیشخوان انبار و کنترل گردش مواد و محصول', subtitle: 'Warehouse Command Center', keywords: ['انبار', 'موجودی', 'کاردکس', 'گردش', 'انبارداری'], targetTab: 'inventory', targetSubTab: 'DASHBOARD' },
  { title: 'استعلام موجودی و فیلتر مشخصات ورق و کالا', subtitle: 'Real-time Stock Inquiry & Filters', keywords: ['استعلام موجودی', 'جستجو موجودی', 'موجودی ورق', 'کارت کالا'], targetTab: 'inventory', targetSubTab: 'INQUIRY' },
  { title: 'مدیریت رول‌های ورق و پکینگ‌لیست کویل', subtitle: 'Steel Coil & Pack Stock Ledger', keywords: ['کویل', 'رول', 'کلاف', 'شیت', 'ورق', 'کویل‌پک', 'باسکول'], targetTab: 'inventory', targetSubTab: 'COILS' },
  { title: 'قراردادها و سهمیه‌های امانی ساپکو و سایپا', subtitle: 'Supply Quota & Consignment Contracts', keywords: ['قرارداد', 'سهمیه', 'ساپکو', 'سایپا', 'امانی', 'تأمین'], targetTab: 'inventory', targetSubTab: 'CONTRACTS' },
  { title: 'هشدارهای نقطه سفارش و کسری موجودی', subtitle: 'Reorder Point & Stock Shortage Alerts', keywords: ['هشدار', 'کسری', 'نقطه سفارش', 'حداقل موجودی', 'alert'], targetTab: 'inventory', targetSubTab: 'ALERTS' },
  { title: 'کاردکس و دفتر کل گردش انبار (اسناد و ابطال)', subtitle: 'Analytical Inventory Ledger & Vouchers', keywords: ['کاردکس', 'دفتر کل', 'اسناد', 'گردش', 'حواله', 'رسید', 'ابطال'], targetTab: 'inventory', targetSubTab: 'MOVEMENT' },
  { title: 'ورود و صدور داده‌های اکسل با اعتبارسنجی خودکار', subtitle: 'Excel Batch Import & Migration Tool', keywords: ['اکسل', 'آپلود', 'خروجی', 'import', 'excel', 'csv'], targetTab: 'inventory', targetSubTab: 'IMPORT_EXPORT' },
  { title: 'ثبت روزانه تولید پرس، مصرف ورق و ضایعات', subtitle: 'Daily Press Production & Scrap Log', keywords: ['تولید روزانه', 'پرس', 'ضایعات', 'آمار تولید', 'ثبت شیفت'], targetTab: 'production' },
  { title: 'رهگیری قطعات در جریان ساخت (WIP) و خطوط موازی', subtitle: 'Shop-Floor WIP & Parallel Lines Tracking', keywords: ['wip', 'کار در جریان', 'ایستگاه', 'انتقال بین خطوط', 'خطوط موازی', 'چپ و راست'], targetTab: 'wip' },
  { title: 'برنامه‌ریزی تولید و نیازسنجی مواد اولیه (MRP)', subtitle: 'Master Production Schedule & MRP Engine', keywords: ['برنامه ریزی', 'mrp', 'پیشنهاد تولید', 'سفارشات مشتری', 'mps'], targetTab: 'planning' },
  { title: 'پیش‌بینی نیازمندی مواد و موازنه کلاف (MRP & ATP)', subtitle: 'BOM Explosion, Stock Netting & Pre-Issue Check', keywords: ['پیش بینی', 'پیش بینی مواد', 'نیاز مواد', 'mrp', 'کسری مواد', 'موازنه کلاف', 'atp', 'پیش از حواله', 'رزرو خودکار'], targetTab: 'planning' },
  { title: 'ماشین‌آلات، خطوط پرس و نگهداری قالب‌های سنبه‌ماتریس', subtitle: 'Press Machines & Die Capacity Ledger', keywords: ['ماشین آلات', 'دستگاه', 'پرس', 'قالب', 'سنبه ماتریس', 'ظرفیت', 'oee'], targetTab: 'machines' },
  { title: 'مواد امانی ساپکو و بیلان وزنی کلاف‌ها', subtitle: 'SAPCO Consignment Steel Ledger', keywords: ['ساپکو', 'مواد امانی', 'کویل ساپکو', 'بیلان وزنی', 'sapco'], targetTab: 'sapco' },
  { title: 'مرکز گزارش‌های جامع مدیریتی و حسابداری صنعتی', subtitle: 'Executive Reports & Audited Analytics', keywords: ['گزارش', 'گزارشات', 'مدیریتی', 'تحلیل', 'بهای تمام شده', 'صورت حساب'], targetTab: 'reports' },
  { title: 'گزارش تحلیلی تأخیرات تولید و انحرافات تعهدات تحویل', subtitle: 'Production Delay Analytics & Root Cause Audit (Report 11)', keywords: ['تاخیر', 'تاخیرات', 'دیرکرد', 'علت تاخیر', 'تعهدات معوق', 'otif', 'جریمه ساپکو', 'گلوگاه'], targetTab: 'reports' },
  { title: 'مدیریت کاربران، نقش‌های سازمانی و ردپای ممیزی', subtitle: 'User Roles & System Audit Trails', keywords: ['کاربران', 'نقش', 'دسترسی', 'ممیزی', 'تنظیمات', 'امنیت'], targetTab: 'settings' },
];

const WAREHOUSE_ITEMS = [
  { code: 'WH-RAW-COIL', name: 'انبار مرکزی رول و کویل خام', type: 'مواد اولیه' },
  { code: 'WH-SHEARED-BLANK', name: 'انبار بلنک و شیت‌های برش‌خورده', type: 'نیمه‌ساخته' },
  { code: 'WH-WIP-PRESS', name: 'انبار موقت پای خطوط پرس', type: 'کار در جریان' },
  { code: 'WH-FINISHED-GOODS', name: 'انبار محصولات نهایی تحویل مشتری', type: 'محصول نهایی' },
  { code: 'WH-SCRAP-YARD', name: 'انبار ضایعات پرس و پوشال ورق', type: 'ضایعات' },
];

export function executeGlobalSearch(query: string, limitPerCategory = 6): GlobalSearchResponse {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      query: '',
      totalHits: 0,
      groups: [],
    };
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const matchesTokens = (text?: string | null) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return tokens.every(tok => lower.includes(tok));
  };

  const groups: GlobalSearchResultGroup[] = [];

  // 1. Modules & Navigation Hits
  const matchedModules: GlobalSearchHit[] = SYSTEM_MODULES
    .filter(m => matchesTokens(m.title) || matchesTokens(m.subtitle) || m.keywords.some(k => matchesTokens(k)))
    .slice(0, 5)
    .map(m => ({
      id: `mod-${m.targetTab}-${m.targetSubTab || 'root'}`,
      type: 'module',
      title: m.title,
      subtitle: m.subtitle,
      code: m.targetTab.toUpperCase(),
      badge: 'ماژول سیستم',
      badgeColor: 'purple',
      targetTab: m.targetTab,
      targetSubTab: m.targetSubTab,
    }));

  if (matchedModules.length > 0) {
    groups.push({
      type: 'module',
      labelFa: 'ماژول‌ها و ابزارهای سیستم',
      count: matchedModules.length,
      items: matchedModules,
    });
  }

  // 2. Parts (کالاها و قطعات)
  const matchedParts: GlobalSearchHit[] = INITIAL_PARTS
    .filter(p => matchesTokens(p.code) || matchesTokens(p.name) || matchesTokens(p.materialGrade) || matchesTokens(p.carModel))
    .slice(0, limitPerCategory)
    .map(p => ({
      id: p.id,
      type: 'part',
      title: p.name,
      subtitle: `${p.code} • ${p.category} ${p.materialGrade ? `• ${p.materialGrade}` : ''} ${p.thicknessMm ? `(${p.thicknessMm}mm)` : ''}`,
      code: p.code,
      badge: p.carModel || p.category,
      badgeColor: 'emerald',
      meta: {
        'کد قطعه': p.code,
        'گرید': p.materialGrade || '—',
        'ضخامت': p.thicknessMm ? `${p.thicknessMm} mm` : '—',
        'خودرو': p.carModel || 'عمومی',
        'حداقل موجودی': p.minStock ?? '—',
      },
      targetTab: 'master_data',
      filterParam: p.code,
    }));

  if (matchedParts.length > 0) {
    groups.push({
      type: 'part',
      labelFa: `قطعات و کالاها (${matchedParts.length})`,
      count: matchedParts.length,
      items: matchedParts,
    });
  }

  // 3. Coils & Steel Rolls (کویل‌ها و لوت‌های مواد اولیه)
  const matchedCoils: GlobalSearchHit[] = INITIAL_SAPCO_COILS
    .filter(c => matchesTokens(c.coilNumber) || matchesTokens(c.heatNumber) || matchesTokens(c.materialGrade))
    .slice(0, limitPerCategory)
    .map(c => {
      const consumed = c.consumedWeightKg || 0;
      const remaining = Math.max(0, c.receivedWeightKg - consumed);
      return {
        id: c.id,
        type: 'coil',
        title: `کویل ${c.coilNumber} (${c.materialGrade} - ${c.thicknessMm}mm)`,
        subtitle: `وزن باقیمانده: ${remaining.toLocaleString('fa-IR')} کیلوگرم • ذوب: ${c.heatNumber || '—'} • انبار رول و ورق`,
        code: c.coilNumber,
        badge: 'امانی ساپکو',
        badgeColor: 'blue',
        meta: {
          'شماره کویل': c.coilNumber,
          'گرید ورق': c.materialGrade,
          'ضخامت': `${c.thicknessMm} mm`,
          'عرض': `${c.widthMm} mm`,
          'وزن دریافتی': `${c.receivedWeightKg.toLocaleString()} kg`,
          'وزن باقیمانده': `${remaining.toLocaleString()} kg`,
          'شماره ذوب': c.heatNumber || '—',
        },
        targetTab: 'inventory',
        targetSubTab: 'COILS',
        filterParam: c.coilNumber,
      };
    });

  if (matchedCoils.length > 0) {
    groups.push({
      type: 'coil',
      labelFa: `کویل‌ها و رول‌های ورق (${matchedCoils.length})`,
      count: matchedCoils.length,
      items: matchedCoils,
    });
  }

  // 4. Manufacturing Orders (دستورهای کار ساخت - MO)
  const matchedMos: GlobalSearchHit[] = manufacturingOrdersStore
    .filter(m => matchesTokens(m.moNumber) || matchesTokens(m.partCode) || matchesTokens(m.partName) || matchesTokens(m.status))
    .slice(0, limitPerCategory)
    .map(m => ({
      id: m.id,
      type: 'mo',
      title: `دستور کار ${m.moNumber} — ${m.partName}`,
      subtitle: `تیراژ: ${m.targetQuantity.toLocaleString('fa-IR')} عدد • تکمیل: ${(m.completedQuantity || 0).toLocaleString('fa-IR')} • وضعیت: ${m.status === 'IN_PROGRESS' ? 'در حال تولید' : m.status === 'COMPLETED' ? 'تکمیل‌شده' : 'پیش‌نویس'}`,
      code: m.moNumber,
      badge: m.status,
      badgeColor: m.status === 'COMPLETED' ? 'emerald' : m.status === 'IN_PROGRESS' ? 'blue' : 'slate',
      meta: {
        'شماره دستور': m.moNumber,
        'کد قطعه': m.partCode,
        'تیراژ مصوب': m.targetQuantity,
        'تکمیل‌شده': m.completedQuantity || 0,
        'ضایعات': m.totalScrapQuantity || 0,
      },
      targetTab: 'wip',
      filterParam: m.moNumber,
    }));

  if (matchedMos.length > 0) {
    groups.push({
      type: 'mo',
      labelFa: `دستورهای ساخت (${matchedMos.length})`,
      count: matchedMos.length,
      items: matchedMos,
    });
  }

  // 5. Customer Orders (سفارش‌های مشتری)
  const matchedOrders: GlobalSearchHit[] = customerOrdersStore
    .filter(o => matchesTokens(o.orderNumber) || matchesTokens(o.customerName) || matchesTokens(o.contractNumber))
    .slice(0, limitPerCategory)
    .map(o => ({
      id: o.id,
      type: 'customer_order',
      title: `سفارش ${o.orderNumber} — ${o.customerName}`,
      subtitle: `قرارداد: ${o.contractNumber} • تعداد اقلام: ${o.lines.length} ردیف • سررسید: ${o.dueDate}`,
      code: o.orderNumber,
      badge: o.status,
      badgeColor: o.status === 'FULFILLED' ? 'emerald' : o.status === 'OPEN' ? 'blue' : 'amber',
      meta: {
        'شماره سفارش': o.orderNumber,
        'مشتری': o.customerName,
        'قرارداد': o.contractNumber,
        'تعداد اقلام': o.lines.length,
      },
      targetTab: 'planning',
      filterParam: o.orderNumber,
    }));

  if (matchedOrders.length > 0) {
    groups.push({
      type: 'customer_order',
      labelFa: `سفارش‌های مشتریان (${matchedOrders.length})`,
      count: matchedOrders.length,
      items: matchedOrders,
    });
  }

  // 6. Contracts (قراردادهای مواد)
  const matchedContracts: GlobalSearchHit[] = INITIAL_SAPCO_CONTRACTS
    .filter(c => matchesTokens(c.contractNumber) || matchesTokens(c.title) || matchesTokens(c.customerName) || matchesTokens(c.materialGrade))
    .slice(0, limitPerCategory)
    .map(c => ({
      id: c.id,
      type: 'contract',
      title: `قرارداد ${c.contractNumber} (${c.title})`,
      subtitle: `طرف حساب: ${c.customerName || 'ساپکو'} • سهمیه: ${c.allocatedWeightKg.toLocaleString('fa-IR')} kg • مصرف: ${(c.totalConsumedKg || 0).toLocaleString('fa-IR')} kg`,
      code: c.contractNumber,
      badge: c.status,
      badgeColor: c.status === 'ACTIVE' ? 'emerald' : 'slate',
      meta: {
        'شماره قرارداد': c.contractNumber,
        'طرف حساب': c.customerName || 'ساپکو',
        'سهمیه کل': `${c.allocatedWeightKg.toLocaleString()} kg`,
        'مصرف‌شده': `${(c.totalConsumedKg || 0).toLocaleString()} kg`,
      },
      targetTab: 'inventory',
      targetSubTab: 'CONTRACTS',
      filterParam: c.contractNumber,
    }));

  if (matchedContracts.length > 0) {
    groups.push({
      type: 'contract',
      labelFa: `قراردادهای مواد (${matchedContracts.length})`,
      count: matchedContracts.length,
      items: matchedContracts,
    });
  }

  // 7. Inventory Documents (اسناد و کاردکس انبار)
  const matchedDocs: GlobalSearchHit[] = INITIAL_INVENTORY_DOCUMENTS
    .filter(d => matchesTokens(d.documentNumber) || matchesTokens(d.documentType) || matchesTokens(d.referenceNumber))
    .slice(0, limitPerCategory)
    .map(d => ({
      id: d.id,
      type: 'document',
      title: `سند ${d.documentNumber} (${d.documentType})`,
      subtitle: `تاریخ: ${d.documentDate} • ردیف‌ها: ${d.lines.length} قلم • عطف: ${d.referenceNumber || 'ندارد'}`,
      code: d.documentNumber,
      badge: d.postingStatus === 'POSTED' ? 'قطعی‌شده' : d.postingStatus === 'REVERSED' ? 'ابطالی' : 'پیش‌نویس',
      badgeColor: d.postingStatus === 'POSTED' ? 'emerald' : d.postingStatus === 'REVERSED' ? 'rose' : 'slate',
      meta: {
        'شماره سند': d.documentNumber,
        'نوع سند': d.documentType,
        'تاریخ': d.documentDate,
        'تعداد اقلام': d.lines.length,
        'وضعیت': d.postingStatus,
      },
      targetTab: 'inventory',
      targetSubTab: 'MOVEMENT',
      filterParam: d.documentNumber,
    }));

  if (matchedDocs.length > 0) {
    groups.push({
      type: 'document',
      labelFa: `اسناد و کاردکس انبار (${matchedDocs.length})`,
      count: matchedDocs.length,
      items: matchedDocs,
    });
  }

  // 8. Machines (دستگاه‌ها و پرس‌ها)
  const matchedMachines: GlobalSearchHit[] = INITIAL_MACHINES
    .filter(m => matchesTokens(m.code) || matchesTokens(m.name) || matchesTokens(m.location) || (m.tonnage && matchesTokens(String(m.tonnage))))
    .slice(0, limitPerCategory)
    .map(m => ({
      id: m.id,
      type: 'machine',
      title: `${m.name} (${m.code})`,
      subtitle: `${m.location || 'سالن اصلی'} ${m.tonnage ? `• تناژ: ${m.tonnage} تن` : ''} • نوع: ${m.processType}`,
      code: m.code,
      badge: m.status === 'ACTIVE' ? 'فعال' : 'در حال تعمیر',
      badgeColor: m.status === 'ACTIVE' ? 'emerald' : 'rose',
      meta: {
        'کد دستگاه': m.code,
        'تناژ': m.tonnage ? `${m.tonnage} T` : '—',
        'موقعیت': m.location || '—',
        'وضعیت': m.status,
      },
      targetTab: 'machines',
      filterParam: m.code,
    }));

  if (matchedMachines.length > 0) {
    groups.push({
      type: 'machine',
      labelFa: `ماشین‌آلات و پرس‌ها (${matchedMachines.length})`,
      count: matchedMachines.length,
      items: matchedMachines,
    });
  }

  // 9. Dies (قالب‌های سنبه و ماتریس)
  const matchedDies: GlobalSearchHit[] = INITIAL_DIES_MOLDS
    .filter(d => matchesTokens(d.code) || matchesTokens(d.name) || matchesTokens(d.partCode))
    .slice(0, limitPerCategory)
    .map(d => ({
      id: d.id,
      type: 'die',
      title: `قالب ${d.name} (${d.code})`,
      subtitle: `قطعه متناظر: ${d.partCode} • ضربات ثبت‌شده: ${d.currentStrokes.toLocaleString('fa-IR')} از ${d.strokeLifeTarget.toLocaleString('fa-IR')}`,
      code: d.code,
      badge: d.status === 'READY' ? 'آماده تولید' : d.status,
      badgeColor: d.status === 'READY' ? 'emerald' : 'amber',
      meta: {
        'کد قالب': d.code,
        'قطعه متناظر': d.partCode,
        'کارکرد ضرب': d.currentStrokes,
        'عمر اسمی': d.strokeLifeTarget,
      },
      targetTab: 'machines',
      filterParam: d.code,
    }));

  if (matchedDies.length > 0) {
    groups.push({
      type: 'die',
      labelFa: `قالب‌های سنبه‌ماتریس (${matchedDies.length})`,
      count: matchedDies.length,
      items: matchedDies,
    });
  }

  // 10. Routings (مسیرهای ساخت)
  const matchedRoutings: GlobalSearchHit[] = INITIAL_ROUTINGS
    .filter(r => matchesTokens(r.partCode) || matchesTokens(r.partName) || matchesTokens(r.id))
    .slice(0, limitPerCategory)
    .map(r => ({
      id: r.id,
      type: 'routing',
      title: `مسیر ساخت: ${r.partName}`,
      subtitle: `کد قطعه: ${r.partCode} • تعداد مراحل تولید: ${r.operations.length} اوپراسیون`,
      code: r.partCode,
      badge: `${r.operations.length} مرحله`,
      badgeColor: 'blue',
      meta: {
        'کد قطعه': r.partCode,
        'تعداد اوپراسیون': r.operations.length,
      },
      targetTab: 'master_data',
      filterParam: r.partCode,
    }));

  if (matchedRoutings.length > 0) {
    groups.push({
      type: 'routing',
      labelFa: `مسیرهای ساخت (${matchedRoutings.length})`,
      count: matchedRoutings.length,
      items: matchedRoutings,
    });
  }

  // 11. Warehouses (انبارها)
  const matchedWarehouses: GlobalSearchHit[] = WAREHOUSE_ITEMS
    .filter(w => matchesTokens(w.code) || matchesTokens(w.name))
    .slice(0, 4)
    .map(w => ({
      id: w.code,
      type: 'warehouse',
      title: `${w.name} (${w.code})`,
      subtitle: `نوع انبار: ${w.type} • مدیریت فیزیکی کارخانه`,
      code: w.code,
      badge: 'انبار فعال',
      badgeColor: 'slate',
      targetTab: 'inventory',
      targetSubTab: 'DASHBOARD',
      filterParam: w.code,
    }));

  if (matchedWarehouses.length > 0) {
    groups.push({
      type: 'warehouse',
      labelFa: `انبارها (${matchedWarehouses.length})`,
      count: matchedWarehouses.length,
      items: matchedWarehouses,
    });
  }

  const totalHits = groups.reduce((acc, g) => acc + g.items.length, 0);

  return {
    query: q,
    totalHits,
    groups,
  };
}
