import { getPrismaClient } from './db/prisma';

export interface RelationalNetRequirement {
  partId: string;
  partCode: string;
  partName: string;
  materialId: string | null;
  materialCode: string | null;
  materialGrade: string | null;
  dueDate: string;
  customerOrderIds: string[];
  customerOrderNumbers: string[];
  grossDemandQty: number;
  physicalFinishedGoodsQty: number;
  reservedFinishedGoodsQty: number;
  availableFinishedGoodsQty: number;
  downstreamWipQty: number;
  netProductionRequirement: number;
  requiredMaterialKg: number;
  availableRawMaterialKg: number;
  materialShortageKg: number;
  hasMaterialShortage: boolean;
  route: Array<{
    stepNumber: number;
    stepCode: string;
    stepName: string;
    processType: string;
    requiredTonnage: number;
    setupTimeMin: number;
    standardCycleTimeSec: number;
    scrapNormPercent: number;
    assignedMachine: { id: string; code: string; name: string } | null;
    die: { id: string; code: string; name: string; tonnageRequired: number } | null;
  }>;
  dataWarnings: string[];
}

const n = (value: unknown): number => Number(value ?? 0);
const round1 = (value: number): number => Math.round(value * 10) / 10;

export async function getRelationalPlanningReadModel() {
  const prisma = getPrismaClient();
  const now = new Date();

  const [orders, finishedBalances, wipBalances, reservations, rawBalances, parts, machines, dies] = await Promise.all([
    prisma.customerOrder.findMany({
      where: { documentStatus: { in: ['CONFIRMED'] } },
      include: {
        customer: { select: { id: true, name: true } },
        orderLines: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: { part: { include: { material: true } } },
          orderBy: [{ requestedDate: 'asc' }, { lineNumber: 'asc' }],
        },
      },
      orderBy: [{ priority: 'asc' }, { requestedDeliveryDate: 'asc' }],
    }),
    prisma.stockBalance.findMany({
      where: {
        warehouse: { type: 'FINISHED_GOODS', active: true },
        qualityStatus: 'AVAILABLE',
        part: { active: true, category: 'FINISHED_GOOD' },
      },
      select: { partId: true, quantityOnHand: true, quantityReserved: true, quantityAvailable: true },
    }),
    prisma.stockBalance.findMany({
      where: {
        warehouse: { type: 'WIP', active: true },
        qualityStatus: 'AVAILABLE',
        part: { active: true },
      },
      select: { partId: true, quantityAvailable: true },
    }),
    prisma.inventoryReservation.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        warehouse: { type: 'FINISHED_GOODS', active: true },
      },
      select: { partId: true, quantity: true },
    }),
    prisma.stockBalance.findMany({
      where: {
        warehouse: { type: 'RAW_MATERIALS', active: true },
        qualityStatus: 'AVAILABLE',
        part: { active: true, category: 'RAW_MATERIAL' },
      },
      include: { part: { select: { materialId: true, material: { select: { id: true, code: true, grade: true } } } },
      },
    }),
    prisma.part.findMany({
      where: { active: true, category: 'FINISHED_GOOD' },
      include: {
        material: true,
        routes: {
          where: { status: 'ACTIVE', isDefault: true },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
          include: {
            operations: {
              orderBy: { stepNumber: 'asc' },
              include: {
                operation: true,
                machine: true,
                die: true,
              },
            },
          },
        },
      },
    }),
    prisma.machine.findMany({
      where: { active: true },
      include: { capabilities: { include: { operation: true } }, dieCompatibilities: true },
    }),
    prisma.die.findMany({
      where: { active: true, status: { in: ['READY', 'ON_MACHINE'] } },
      include: { machineCompatibilities: true },
    }),
  ]);

  const finishedByPart = new Map<string, number>();
  for (const row of finishedBalances) {
    finishedByPart.set(row.partId, (finishedByPart.get(row.partId) || 0) + n(row.quantityOnHand));
  }

  const wipByPart = new Map<string, number>();
  for (const row of wipBalances) {
    wipByPart.set(row.partId, (wipByPart.get(row.partId) || 0) + n(row.quantityAvailable));
  }

  const reservedByPart = new Map<string, number>();
  for (const row of reservations) {
    reservedByPart.set(row.partId, (reservedByPart.get(row.partId) || 0) + n(row.quantity));
  }

  const rawByMaterial = new Map<string, number>();
  for (const row of rawBalances) {
    const materialId = row.part.materialId;
    if (!materialId) continue;
    rawByMaterial.set(materialId, (rawByMaterial.get(materialId) || 0) + n(row.weightKgAvailable));
  }

  const partById = new Map<string, any>(parts.map((part: any) => [part.id, part] as [string, any]));
  const demand = new Map<string, {
    gross: number;
    dueDate: Date;
    orderIds: Set<string>;
    orderNumbers: Set<string>;
  }>();

  for (const order of orders) {
    for (const line of order.orderLines) {
      const remaining = Math.max(0, n(line.orderedQty) - n(line.deliveredQty));
      if (remaining <= 0 || !partById.has(line.partId)) continue;
      const current = demand.get(line.partId) || {
        gross: 0,
        dueDate: line.requestedDate,
        orderIds: new Set<string>(),
        orderNumbers: new Set<string>(),
      };
      current.gross += remaining;
      if (line.requestedDate < current.dueDate) current.dueDate = line.requestedDate;
      current.orderIds.add(order.id);
      current.orderNumbers.add(order.orderNumber);
      demand.set(line.partId, current);
    }
  }

  const requirements: RelationalNetRequirement[] = [];
  for (const [partId, info] of demand) {
    const part: any = partById.get(partId);
    const physicalFg = finishedByPart.get(partId) || 0;
    const reservedFg = reservedByPart.get(partId) || 0;
    const availableFg = Math.max(0, physicalFg - reservedFg);
    const wipQty = wipByPart.get(partId) || 0;
    const netQty = Math.max(0, info.gross - availableFg - wipQty);
    const routeRow = part.routes?.[0];
    const route = (routeRow?.operations || []).map((step: any) => ({
      stepNumber: step.stepNumber,
      stepCode: step.stepCode,
      stepName: step.stepName,
      processType: step.operation.processType,
      requiredTonnage: n(step.die?.tonnageRequired),
      setupTimeMin: step.setupTimeMin,
      standardCycleTimeSec: step.standardCycleTimeSec,
      scrapNormPercent: n(step.scrapNormPercent),
      assignedMachine: step.machine ? { id: step.machine.id, code: step.machine.code, name: step.machine.name } : null,
      die: step.die ? {
        id: step.die.id,
        code: step.die.code,
        name: step.die.name,
        tonnageRequired: n(step.die.tonnageRequired),
      } : null,
    }));
    const scrapPercent = route.reduce((sum: number, step: any) => sum + step.scrapNormPercent, 0);
    const requiredMaterialKg = round1(netQty * n(part.weightGrossKg) * (1 + scrapPercent / 100));
    const availableRawKg = part.materialId ? (rawByMaterial.get(part.materialId) || 0) : 0;
    const warnings: string[] = [];
    if (!route.length) warnings.push('برای این قطعه مسیر تولید فعال و پیش‌فرض تعریف نشده است.');
    if (!part.materialId) warnings.push('متریال اصلی قطعه در اطلاعات پایه مشخص نشده است.');
    if (n(part.weightGrossKg) <= 0 && netQty > 0) warnings.push('وزن ناخالص مهندسی قطعه صفر است؛ محاسبه نیاز ورق معتبر نیست.');
    requirements.push({
      partId,
      partCode: part.partNumber,
      partName: part.name,
      materialId: part.materialId || null,
      materialCode: part.material?.code || null,
      materialGrade: part.material?.grade || null,
      dueDate: info.dueDate.toISOString().slice(0, 10),
      customerOrderIds: [...info.orderIds],
      customerOrderNumbers: [...info.orderNumbers],
      grossDemandQty: round1(info.gross),
      physicalFinishedGoodsQty: round1(physicalFg),
      reservedFinishedGoodsQty: round1(reservedFg),
      availableFinishedGoodsQty: round1(availableFg),
      downstreamWipQty: round1(wipQty),
      netProductionRequirement: round1(netQty),
      requiredMaterialKg: part.materialId && n(part.weightGrossKg) > 0 ? requiredMaterialKg : 0,
      availableRawMaterialKg: round1(availableRawKg),
      materialShortageKg: part.materialId && n(part.weightGrossKg) > 0 ? round1(Math.max(0, requiredMaterialKg - availableRawKg)) : 0,
      hasMaterialShortage: Boolean(part.materialId && n(part.weightGrossKg) > 0 && requiredMaterialKg > availableRawKg),
      route,
      dataWarnings: warnings,
    });
  }

  return {
    source: 'postgresql',
    generatedAt: now.toISOString(),
    counts: {
      openOrders: orders.length,
      demandedParts: requirements.length,
      activeParts: parts.length,
      activeMachines: machines.length,
      availableDies: dies.length,
    },
    requirements,
    masterData: {
      machines: machines.map((machine: any) => ({
        id: machine.id,
        code: machine.code,
        name: machine.name,
        machineType: machine.machineType,
        tonnageCapacity: n(machine.tonnageCapacity),
        maxStrokesPerMinute: machine.maxStrokesPerMinute,
        status: machine.status,
        capabilities: machine.capabilities.map((capability: any) => ({
          operationCode: capability.operation.code,
          operationName: capability.operation.name,
          processType: capability.operation.processType,
          maxTonnage: n(capability.maxTonnage),
          minThicknessMm: capability.minThicknessMm == null ? null : n(capability.minThicknessMm),
          maxThicknessMm: capability.maxThicknessMm == null ? null : n(capability.maxThicknessMm),
          efficiencyFactor: n(capability.efficiencyFactor),
          preferred: capability.isPreferred,
        })),
        compatibleDieIds: machine.dieCompatibilities.map((item: any) => item.dieId),
      })),
      dies: dies.map((die: any) => ({
        id: die.id,
        code: die.code,
        name: die.name,
        partId: die.partId,
        tonnageRequired: n(die.tonnageRequired),
        status: die.status,
        compatibleMachineIds: die.machineCompatibilities.map((item: any) => item.machineId),
      })),
    },
  };
}
