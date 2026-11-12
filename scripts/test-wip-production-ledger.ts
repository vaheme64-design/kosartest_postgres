import { getPrismaClient } from '../src/server/db/prisma';
import { postWipProductionAtomically } from '../src/server/wipProductionLedger';

function assert(description: string, condition: boolean) {
  if (!condition) throw new Error(`❌ ${description}`);
  console.log(`✅ ${description}`);
}

async function run() {
  const prisma = getPrismaClient();
  const wipMoId = 'WIP-LEDGER-INTEGRATION-TEST';
  const idempotencyKey = 'test-wip-ledger-atomic-980-20';
  const rollbackKey = 'test-wip-ledger-rollback-001';
  const testOwnership = 'WIP_LEDGER_TEST';
  const testContractId = 'WIP-LEDGER-INTEGRATION-TEST';

  let originalSnapshot: any = null;
  let hadSnapshot = false;
  let snapshotCaptured = false;
  let relationalOrder: any;
  let operation20: any;
  let operation30: any;
  let sourceLocation: any;
  let targetLocation: any;
  let scrapLocation: any;
  let part: any;
  let shift: any;
  let user: any;
  let originalMoValues: any;
  let originalOperationValues: any;

  try {
    // Clean leftovers from an interrupted run of this dedicated CI fixture.
    const stale = await prisma.productionReport.findMany({
      where: { wipIdempotencyKey: { in: [idempotencyKey, rollbackKey] } },
      select: { id: true },
    });
    if (stale.length) {
      await prisma.inventoryTransaction.deleteMany({ where: { productionReportId: { in: stale.map((row: any) => row.id) } } });
      await prisma.productionReport.deleteMany({ where: { id: { in: stale.map((row: any) => row.id) } } });
    }
    await prisma.wipManufacturingOrderLink.deleteMany({ where: { wipManufacturingOrderId: wipMoId } });
    await prisma.stockBalance.deleteMany({ where: { ownership: testOwnership, contractId: testContractId } });

    relationalOrder = await prisma.manufacturingOrder.findUnique({
      where: { moNumber: 'MO-1403-1082' },
      include: { part: true, operations: { include: { operation: true, plannedMachine: true }, orderBy: { stepNumber: 'asc' } } },
    });
    if (!relationalOrder) throw new Error('Seeded MO-1403-1082 is required for the WIP ledger integration test.');
    operation20 = relationalOrder.operations.find((row: any) => row.stepNumber === 20);
    operation30 = relationalOrder.operations.find((row: any) => row.stepNumber === 30);
    if (!operation20 || !operation30 || !operation20.plannedMachineId) {
      throw new Error('Seeded relational operations 20 and 30 with a planned machine are required.');
    }
    part = relationalOrder.part;
    shift = await prisma.shift.findUnique({ where: { code: 'SHIFT-MORN' } });
    user = await prisma.user.findUnique({ where: { username: 'supervisor_press' } });
    if (!shift?.active || !user?.active) throw new Error('Active seeded shift and supervisor user are required.');

    const [sourceRows, targetRows, scrapWarehouses] = await Promise.all([
      prisma.warehouseLocation.findMany({ where: { code: 'LOC-WIP-DRAWN', active: true }, include: { warehouse: true } }),
      prisma.warehouseLocation.findMany({ where: { code: 'LOC-WIP-TRIM', active: true }, include: { warehouse: true } }),
      prisma.warehouse.findMany({ where: { type: 'SCRAP', active: true }, include: { locations: { where: { active: true }, orderBy: { code: 'asc' }, take: 1 } } }),
    ]);
    if (sourceRows.length !== 1 || targetRows.length !== 1 || !scrapWarehouses[0]?.locations[0]) {
      throw new Error('Unique active source/target and scrap locations are required by the test fixture.');
    }
    sourceLocation = sourceRows[0];
    targetLocation = targetRows[0];
    scrapLocation = scrapWarehouses[0].locations[0];

    originalMoValues = { completedQty: relationalOrder.completedQty, scrapQty: relationalOrder.scrapQty };
    originalOperationValues = {
      inputQty: operation20.inputQty,
      outputGoodQty: operation20.outputGoodQty,
      outputScrapQty: operation20.outputScrapQty,
      outputReworkQty: operation20.outputReworkQty,
      outputRejectedQty: operation20.outputRejectedQty,
      status: operation20.status,
      endDate: operation20.endDate,
    };

    const snapshot = await prisma.wipStateSnapshot.findUnique({ where: { id: 'production-wip-state' } });
    hadSnapshot = !!snapshot;
    snapshotCaptured = true;
    originalSnapshot = snapshot?.payload ?? null;

    await prisma.stockBalance.create({
      data: {
        partId: part.id,
        warehouseId: sourceLocation.warehouseId,
        locationId: sourceLocation.id,
        ownership: testOwnership,
        contractId: testContractId,
        contractNumber: testContractId,
        qualityStatus: 'AVAILABLE',
        quantityOnHand: 1000,
        quantityReserved: 0,
        quantityAvailable: 1000,
        weightKgOnHand: 1000 * Number(part.weightNetKg),
        weightKgReserved: 0,
        weightKgAvailable: 1000 * Number(part.weightNetKg),
      },
    });

    await prisma.wipManufacturingOrderLink.create({
      data: {
        wipManufacturingOrderId: wipMoId,
        manufacturingOrderId: relationalOrder.id,
        createdBy: user.id,
        operationLinks: {
          create: [
            { wipOperationId: 'WIP-LEDGER-OP20', productionOperationId: operation20.id },
            { wipOperationId: 'WIP-LEDGER-OP30', productionOperationId: operation30.id },
          ],
        },
      },
    });

    const snapshotPayload = {
      manufacturingOrders: [{
        id: wipMoId,
        moNumber: wipMoId,
        partCode: part.partNumber,
        operations: [
          { id: 'WIP-LEDGER-OP20', stepNumber: 20, sequence: 1, processType: operation20.operation.processType, warehouseLocation: 'LOC-WIP-DRAWN', status: 'IN_PROGRESS' },
          { id: 'WIP-LEDGER-OP30', stepNumber: 30, sequence: 2, processType: operation30.operation.processType, warehouseLocation: 'LOC-WIP-TRIM', status: 'READY' },
        ],
      }],
      wipTransfers: [],
      productionLogs: [],
    };

    const input = {
      wipManufacturingOrderId: wipMoId,
      wipOperationId: 'WIP-LEDGER-OP20',
      idempotencyKey,
      shiftId: shift.id,
      createdByUserId: user.id,
      goodQty: 980,
      scrapQty: 20,
      reworkQty: 0,
      rejectedQty: 0,
      scrapReason: 'TEST_SCRAP',
      operatorName: user.fullName,
      snapshotPayload,
    };

    const posted = await postWipProductionAtomically(input);
    assert('980 good and 20 scrap posted in one atomic transaction', !posted.duplicate && posted.transactionCount === 3);
    assert('Production report contains 980 good and 20 scrap', Number(posted.report.goodQuantity) === 980 && Number(posted.report.scrapQuantity) === 20);
    assert('Scrap reason is retained in the relational report', posted.report.scrapReasonText === 'TEST_SCRAP');

    const [sourceBalance, targetBalance, scrapBalance, movements] = await Promise.all([
      prisma.stockBalance.findFirst({ where: { partId: part.id, locationId: sourceLocation.id, ownership: testOwnership, contractId: testContractId, qualityStatus: 'AVAILABLE' } }),
      prisma.stockBalance.findFirst({ where: { partId: part.id, locationId: targetLocation.id, ownership: testOwnership, contractId: testContractId, qualityStatus: 'AVAILABLE' } }),
      prisma.stockBalance.findFirst({ where: { partId: part.id, locationId: scrapLocation.id, ownership: testOwnership, contractId: testContractId, qualityStatus: 'SCRAP' } }),
      prisma.inventoryTransaction.findMany({ where: { productionReportId: posted.report.id } }),
    ]);
    assert('Source stage stock is reduced to zero', Number(sourceBalance?.quantityOnHand) === 0);
    assert('980 good pieces are added to the next operation location', Number(targetBalance?.quantityOnHand) === 980);
    assert('20 scrap pieces are added to the scrap location', Number(scrapBalance?.quantityOnHand) === 20);
    assert('Three report-linked ledger movements are written', movements.length === 3);
    assert('Inventory quantity is conserved: 1000 out = 980 good + 20 scrap', movements.reduce((sum: number, row: any) => sum + Number(row.quantitySigned), 0) === 0);

    const replay = await postWipProductionAtomically(input);
    assert('Same idempotency key returns the existing report without new transactions', replay.duplicate && replay.transactionCount === 0);
    const movementCountAfterReplay = await prisma.inventoryTransaction.count({ where: { productionReportId: posted.report.id } });
    assert('Idempotent replay does not duplicate kardex movements', movementCountAfterReplay === 3);

    let rollbackRejected = false;
    try {
      await postWipProductionAtomically({
        ...input,
        idempotencyKey: rollbackKey,
        goodQty: 1,
        scrapQty: 0,
      });
    } catch (error) {
      rollbackRejected = error instanceof Error && error.message.includes('Insufficient source WIP stock');
    }
    assert('Insufficient source stock rejects posting', rollbackRejected);
    assert('Failed posting leaves no relational production report', !(await prisma.productionReport.findUnique({ where: { wipIdempotencyKey: rollbackKey } })));
    assert('Failed posting leaves no extra inventory transactions', await prisma.inventoryTransaction.count({ where: { productionReportId: posted.report.id } }) === 3);

    console.log('ALL ATOMIC WIP PRODUCTION LEDGER TESTS PASSED');
  } finally {
    const reports = await prisma.productionReport.findMany({
      where: { wipIdempotencyKey: { in: [idempotencyKey, rollbackKey] } },
      select: { id: true },
    });
    if (reports.length) {
      await prisma.inventoryTransaction.deleteMany({ where: { productionReportId: { in: reports.map((row: any) => row.id) } } });
      await prisma.productionReport.deleteMany({ where: { id: { in: reports.map((row: any) => row.id) } } });
    }
    await prisma.wipManufacturingOrderLink.deleteMany({ where: { wipManufacturingOrderId: wipMoId } });
    await prisma.stockBalance.deleteMany({ where: { ownership: testOwnership, contractId: testContractId } });
    if (relationalOrder && originalMoValues) {
      await prisma.manufacturingOrder.update({
        where: { id: relationalOrder.id },
        data: { completedQty: originalMoValues.completedQty, scrapQty: originalMoValues.scrapQty },
      });
    }
    if (operation20 && originalOperationValues) {
      await prisma.productionOperation.update({
        where: { id: operation20.id },
        data: originalOperationValues,
      });
    }
    if (snapshotCaptured && hadSnapshot) {
      await prisma.wipStateSnapshot.upsert({
        where: { id: 'production-wip-state' },
        create: { id: 'production-wip-state', payload: originalSnapshot },
        update: { payload: originalSnapshot },
      });
    } else if (snapshotCaptured) {
      await prisma.wipStateSnapshot.deleteMany({ where: { id: 'production-wip-state' } });
    }
    await prisma.$disconnect();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
