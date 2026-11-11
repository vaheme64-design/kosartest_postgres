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

// Runtime store for VIP parts (قطعات کلیدی)
export const serverVipPartsStore: Record<string, boolean> = {
  'PRT-ECU-BRK-01': true,
  'SAPCO-ASY-ECU-BRK-01': true,
  'PRT-PEDAL-01': true,
  'SAPCO-998120': true,
  'RM-COIL-DC04-08': true,
};

/**
 * Format a Jalali date string for display
 */
function getJalaliNowString(): string {
  const d = new Date();
  const jy = d.getFullYear() - 621;
  const jm = String(d.getMonth() + 1).padStart(2, '0');
  const jd = String(d.getDate()).padStart(2, '0');
  const jh = String(d.getHours()).padStart(2, '0');
  const jmin = String(d.getMinutes()).padStart(2, '0');
  return `${jy}/${jm}/${jd} ${jh}:${jmin}`;
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
  const boms = INITIAL_ADVANCED_BOMS;
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
    const part = parts.find(p => p.id === partId);
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
      // Use multi-layer advanced BOM components
      bom.components.forEach(cmp => {
        const componentQty = netQty * cmp.quantityPerAssembly;
        const scrapFactor = 1 + ((cmp.scrapAllowancePercent || 0) / 100);
        const grossWeightKg = Math.round(componentQty * (cmp.grossWeightKg || 0.1) * scrapFactor * 10) / 10;

        // Determine material key and attributes
        let materialKey = cmp.componentPartCode;
        let grade = 'ST14';
        let thickness = 1.0;
        let width = 1250;

        if (cmp.componentType === 'RAW_SHEET') {
          if (cmp.componentPartName.includes('DC04')) grade = 'DC04';
          else if (cmp.componentPartName.includes('ST14')) grade = 'ST14';
          else if (cmp.componentPartName.includes('DX51')) grade = 'DX51D';
          else if (cmp.componentPartName.includes('ST37')) grade = 'ST37';

          if (cmp.componentPartName.includes('0.8')) thickness = 0.8;
          else if (cmp.componentPartName.includes('1.0')) thickness = 1.0;
          else if (cmp.componentPartName.includes('1.2')) thickness = 1.2;
          else if (cmp.componentPartName.includes('1.5')) thickness = 1.5;
          else if (cmp.componentPartName.includes('2.0')) thickness = 2.0;

          materialKey = `RAW-COIL-${grade}-${thickness.toFixed(1)}`;
        }

        const existing = rawMap.get(materialKey) || {
          materialCode: materialKey,
          materialName: cmp.componentPartName,
          grade,
          thicknessMm: thickness,
          widthMm: width,
          unitCode: cmp.unit === 'KG' || cmp.componentType === 'RAW_SHEET' ? 'KG' : 'PCS',
          totalQuantity: 0,
          totalWeightKg: 0,
          demandedByParts: [],
        };

        existing.totalQuantity += componentQty;
        existing.totalWeightKg += grossWeightKg;
        existing.demandedByParts.push({
          partId: pRow.partId,
          partCode: pRow.partCode,
          partName: pRow.partName,
          requiredQuantity: componentQty,
          weightKg: grossWeightKg,
        });

        rawMap.set(materialKey, existing);
      });
    } else {
      // Standard single-material explosion based on part weight and grade
      const grade = partObj?.materialGrade || 'ST14';
      const thickness = partObj?.thicknessMm || 1.2;
      const unitWeight = partObj?.weightPerUnitKg || 1.5;
      const materialKey = `RAW-COIL-${grade}-${thickness.toFixed(1)}`;
      const totalWeightKg = Math.round(netQty * unitWeight * 1.15 * 10) / 10; // 15% standard stamping scrap norm

      const existing = rawMap.get(materialKey) || {
        materialCode: materialKey,
        materialName: `کویل ورق روغنی / گالوانیزه ${grade} ضخامت ${thickness}mm`,
        grade,
        thicknessMm: thickness,
        widthMm: 1250,
        unitCode: 'KG',
        totalQuantity: totalWeightKg,
        totalWeightKg,
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

  // Ensure default automotive materials are visible even if demand is small
  const defaultMaterialKeys = [
    { key: 'RAW-COIL-DC04-0.8', name: 'کویل ورق روغنی کشش عمیق DC04 ضخامت 0.8mm ساپکو', grade: 'DC04', thk: 0.8 },
    { key: 'RAW-COIL-ST14-1.2', name: 'کویل ورق سرد فرم‌دهی ST14 ضخامت 1.2mm ساپکو', grade: 'ST14', thk: 1.2 },
    { key: 'RAW-COIL-DX51D-1.5', name: 'کویل ورق گالوانیزه ضدخوردگی DX51D ضخامت 1.5mm', grade: 'DX51D', thk: 1.5 },
    { key: 'FST-NUT-WELD-M8', name: 'مهره جوشی چهارگوش پایه‌دار M8 DIN 928', grade: 'STEEL-8', thk: 0, unit: 'PCS' },
  ];

  defaultMaterialKeys.forEach(dm => {
    if (!rawMap.has(dm.key)) {
      rawMap.set(dm.key, {
        materialCode: dm.key,
        materialName: dm.name,
        grade: dm.grade,
        thicknessMm: dm.thk,
        widthMm: 1250,
        unitCode: dm.unit || 'KG',
        totalQuantity: 0,
        totalWeightKg: 0,
        demandedByParts: [],
      });
    }
  });

  // 4. Netting against On-Hand Stock, Consignment, Quarantined & Contracts
  const materialRows: MrpMaterialRow[] = [];

  rawMap.forEach((req, matKey) => {
    // 4.1. Match physical coils on factory floor
    const matchingCoilsList = coils.filter(c => {
      const matchGrade = c.materialGrade.toLowerCase().includes(req.grade.toLowerCase()) ||
        req.grade.toLowerCase().includes(c.materialGrade.toLowerCase());
      const matchThk = Math.abs(c.thicknessMm - req.thicknessMm) < 0.15;
      return matchGrade && matchThk;
    });

    // Stock quantities from coils
    let onHandConsignment = 0;
    let onHandOwned = 0;
    let onHandQuarantined = 0;

    matchingCoilsList.forEach(c => {
      const remainingKg = Math.max(0, c.receivedWeightKg - c.consumedWeightKg);
      if (c.status === 'DEPLETED') {
        // depleted coil has no remaining usable weight
      } else {
        // Coils received through Sapco delivery are consignment, otherwise factory owned
        if (c.partCode.includes('FAC') || c.receiptNumber.includes('FAC')) {
          onHandOwned += remainingKg;
        } else {
          onHandConsignment += remainingKg;
        }
      }
    });

    // Also check raw stock balances from warehouse ledger if coils table didn't capture all
    const ledgerRaw = balances.filter(b => {
      if (b.warehouseId !== 'WH-RAW') return false;
      const matchGrade = (b.materialGrade && req.grade && b.materialGrade.includes(req.grade)) ||
        (b.partCode && b.partCode.includes(req.grade));
      return matchGrade;
    });

    if (matchingCoilsList.length === 0 && ledgerRaw.length > 0) {
      ledgerRaw.forEach(lr => {
        onHandConsignment += lr.supplierOwnedQty || 0;
        onHandOwned += lr.ownedQty || 0;
        onHandQuarantined += lr.qualityBlockedQty || 0;
      });
    } else if (ledgerRaw.length > 0) {
      // Even when coils match, capture any qualityBlockedQty from ledger balances
      ledgerRaw.forEach(lr => {
        onHandQuarantined += lr.qualityBlockedQty || 0;
      });
    }

    // Also include any active QC Hold overrides placed by user in Inventory / Coils
    Object.values(serverQcHoldStore).forEach(hold => {
      if (!hold.isHeld) return;
      const gradeMatch =
        hold.materialGrade &&
        req.grade &&
        (hold.materialGrade.toLowerCase().includes(req.grade.toLowerCase()) ||
          req.grade.toLowerCase().includes(hold.materialGrade.toLowerCase()));
      const codeMatch =
        hold.partCode &&
        (hold.partCode === req.materialCode ||
          (req.grade && hold.partCode.toLowerCase().includes(req.grade.toLowerCase())));
      if (gradeMatch || codeMatch) {
        onHandQuarantined += Number(hold.heldWeightKg || hold.heldQty || 0);
      }
    });

    // Active Reservations for this material grade / code
    const activeRes = activeReservationsStore.filter(r => {
      if (r.status !== 'ACTIVE') return false;
      return r.partCode.includes(req.grade) || r.partName.includes(req.grade);
    });
    const reservedActive = activeRes.reduce((sum, r) => sum + r.quantityKg, 0);

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
      materialId: `MAT-${matKey}`,
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
