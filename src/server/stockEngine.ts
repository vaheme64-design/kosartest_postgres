import {
  InventoryTransaction,
  Part,
  StageInventorySummary,
  FACTORY_STAGES
} from '../types/inventory';

export interface InventoryCalculationResult {
  stageBalances: StageInventorySummary[];
  rawMaterialKg: number;
  totalWipPcs: number;
  totalWipKg: number;
  totalFinishedPcs: number;
  totalFinishedKg: number;
  totalScrapQty: number;
  totalScrapKg: number;
  overallScrapRate: number;
  partStockMap: Record<string, { totalQty: number; totalKg: number; unit: string; byStage: Record<string, number> }>;
}

/**
 * Pure server-side ledger calculation engine
 * Calculates balances strictly from the immutable chronological transactions
 */
export function calculateInventoryLedger(
  transactions: InventoryTransaction[],
  parts: Part[]
): InventoryCalculationResult {
  const partsMap = new Map<string, Part>();
  parts.forEach(p => partsMap.set(p.id, p));

  // Mapping: key = `${stageId}:::${partId}` -> balance object
  const stageMap = new Map<string, {
    stageId: string;
    partId: string;
    totalQty: number;
    reservedQty: number;
    inTransitQty: number;
    scrapQty: number;
    productionQty: number;
    lastActivityDate?: string;
  }>();

  const getStageEntry = (stageId: string, partId: string) => {
    const key = `${stageId}:::${partId}`;
    if (!stageMap.has(key)) {
      stageMap.set(key, {
        stageId,
        partId,
        totalQty: 0,
        reservedQty: 0,
        inTransitQty: 0,
        scrapQty: 0,
        productionQty: 0,
      });
    }
    return stageMap.get(key)!;
  };

  // Sort transactions chronologically
  const validTx = transactions
    .filter(t => t.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const tx of validTx) {
    const { voucherType, stageId, targetStageId, partId, quantity, createdAt } = tx;
    const entry = getStageEntry(stageId, partId);
    entry.lastActivityDate = createdAt;

    switch (voucherType) {
      case 'OPENING_BALANCE':
      case 'RECEIPT':
        // Direct addition to the stage
        entry.totalQty += quantity;
        break;

      case 'ISSUE':
      case 'CUSTOMER_DELIVERY':
        // Issuance from store to factory or outbound delivery to customer
        entry.totalQty -= quantity;
        break;

      case 'PRODUCTION_OUTPUT':
        // Good parts output in this stage
        entry.totalQty += quantity;
        entry.productionQty += quantity;
        break;

      case 'SCRAP':
        // Scrap removed from this stage
        entry.totalQty -= quantity;
        entry.scrapQty += quantity;
        break;

      case 'WIP_TRANSFER_DISPATCH':
        // Source stage: quantity moves from usable to in-transit
        // It leaves stage totalQty, and is added to inTransit on target stage
        entry.totalQty -= quantity;
        if (targetStageId) {
          const targetEntry = getStageEntry(targetStageId, partId);
          targetEntry.inTransitQty += quantity;
          targetEntry.lastActivityDate = createdAt;
        }
        break;

      case 'WIP_TRANSFER_RECEIPT':
        // Destination stage confirms receipt: clears inTransit and enters totalQty
        entry.totalQty += quantity;
        entry.inTransitQty = Math.max(0, entry.inTransitQty - quantity);
        break;

      case 'ADJUSTMENT':
        // Inventory adjustment (+ or -)
        entry.totalQty += quantity;
        break;

      default:
        break;
    }
  }

  // Format StageInventorySummary records
  const stageBalances: StageInventorySummary[] = [];
  const partStockMap: Record<string, { totalQty: number; totalKg: number; unit: string; byStage: Record<string, number> }> = {};

  let rawMaterialKg = 0;
  let totalWipPcs = 0;
  let totalWipKg = 0;
  let totalFinishedPcs = 0;
  let totalFinishedKg = 0;
  let totalScrapQty = 0;
  let totalScrapKg = 0;
  let totalGoodOutputPcs = 0;

  for (const [, data] of stageMap.entries()) {
    const stageId = data.stageId;
    const partId = data.partId;
    const part = partsMap.get(partId);
    if (!part) continue;

    const stageConfig = FACTORY_STAGES.find(s => s.id === stageId);
    const stageName = stageConfig ? stageConfig.name : stageId;
    const weightPerUnit = part.weightPerUnitKg || 1;

    const usableQty = Math.max(0, data.totalQty - data.reservedQty);
    const weightKg = part.unit === 'KG' ? data.totalQty : Number((data.totalQty * weightPerUnit).toFixed(2));

    const scrapRate = data.productionQty + data.scrapQty > 0
      ? (data.scrapQty / (data.productionQty + data.scrapQty)) * 100
      : 0;

    stageBalances.push({
      stageId,
      stageName,
      partId,
      partCode: part.code,
      partName: part.name,
      unit: part.unit,
      totalQty: Math.round(data.totalQty * 100) / 100,
      reservedQty: Math.round(data.reservedQty * 100) / 100,
      inTransitQty: Math.round(data.inTransitQty * 100) / 100,
      usableQty: Math.round(usableQty * 100) / 100,
      totalKg: Math.round(weightKg * 100) / 100,
      scrapQty: Math.round(data.scrapQty * 100) / 100,
      scrapRatePercent: Number(scrapRate.toFixed(2)),
      lastActivityDate: data.lastActivityDate,
    });

    // Accumulate category summaries
    if (stageId === 'STAGE_RAW_STORE' || part.category === 'RAW_MATERIAL') {
      rawMaterialKg += weightKg;
    } else if (stageId === 'STAGE_FINISHED_STORE' || part.category === 'FINISHED_GOOD') {
      totalFinishedPcs += data.totalQty;
      totalFinishedKg += weightKg;
    } else {
      totalWipPcs += data.totalQty;
      totalWipKg += weightKg;
    }

    totalScrapQty += data.scrapQty;
    totalScrapKg += part.unit === 'KG' ? data.scrapQty : data.scrapQty * weightPerUnit;
    totalGoodOutputPcs += data.productionQty;

    // Build part stock map
    if (!partStockMap[partId]) {
      partStockMap[partId] = {
        totalQty: 0,
        totalKg: 0,
        unit: part.unit,
        byStage: {},
      };
    }
    partStockMap[partId].totalQty += data.totalQty;
    partStockMap[partId].totalKg += weightKg;
    partStockMap[partId].byStage[stageId] = (partStockMap[partId].byStage[stageId] || 0) + data.totalQty;
  }

  const overallScrapRate = totalGoodOutputPcs + totalScrapQty > 0
    ? Number(((totalScrapQty / (totalGoodOutputPcs + totalScrapQty)) * 100).toFixed(2))
    : 0;

  return {
    stageBalances,
    rawMaterialKg: Math.round(rawMaterialKg * 100) / 100,
    totalWipPcs: Math.round(totalWipPcs),
    totalWipKg: Math.round(totalWipKg * 100) / 100,
    totalFinishedPcs: Math.round(totalFinishedPcs),
    totalFinishedKg: Math.round(totalFinishedKg * 100) / 100,
    totalScrapQty: Math.round(totalScrapQty),
    totalScrapKg: Math.round(totalScrapKg * 100) / 100,
    overallScrapRate,
    partStockMap,
  };
}

export interface ValidationCheckResult {
  valid: boolean;
  errorMessage?: string;
  normalizedTransaction?: InventoryTransaction;
}

/**
 * Rigorous server-side business rules and negative inventory block
 */
export function validateAndPrepareTransaction(
  payload: Partial<InventoryTransaction>,
  existingTransactions: InventoryTransaction[],
  parts: Part[],
  user: { uid: string; displayName: string }
): ValidationCheckResult {
  if (!payload.voucherType) {
    return { valid: false, errorMessage: 'نوع سند مشخص نشده است.' };
  }

  if (!payload.partId) {
    return { valid: false, errorMessage: 'قطعه یا ماده اولیه انتخاب نشده است.' };
  }

  const part = parts.find(p => p.id === payload.partId);
  if (!part) {
    return { valid: false, errorMessage: `قطعه با شناسه ${payload.partId} در سیستم یافت نشد.` };
  }

  if (!payload.stageId) {
    return { valid: false, errorMessage: 'ایستگاه مبدا یا انبار مشخص نشده است.' };
  }

  const qty = Number(payload.quantity);
  if (isNaN(qty) || qty <= 0) {
    return { valid: false, errorMessage: 'مقدار تراکنش باید عددی مثبت و بزرگتر از صفر باشد.' };
  }

  // Duplicate voucher number prevention
  if (payload.voucherNumber) {
    const duplicate = existingTransactions.find(
      t => t.voucherNumber === payload.voucherNumber && t.status === 'CONFIRMED'
    );
    if (duplicate) {
      return {
        valid: false,
        errorMessage: `سند با شماره پیگیری «${payload.voucherNumber}» قبلاً در سیستم ثبت شده است. از ثبت تکراری جلوگیری شد.`,
      };
    }
  }

  // Check stage stock balance to prevent negative inventory
  const requiresStockDeduction = [
    'ISSUE',
    'CUSTOMER_DELIVERY',
    'SCRAP',
    'WIP_TRANSFER_DISPATCH',
  ].includes(payload.voucherType);

  if (requiresStockDeduction) {
    const currentStatus = calculateInventoryLedger(existingTransactions, parts);
    const stageEntry = currentStatus.stageBalances.find(
      sb => sb.stageId === payload.stageId && sb.partId === payload.partId
    );
    const availableQty = stageEntry ? stageEntry.usableQty : 0;

    if (qty > availableQty) {
      const stageName = FACTORY_STAGES.find(s => s.id === payload.stageId)?.name || payload.stageId;
      return {
        valid: false,
        errorMessage: `خطای کنترل موجودی: موجودی در دسترس در «${stageName}» برای قطعه «${part.name}» کافی نیست. موجودی قابل استفاده: ${availableQty} ${part.unit}، مقدار درخواستی: ${qty} ${part.unit}. جلوگیری از موجودی منفی.`,
      };
    }
  }

  // Check transfer destination
  if (payload.voucherType === 'WIP_TRANSFER_DISPATCH' && !payload.targetStageId) {
    return { valid: false, errorMessage: 'برای انتقال قطعه، مشخص کردن مرحله مقصد الزامی است.' };
  }

  if (payload.voucherType === 'WIP_TRANSFER_DISPATCH' && payload.stageId === payload.targetStageId) {
    return { valid: false, errorMessage: 'مرحله مبدا و مقصد انتقال نمی‌تواند یکسان باشد.' };
  }

  // Calculate equivalent weight in kg
  const weightPerUnit = part.weightPerUnitKg || 1;
  const quantityKg = part.unit === 'KG' ? qty : Number((qty * weightPerUnit).toFixed(3));

  // Auto-generate voucher number if not provided
  const voucherNum = payload.voucherNumber || generateVoucherNumber(payload.voucherType);

  const stageConfig = FACTORY_STAGES.find(s => s.id === payload.stageId);
  const targetConfig = payload.targetStageId ? FACTORY_STAGES.find(s => s.id === payload.targetStageId) : undefined;

  const normalized: InventoryTransaction = {
    id: payload.id || `TX-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    voucherNumber: voucherNum,
    voucherType: payload.voucherType,
    partId: part.id,
    partCode: part.code,
    partName: part.name,
    stageId: payload.stageId,
    stageName: stageConfig ? stageConfig.name : payload.stageId,
    targetStageId: payload.targetStageId,
    targetStageName: targetConfig ? targetConfig.name : payload.targetStageName,
    quantity: qty,
    unit: part.unit,
    quantityKg,
    referenceDoc: payload.referenceDoc || '',
    operatorName: payload.operatorName || user.displayName || 'اپراتور شیفت',
    machineId: payload.machineId,
    shift: payload.shift || 'MORNING',
    scrapReason: payload.scrapReason,
    status: 'CONFIRMED',
    notes: payload.notes || '',
    createdByUid: user.uid,
    createdByName: user.displayName,
    isDemo: payload.isDemo !== undefined ? payload.isDemo : true,
    createdAt: new Date().toISOString(),
  };

  return { valid: true, normalizedTransaction: normalized };
}

export function generateVoucherNumber(type: string): string {
  const prefixMap: Record<string, string> = {
    OPENING_BALANCE: 'OB',
    RECEIPT: 'RC',
    ISSUE: 'IS',
    CUSTOMER_DELIVERY: 'DLV',
    PRODUCTION_OUTPUT: 'PR',
    SCRAP: 'SC',
    WIP_TRANSFER_DISPATCH: 'TD',
    WIP_TRANSFER_RECEIPT: 'TR',
    ADJUSTMENT: 'AJ',
  };
  const prefix = prefixMap[type] || 'TX';
  const rand = Math.floor(1000 + Math.random() * 9000);
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${prefix}-${dateStr}-${rand}`;
}
