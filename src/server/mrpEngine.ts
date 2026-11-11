/**
 * KPIMS - Phase 8 & 9: Material Requirements Planning (MRP) Engine
 * موتور محاسبه پیش‌بینی نیازمندی مواد و کلاف‌ها، موازنه تأمین ساپکو و بررسی پیش از حواله
 */

import {
  MrpMaterialRow,
  MrpPartRow,
  MrpRunResult,
  MrpSimulationParams,
  MoMaterialCheckResult,
  MoMaterialCheckLine,
  MrpMatchingCoilInfo,
  MrpContractCoverage,
  MrpMaterialDemandSource,
} from '../types/mrp';
import { INITIAL_PARTS, INITIAL_SAPCO_COILS, INITIAL_ROUTINGS } from './sampleData';
import { customerOrdersStore } from './productionPlanningEngine';
import { manufacturingOrdersStore } from './productionWipEngine';
import { INITIAL_ADVANCED_BOMS } from './bomAndParallelEngine';
import { INITIAL_SAPCO_CONTRACTS, INITIAL_INVENTORY_RESERVATIONS, INITIAL_INVENTORY_DOCUMENTS } from './inventorySampleData';
import { calculateDetailedStockBalances } from './inventoryEngine';
import { InventoryReservation } from '../types/inventory';
import { toPersianDigits } from '../utils/formatters';
import { formatToJalali } from '../utils/jalali';
import { getAllBoms } from './bomAndParallelEngine';

// Runtime store for active inventory reservations (allows auto-reserving via Pre-Issue Check)
export const activeReservationsStore: InventoryReservation[] = JSON.parse(
  JSON.stringify(INITIAL_INVENTORY_RESERVATIONS)
);

// Runtime store for QC Hold (قرنطینه کیفی) overrides synced from Inventory & Coils
export interface ServerQcHoldOverride {
  key: string;
  partId?: string;
  partCode?: string;
  materialGrade?: string;
  lotNumber?: string;
  isHeld: boolean;
  heldQty: number;
  heldWeightKg: number;
  reasonFa: string;
  updatedAt: string;
}

export const serverQcHoldStore: Record<string, ServerQcHoldOverride> = {};

// Runtime store for VIP parts (قطعات کلیدی - فقط مجموعه براکت ضدسرقت رایانه موتور)
export const serverVipPartsStore: Record<string, boolean> = {
  'PRT-FGD-ECU-BRK': true,
  'SAPCO-ASY-ECU-BRK-01': true,
};

/**
 * Format a Jalali date string for display using accurate astronomical conversion
 */
function getJalaliNowString(): string {
  return formatToJalali(new Date(), { includeTime: true });
}

/**
 * Run a full MRP calculation across open demand exploded through BOMs
 */
export function runFullMrp(options?: {
  partIds?: string[];
  horizonDays?: number;
  demandGrowthPercent?: number;
  includeWip?: boolean;
  includeConsignment?: boolean;
}): MrpRunResult {
  const parts = INITIAL_PARTS;
  const orders = customerOrdersStore;
  const boms = getAllBoms();
  const routings = INITIAL_ROUTINGS;
  const coils = INITIAL_SAPCO_COILS;
  const contracts = INITIAL_SAPCO_CONTRACTS;
  const mos = manufacturingOrdersStore;

  const demandGrowthMultiplier = 1 + (Math.max(0, options?.demandGrowthPercent || 0) / 100);
  const includeWip = options?.includeWip ?? true;
  const includeConsignment = options?.includeConsignment ?? true;

  // 1. Gather all open customer orders
  const openOrders = orders.filter(o => o.status === 'OPEN' || o.status === 'PARTIALLY_FULFILLED');
  const grossDemandByPart = new Map<string, { totalDemand: number; orderCount: number }>();

  let totalOrderLines = 0;
  openOrders.forEach(o => {
    o.lines.forEach(line => {
      if (options?.partIds?.length && !options.partIds.includes(line.partId)) return;
      if (line.remainingQuantity <= 0) return;

      totalOrderLines++;
      const current = grossDemandByPart.get(line.partId) || { totalDemand: 0, orderCount: 0 };
      current.totalDemand += Math.round(line.remainingQuantity * demandGrowthMultiplier);
      current.orderCount += 1;
      grossDemandByPart.set(line.partId, current);
    });
  });

  // Calculate stock balances
  const balances = calculateDetailedStockBalances(
    INITIAL_INVENTORY_DOCUMENTS,
    activeReservationsStore,
    parts
  ).balances;

  // 2. Netting at Part Level (FG stock, FG reservations, WIP, Active MOs)
  const partRows: MrpPartRow[] = [];
  const partNetRequirementsMap = new Map<string, number>();

  grossDemandByPart.forEach((demand, partId) => {
    const part = parts.find(p => p.id === partId || p.code === partId);
    if (!part) return;

    // FG on-hand stock
    const fgRecords = balances.filter(b => b.partId === part.id && b.warehouseId === 'WH-FINISHED');
    const fgPhysical = fgRecords.reduce((sum, b) => sum + b.physicalQty, 0);
    const fgBlocked = fgRecords.reduce((sum, b) => sum + b.qualityBlockedQty, 0);

    const fgBlockedFromStore = Object.values(serverQcHoldStore)
      .filter(h => h.isHeld && (h.partId === part.id || h.partCode === part.code))
      .reduce((sum, h) => sum + (h.heldQty || 0), 0);
    const effectiveFgBlocked = fgBlocked + fgBlockedFromStore;

    // FG reservations
    const fgRes = activeReservationsStore.filter(
      r => r.partId === part.id && r.status === 'ACTIVE' && r.warehouseId === 'WH-FINISHED'
    );
    const coveredByFgReservations = fgRes.reduce((sum, r) => sum + r.quantity, 0);
    const coveredByFgStock = Math.max(0, fgPhysical - effectiveFgBlocked - coveredByFgReservations);

    // WIP across active operations
    let coveredByWip = 0;
    if (includeWip) {
      const partMos = mos.filter(
        m => (m.partId === part.id || m.partCode === part.code) && (m.status === 'IN_PROGRESS' || m.status === 'RELEASED')
      );
      partMos.forEach(m => {
        m.operations.forEach(op => {
          coveredByWip += (op.waitingInputQty || 0) + (op.inProgressQty || 0) + (op.readyForTransferQty || 0);
        });
      });
    }

    // Active MOs target quantities not yet in finished stock
    const activeMosForPart = mos.filter(
      m => (m.partId === part.id || m.partCode === part.code) && m.status === 'PLANNED'
    );
    const coveredByActiveMos = activeMosForPart.reduce((sum, m) => sum + m.targetQuantity, 0);

    // Net requirement for manufacturing this finished part
    const netReq = Math.max(0, demand.totalDemand - coveredByFgStock - coveredByWip - coveredByActiveMos);
    partNetRequirementsMap.set(part.id, netReq);

    const hasBom = boms.some(b => b.assemblyPartId === part.id || b.assemblyPartCode === part.code);
    const hasRouting = routings.some(r => r.partId === part.id || r.partCode === part.code);
    const isVIP = Boolean(
      part.isVIP ||
      part.isPinned ||
      serverVipPartsStore[part.id] ||
      serverVipPartsStore[part.code]
    );

    partRows.push({
      partId: part.id,
      partCode: part.code,
      partName: part.name,
      carModel: part.carModel,
      isVIP,
      grossDemand: demand.totalDemand,
      coveredByFgStock,
      coveredByFgReservations,
      coveredByWip,
      coveredByActiveMos,
      netRequirement: netReq,
      hasBom,
      hasRouting,
      missingInfo: [
        ...(!hasBom ? ['عدم ثبت درخت BOM تفصیلی'] : []),
        ...(!hasRouting ? ['عدم ثبت مسیر تولید مصوب'] : []),
      ],
    });
  });

  // Sort partRows: VIP parts with net requirement first, then by netRequirement descending
  partRows.sort((a, b) => {
    if (Boolean(a.isVIP) !== Boolean(b.isVIP)) return a.isVIP ? -1 : 1;
    return b.netRequirement - a.netRequirement;
  });

  // 3. Explode Net Demand through BOM into Raw Materials, Coils & Hardware
  interface RawRequirementAccumulator {
    materialCode: string;
    materialName: string;
    grade: string;
    thicknessMm: number;
    widthMm: number;
    unitCode: string;
    totalQuantity: number;
    totalWeightKg: number;
    demandedByParts: MrpMaterialDemandSource[];
  }

  const rawMap = new Map<string, RawRequirementAccumulator>();

  partRows.forEach(pRow => {
    const netQty = pRow.netRequirement;
    if (netQty <= 0) return;

    const bom = boms.find(b => b.assemblyPartId === pRow.partId || b.assemblyPartCode === pRow.partCode);
    const partObj = parts.find(p => p.id === pRow.partId);

    if (bom && bom.components.length > 0) {
      // Explode multi-layer advanced BOM components
      bom.components.forEach(cmp => {
        const componentQty = netQty * cmp.quantityPerAssembly;
        const scrapFactor = 1 + ((cmp.scrapAllowancePercent || 0) / 100);
        const grossWeightKg = Math.round(componentQty * (cmp.grossWeightKg || 0.1) * scrapFactor * 10) / 10;

        let materialKey = cmp.componentPartCode;
        let materialName = cmp.componentPartName;
        let grade = 'DC01A';
        let thickness = 2.0;
        let width = 1140;

        if (cmp.componentType === 'RAW_SHEET') {
          materialKey = 'RM-COIL-DC01A-2.0-1140';
          materialName = 'رول ورق روغنی DC01A ضخامت 2mm با عرض 1140mm (ابعاد ۲×۱۱۴۰)';
          grade = 'DC01A';
          thickness = 2.0;
          width = 1140;
        } else if (cmp.componentPartCode === 'FST-NUT-WELD-M6') {
          grade = 'FST-NUT-M6';
          thickness = 0;
          width = 0;
        } else if (cmp.componentPartCode === 'FST-BOLT-WELD-M6-20') {
          grade = 'FST-BOLT-M6';
          thickness = 0;
          width = 0;
        }

        const existing = rawMap.get(materialKey) || {
          materialCode: materialKey,
          materialName,
          grade,
          thicknessMm: thickness,
          widthMm: width,
          unitCode: cmp.unit === 'KG' || cmp.componentType === 'RAW_SHEET' ? 'KG' : 'PCS',
          totalQuantity: 0,
          totalWeightKg: 0,
          demandedByParts: [],
        };

        existing.totalQuantity += cmp.componentType === 'RAW_SHEET' ? grossWeightKg : componentQty;
        existing.totalWeightKg += grossWeightKg;
        existing.demandedByParts.push({
          partId: pRow.partId,
          partCode: pRow.partCode,
          partName: `${pRow.partName} (${cmp.componentPartName})`,
          requiredQuantity: componentQty,
          weightKg: grossWeightKg,
        });

        rawMap.set(materialKey, existing);
      });
    } else {
      const grade = partObj?.materialGrade || 'DC01A';
      const thickness = partObj?.thicknessMm || 2.0;
      const unitWeight = partObj?.weightPerUnitKg || 1.25;
      const materialKey = 'RM-COIL-DC01A-2.0-1140';
      const totalWeightKg = Math.round(netQty * unitWeight * 1.15 * 10) / 10;

      const existing = rawMap.get(materialKey) || {
        materialCode: materialKey,
        materialName: `رول ورق روغنی ${grade} ضخامت ${thickness}mm عرض ۱۱۴۰`,
        grade,
        thicknessMm: thickness,
        widthMm: 1140,
        unitCode: 'KG',
        totalQuantity: 0,
        totalWeightKg: 0,
        demandedByParts: [],
      };

      existing.totalQuantity += totalWeightKg;
      existing.totalWeightKg += totalWeightKg;
      existing.demandedByParts.push({
        partId: pRow.partId,
        partCode: pRow.partCode,
        partName: pRow.partName,
        requiredQuantity: netQty,
        weightKg: totalWeightKg,
      });

      rawMap.set(materialKey, existing);
    }
  });

  // Ensure the 4 raw materials & fasteners of the Anti-Theft ECU Bracket are always visible
  const defaultMaterialKeys = [
    { key: 'RM-COIL-DC01A-2.0-1140', name: 'رول ورق روغنی DC01A ضخامت 2mm با عرض 1140mm (ابعاد ۲×۱۱۴۰)', grade: 'DC01A', thk: 2.0, width: 1140, unit: 'KG' },
    { key: 'RM-SHT-DC01A-2.0-1000', name: 'ورق شیت روغنی DC01A ضخامت 2mm ابعاد ۲×۱۰۰۰ (ورق آلترناتیو)', grade: 'DC01A', thk: 2.0, width: 1000, unit: 'KG' },
    { key: 'FST-NUT-WELD-M6', name: 'مهره جوشی چهارگوش پایه‌دار M6 استاندارد DIN 928 (۱۵ عدد در هر براکت)', grade: 'FST-NUT-M6', thk: 0, width: 0, unit: 'PCS' },
    { key: 'FST-BOLT-WELD-M6-20', name: 'پیچ پایه جوشی مقاومتی M6x20 استاندارد خودرویی (۲ عدد در هر مکمل)', grade: 'FST-BOLT-M6', thk: 0, width: 0, unit: 'PCS' },
  ];

  defaultMaterialKeys.forEach(dm => {
    if (!rawMap.has(dm.key)) {
      rawMap.set(dm.key, {
        materialCode: dm.key,
        materialName: dm.name,
        grade: dm.grade,
        thicknessMm: dm.thk,
        widthMm: dm.width,
        unitCode: dm.unit,
        totalQuantity: 0,
        totalWeightKg: 0,
        demandedByParts: [],
      });
    }
  });

  // 4. Netting against On-Hand Stock, Consignment, Quarantined & Contracts
  const materialRows: MrpMaterialRow[] = [];

  rawMap.forEach((req) => {
    // 4.1. Match physical coils on factory floor by exact partCode or grade+width
    const matchingCoilsList = coils.filter(c => {
      if (c.partCode === req.materialCode) return true;
      if (req.unitCode !== 'KG') return false;
      const matchGrade = c.materialGrade.toLowerCase().includes(req.grade.toLowerCase());
      const matchWidth = !req.widthMm || c.widthMm === req.widthMm;
      return matchGrade && matchWidth;
    });

    let onHandConsignment = 0;
    let onHandOwned = 0;
    let onHandQuarantined = 0;

    matchingCoilsList.forEach(c => {
      const remainingKg = Math.max(0, c.receivedWeightKg - c.consumedWeightKg);
      if (c.status !== 'DEPLETED') {
        if (c.partCode.includes('ALT') || c.coilNumber.includes('ALT')) {
          onHandOwned += remainingKg;
        } else {
          onHandConsignment += remainingKg;
        }
      }
    });

    // Also check raw stock balances from warehouse ledger (especially for fasteners M6 nut & M6x20 bolt)
    const ledgerRaw = balances.filter(b => {
      if (b.warehouseId !== 'WH-RAW') return false;
      return b.partCode === req.materialCode;
    });

    if (matchingCoilsList.length === 0 && ledgerRaw.length > 0) {
      ledgerRaw.forEach(lr => {
        onHandConsignment += lr.supplierOwnedQty || 0;
        onHandOwned += lr.ownedQty || 0;
        onHandQuarantined += lr.qualityBlockedQty || 0;
      });
    } else if (ledgerRaw.length > 0) {
      ledgerRaw.forEach(lr => {
        onHandQuarantined += lr.qualityBlockedQty || 0;
      });
    }

    // Include any active QC Hold overrides placed by user
    Object.values(serverQcHoldStore).forEach(hold => {
      if (!hold.isHeld) return;
      const codeMatch = hold.partCode === req.materialCode;
      if (codeMatch) {
        onHandQuarantined += Number(hold.heldWeightKg || hold.heldQty || 0);
      }
    });

    // Active Reservations for this material code
    const activeRes = activeReservationsStore.filter(r => {
      if (r.status !== 'ACTIVE') return false;
      return r.partCode === req.materialCode;
    });
    const reservedActive = activeRes.reduce((sum, r) => sum + (req.unitCode === 'KG' ? r.quantityKg : r.quantity), 0);

    // Effective usable stock (ATP): (Owned + Consignment) - Reserved - Quarantined (QC Hold)
    const effectiveStock = includeConsignment ? (onHandOwned + onHandConsignment) : onHandOwned;
    const netAvailable = Math.max(0, effectiveStock - reservedActive - onHandQuarantined);

    // 4.2. Open Contracts with SAPCO / Suppliers
    const matchingContracts = contracts.filter(c => {
      if (c.status !== 'ACTIVE') return false;
      const matchGrade = c.materialGrade && (
        c.materialGrade.includes(req.grade) || req.grade.includes(c.materialGrade)
      );
      return matchGrade;
    });

    let openContractQuantity = 0;
    const contractInfo: MrpContractCoverage[] = [];

    matchingContracts.forEach(c => {
      const lines = c.commercialLines || [];
      const lineMatch = lines.find(l => l.partCode.includes(req.grade) || l.partName.includes(req.grade));
      const remainingKg = lineMatch ? lineMatch.remainingKg : (c.allocatedWeightKg - c.totalReceivedKg);
      if (remainingKg > 0) {
        openContractQuantity += remainingKg;
        contractInfo.push({
          contractNumber: c.contractNumber,
          supplierName: c.customerName || 'شرکت ساپکو (تأمین قطعات ایران‌خودرو)',
          allocatedQuotaKg: c.allocatedWeightKg,
          remainingKg,
          expectedDeliveryDate: c.endDate ? c.endDate.slice(0, 10) : 'در حال تحویل',
        });
      }
    });

    // Shortage calculations
    const requiredWeightKg = req.totalWeightKg;
    const shortageQuantity = Math.max(0, Math.round((requiredWeightKg - netAvailable) * 10) / 10);
    const coveredByContract = Math.min(shortageQuantity, openContractQuantity);
    const hardShortageQuantity = Math.max(0, Math.round((shortageQuantity - coveredByContract) * 10) / 10);

    let severity: 'OK' | 'SHORTAGE_COVERED_BY_CONTRACT' | 'HARD_SHORTAGE' = 'OK';
    if (shortageQuantity > 0) {
      severity = hardShortageQuantity === 0 ? 'SHORTAGE_COVERED_BY_CONTRACT' : 'HARD_SHORTAGE';
    }

    const matchingCoilInfos: MrpMatchingCoilInfo[] = matchingCoilsList.map(c => ({
      coilId: c.id,
      coilNumber: c.coilNumber,
      materialCode: c.partCode,
      materialGrade: c.materialGrade,
      thicknessMm: c.thicknessMm,
      remainingWeightKg: Math.max(0, c.receivedWeightKg - c.consumedWeightKg),
      ownership: c.partCode.includes('FAC') ? 'FACTORY_OWNED' : 'SAPCO_CONSIGNMENT',
      warehouseLocation: 'انبار مرکزی رول ساپکو (LOC-RAW-A)',
      status: c.consumedWeightKg > 0 ? 'PARTIAL' : 'FULL',
    }));

    materialRows.push({
      materialId: `MAT-${req.materialCode}`,
      materialCode: req.materialCode,
      materialName: req.materialName,
      materialGrade: req.grade,
      thicknessMm: req.thicknessMm,
      widthMm: req.widthMm,
      unitCode: req.unitCode,
      requiredQuantity: req.totalQuantity,
      requiredWeightKg,
      onHandOwned,
      onHandConsignment,
      onHandQuarantined,
      reservedActive,
      netAvailable,
      openContractQuantity,
      shortageQuantity,
      coveredByContract,
      hardShortageQuantity,
      severity,
      demandedByParts: req.demandedByParts,
      contractInfo,
      matchingCoils: matchingCoilInfos,
    });
  });

  // Sort: hard shortages first, then contract-covered, then OK
  materialRows.sort((a, b) => {
    const sevScore = { HARD_SHORTAGE: 3, SHORTAGE_COVERED_BY_CONTRACT: 2, OK: 1 };
    return sevScore[b.severity] - sevScore[a.severity] || b.shortageQuantity - a.shortageQuantity;
  });

  // Calculate high-level summary
  const okCount = materialRows.filter(m => m.severity === 'OK').length;
  const contractCoveredCount = materialRows.filter(m => m.severity === 'SHORTAGE_COVERED_BY_CONTRACT').length;
  const hardShortagesCount = materialRows.filter(m => m.severity === 'HARD_SHORTAGE').length;
  const totalGrossWeightKg = materialRows.reduce((sum, m) => sum + m.requiredWeightKg, 0);
  const totalShortageWeightKg = materialRows.reduce((sum, m) => sum + m.hardShortageQuantity, 0);
  const totalFinishedGoodsDemandPieces = partRows.reduce((sum, p) => sum + p.grossDemand, 0);
  const totalNetProductionPieces = partRows.reduce((sum, p) => sum + p.netRequirement, 0);

  const notes: string[] = [
    'محاسبه نیازمندی بر اساس سفارشات قطعی ثبت‌شده و انفجار چندسطحی درخت محصول (BOM) انجام شده است.',
    'موجودی امانی ساپکو در کنار موجودی ملکی کارخانه تفکیک شده و کلاف‌های قرنطینه از چرخه تخصیص حذف گردیده‌اند.',
    'برای پوشش کسری‌های قطعی، لازم است با ساپکو جهت تسریع حواله بارگیری کلاف هماهنگی به عمل آید.',
  ];

  return {
    ranAt: new Date().toISOString(),
    ranAtFa: getJalaliNowString(),
    scope: {
      orderLinesCount: totalOrderLines,
      partsCount: partRows.length,
      withNetRequirementCount: partRows.filter(p => p.netRequirement > 0).length,
    },
    parts: partRows,
    materials: materialRows,
    summary: {
      materialsConsidered: materialRows.length,
      ok: okCount,
      contractCovered: contractCoveredCount,
      hardShortages: hardShortagesCount,
      totalGrossWeightKg: Math.round(totalGrossWeightKg * 10) / 10,
      totalShortageWeightKg: Math.round(totalShortageWeightKg * 10) / 10,
      totalFinishedGoodsDemandPieces,
      totalNetProductionPieces,
    },
    notes,
  };
}

/**
 * Pre-Issue Check: Verifies whether material for a specific Manufacturing Order is ready to issue
 */
export function checkMoMaterialAvailability(moId: string): MoMaterialCheckResult | null {
  const mo = manufacturingOrdersStore.find(m => m.id === moId || m.moNumber === moId);
  if (!mo) return null;

  const boms = INITIAL_ADVANCED_BOMS;
  const bom = boms.find(b => b.assemblyPartId === mo.partId || b.assemblyPartCode === mo.partCode);
  const coils = INITIAL_SAPCO_COILS;

  const lines: MoMaterialCheckLine[] = [];
  let allReady = true;

  if (bom && bom.components.length > 0) {
    bom.components.forEach(cmp => {
      const requiredQty = mo.targetQuantity * cmp.quantityPerAssembly;
      const requiredWeightKg = Math.round(requiredQty * (cmp.grossWeightKg || 0.1) * 10) / 10;
      const alreadyIssuedQuantity = Math.min(requiredQty, mo.initialInputQuantity);
      const remainingRequired = Math.max(0, requiredQty - alreadyIssuedQuantity);

      // On-hand stock in plant
      const matchingCoils = coils.filter(c => {
        const matchGrade = cmp.componentPartName.includes(c.materialGrade);
        return matchGrade && c.status !== 'DEPLETED';
      });
      const onHandApproved = matchingCoils.reduce((sum, c) => sum + Math.max(0, c.receivedWeightKg - c.consumedWeightKg), 0);

      // Check reservations
      const resForThisMo = activeReservationsStore
        .filter(r => r.reservedFor.includes(mo.moNumber) && r.status === 'ACTIVE')
        .reduce((sum, r) => sum + r.quantity, 0);

      const resForOthers = activeReservationsStore
        .filter(r => !r.reservedFor.includes(mo.moNumber) && r.status === 'ACTIVE')
        .reduce((sum, r) => sum + r.quantity, 0);

      const availableForThisMo = Math.max(0, onHandApproved - resForOthers);
      const shortageQuantity = Math.max(0, remainingRequired - resForThisMo - availableForThisMo);

      let status: 'NOT_REQUIRED' | 'READY' | 'SHORTAGE' = 'READY';
      if (remainingRequired <= 0) {
        status = 'NOT_REQUIRED';
      } else if (shortageQuantity > 0) {
        status = 'SHORTAGE';
        allReady = false;
      }

      lines.push({
        materialId: cmp.id,
        materialCode: cmp.componentPartCode,
        materialName: cmp.componentPartName,
        unitCode: cmp.unit,
        requiredQuantity: requiredQty,
        requiredWeightKg,
        alreadyIssuedQuantity,
        remainingRequired,
        onHandApproved,
        reservedForThisMo: resForThisMo,
        reservedForOthers: resForOthers,
        availableForThisMo,
        shortageQuantity,
        status,
        notes: [
          cmp.supplierSource === 'SAPCO_CONSIGNMENT' ? 'تأمین امانی ساپکو' : 'تأمین داخلی کارخانه',
          `اتصال در مرحله OP${cmp.stageJoinedStepNumber}`,
        ],
      });
    });
  } else {
    // Default sheet steel line for single-operation parts
    const requiredWeightKg = Math.round(mo.targetQuantity * 1.65 * 10) / 10;
    const remainingRequired = Math.max(0, requiredWeightKg - (mo.initialInputQuantity * 1.5));
    const matchingCoil = coils[0];
    const onHandApproved = matchingCoil ? Math.max(0, matchingCoil.receivedWeightKg - matchingCoil.consumedWeightKg) : 5000;
    const availableForThisMo = onHandApproved;
    const shortageQuantity = Math.max(0, remainingRequired - availableForThisMo);

    lines.push({
      materialId: 'MAT-DEFAULT-SHEET',
      materialCode: 'SAPCO-COIL-DC04-0.8',
      materialName: 'کویل ورق روغنی کشش عمیق DC04 ضخامت 0.8mm',
      materialGrade: 'DC04',
      thicknessMm: 0.8,
      unitCode: 'KG',
      requiredQuantity: requiredWeightKg,
      requiredWeightKg,
      alreadyIssuedQuantity: mo.initialInputQuantity,
      remainingRequired,
      onHandApproved,
      reservedForThisMo: 0,
      reservedForOthers: 0,
      availableForThisMo,
      shortageQuantity,
      status: shortageQuantity === 0 ? 'READY' : 'SHORTAGE',
      notes: ['کلاف تخصیص داده شده پای پرس نواربری'],
    });

    if (shortageQuantity > 0) allReady = false;
  }

  return {
    moId: mo.id,
    moNumber: mo.moNumber,
    moStatus: mo.status,
    partId: mo.partId,
    partCode: mo.partCode,
    partName: mo.partName,
    targetQuantity: mo.targetQuantity,
    lines,
    readyToIssue: allReady,
    notes: allReady
      ? ['کلیه اقلام درخت محصول در انبار موجود و آماده صدور حواله خروج به خط تولید می‌باشند.']
      : ['توجه: برخی از اقلام مواد یا قطعات پیچی دارای کسری موجودی آزاد هستند.'],
  };
}

/**
 * Auto-reserve materials for a specific MO from free available ATP
 */
export function autoReserveMoMaterials(moId: string): {
  moNumber: string;
  reserved: { created: boolean; materialCode: string; quantity: number; unitCode: string }[];
  shortages: { materialCode: string; shortage: number; unitCode: string }[];
} {
  const check = checkMoMaterialAvailability(moId);
  if (!check) throw new Error('دستور کار مورد نظر یافت نشد');

  const reserved: { created: boolean; materialCode: string; quantity: number; unitCode: string }[] = [];
  const shortages: { materialCode: string; shortage: number; unitCode: string }[] = [];

  check.lines.forEach((line, idx) => {
    if (line.status === 'NOT_REQUIRED') return;

    if (line.availableForThisMo > 0 && line.remainingRequired > line.reservedForThisMo) {
      const neededQty = line.remainingRequired - line.reservedForThisMo;
      const allocatable = Math.min(neededQty, line.availableForThisMo);

      // Create new inventory reservation record
      const resRecord: InventoryReservation = {
        id: `RES-${Date.now()}-${idx}`,
        reservationNumber: `RES-ATP-${toPersianDigits(Date.now().toString().slice(-4))}`,
        partId: line.materialId,
        partCode: line.materialCode,
        partName: line.materialName,
        warehouseId: 'WH-RAW',
        warehouseName: 'انبار مرکزی رول و ورق مواد اولیه',
        ownership: 'SAPCO_SUPPLIER_OWNED',
        reservedFor: `دستور کار شماره ${check.moNumber} (${check.partName})`,
        quantity: allocatable,
        quantityKg: line.unitCode === 'KG' ? allocatable : allocatable * 0.1,
        unit: line.unitCode as any,
        status: 'ACTIVE',
        validUntil: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      activeReservationsStore.push(resRecord);
      reserved.push({
        created: true,
        materialCode: line.materialCode,
        quantity: allocatable,
        unitCode: line.unitCode,
      });

      if (allocatable < neededQty) {
        shortages.push({
          materialCode: line.materialCode,
          shortage: neededQty - allocatable,
          unitCode: line.unitCode,
        });
      }
    } else if (line.status === 'SHORTAGE') {
      shortages.push({
        materialCode: line.materialCode,
        shortage: line.shortageQuantity,
        unitCode: line.unitCode,
      });
    }
  });

  return {
    moNumber: check.moNumber,
    reserved,
    shortages,
  };
}
