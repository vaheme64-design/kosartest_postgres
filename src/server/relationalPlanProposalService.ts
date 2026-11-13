import { randomUUID } from 'node:crypto';
import { getPrismaClient } from './db/prisma';
import { getRelationalPlanningReadModel } from './relationalPlanningReadModel';
import {
  advanceProductionWipSnapshotVersion,
  getLocationForProcess,
  getProductionWipSnapshotVersion,
  loadProductionWipState,
  manufacturingOrdersStore,
} from './productionWipEngine';
import type { ManufacturingOrder as WipManufacturingOrder } from '../types/productionWip';

const prisma = getPrismaClient();
const today = () => new Date(new Date().toISOString().slice(0, 10));
const dateKey = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, '');
const makeNumber = (prefix: string, date: Date) => `${prefix}-${dateKey(date)}-${randomUUID().slice(0, 6).toUpperCase()}`;
const numeric = (value: unknown) => Number(value ?? 0);

type OperationAssignment = {
  routeOperationId: string;
  operationId: string;
  stepNumber: number;
  stepCode: string;
  stepName: string;
  machineId: string | null;
  dieId: string | null;
  eligibleMachineIds: string[];
};

function assertProposalDemandIsCurrent(proposalLines: any[], readModel: any) {
  const current = new Map<string, number>();
  for (const requirement of readModel.requirements) {
    for (const line of requirement.demandLines) {
      if (line.plannedQty > 0) current.set(line.customerOrderLineId, numeric(line.plannedQty));
    }
  }
  const proposed = new Map<string, number>();
  for (const line of proposalLines) proposed.set(line.customerOrderLineId, numeric(line.plannedQty));
  if (current.size !== proposed.size) {
    throw new Error('تقاضا، موجودی یا برنامه‌های باز پس از تولید این پیشنهاد تغییر کرده‌اند؛ پیش از تایید/صدور، پیشنهاد را دوباره تولید کنید.');
  }
  for (const [lineId, quantity] of current) {
    if (!proposed.has(lineId) || Math.abs((proposed.get(lineId) || 0) - quantity) > 0.05) {
      throw new Error('مقدار تقاضای برنامه‌ریزی‌نشده تغییر کرده است؛ پیشنهاد را دوباره تولید کنید.');
    }
  }
}

function buildAssignments(route: any[]): OperationAssignment[] {
  return route.map(step => {
    const candidates = Array.isArray(step.eligibleMachines) ? step.eligibleMachines : [];
    const current = step.assignedMachine?.id;
    const selected = current && candidates.some((item: any) => item.id === current)
      ? current
      : candidates[0]?.id || null;
    return {
      routeOperationId: step.routeOperationId,
      operationId: step.operationId,
      stepNumber: step.stepNumber,
      stepCode: step.stepCode,
      stepName: step.stepName,
      machineId: selected,
      dieId: step.dieId || null,
      eligibleMachineIds: candidates.map((item: any) => item.id),
    };
  });
}

export async function createRelationalPlanProposal(notes?: string) {
  const readModel = await getRelationalPlanningReadModel();
  const proposalLines: any[] = [];
  const missingRouteDemand = readModel.requirements.flatMap((requirement: any) =>
    !requirement.routeId || !requirement.route.length
      ? requirement.demandLines.filter((line: any) => line.plannedQty > 0).map((line: any) => `${requirement.partCode} / ${line.customerOrderNumber}`)
      : [],
  );
  if (missingRouteDemand.length) {
    throw new Error(`برای بخشی از تقاضای باز مسیر تولید فعال و پیش‌فرض تعریف نشده است: ${missingRouteDemand.slice(0, 5).join('، ')}. ابتدا مسیر تولید را تکمیل کنید.`);
  }

  for (const requirement of readModel.requirements) {
    if (!requirement.routeId || !requirement.route.length) continue;
    for (const demandLine of requirement.demandLines) {
      if (demandLine.plannedQty <= 0) continue;
      proposalLines.push({
        customerOrderLineId: demandLine.customerOrderLineId,
        partId: requirement.partId,
        routeId: requirement.routeId,
        requestedQty: demandLine.remainingQty,
        plannedQty: demandLine.plannedQty,
        plannedStartDate: today(),
        plannedEndDate: new Date(Math.max(today().getTime(), new Date(demandLine.dueDate).getTime())),
        priority: demandLine.priority,
        operationAssignments: buildAssignments(requirement.route),
        warnings: [
          ...requirement.dataWarnings,
          ...(requirement.hasMaterialShortage ? [`کسری متریال برآوردی: ${requirement.materialShortageKg} کیلوگرم`] : []),
          ...requirement.route.filter((step: any) => step.machineSelectionStatus === 'NO_ELIGIBLE_MACHINE')
            .map((step: any) => `برای عملیات ${step.stepCode} ماشین واجد شرایط پیدا نشد.`),
        ],
      });
    }
  }

  if (!proposalLines.length) {
    throw new Error('تقاضای تولیدِ برنامه‌ریزی‌نشده‌ای برای ساخت پیشنهاد جدید وجود ندارد؛ موجودی، WIP و برنامه‌های باز تقاضای فعلی را پوشش می‌دهند یا مسیر تولید ناقص است.');
  }

  const now = new Date();
  const id = randomUUID();
  const proposalNumber = makeNumber('PRP', now);
  const proposal = await prisma.$transaction(async tx => {
    const approvedPendingRelease = await tx.productionPlanProposal.count({ where: { status: 'APPROVED' } });
    if (approvedPendingRelease > 0) {
      throw new Error('یک پیشنهاد تاییدشده هنوز صادر نشده است؛ ابتدا آن را صادر یا لغو کنید، سپس پیشنهاد جدید بسازید.');
    }
    await tx.productionPlanProposal.updateMany({
      where: { status: 'DRAFT' },
      data: { status: 'SUPERSEDED' },
    });
    return tx.productionPlanProposal.create({
      data: {
        id,
        proposalNumber,
        revisionGroupId: id,
        version: 1,
        status: 'DRAFT',
        generatedAt: now,
        inputSnapshot: readModel as any,
        notes: notes || 'پیشنهاد تولید محاسبه‌شده از سفارش‌های تاییدشده، موجودی، WIP و اطلاعات پایه relational',
        lines: { create: proposalLines },
      },
      include: {
        lines: {
          include: {
            part: { select: { partNumber: true, name: true } },
            customerOrderLine: { include: { order: { select: { orderNumber: true, priority: true } } } },
          },
          orderBy: [{ priority: 'asc' }, { plannedEndDate: 'asc' }],
        },
      },
    });
  }, { isolationLevel: 'Serializable' });
  return proposal;
}

export async function listRelationalPlanProposals() {
  return prisma.productionPlanProposal.findMany({
    include: {
      lines: {
        include: {
          part: { select: { partNumber: true, name: true } },
          customerOrderLine: { include: { order: { select: { orderNumber: true, priority: true } } } },
        },
        orderBy: [{ priority: 'asc' }, { plannedEndDate: 'asc' }],
      },
      productionPlan: { select: { id: true, planNumber: true, status: true } },
    },
    orderBy: [{ generatedAt: 'desc' }, { version: 'desc' }],
    take: 100,
  });
}

export async function getRelationalPlanProposal(id: string) {
  return prisma.productionPlanProposal.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          part: { select: { partNumber: true, name: true } },
          route: { include: { operations: { include: { operation: true, machine: true, die: true }, orderBy: { stepNumber: 'asc' } } } },
          customerOrderLine: { include: { order: { select: { id: true, orderNumber: true, priority: true } } } },
        },
        orderBy: [{ priority: 'asc' }, { plannedEndDate: 'asc' }],
      },
      productionPlan: true,
    },
  });
}

export async function reviseRelationalPlanProposal(id: string, changes: any[], note: string) {
  return prisma.$transaction(async tx => {
    const source = await tx.productionPlanProposal.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!source) throw new Error('پیشنهاد برنامه یافت نشد.');
    if (source.status !== 'DRAFT') throw new Error('فقط پیشنهاد در وضعیت پیش‌نویس قابل اصلاح است؛ برای پیشنهاد تاییدشده باید نسخه جدید ایجاد شود.');

    const changeMap = new Map<string, any>();
    for (const change of changes || []) {
      if (!change || typeof change.proposalLineId !== 'string' || !Array.isArray(change.operationAssignments)) {
        throw new Error('ساختار اصلاح تخصیص عملیات معتبر نیست.');
      }
      changeMap.set(change.proposalLineId, change);
    }

    const nextVersion = source.version + 1;
    const nextId = randomUUID();
    const created = await tx.productionPlanProposal.create({
      data: {
        id: nextId,
        proposalNumber: makeNumber('PRP', new Date()),
        revisionGroupId: source.revisionGroupId,
        version: nextVersion,
        status: 'DRAFT',
        inputSnapshot: source.inputSnapshot as any,
        notes: note || `اصلاح نسخه ${source.version}`,
        lines: {
          create: source.lines.map((line: any) => {
            const change = changeMap.get(line.id);
            const assignments = (line.operationAssignments as any[]) || [];
            const nextAssignments = assignments.map(original => {
              const requested = change?.operationAssignments?.find((item: any) => item.routeOperationId === original.routeOperationId);
              if (!requested) return original;
              if (requested.machineId !== null && typeof requested.machineId !== 'string') {
                throw new Error('شناسه ماشین انتخاب‌شده معتبر نیست.');
              }
              if (requested.machineId !== null && !original.eligibleMachineIds.includes(requested.machineId)) {
                throw new Error(`ماشین انتخاب‌شده برای عملیات ${original.stepCode} در فهرست ماشین‌های واجد شرایط نیست.`);
              }
              return { ...original, machineId: requested.machineId };
            });
            if (change && change.operationAssignments.some((item: any) =>
              !assignments.some((original: any) => original.routeOperationId === item.routeOperationId)
            )) {
              throw new Error('عملیاتی در اصلاح انتخاب شده که در مسیر تولید این قطعه وجود ندارد.');
            }
            return {
              customerOrderLineId: line.customerOrderLineId,
              partId: line.partId,
              routeId: line.routeId,
              requestedQty: line.requestedQty,
              plannedQty: line.plannedQty,
              plannedStartDate: line.plannedStartDate,
              plannedEndDate: line.plannedEndDate,
              priority: line.priority,
              operationAssignments: nextAssignments,
              warnings: line.warnings as any,
            };
          }),
        },
      },
      include: { lines: true },
    });
    await tx.productionPlanProposal.update({ where: { id: source.id }, data: { status: 'SUPERSEDED' } });
    return created;
  }, { isolationLevel: 'Serializable' });
}

export async function approveRelationalPlanProposal(id: string, approvedBy: string) {
  const currentReadModel = await getRelationalPlanningReadModel();
  return prisma.$transaction(async tx => {
    const proposal = await tx.productionPlanProposal.findUnique({ where: { id }, include: { lines: true } });
    if (!proposal) throw new Error('پیشنهاد برنامه یافت نشد.');
    if (proposal.status === 'APPROVED' || proposal.status === 'RELEASED') return proposal;
    if (proposal.status !== 'DRAFT') throw new Error('فقط پیشنهاد پیش‌نویس قابل تایید است.');
    if (!proposal.lines.length) throw new Error('پیشنهاد بدون ردیف تولید قابل تایید نیست.');
    assertProposalDemandIsCurrent(proposal.lines, currentReadModel);

    const now = new Date();
    return tx.productionPlanProposal.update({
      where: { id },
      data: { status: 'APPROVED', approvedByUserId: approvedBy, approvedAt: now },
      include: { lines: true },
    });
  }, { isolationLevel: 'Serializable' });
}

export async function releaseRelationalPlanProposal(id: string, releasedBy: string) {
  const currentReadModel = await getRelationalPlanningReadModel();
  // Load the latest durable WIP snapshot before the transaction. The snapshot
  // version is checked again inside the same transaction as plan/MO release.
  await loadProductionWipState();
  const expectedWipSnapshotVersion = getProductionWipSnapshotVersion();
  let bridgedWipOrders: WipManufacturingOrder[] = [];
  const result = await prisma.$transaction(async tx => {
    const proposal = await tx.productionPlanProposal.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            customerOrderLine: { include: { order: true } },
            route: { include: { operations: { include: { operation: true, die: true }, orderBy: { stepNumber: 'asc' } } } },
            part: { select: { partNumber: true, name: true, thicknessMm: true } },
          },
          orderBy: [{ priority: 'asc' }, { plannedEndDate: 'asc' }],
        },
        productionPlan: true,
      },
    });
    if (!proposal) throw new Error('پیشنهاد برنامه یافت نشد.');
    if (proposal.status === 'RELEASED' && proposal.productionPlan) {
      return { proposal, plan: proposal.productionPlan, manufacturingOrders: await tx.manufacturingOrder.findMany({ where: { planId: proposal.productionPlan.id }, include: { operations: true } }), replayed: true };
    }
    if (proposal.status !== 'APPROVED') throw new Error('برای صدور برنامه، ابتدا باید پیشنهاد تایید شود.');
    if (!proposal.lines.length) throw new Error('پیشنهاد بدون ردیف تولید قابل صدور نیست.');
    assertProposalDemandIsCurrent(proposal.lines, currentReadModel);

    const now = new Date();
    const starts = proposal.lines.map((line: any) => line.plannedStartDate.getTime());
    const ends = proposal.lines.map((line: any) => line.plannedEndDate.getTime());
    const plan = await tx.productionPlan.create({
      data: {
        planNumber: makeNumber('PLN', now),
        title: `برنامه تولید بر اساس پیشنهاد ${proposal.proposalNumber} نسخه ${proposal.version}`,
        startDate: new Date(Math.min(...starts)),
        endDate: new Date(Math.max(...ends)),
        status: 'IN_PROGRESS',
        approvedByUserId: proposal.approvedByUserId || releasedBy,
        approvedAt: proposal.approvedAt || now,
        notes: proposal.notes,
        proposal: { connect: { id: proposal.id } },
      },
    });

    const manufacturingOrders: any[] = [];
    for (const line of proposal.lines as any[]) {
      const validationAssignments = (line.operationAssignments as OperationAssignment[]) || [];
      for (const assignment of validationAssignments) {
        if (!assignment.machineId) continue;
        const routeOperation = line.route.operations.find((item: any) => item.id === assignment.routeOperationId);
        const machine = await tx.machine.findUnique({
          where: { id: assignment.machineId },
          include: {
            capabilities: { where: { operationId: assignment.operationId } },
            dieCompatibilities: assignment.dieId ? { where: { dieId: assignment.dieId } } : true,
          },
        });
        const capability = machine?.capabilities?.[0];
        const requiredTonnage = numeric(routeOperation?.die?.tonnageRequired ?? 0);
        const thickness = line.part.thicknessMm == null ? null : numeric(line.part.thicknessMm);
        if (!machine || !machine.active || machine.status !== 'ACTIVE' || !capability) {
          throw new Error(`ماشین انتخاب‌شده برای عملیات ${assignment.stepCode} دیگر فعال یا واجد قابلیت لازم نیست؛ پیشنهاد را اصلاح کنید.`);
        }
        if (requiredTonnage > 0 && (numeric(machine.tonnageCapacity) < requiredTonnage ||
          (capability.maxTonnage != null && numeric(capability.maxTonnage) < requiredTonnage))) {
          throw new Error(`ظرفیت تناژ ماشین برای عملیات ${assignment.stepCode} کافی نیست.`);
        }
        if ((capability.minThicknessMm != null && (thickness == null || thickness < numeric(capability.minThicknessMm))) ||
          (capability.maxThicknessMm != null && (thickness == null || thickness > numeric(capability.maxThicknessMm)))) {
          throw new Error(`محدوده ضخامت ورق با ماشین انتخاب‌شده برای عملیات ${assignment.stepCode} سازگار نیست.`);
        }
        if (assignment.dieId && !machine.dieCompatibilities.some((item: any) => item.dieId === assignment.dieId)) {
          throw new Error(`سازگاری قالب با ماشین برای عملیات ${assignment.stepCode} تایید نشد.`);
        }
      }
      const customerLine = line.customerOrderLine;
      const planLine = await tx.productionPlanLine.create({
        data: {
          planId: plan.id,
          partId: line.partId,
          customerOrderId: customerLine.orderId,
          customerOrderLineId: line.customerOrderLineId,
          plannedQty: line.plannedQty,
          plannedStartDate: line.plannedStartDate,
          plannedEndDate: line.plannedEndDate,
          priority: line.priority,
          status: 'RELEASED',
        },
      });

      const assignments = (line.operationAssignments as OperationAssignment[]) || [];
      const assignmentByRouteOperation = new Map(assignments.map(item => [item.routeOperationId, item]));
      const mo = await tx.manufacturingOrder.create({
        data: {
          moNumber: makeNumber('MO', now),
          partId: line.partId,
          routeId: line.routeId,
          planId: plan.id,
          planLineId: planLine.id,
          targetQty: line.plannedQty,
          scheduledStartDate: line.plannedStartDate,
          scheduledEndDate: line.plannedEndDate,
          priority: line.priority,
          status: 'RELEASED',
          notes: `صادرشده از پیشنهاد ${proposal.proposalNumber}؛ ${releasedBy}`,
          operations: {
            create: line.route.operations.map((routeOperation: any, index: number) => {
              const assignment = assignmentByRouteOperation.get(routeOperation.id);
              return {
                operationId: routeOperation.operationId,
                routeOperationId: routeOperation.id,
                stepNumber: routeOperation.stepNumber,
                plannedMachineId: assignment?.machineId || null,
                plannedDieId: assignment?.dieId || routeOperation.dieId || null,
                plannedQty: line.plannedQty,
                status: index === 0 ? 'READY' : 'PENDING',
              };
            }),
          },
        },
        include: { operations: { include: { plannedMachine: true, plannedDie: true }, orderBy: { stepNumber: 'asc' } } },
      });
      manufacturingOrders.push(mo);

      const bridgeOrderId = `WIP-${mo.id}`;
      const nowIso = now.toISOString();
      const wipOperations = line.route.operations.map((routeOperation: any, index: number) => {
        const productionOperation = mo.operations.find((item: any) => item.stepNumber === routeOperation.stepNumber);
        if (!productionOperation) {
          throw new Error(`عملیات relational مرحله ${routeOperation.stepNumber} برای ایجاد پل WIP پیدا نشد.`);
        }
        return {
          id: `WIPOP-${productionOperation.id}`,
          moId: bridgeOrderId,
          moNumber: mo.moNumber,
          stepNumber: routeOperation.stepNumber,
          stepCode: routeOperation.stepCode,
          stepName: routeOperation.stepName,
          processType: routeOperation.operation.processType,
          sequence: index + 1,
          machineId: productionOperation.plannedMachineId || undefined,
          machineName: productionOperation.plannedMachine?.name || undefined,
          dieMoldId: productionOperation.plannedDieId || undefined,
          dieMoldName: productionOperation.plannedDie?.name || undefined,
          warehouseLocation: getLocationForProcess(routeOperation.operation.processType, routeOperation.stepNumber),
          status: index === 0 ? 'READY' as const : 'PENDING' as const,
          waitingInputQty: 0,
          inProgressQty: 0,
          goodOutputQty: 0,
          scrapQty: 0,
          reworkQty: 0,
          rejectedQty: 0,
          readyForTransferQty: 0,
          transferredQty: 0,
          standardCycleTimeSec: routeOperation.standardCycleTimeSec,
          scrapNormPercent: numeric(routeOperation.scrapNormPercent),
          lastActivityAt: nowIso,
          createdAt: nowIso,
        };
      });
      const wipOrder: WipManufacturingOrder = {
        id: bridgeOrderId,
        moNumber: mo.moNumber,
        partId: line.partId,
        partCode: line.part.partNumber,
        partName: line.part.name,
        targetQuantity: numeric(mo.targetQty),
        // Material is not issued at plan release. The first operation is ready
        // for input, but no WIP quantity is fabricated or implied here.
        initialInputQuantity: 0,
        completedQuantity: 0,
        totalScrapQuantity: 0,
        totalReworkQuantity: 0,
        totalRejectedQuantity: 0,
        routingId: line.routeId,
        routingVersion: line.route.version,
        status: 'RELEASED',
        startDate: mo.scheduledStartDate.toISOString().slice(0, 10),
        dueDate: mo.scheduledEndDate.toISOString().slice(0, 10),
        operations: wipOperations,
        notes: `پل اجرایی از دستور ساخت relational ${mo.moNumber}`,
        createdBy: releasedBy,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      bridgedWipOrders.push(wipOrder);
      await tx.wipManufacturingOrderLink.create({
        data: {
          wipManufacturingOrderId: bridgeOrderId,
          manufacturingOrderId: mo.id,
          createdBy: releasedBy,
          notes: 'ایجاد خودکار پل هویتی همزمان با صدور برنامه تولید',
          operationLinks: {
            create: mo.operations.map((productionOperation: any) => ({
              wipOperationId: `WIPOP-${productionOperation.id}`,
              productionOperationId: productionOperation.id,
            })),
          },
        },
      });

      await tx.customerOrderLine.update({
        where: { id: line.customerOrderLineId },
        data: { status: 'IN_PRODUCTION' },
      });
    }

    if (bridgedWipOrders.length) {
      const snapshot = await tx.wipStateSnapshot.findUnique({ where: { id: 'production-wip-state' } });
      if (!snapshot || snapshot.version !== expectedWipSnapshotVersion) {
        throw new Error('WIP_SNAPSHOT_VERSION_CONFLICT: WIP snapshot changed while releasing the production plan; retry after refreshing.');
      }
      const currentPayload = snapshot.payload as any;
      if (!currentPayload || !Array.isArray(currentPayload.manufacturingOrders) ||
          !Array.isArray(currentPayload.wipTransfers) || !Array.isArray(currentPayload.productionLogs)) {
        throw new Error('Persistent WIP snapshot is malformed. Refusing to append released manufacturing orders.');
      }
      const nextPayload = {
        manufacturingOrders: [...currentPayload.manufacturingOrders, ...bridgedWipOrders],
        wipTransfers: currentPayload.wipTransfers,
        productionLogs: currentPayload.productionLogs,
      };
      const updatedSnapshot = await tx.wipStateSnapshot.updateMany({
        where: { id: 'production-wip-state', version: expectedWipSnapshotVersion },
        data: { payload: nextPayload, version: { increment: 1 } },
      });
      if (updatedSnapshot.count !== 1) {
        throw new Error('WIP_SNAPSHOT_VERSION_CONFLICT: WIP snapshot changed while releasing the production plan; retry after refreshing.');
      }
    }

    const updatedProposal = await tx.productionPlanProposal.update({
      where: { id: proposal.id },
      data: { status: 'RELEASED', releasedAt: now },
    });
    return { proposal: updatedProposal, plan, manufacturingOrders, replayed: false };
  }, { isolationLevel: 'Serializable' });

  if (!result.replayed && bridgedWipOrders.length) {
    manufacturingOrdersStore.push(...bridgedWipOrders);
    advanceProductionWipSnapshotVersion(expectedWipSnapshotVersion);
  }
  return result;
}
