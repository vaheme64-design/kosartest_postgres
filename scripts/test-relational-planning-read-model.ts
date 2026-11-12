import express from 'express';
import { apiRouter } from '../src/server/apiRouter';
import { getPrismaClient } from '../src/server/db/prisma';

const prisma = getPrismaClient();
const nonce = `REL-PLAN-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
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
  assert(process.env.DATABASE_URL, 'DATABASE_URL is required for relational planning tests.');
  const [customer, part] = await Promise.all([
    prisma.customer.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } }),
    prisma.part.findFirst({
      where: {
        active: true,
        category: 'FINISHED_GOOD',
        weightGrossKg: { gt: 0 },
        materialId: { not: null },
        routes: { some: { status: 'ACTIVE', isDefault: true, operations: { some: {} } } },
      },
      include: {
        material: true,
        routes: {
          where: { status: 'ACTIVE', isDefault: true },
          take: 1,
          include: { operations: { orderBy: { stepNumber: 'asc' }, include: { operation: true } } },
        },
      },
      orderBy: { partNumber: 'asc' },
    }),
  ]);
  assert(customer && part && part.routes[0]?.operations.length, 'CI seed must include an active customer and a finished-good part with a material, positive gross weight, and active default route.');

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
    assert(address && typeof address === 'object', 'Relational planning test server did not bind to an ephemeral port.');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const baselineResponse = await requestJson(baseUrl, '/api/planning/read-model');
    assert(baselineResponse.response.status === 200 && baselineResponse.payload.success, 'Baseline relational read model must load before adding test demand.');
    const baselineRequirement = baselineResponse.payload.data.requirements.find((item: any) => item.partId === part.id);
    const baselineGrossDemand = baselineRequirement?.grossDemandQty || 0;

    const create = await requestJson(baseUrl, '/api/planning/customer-orders', 'POST', {
      orderNumber: `${nonce}-SO`,
      customerCode: customer.code,
      orderDate: '2026-11-12',
      dueDate: '2026-11-20',
      priority: 1,
      lines: [{ partCode: part.partNumber, orderedQuantity: 137, deliveredQuantity: 14, dueDate: '2026-11-18' }],
    });
    assert(create.response.status === 201 && create.payload.success, `Test demand order creation failed: ${JSON.stringify(create.payload)}`);
    orderId = create.payload.data.id;

    const readModel = await requestJson(baseUrl, '/api/planning/read-model');
    assert(readModel.response.status === 200 && readModel.payload.success, `Relational read model failed: ${JSON.stringify(readModel.payload)}`);
    assert(readModel.payload.data.source === 'postgresql', 'Read model must explicitly identify PostgreSQL as its source.');
    const requirement = readModel.payload.data.requirements.find((item: any) => item.partId === part.id);
    assert(requirement, 'Relational read model must include the newly persisted customer demand.');
    assert(requirement.grossDemandQty === baselineGrossDemand + 123, 'Gross demand must increase by ordered quantity less delivered quantity from relational order lines.');
    assert(requirement.partCode === part.partNumber, 'Requirement part identity must be the relational part number, not a legacy sample ID.');
    assert(requirement.route.length === part.routes[0].operations.length, 'Route steps must come from the active relational default route.');
    assert(requirement.route[0].stepNumber === part.routes[0].operations[0].stepNumber, 'Relational route ordering must be preserved.');
    for (const step of requirement.route) {
      assert(step.operationId && step.operationCode, 'Every route operation must retain its relational operation identity.');
      assert(
        step.machineSelectionStatus === (step.eligibleMachines.length > 0 ? 'CANDIDATES_FOUND' : 'NO_ELIGIBLE_MACHINE'),
        'Machine selection status must agree with the relational eligible-candidate list.',
      );
      for (const candidate of step.eligibleMachines) {
        const machine = readModel.payload.data.masterData.machines.find((item: any) => item.id === candidate.id);
        assert(machine?.status === 'ACTIVE', 'Only active machines may be returned as eligible candidates.');
        assert(machine.capabilities.some((capability: any) => capability.operationCode === step.operationCode), 'Every candidate must have a relational capability for the route operation.');
        assert(!step.dieId || machine.compatibleDieIds.includes(step.dieId), 'A candidate must have a relational compatibility record for the assigned die.');
      }
    }
    assert(
      Math.abs(requirement.netProductionRequirement - Math.max(0, requirement.grossDemandQty - requirement.availableFinishedGoodsQty - requirement.downstreamWipQty)) < 0.11,
      'Net requirement must subtract available finished goods and WIP exactly once.',
    );
    assert(requirement.materialShortageKg >= 0 && requirement.availableRawMaterialKg >= 0, 'Material availability and shortage must be non-negative.');
    console.log('PASS: PostgreSQL read model resolves relational order, part, route, finished stock, WIP and material data.');

    const net = await requestJson(baseUrl, '/api/planning/net-requirements');
    assert(net.response.status === 200 && net.payload.source === 'postgresql', 'Net requirements endpoint must use the relational read model in database mode.');
    assert(net.payload.data.some((item: any) => item.partId === part.id && item.grossDemandQty === baselineGrossDemand + 123), 'Net requirements endpoint must return the persisted relational demand.');
    console.log('PASS: Net requirements endpoint uses relational data and correct demand netting.');

    const suggestions = await requestJson(baseUrl, '/api/planning/suggestions');
    assert(suggestions.response.status === 409 && suggestions.payload.code === 'RELATIONAL_PLAN_LIFECYCLE_PENDING', 'Unmigrated in-memory suggestions must be blocked in database mode.');
    const dashboard = await requestJson(baseUrl, '/api/planning/dashboard-metrics');
    assert(dashboard.response.status === 409 && dashboard.payload.code === 'RELATIONAL_PLANNING_DASHBOARD_PENDING', 'Sample-backed planning dashboard must be blocked in database mode.');
    console.log('PASS: Sample-backed suggestions and dashboard fail closed instead of leaking sample data.');
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    if (orderId) await prisma.customerOrder.deleteMany({ where: { id: orderId } });
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('Relational planning read-model test failed:', error);
  process.exitCode = 1;
});
