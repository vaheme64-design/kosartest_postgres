import express from 'express';
import { apiRouter } from '../src/server/apiRouter';
import { getPrismaClient } from '../src/server/db/prisma';

const prisma = getPrismaClient();
const nonce = `PLAN-ORDER-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
let orderId: string | undefined;
let server: import('node:http').Server | undefined;

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
  assert(process.env.DATABASE_URL, 'DATABASE_URL is required for planning customer-order integration tests.');
  const [customer, part] = await Promise.all([
    prisma.customer.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } }),
    prisma.part.findFirst({ where: { active: true, category: 'FINISHED_GOOD' }, orderBy: { partNumber: 'asc' } }),
  ]);
  assert(customer && part, 'CI seed must include an active customer and finished-good part.');

  try {
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use('/api', apiRouter);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      server!.once('listening', resolve);
      server!.once('error', reject);
    });
    const address = server.address();
    assert(address && typeof address === 'object', 'Planning HTTP test server did not bind to an ephemeral port.');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const orderNumber = `${nonce}-SO`;
    const create = await requestJson(baseUrl, '/api/planning/customer-orders', 'POST', {
      orderNumber,
      customerCode: customer.code,
      customerName: customer.name,
      contractNumber: `${nonce}-CONTRACT`,
      orderDate: '2026-11-01',
      dueDate: '2026-11-20',
      priority: 1,
      notes: 'PostgreSQL planning order integration test',
      lines: [{ partCode: part.partNumber, orderedQuantity: 100, deliveredQuantity: 10, dueDate: '2026-11-20' }],
    });
    assert(create.response.status === 201 && create.payload.success === true, `Customer order create failed: ${JSON.stringify(create.payload)}`);
    orderId = create.payload.data.id;
    assert(create.payload.source === 'postgresql' && create.payload.data.lines?.length === 1, 'Create response must be sourced from PostgreSQL and contain its persisted order line.');
    assert(create.payload.data.lines[0].partCode === part.partNumber && create.payload.data.lines[0].remainingQuantity === 90, 'Created line must resolve relational part identity and calculate remaining quantity.');
    console.log('PASS: Customer order and lines are created in PostgreSQL.');

    const duplicate = await requestJson(baseUrl, '/api/planning/customer-orders', 'POST', {
      orderNumber,
      customerCode: customer.code,
      lines: [{ partCode: part.partNumber, orderedQuantity: 1 }],
    });
    assert(duplicate.response.status === 409 && duplicate.payload.success === false, 'Duplicate customer order number must return HTTP 409.');
    console.log('PASS: Duplicate customer order number is rejected with HTTP 409.');

    const persisted = await prisma.customerOrder.findUnique({
      where: { id: orderId },
      include: { orderLines: true },
    });
    assert(persisted?.priority === 1 && persisted.orderLines.length === 1 && Number(persisted.orderLines[0].orderedQty) === 100, 'Order header priority and line quantity must persist relationally.');
    console.log('PASS: Customer order priority and line quantities persist in relational tables.');

    const update = await requestJson(baseUrl, `/api/planning/customer-orders/${orderId}`, 'PUT', {
      priority: 3,
      dueDate: '2026-11-25',
      notes: 'Updated planning order',
      lines: [{ partCode: part.partNumber, orderedQuantity: 120, deliveredQuantity: 20, dueDate: '2026-11-25' }],
    });
    assert(update.response.status === 200 && update.payload.success === true, `Customer order update failed: ${JSON.stringify(update.payload)}`);
    assert(update.payload.data.priority === 3 && update.payload.data.lines?.length === 1 && update.payload.data.lines[0].orderedQuantity === 120 && update.payload.data.lines[0].remainingQuantity === 100, 'Updated order must return the changed priority, quantity, and remaining quantity.');
    console.log('PASS: Customer order header and lines are updated transactionally.');

    const list = await requestJson(baseUrl, '/api/planning/customer-orders');
    const listed = list.payload.data?.find((row: any) => row.id === orderId);
    assert(list.response.status === 200 && list.payload.source === 'postgresql' && listed?.priority === 3 && listed.lines?.[0]?.orderedQuantity === 120, 'Customer order list must read the latest committed PostgreSQL values.');
    console.log('PASS: Customer order inquiry reads the latest committed database state.');

    const missingPart = await requestJson(baseUrl, '/api/planning/customer-orders', 'POST', {
      orderNumber: `${nonce}-INVALID`,
      customerCode: customer.code,
      lines: [{ partCode: `${nonce}-UNKNOWN-PART`, orderedQuantity: 1 }],
    });
    assert(missingPart.response.status === 400 && missingPart.payload.success === false, 'Unknown part must be rejected without creating a customer order.');
    console.log('PASS: Invalid part references are rejected before persistence.');
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    if (orderId) await prisma.customerOrder.deleteMany({ where: { id: orderId } });
    await prisma.customerOrder.deleteMany({ where: { orderNumber: `${nonce}-INVALID` } });
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('Planning customer-order integration test failed:', error);
  process.exitCode = 1;
});
