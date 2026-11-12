import express from 'express';
import { PrismaClient } from '@prisma/client';
import { apiRouter, loadInventoryAppState } from '../src/server/apiRouter';
import { manufacturingOrdersStore } from '../src/server/productionWipEngine';
import { INITIAL_PARTS } from '../src/server/sampleData';

const prisma = new PrismaClient();
const nonce = `WIP-COIL-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
let server: import('node:http').Server | undefined;
let coilId: string | undefined;
let materialLotId: string | undefined;
const contractIds: string[] = [];
let originalSnapshot: any;
let snapshotCaptured = false;
let originalWipOrders: any[] = [];
let operationStatusToRestore: { id: string; status: any } | undefined;

function assert(description: string, condition: boolean) {
  if (!condition) throw new Error(`❌ ${description}`);
  console.log(`✅ ${description}`);
}

async function requestJson(baseUrl: string, path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function run() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const relationalOrder = await prisma.manufacturingOrder.findUnique({
    where: { moNumber: 'MO-1403-1082' },
    include: { part: { include: { unit: true } }, operations: { include: { operation: true }, orderBy: { stepNumber: 'asc' } } },
  });
  if (!relationalOrder || relationalOrder.operations.length < 2) {
    throw new Error('Seeded MO-1403-1082 with at least two relational operations is required.');
  }
  if (relationalOrder.part.unit.code !== 'PCS' || Number(relationalOrder.part.weightNetKg || 0) <= 0) {
    throw new Error('MO-1403-1082 must reference a PCS part with positive engineering net weight.');
  }
  const [warehouse, customer, rawParts, sourceLocation] = await Promise.all([
    prisma.warehouse.findFirst({ where: { code: 'WH-RAW', active: true } }),
    prisma.customer.findFirst({ where: { active: true } }),
    prisma.part.findMany({
      where: { active: true, category: 'RAW_MATERIAL', materialId: { not: null } },
      include: { unit: true, material: true },
    }),
    prisma.warehouseLocation.findFirst({ where: { code: 'LOC-WIP-BLANK', active: true } }),
  ]);
  const rawPart = rawParts.find(row => row.unit.code === 'KG' && row.material);
  const appPart = rawPart ? INITIAL_PARTS.find(row => row.code === rawPart.partNumber) : undefined;
  if (!warehouse || !customer || !rawPart?.material || !appPart || !sourceLocation) {
    throw new Error('CI requires WH-RAW, LOC-WIP-BLANK, a customer, and a mapped KG raw-material part.');
  }

  const originalRawSnapshot = await prisma.wipStateSnapshot.findUnique({ where: { id: 'production-wip-state' } });
  snapshotCaptured = true;
  originalSnapshot = originalRawSnapshot?.payload ?? null;
  originalWipOrders = JSON.parse(JSON.stringify(manufacturingOrdersStore));

  operationStatusToRestore = { id: relationalOrder.operations[0].id, status: relationalOrder.operations[0].status };
  const wipMoId = `${nonce}-WIP-MO`;
  const wipOperationIds = relationalOrder.operations.map((row, index) => `${nonce}-WIP-OP-${index + 1}`);
  const wipOperations = relationalOrder.operations.map((row, index) => ({
    id: wipOperationIds[index],
    moId: wipMoId,
    moNumber: relationalOrder.moNumber,
    stepNumber: row.stepNumber,
    sequence: index + 1,
    processType: row.operation.processType,
    warehouseLocation: index === 0 ? 'LOC-WIP-BLANK' : 'LOC-WIP-DRAWN',
    status: 'PENDING',
    waitingInputQty: 0,
    inProgressQty: 0,
    goodOutputQty: 0,
    scrapQty: 0,
    reworkQty: 0,
    rejectedQty: 0,
    readyForTransferQty: 0,
    transferredQty: 0,
    lastActivityAt: new Date().toISOString(),
  }));
  const wipOrder: any = {
    id: wipMoId,
    moNumber: relationalOrder.moNumber,
    partId: relationalOrder.part.partNumber,
    partCode: relationalOrder.part.partNumber,
    partName: relationalOrder.part.name,
    targetQuantity: Number(relationalOrder.targetQty),
    initialInputQuantity: 0,
    completedQuantity: 0,
    totalScrapQuantity: 0,
    totalReworkQuantity: 0,
    totalRejectedQuantity: 0,
    routingId: relationalOrder.routeId,
    routingVersion: 1,
    status: 'IN_PROGRESS',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    operations: wipOperations,
    notes: 'CI first-operation coil issue integration fixture',
    createdBy: 'CI',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await loadInventoryAppState();
    // Preserve the existing snapshot and append one isolated WIP identity fixture.
    originalWipOrders = JSON.parse(JSON.stringify(manufacturingOrdersStore));
    manufacturingOrdersStore.push(wipOrder);
    const snapshotPayload: any = originalSnapshot && typeof originalSnapshot === 'object'
      ? JSON.parse(JSON.stringify(originalSnapshot))
      : { manufacturingOrders: [], wipTransfers: [], productionLogs: [] };
    snapshotPayload.manufacturingOrders = [
      ...(Array.isArray(snapshotPayload.manufacturingOrders) ? snapshotPayload.manufacturingOrders : []),
      wipOrder,
    ];
    await prisma.wipStateSnapshot.upsert({
      where: { id: 'production-wip-state' },
      create: { id: 'production-wip-state', payload: snapshotPayload },
      update: { payload: snapshotPayload },
    });

    const contractA = await prisma.materialContract.create({
      data: {
        contractNumber: `${nonce}-A`,
        supplierCustomerId: customer.id,
        title: 'CI WIP coil issue contract A',
        materialId: rawPart.materialId!,
        totalAllocatedWeightKg: 60,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
      },
    });
    contractIds.push(contractA.id);
    const contractB = await prisma.materialContract.create({
      data: {
        contractNumber: `${nonce}-B`,
        supplierCustomerId: customer.id,
        title: 'CI WIP coil issue contract B',
        materialId: rawPart.materialId!,
        totalAllocatedWeightKg: 40,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
      },
    });
    contractIds.push(contractB.id);

    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use('/api', apiRouter);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      server!.once('listening', resolve);
      server!.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address !== 'object') throw new Error('HTTP test server did not bind.');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const receipt = await requestJson(baseUrl, '/api/inventory/coils', 'POST', {
      coilId: `${nonce}-COIL`,
      coilPackNumber: `${nonce}-PACK`,
      partId: appPart.id,
      partCode: appPart.code,
      partName: appPart.name,
      materialGrade: rawPart.material.grade,
      thicknessMm: Number(rawPart.thicknessMm || 1),
      widthMm: 1000,
      originalWeightKg: 100,
      remainingWeightKg: 100,
      warehouseId: 'WH-RAW',
      warehouseLocationCode: 'LOC-RAW-A1',
      ownership: 'SAPCO_SUPPLIER_OWNED',
      qualityStatus: 'AVAILABLE',
      physicalStatus: 'AVAILABLE',
      allocations: [],
    });
    assert('HTTP receipt creates the test physical coil', receipt.response.status === 201 && !!receipt.payload.data?.id);
    coilId = receipt.payload.data.id;
    materialLotId = (await prisma.physicalCoil.findUnique({ where: { id: coilId } }))?.materialLotId || undefined;
    if (!materialLotId) throw new Error('Test coil receipt did not create a material lot.');

    const allocation = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/allocate`, 'POST', {
      allocations: [
        { contractId: contractA.id, contractNumber: contractA.contractNumber, allocatedWeightKg: 60 },
        { contractId: contractB.id, contractNumber: contractB.contractNumber, allocatedWeightKg: 40 },
      ],
    });
    assert('One physical coil can be allocated across two contracts', allocation.response.status === 200 && allocation.payload.success === true);

    const operation10 = relationalOrder.operations[0];
    // This seeded order's first operation is already closed; temporarily reopen it in the disposable CI DB.
    await prisma.productionOperation.update({ where: { id: operation10.id }, data: { status: 'IN_PROGRESS' } });
    const issuePayload = {
      issueRequestKey: `${nonce}-ISSUE-REQUEST-1`,
      issuedWeightKg: 70,
      moId: relationalOrder.moNumber,
      moOperationId: operation10.id,
      partId: relationalOrder.partId,
      scrappedKg: 0,
      initialInputQuantityPcs: 15,
      wipManufacturingOrderId: wipMoId,
    };
    const issue = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/issue`, 'POST', issuePayload);
    assert(`Coil issue and operator-confirmed 15 PCS WIP input post successfully: HTTP ${issue.response.status} ${JSON.stringify(issue.payload)}`, issue.response.status === 200 && issue.payload.success === true && issue.payload.duplicate !== true);

    const duplicateIssue = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/issue`, 'POST', issuePayload);
    const coilAfterDuplicate = await prisma.physicalCoil.findUnique({ where: { id: coilId } });
    const wipQtyAfterDuplicate = Number((await prisma.stockBalance.aggregate({
      where: { physicalCoilId: coilId, partId: relationalOrder.partId },
      _sum: { quantityOnHand: true },
    }))._sum.quantityOnHand);
    assert('Retrying the same issue request returns the original document without a second stock deduction or WIP posting',
      duplicateIssue.response.status === 200 && duplicateIssue.payload.duplicate === true &&
      duplicateIssue.payload.documentNumber === issue.payload.documentNumber &&
      Number(coilAfterDuplicate?.remainingWeightKg) === 30 && wipQtyAfterDuplicate === 15);

    const changedPayload = { ...issuePayload, issuedWeightKg: 71 };
    const conflictingRetry = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/issue`, 'POST', changedPayload);
    const coilAfterConflict = await prisma.physicalCoil.findUnique({ where: { id: coilId } });
    assert('Reusing an idempotency key with a changed payload is rejected without changing stock',
      conflictingRetry.response.status === 409 && Number(coilAfterConflict?.remainingWeightKg) === 30);

    const [coilAfterIssue, lotAfterIssue, rawBalances, wipBalances, wipTransactions, snapshotAfterIssue] = await Promise.all([
      prisma.physicalCoil.findUnique({ where: { id: coilId } }),
      prisma.materialLot.findUnique({ where: { id: materialLotId } }),
      prisma.stockBalance.findMany({ where: { physicalCoilId: coilId, partId: rawPart.id, qualityStatus: 'AVAILABLE' } }),
      prisma.stockBalance.findMany({ where: { physicalCoilId: coilId, partId: relationalOrder.partId, qualityStatus: 'AVAILABLE' } }),
      prisma.inventoryTransaction.findMany({ where: { physicalCoilId: coilId, manufacturingOrderId: relationalOrder.id, locationId: sourceLocation.id } }),
      prisma.wipStateSnapshot.findUnique({ where: { id: 'production-wip-state' } }),
    ]);
    const rawA = rawBalances.find(row => row.contractId === contractA.id);
    const rawB = rawBalances.find(row => row.contractId === contractB.id);
    const wipA = wipBalances.find(row => row.contractId === contractA.id);
    const wipB = wipBalances.find(row => row.contractId === contractB.id);
    assert('Raw coil remaining weight and material lot both reconcile to 30 kg after a 70 kg issue', Number(coilAfterIssue?.remainingWeightKg) === 30 && Number(lotAfterIssue?.remainingWeightKg) === 30);
    assert('Contract A raw stock is fully issued (60 kg)', Number(rawA?.weightKgAvailable) === 0);
    assert('Contract B raw stock decreases from 40 to 30 kg', Number(rawB?.weightKgAvailable) === 30);
    assert('WIP receives 15 PCS split 12/3 across the original contract lineage', Number(wipA?.quantityOnHand) === 12 && Number(wipB?.quantityOnHand) === 3);
    assert('WIP input transactions retain coil, lot, MO and both contract identities', wipTransactions.length === 2 && wipTransactions.every(row => row.physicalCoilId === coilId && row.materialLotId === materialLotId) && new Set(wipTransactions.map(row => row.contractId)).size === 2);
    const snapshotOrder = (snapshotAfterIssue?.payload as any)?.manufacturingOrders?.find((row: any) => row.id === wipMoId);
    const snapshotOperation = snapshotOrder?.operations?.find((row: any) => row.id === wipOperationIds[0]);
    assert('WIP snapshot increments initial input and first-operation waiting quantity by 15', Number(snapshotOrder?.initialInputQuantity) === 15 && Number(snapshotOperation?.waitingInputQty) === 15 && snapshotOperation?.status === 'READY');

    const returnResult = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/return`, 'POST', {
      returnedRemnantWeightKg: 5,
      warehouseId: 'WH-RAW',
      locationCode: 'LOC-RAW-A1',
      notes: 'CI WIP coil issue remnant return',
    });
    assert('Partial remnant return restores 5 kg to the same physical coil', returnResult.response.status === 200 && returnResult.payload.success === true);
    const [coilAfterReturn, lotAfterReturn, rawAfterReturn] = await Promise.all([
      prisma.physicalCoil.findUnique({ where: { id: coilId } }),
      prisma.materialLot.findUnique({ where: { id: materialLotId } }),
      prisma.stockBalance.findMany({ where: { physicalCoilId: coilId, partId: rawPart.id, qualityStatus: 'AVAILABLE' } }),
    ]);
    assert('Remnant return reconciles coil and lot to 35 kg without changing WIP PCS', Number(coilAfterReturn?.remainingWeightKg) === 35 && Number(lotAfterReturn?.remainingWeightKg) === 35 && Number((await prisma.stockBalance.aggregate({ where: { physicalCoilId: coilId, partId: relationalOrder.partId }, _sum: { quantityOnHand: true } }))._sum.quantityOnHand) === 15);
    assert('Returned raw material is available again under its original contract identity', rawAfterReturn.some(row => row.contractId === contractA.id || row.contractId === contractB.id));

    // Force a failure after the WIP and raw-stock updates have begun inside the transaction.
    // The lot guard is evaluated near the end of the transaction and must roll everything back.
    await prisma.materialLot.update({ where: { id: materialLotId }, data: { remainingWeightKg: 0 } });
    const beforeRollback = await prisma.physicalCoil.findUnique({ where: { id: coilId } });
    const beforeWipQty = Number((await prisma.stockBalance.aggregate({
      where: { physicalCoilId: coilId, partId: relationalOrder.partId },
      _sum: { quantityOnHand: true },
    }))._sum.quantityOnHand);
    const failedIssue = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/issue`, 'POST', {
      issuedWeightKg: 1,
      moId: relationalOrder.moNumber,
      moOperationId: operation10.id,
      partId: relationalOrder.partId,
      scrappedKg: 0,
      initialInputQuantityPcs: 1,
      wipManufacturingOrderId: wipMoId,
    });
    assert('Material-lot mismatch rejects the issue request', failedIssue.response.status === 409 && failedIssue.payload.success === false);
    const [afterRollbackCoil, afterRollbackWip, afterRollbackRaw, failedDocs] = await Promise.all([
      prisma.physicalCoil.findUnique({ where: { id: coilId } }),
      prisma.stockBalance.aggregate({ where: { physicalCoilId: coilId, partId: relationalOrder.partId }, _sum: { quantityOnHand: true } }),
      prisma.stockBalance.aggregate({ where: { physicalCoilId: coilId, partId: rawPart.id }, _sum: { weightKgOnHand: true } }),
      prisma.inventoryDocument.count({ where: { referenceNumber: relationalOrder.moNumber, documentType: 'ISSUE' } }),
    ]);
    assert('Failed issue leaves coil balance unchanged', Number(afterRollbackCoil?.remainingWeightKg) === Number(beforeRollback?.remainingWeightKg));
    assert('Failed issue leaves WIP quantity unchanged', Number(afterRollbackWip._sum.quantityOnHand) === beforeWipQty);
    assert('Failed issue creates no extra issue document or stock movement', failedDocs === 1 && Number(afterRollbackRaw._sum.weightKgOnHand) === 35);

    console.log('ALL FIRST-OPERATION COIL-TO-WIP INTEGRATION TESTS PASSED');
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    if (coilId) {
      const docs = await prisma.inventoryDocument.findMany({ where: { lines: { some: { physicalCoilId: coilId } } }, select: { id: true } });
      await prisma.inventoryTransaction.deleteMany({ where: { physicalCoilId: coilId } });
      await prisma.inventoryDocumentLine.deleteMany({ where: { physicalCoilId: coilId } });
      await prisma.coilIssueReturnRecord.deleteMany({ where: { coilId } });
      await prisma.stockBalance.deleteMany({ where: { physicalCoilId: coilId } });
      await prisma.contractCoilAllocation.deleteMany({ where: { coilId } });
      if (docs.length) await prisma.inventoryDocument.deleteMany({ where: { id: { in: docs.map(row => row.id) } } });
      await prisma.physicalCoil.deleteMany({ where: { id: coilId } });
    }
    if (contractIds.length) await prisma.materialContractTransaction.deleteMany({ where: { contractId: { in: contractIds } } });
    if (materialLotId) await prisma.materialLot.deleteMany({ where: { id: materialLotId } });
    if (contractIds.length) {
      await prisma.materialContract.deleteMany({ where: { id: { in: contractIds } } });
    }
    await prisma.wipManufacturingOrderLink.deleteMany({ where: { wipManufacturingOrderId: wipMoId } });
    if (operationStatusToRestore) {
      await prisma.productionOperation.update({ where: { id: operationStatusToRestore.id }, data: { status: operationStatusToRestore.status } });
    }
    manufacturingOrdersStore.splice(0, manufacturingOrdersStore.length, ...originalWipOrders);
    if (snapshotCaptured) {
      if (originalSnapshot !== null) {
        await prisma.wipStateSnapshot.upsert({
          where: { id: 'production-wip-state' },
          create: { id: 'production-wip-state', payload: originalSnapshot },
          update: { payload: originalSnapshot },
        });
      } else {
        await prisma.wipStateSnapshot.deleteMany({ where: { id: 'production-wip-state' } });
      }
    }
    await prisma.$disconnect();
  }
}

run().catch(error => {
  console.error('First-operation coil-to-WIP integration test failed:', error);
  process.exitCode = 1;
});
