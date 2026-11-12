import express from 'express';
import { apiRouter } from '../src/server/apiRouter';
import { getPrismaClient } from '../src/server/db/prisma';

const prisma = getPrismaClient();
const nonce = `REL-PLAN-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
let orderId: string | undefined;
let proposalGroupId: string | undefined;
let planId: string | undefined;
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
      lines: [{ partCode: part.partNumber, orderedQuantity: 1000137, deliveredQuantity: 14, dueDate: '2026-11-18' }],
    });
    assert(create.response.status === 201 && create.payload.success, `Test demand order creation failed: ${JSON.stringify(create.payload)}`);
    orderId = create.payload.data.id;

    const readModel = await requestJson(baseUrl, '/api/planning/read-model');
    assert(readModel.response.status === 200 && readModel.payload.success, `Relational read model failed: ${JSON.stringify(readModel.payload)}`);
    assert(readModel.payload.data.source === 'postgresql', 'Read model must explicitly identify PostgreSQL as its source.');
    const requirement = readModel.payload.data.requirements.find((item: any) => item.partId === part.id);
    assert(requirement, 'Relational read model must include the newly persisted customer demand.');
    assert(requirement.grossDemandQty === baselineGrossDemand + 1000123, 'Gross demand must increase by ordered quantity less delivered quantity from relational order lines.');
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

    const customerLine = await prisma.customerOrderLine.findFirst({ where: { orderId }, orderBy: { lineNumber: 'asc' } });
    assert(customerLine, 'Test customer order must have a persisted relational order line.');

    const generated = await requestJson(baseUrl, '/api/planning/proposals/regenerate', 'POST', { notes: 'CI relational proposal lifecycle' });
    assert(generated.response.status === 201 && generated.payload.success, `Relational proposal generation failed: ${JSON.stringify(generated.payload)}`);
    const proposal = generated.payload.data;
    proposalGroupId = proposal.revisionGroupId;
    const proposalLine = proposal.lines.find((item: any) => item.customerOrderLineId === customerLine.id);
    assert(proposal.status === 'DRAFT' && proposalLine, 'Generated proposal must be persisted as DRAFT and linked to the exact customer order line.');
    assert(Number(proposalLine.plannedQty) > 0, 'A high-demand test line must produce a positive net planned quantity.');
    assert(proposalLine.routeId === part.routes[0].id, 'Proposal must persist the relational default route.');
    assert(proposalLine.operationAssignments.length === part.routes[0].operations.length, 'Proposal must persist one machine-selection record per route operation.');
    console.log('PASS: Version 1 proposal is persisted and linked to individual customer-order lines.');

    const revised = await requestJson(baseUrl, `/api/planning/proposals/${proposal.id}/revise`, 'POST', {
      note: 'CI versioning check',
      changes: [{ proposalLineId: proposalLine.id, operationAssignments: proposalLine.operationAssignments }],
    });
    assert(revised.response.status === 201 && revised.payload.data.version === 2, 'Revision must create a new persisted proposal version.');
    assert(revised.payload.data.status === 'DRAFT', 'Revised proposal must return to DRAFT.');
    const oldProposal = await prisma.productionPlanProposal.findUnique({ where: { id: proposal.id } });
    assert(oldProposal?.status === 'SUPERSEDED', 'Previous proposal version must be marked SUPERSEDED.');
    const activeProposalId = revised.payload.data.id;
    console.log('PASS: Proposal revision creates version 2 and supersedes version 1.');

    const approved = await requestJson(baseUrl, `/api/planning/proposals/${activeProposalId}/approve`, 'POST', { approvedBy: 'CI Test Approver' });
    assert(approved.response.status === 200 && approved.payload.data.status === 'APPROVED', 'Only the current draft version should transition to APPROVED.');
    const release = await requestJson(baseUrl, `/api/planning/proposals/${activeProposalId}/release`, 'POST', { releasedBy: 'CI Test Release' });
    assert(release.response.status === 201 && release.payload.success, `Approved proposal release failed: ${JSON.stringify(release.payload)}`);
    assert(release.payload.data.proposal.status === 'RELEASED', 'Proposal must be marked RELEASED in the same transaction as plan/MO creation.');
    assert(release.payload.data.plan.status === 'IN_PROGRESS', 'Release must create the relational production plan.');
    assert(release.payload.data.manufacturingOrders.length === revised.payload.data.lines.length, 'Each proposal demand line must create one manufacturing order.');
    planId = release.payload.data.plan.id;
    const linkedPlanLine = await prisma.productionPlanLine.findFirst({
      where: { planId, customerOrderLineId: customerLine.id },
      include: { manufacturingOrders: { include: { operations: { orderBy: { stepNumber: 'asc' } } } } },
    });
    assert(linkedPlanLine && linkedPlanLine.manufacturingOrders.length === 1, 'Released plan line must retain exact customer-order-line and MO traceability.');
    assert(linkedPlanLine.manufacturingOrders[0].operations.length === part.routes[0].operations.length, 'Released MO must materialize every route operation.');
    assert(linkedPlanLine.manufacturingOrders[0].operations[0].status === 'READY', 'First MO operation must be READY; later operations wait for predecessor output.');
    assert(linkedPlanLine.manufacturingOrders[0].operations.slice(1).every((item: any) => item.status === 'PENDING'), 'Downstream MO operations must remain PENDING.');
    const replay = await requestJson(baseUrl, `/api/planning/proposals/${activeProposalId}/release`, 'POST', { releasedBy: 'CI Retry' });
    assert(replay.response.status === 200 && replay.payload.data.replayed, 'Repeated release must be idempotent.');
    assert(replay.payload.data.plan.id === planId, 'Repeated release must return the original plan, not create another one.');
    console.log('PASS: Approval, transactional plan/MO release, route operation materialization and idempotent replay.');

    const suggestions = await requestJson(baseUrl, '/api/planning/suggestions');
    assert(suggestions.response.status === 409 && suggestions.payload.code === 'RELATIONAL_PLAN_LIFECYCLE_PENDING', 'Legacy in-memory suggestions must remain blocked in database mode.');
    const dashboard = await requestJson(baseUrl, '/api/planning/dashboard-metrics');
    assert(dashboard.response.status === 409 && dashboard.payload.code === 'RELATIONAL_PLANNING_DASHBOARD_PENDING', 'Sample-backed planning dashboard must be blocked in database mode.');
    console.log('PASS: Sample-backed legacy suggestions and dashboard fail closed instead of leaking sample data.');
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    if (planId) {
      await prisma.manufacturingOrder.deleteMany({ where: { planId } });
      await prisma.productionPlan.deleteMany({ where: { id: planId } });
    }
    if (proposalGroupId) await prisma.productionPlanProposal.deleteMany({ where: { revisionGroupId: proposalGroupId } });
    if (orderId) await prisma.customerOrder.deleteMany({ where: { id: orderId } });
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('Relational planning read-model test failed:', error);
  process.exitCode = 1;
});
