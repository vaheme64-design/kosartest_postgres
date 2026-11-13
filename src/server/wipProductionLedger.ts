import { getPrismaClient } from './db/prisma';

export interface WipProductionLedgerInput {
  wipManufacturingOrderId: string;
  wipOperationId: string;
  idempotencyKey: string;
  machineId?: string;
  shiftId: string;
  createdByUserId: string;
  reportDate?: string;
  notes?: string;
  goodQty: number;
  scrapQty: number;
  reworkQty: number;
  rejectedQty: number;
  scrapReason?: string;
  operatorName: string;
  expectedSnapshotVersion: number;
  snapshotPayload: {
    manufacturingOrders: unknown[];
    wipTransfers: unknown[];
    productionLogs: unknown[];
  };
}

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative quantity.`);
  }
}

export async function findWipProductionReportByKey(idempotencyKey: string) {
  return getPrismaClient().productionReport.findUnique({
    where: { wipIdempotencyKey: idempotencyKey },
    select: {
      id: true,
      reportNumber: true,
      manufacturingOrderId: true,
      productionOperationId: true,
      goodQuantity: true,
      scrapQuantity: true,
      reworkQuantity: true,
      rejectedQuantity: true,
      reportDate: true,
    },
  });
}

export async function postWipProductionAtomically(input: WipProductionLedgerInput) {
  const {
    wipManufacturingOrderId, wipOperationId, idempotencyKey,
    machineId, shiftId, createdByUserId, goodQty, scrapQty,
    reworkQty, rejectedQty, snapshotPayload, expectedSnapshotVersion,
  } = input;

  if (!idempotencyKey || idempotencyKey.trim().length < 8 || idempotencyKey.length > 160) {
    throw new Error('A stable idempotencyKey between 8 and 160 characters is required.');
  }
  for (const [label, value] of [
    ['goodQty', goodQty], ['scrapQty', scrapQty],
    ['reworkQty', reworkQty], ['rejectedQty', rejectedQty],
  ] as const) assertPositiveFinite(value, label);

  const totalQty = goodQty + scrapQty + reworkQty + rejectedQty;
  if (totalQty <= 0) throw new Error('At least one reported production quantity is required.');

  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx: any) => {
    // Idempotency is checked inside the same serializable transaction as every posting.
    const alreadyPosted = await tx.productionReport.findUnique({
      where: { wipIdempotencyKey: idempotencyKey },
      select: { id: true, reportNumber: true, goodQuantity: true, scrapQuantity: true, reworkQuantity: true, rejectedQuantity: true, scrapReasonText: true },
    });
    if (alreadyPosted) {
      return { duplicate: true, report: alreadyPosted, transactionCount: 0 };
    }

    const orderLink = await tx.wipManufacturingOrderLink.findUnique({
      where: { wipManufacturingOrderId },
      include: {
        manufacturingOrder: {
          include: { part: { include: { unit: true } }, operations: { orderBy: { stepNumber: 'asc' } } },
        },
        operationLinks: true,
      },
    });
    if (!orderLink) throw new Error('WIP order has no validated relational identity link.');

    const operationLink = orderLink.operationLinks.find((link: any) => link.wipOperationId === wipOperationId);
    if (!operationLink) throw new Error('WIP operation has no validated relational identity link.');

    const relationalOrder = orderLink.manufacturingOrder;
    const relationalOperation = await tx.productionOperation.findUnique({
      where: { id: operationLink.productionOperationId },
      include: { operation: true },
    });
    if (!relationalOperation || relationalOperation.manufacturingOrderId !== relationalOrder.id) {
      throw new Error('Linked relational operation does not belong to the linked manufacturing order.');
    }

    const effectiveMachineId = machineId || relationalOperation.plannedMachineId;
    if (!effectiveMachineId) {
      throw new Error('A relationalMachineId is required because the linked production operation has no planned machine.');
    }
    const machine = await tx.machine.findUnique({ where: { id: effectiveMachineId } });
    if (!machine || !machine.active || machine.status !== 'ACTIVE') {
      throw new Error('A valid active relational machineId is required for the production report.');
    }
    if (relationalOperation.plannedMachineId && relationalOperation.plannedMachineId !== effectiveMachineId) {
      throw new Error('Reported machine does not match the machine assigned to the linked production operation.');
    }
    const shift = await tx.shift.findUnique({ where: { id: shiftId } });
    if (!shift || !shift.active) throw new Error('A valid active shiftId is required.');
    const user = await tx.user.findUnique({ where: { id: createdByUserId } });
    if (!user || !user.active) throw new Error('A valid active createdByUserId is required.');

    const reportDate = input.reportDate ? new Date(input.reportDate) : new Date();
    if (Number.isNaN(reportDate.getTime())) throw new Error('reportDate is invalid.');

    const wipOrder = (snapshotPayload.manufacturingOrders as any[]).find(row => row.id === wipManufacturingOrderId);
    const wipOperation = wipOrder?.operations?.find((row: any) => row.id === wipOperationId);
    if (!wipOrder || !wipOperation) throw new Error('WIP order/operation is missing from the proposed persistent snapshot.');
    if (wipOrder.partCode !== relationalOrder.part.partNumber) {
      throw new Error('WIP part code no longer matches the linked relational part.');
    }
    if (Number(wipOperation.processType) !== Number(relationalOperation.operation.processType) &&
        String(wipOperation.processType) !== String(relationalOperation.operation.processType)) {
      throw new Error('WIP process type no longer matches the linked relational operation.');
    }

    const locateUnique = async (code: string) => {
      const rows = await tx.warehouseLocation.findMany({
        where: { code, active: true },
        include: { warehouse: true },
      });
      if (rows.length !== 1) {
        throw new Error(`Location code "${code}" must resolve to exactly one active warehouse location; found ${rows.length}.`);
      }
      return rows[0];
    };

    const sourceLocation = await locateUnique(wipOperation.warehouseLocation);
    const nextWipOperation = wipOrder.operations.find((row: any) => row.sequence === wipOperation.sequence + 1);
    const targetLocation = await locateUnique(nextWipOperation?.warehouseLocation || 'LOC-FIN-P1');
    const scrapWarehouse = scrapQty > 0
      ? await tx.warehouse.findFirst({
          where: { type: 'SCRAP', active: true },
          include: { locations: { where: { active: true }, orderBy: { code: 'asc' }, take: 1 } },
          orderBy: { code: 'asc' },
        })
      : null;
    if (scrapQty > 0 && (!scrapWarehouse || !scrapWarehouse.locations?.[0])) {
      throw new Error('An active SCRAP warehouse with at least one active location is required before posting scrap.');
    }

    const part = relationalOrder.part;
    const unitId = part.unitId;
    const unitWeightKg = Number(part.weightNetKg || 0);
    const reportNumber = `PR-WIP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const report = await tx.productionReport.create({
      data: {
        reportNumber,
        manufacturingOrderId: relationalOrder.id,
        productionOperationId: relationalOperation.id,
        machineId: effectiveMachineId,
        shiftId,
        operatorUserId: createdByUserId,
        reportDate,
        goodQuantity: goodQty,
        scrapQuantity: scrapQty,
        reworkQuantity: reworkQty,
        rejectedQuantity: rejectedQty,
        scrapReasonText: input.scrapReason || null,
        notes: input.notes || null,
        documentStatus: 'CONFIRMED',
        postingStatus: 'POSTED',
        wipIdempotencyKey: idempotencyKey,
      },
    });

    // Consume the reported quantity from the source stage, preserving ownership,
    // contract and lot/coil identity when the source balance is split.
    const sourceBalances = await tx.stockBalance.findMany({
      where: {
        partId: part.id,
        warehouseId: sourceLocation.warehouseId,
        locationId: sourceLocation.id,
        qualityStatus: 'AVAILABLE',
        quantityAvailable: { gt: 0 },
      },
      orderBy: [{ contractNumber: 'asc' }, { id: 'asc' }],
    });
    const availableQty = sourceBalances.reduce((sum: number, row: any) => sum + Number(row.quantityAvailable), 0);
    if (availableQty + 1e-9 < totalQty) {
      throw new Error(
        `Insufficient source WIP stock at ${wipOperation.warehouseLocation}: available ${availableQty}, reported ${totalQty}. No report or ledger movement was committed.`,
      );
    }

    const updateBalance = async (base: any, qty: number, direction: 1 | -1, qualityStatus: string) => {
      if (qty <= 0) return null;
      const identity = {
        partId: part.id,
        warehouseId: base.warehouseId,
        locationId: base.locationId,
        materialLotId: base.materialLotId,
        physicalCoilId: base.physicalCoilId,
        ownership: base.ownership,
        contractId: base.contractId,
        contractNumber: base.contractNumber,
        qualityStatus,
      };
      const existing = await tx.stockBalance.findFirst({ where: identity });
      const weight = qty * unitWeightKg;
      if (direction < 0) {
        if (!existing || Number(existing.quantityOnHand) + 1e-9 < qty || Number(existing.quantityAvailable) + 1e-9 < qty) {
          throw new Error('Source stock balance changed during posting; transaction aborted.');
        }
        const nextOnHand = Number(existing.quantityOnHand) - qty;
        const nextAvailable = Number(existing.quantityAvailable) - qty;
        const nextWeight = Number(existing.weightKgOnHand) - weight;
        const nextWeightAvailable = Number(existing.weightKgAvailable) - weight;
        const updated = await tx.stockBalance.update({
          where: { id: existing.id },
          data: {
            quantityOnHand: nextOnHand,
            quantityAvailable: nextAvailable,
            weightKgOnHand: nextWeight,
            weightKgAvailable: nextWeightAvailable,
            lastTransactionAt: reportDate,
          },
        });
        return { row: updated, quantityAfter: nextOnHand, weightAfter: nextWeight };
      }
      if (existing) {
        const nextOnHand = Number(existing.quantityOnHand) + qty;
        const nextAvailable = qualityStatus === 'AVAILABLE' ? Number(existing.quantityAvailable) + qty : Number(existing.quantityAvailable);
        const nextWeight = Number(existing.weightKgOnHand) + weight;
        const nextWeightAvailable = qualityStatus === 'AVAILABLE' ? Number(existing.weightKgAvailable) + weight : Number(existing.weightKgAvailable);
        const updated = await tx.stockBalance.update({
          where: { id: existing.id },
          data: {
            quantityOnHand: nextOnHand,
            quantityAvailable: nextAvailable,
            weightKgOnHand: nextWeight,
            weightKgAvailable: nextWeightAvailable,
            lastTransactionAt: reportDate,
          },
        });
        return { row: updated, quantityAfter: nextOnHand, weightAfter: nextWeight };
      }
      const created = await tx.stockBalance.create({
        data: {
          ...identity,
          quantityOnHand: qty,
          quantityReserved: 0,
          quantityAvailable: qualityStatus === 'AVAILABLE' ? qty : 0,
          weightKgOnHand: weight,
          weightKgReserved: 0,
          weightKgAvailable: qualityStatus === 'AVAILABLE' ? weight : 0,
          lastTransactionAt: reportDate,
        },
      });
      return { row: created, quantityAfter: qty, weightAfter: weight };
    };

    let remainingToConsume = totalQty;
    let remainingGood = goodQty;
    let remainingScrap = scrapQty;
    let remainingRework = reworkQty;
    let remainingRejected = rejectedQty;
    let transactionIndex = 0;
    const postMovement = async (args: {
      base: any;
      location: any;
      quantity: number;
      direction: 1 | -1;
      qualityStatus: string;
      transactionType: 'INBOUND' | 'OUTBOUND';
    }) => {
      if (args.quantity <= 0) return;
      const balance = await updateBalance(args.base, args.quantity, args.direction, args.qualityStatus);
      if (!balance) throw new Error('Could not update stock balance.');
      transactionIndex += 1;
      const signedQty = args.quantity * args.direction;
      const signedWeight = args.quantity * unitWeightKg * args.direction;
      await tx.inventoryTransaction.create({
        data: {
          transactionNumber: `${reportNumber}-${String(transactionIndex).padStart(2, '0')}`,
          partId: part.id,
          productionOperationId: relationalOperation.id,
          warehouseId: args.location.warehouseId,
          locationId: args.location.id,
          transactionType: args.transactionType,
          quantity: args.quantity,
          quantitySigned: signedQty,
          unitId,
          weightKg: args.quantity * unitWeightKg,
          weightKgSigned: signedWeight,
          ownership: args.base.ownership,
          contractId: args.base.contractId,
          contractNumber: args.base.contractNumber,
          qualityStatus: args.qualityStatus,
          balanceAfter: balance.quantityAfter,
          balanceKgAfter: balance.weightAfter,
          transactionDate: reportDate,
          postingStatus: 'POSTED',
          createdByUserId,
          productionReportId: report.id,
          manufacturingOrderId: relationalOrder.id,
        },
      });
    };

    for (const source of sourceBalances) {
      if (remainingToConsume <= 0) break;
      const take = Math.min(remainingToConsume, Number(source.quantityAvailable));
      if (take <= 0) continue;
      await postMovement({
        base: source,
        location: sourceLocation,
        quantity: take,
        direction: -1,
        qualityStatus: 'AVAILABLE',
        transactionType: 'OUTBOUND',
      });

      const isLastSourceSlice = remainingToConsume - take <= 1e-9;
      const proportionalSlice = (original: number, remaining: number) =>
        isLastSourceSlice ? remaining : Math.min(remaining, Math.round(original * (take / totalQty) * 1e6) / 1e6);
      const goodSlice = proportionalSlice(goodQty, remainingGood);
      const scrapSlice = proportionalSlice(scrapQty, remainingScrap);
      const reworkSlice = proportionalSlice(reworkQty, remainingRework);
      const rejectedSlice = proportionalSlice(rejectedQty, remainingRejected);
      remainingGood -= goodSlice;
      remainingScrap -= scrapSlice;
      remainingRework -= reworkSlice;
      remainingRejected -= rejectedSlice;
      const destinations: Array<{ quantity: number; location: any; qualityStatus: string }> = [
        { quantity: goodSlice, location: targetLocation, qualityStatus: 'AVAILABLE' },
        { quantity: scrapSlice, location: scrapWarehouse?.locations?.[0], qualityStatus: 'SCRAP' },
        { quantity: reworkSlice, location: sourceLocation, qualityStatus: 'REWORK' },
        { quantity: rejectedSlice, location: sourceLocation, qualityStatus: 'REJECTED' },
      ];
      for (const destination of destinations) {
        if (destination.quantity <= 0) continue;
        await postMovement({
          base: {
            ...source,
            warehouseId: destination.location.warehouseId,
            locationId: destination.location.id,
          },
          location: destination.location,
          quantity: destination.quantity,
          direction: 1,
          qualityStatus: destination.qualityStatus,
          transactionType: 'INBOUND',
        });
      }
      remainingToConsume -= take;
    }
    if ([remainingGood, remainingScrap, remainingRework, remainingRejected].some(value => Math.abs(value) > 1e-6)) {
      throw new Error('Inventory movement allocation did not conserve the reported quantities.');
    }

    await tx.productionOperation.update({
      where: { id: relationalOperation.id },
      data: {
        inputQty: { increment: totalQty },
        outputGoodQty: { increment: goodQty },
        outputScrapQty: { increment: scrapQty },
        outputReworkQty: { increment: reworkQty },
        outputRejectedQty: { increment: rejectedQty },
        ...(wipOperation.status === 'COMPLETED' ? { status: 'COMPLETED', endDate: reportDate } : {}),
      },
    });
    await tx.manufacturingOrder.update({
      where: { id: relationalOrder.id },
      data: {
        ...(nextWipOperation ? {} : { completedQty: { increment: goodQty } }),
        scrapQty: { increment: scrapQty },
      },
    });

    // Snapshot and relational report/ledger commit together: no half-posted state.
    const snapshotUpdate = await tx.wipStateSnapshot.updateMany({
      where: { id: 'production-wip-state', version: expectedSnapshotVersion },
      data: { payload: snapshotPayload, version: { increment: 1 } },
    });
    if (snapshotUpdate.count !== 1) {
      throw new Error('WIP_SNAPSHOT_VERSION_CONFLICT: another server committed a newer WIP snapshot; production posting was rolled back.');
    }

    return { duplicate: false, report, transactionCount: transactionIndex };
  }, { isolationLevel: 'Serializable' });
}
