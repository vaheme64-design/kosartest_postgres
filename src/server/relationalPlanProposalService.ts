import { randomUUID } from 'node:crypto';
import { getPrismaClient } from './db/prisma';
import { getRelationalPlanningReadModel } from './relationalPlanningReadModel';

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
        warnings: requirement.dataWarnings,
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
  return prisma.$transaction(async tx => {
    const proposal = await tx.productionPlanProposal.findUnique({ where: { id }, include: { lines: true } });
    if (!proposal) throw new Error('پیشنهاد برنامه یافت نشد.');
    if (proposal.status === 'APPROVED' || proposal.status === 'RELEASED') return proposal;
    if (proposal.status !== 'DRAFT') throw new Error('فقط پیشنهاد پیش‌نویس قابل تایید است.');
    if (!proposal.lines.length) throw new Error('پیشنهاد بدون ردیف تولید قابل تایید نیست.');

    const now = new Date();
    return tx.productionPlanProposal.update({
      where: { id },
      data: { status: 'APPROVED', approvedByUserId: approvedBy, approvedAt: now },
      include: { lines: true },
    });
  }, { isolationLevel: 'Serializable' });
}

export async function releaseRelationalPlanProposal(id: string, releasedBy: string) {
  return prisma.$transaction(async tx => {
    const proposal = await tx.productionPlanProposal.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            customerOrderLine: { include: { order: true } },
            route: { include: { operations: { include: { operation: true, die: true }, orderBy: { stepNumber: 'asc' } } } },
            part: { select: { thicknessMm: true } },
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
      const assignments = (line.operationAssignments as OperationAssignment[]) || [];
      for (const assignment of assignments) {
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
        include: { operations: { orderBy: { stepNumber: 'asc' } } },
      });
      manufacturingOrders.push(mo);
      await tx.customerOrderLine.update({
        where: { id: line.customerOrderLineId },
        data: { status: 'IN_PRODUCTION' },
      });
    }

    const updatedProposal = await tx.productionPlanProposal.update({
      where: { id: proposal.id },
      data: { status: 'RELEASED', releasedAt: now },
    });
    return { proposal: updatedProposal, plan, manufacturingOrders, replayed: false };
  }, { isolationLevel: 'Serializable' });
}
