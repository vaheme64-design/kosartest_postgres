import express from 'express';
import { apiRouter, loadInventoryAppState } from '../src/server/apiRouter';
import { getPrismaClient } from '../src/server/db/prisma';
import { INITIAL_PARTS } from '../src/server/sampleData';

const prisma = getPrismaClient();
const nonce = `HTTP-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
let coilId: string | undefined;
let lotId: string | undefined;
let contractId: string | undefined;
let server: ReturnType<ReturnType<typeof express>['listen']> | undefined;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

async function main() {
  assert(process.env.DATABASE_URL, 'DATABASE_URL is required for HTTP inventory integration tests.');

  const [warehouse, location, dbPart, customer, mo] = await Promise.all([
    prisma.warehouse.findFirst({ where: { code: 'WH-RAW', active: true } }),
    prisma.warehouseLocation.findFirst({ where: { code: 'LOC-RAW-A1', active: true, warehouse: { code: 'WH-RAW' } } }),
    prisma.part.findFirst({
      where: { active: true, category: 'RAW_MATERIAL', unit: { code: 'KG' }, materialId: { not: null }, partNumber: { in: INITIAL_PARTS.filter(p => p.unit === 'KG' && p.materialGrade).map(p => p.code) } },
      include: { unit: true, material: true },
    }),
    prisma.customer.findFirst({ where: { active: true } }),
    prisma.manufacturingOrder.findFirst({
      where: { status: 'IN_PROGRESS', operations: { some: { status: 'IN_PROGRESS' } } },
      include: { operations: { where: { status: 'IN_PROGRESS' }, orderBy: { stepNumber: 'asc' }, take: 1 } },
    }),
  ]);
  assert(warehouse && location && dbPart?.material && customer && mo?.operations[0], 'CI seed must contain WH-RAW/LOC-RAW-A1, a KG raw material, a customer and an in-progress MO operation.');

  const appPart = INITIAL_PARTS.find(p => p.code === dbPart.partNumber);
  assert(appPart, `No application part mapping found for ${dbPart.partNumber}.`);

  const contract = await prisma.materialContract.create({
    data: {
      contractNumber: `${nonce}-CONTRACT`,
      supplierCustomerId: customer.id,
      title: 'HTTP inventory integration test contract',
      materialId: dbPart.materialId!,
      totalAllocatedWeightKg: 100,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  contractId = contract.id;

  try {
    await loadInventoryAppState();
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use('/api', apiRouter);

    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      server!.once('listening', resolve);
      server!.once('error', reject);
    });
    const address = server.address();
    assert(address && typeof address === 'object', 'HTTP test server did not bind to an ephemeral port.');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const list = await requestJson(baseUrl, '/api/inventory/coils');
    assert(list.response.status === 200 && list.payload.success === true && Array.isArray(list.payload.data), 'GET /inventory/coils must return a successful JSON list.');
    console.log('PASS: HTTP GET inventory coils.');

    const invalidReceipt = await requestJson(baseUrl, '/api/inventory/coils', 'POST', {});
    assert(invalidReceipt.response.status === 400 && invalidReceipt.payload.success === false, 'Receipt endpoint must reject missing required fields with HTTP 400.');
    console.log('PASS: HTTP receipt validation.');

    const receipt = await requestJson(baseUrl, '/api/inventory/coils', 'POST', {
      coilId: `${nonce}-COIL`,
      coilPackNumber: `${nonce}-PACK`,
      partId: appPart.id,
      partCode: appPart.code,
      partName: appPart.name,
      materialGrade: dbPart.material!.grade,
      thicknessMm: Number(dbPart.thicknessMm || 1),
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
    assert(receipt.response.status === 201 && receipt.payload.success === true && receipt.payload.data?.id, `HTTP coil receipt failed: ${JSON.stringify(receipt.payload)}`);
    coilId = receipt.payload.data.id;
    console.log('PASS: HTTP POST receipt persists a physical coil and inventory receipt.');

    const invalidAllocation = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/allocate`, 'POST', { allocations: [] });
    assert(invalidAllocation.response.status === 400, 'Allocation endpoint must reject an empty allocation list with HTTP 400.');

    const allocation = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/allocate`, 'POST', {
      allocations: [{ contractId: contract.id, contractNumber: contract.contractNumber, allocatedWeightKg: 100 }],
    });
    assert(allocation.response.status === 200 && allocation.payload.success === true, `HTTP contract allocation failed: ${JSON.stringify(allocation.payload)}`);
    console.log('PASS: HTTP POST contract allocation.');

    const invalidIssue = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/issue`, 'POST', {
      issuedWeightKg: 0,
      moId: mo.moNumber,
      moOperationId: mo.operations[0].id,
    });
    assert(invalidIssue.response.status === 400, 'Issue endpoint must reject zero issue weight with HTTP 400.');

    const issue = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/issue`, 'POST', {
      issuedWeightKg: 20,
      moId: mo.moNumber,
      moOperationId: mo.operations[0].id,
      partId: mo.partId,
      scrappedKg: 0,
    });
    assert(issue.response.status === 200 && issue.payload.success === true, `HTTP manufacturing issue failed: ${JSON.stringify(issue.payload)}`);
    console.log('PASS: HTTP POST issue links material consumption to a manufacturing order and operation.');

    const invalidReturn = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/return`, 'POST', { returnedRemnantWeightKg: 0 });
    assert(invalidReturn.response.status === 400, 'Return endpoint must reject zero returned weight with HTTP 400.');

    const returned = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/return`, 'POST', {
      returnedRemnantWeightKg: 5,
      warehouseId: 'WH-RAW',
      locationCode: 'LOC-RAW-A1',
      notes: 'HTTP integration test partial remnant return',
    });
    assert(returned.response.status === 200 && returned.payload.success === true, `HTTP remnant return failed: ${JSON.stringify(returned.payload)}`);
    console.log('PASS: HTTP POST partial remnant return.');

    const [coil, lot, balances, issueRecords] = await Promise.all([
      prisma.physicalCoil.findUnique({ where: { id: coilId } }),
      prisma.materialLot.findFirst({ where: { lotNumber: `${nonce}-COIL` } }),
      prisma.stockBalance.findMany({ where: { physicalCoilId: coilId } }),
      prisma.coilIssueReturnRecord.findMany({ where: { coilId, issuedWeightKg: { gt: 0 } } }),
    ]);
    const balanceKg = balances.reduce((sum, row) => sum + Number(row.weightKgOnHand), 0);
    assert(Number(coil?.remainingWeightKg) === 85, `Expected coil balance 85 kg, got ${coil?.remainingWeightKg}.`);
    assert(Number(lot?.remainingWeightKg) === 85, `Expected material lot balance 85 kg, got ${lot?.remainingWeightKg}.`);
    assert(balanceKg === 85, `Expected stock ledger balance 85 kg, got ${balanceKg}.`);
    assert(issueRecords.length > 0 && Number(issueRecords[0].outstandingWeightKg) === 15 && Number(issueRecords[0].returnedWeightKg) === 5, 'Issue/return genealogy must reconcile to 15 kg outstanding and 5 kg returned.');
    console.log('PASS: HTTP lifecycle reconciles coil, lot, stock ledger and issue/return genealogy to 85 kg.');
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    if (coilId) {
      const documents = await prisma.inventoryDocument.findMany({ where: { lines: { some: { physicalCoilId: coilId } } }, select: { id: true } });
      await prisma.inventoryTransaction.deleteMany({ where: { physicalCoilId: coilId } });
      await prisma.inventoryDocumentLine.deleteMany({ where: { physicalCoilId: coilId } });
      await prisma.coilIssueReturnRecord.deleteMany({ where: { coilId } });
      await prisma.stockBalance.deleteMany({ where: { physicalCoilId: coilId } });
      await prisma.contractCoilAllocation.deleteMany({ where: { coilId } });
      if (documents.length) await prisma.inventoryDocument.deleteMany({ where: { id: { in: documents.map(row => row.id) } } });
      await prisma.physicalCoil.deleteMany({ where: { id: coilId } });
    }
    if (lotId) await prisma.materialLot.deleteMany({ where: { id: lotId } });
    if (coilId) await prisma.materialLot.deleteMany({ where: { lotNumber: `${nonce}-COIL` } });
    if (contractId) {
      await prisma.materialContractTransaction.deleteMany({ where: { contractId } });
      await prisma.materialContract.deleteMany({ where: { id: contractId } });
    }
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('HTTP inventory integration test failed:', error);
  process.exitCode = 1;
});
