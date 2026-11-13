import express from 'express';
import { apiRouter, loadInventoryAppState } from '../src/server/apiRouter';
import { loadProductionWipState } from '../src/server/productionWipEngine';
import { INITIAL_PARTS } from '../src/server/sampleData';
import { getPrismaClient } from '../src/server/db/prisma';

const prisma = getPrismaClient();
const nonce = `REL-PLAN-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
let orderId: string | undefined;
let proposalGroupId: string | undefined;
let planId: string | undefined;
let coilId: string | undefined;
let materialLotId: string | undefined;
let contractId: string | undefined;
let materialIssueDocumentId: string | undefined;
let materialIssuePartId: string | undefined;
let materialIssueLocationId: string | undefined;
let materialIssueWarehouseId: string | undefined;
let createdMaterialIssueWarehouse = false;
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
    assert(net.payload.data.some((item: any) => item.partId === part.id && item.grossDemandQty === baselineGrossDemand + 1000123), 'Net requirements endpoint must return the persisted relational demand.');
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

    const releasedMoIds = release.payload.data.manufacturingOrders.map((item: any) => item.id);
    const bridgedWipOrderIds = releasedMoIds.map((id: string) => `WIP-${id}`);
    const bridgeLinks = await prisma.wipManufacturingOrderLink.findMany({
      where: { manufacturingOrderId: { in: releasedMoIds } },
      include: { operationLinks: true, manufacturingOrder: { include: { operations: true } } },
    });
    assert(bridgeLinks.length === releasedMoIds.length, 'Every released relational MO must have one durable WIP identity bridge.');
    for (const bridge of bridgeLinks) {
      assert(bridge.operationLinks.length === bridge.manufacturingOrder.operations.length, 'Every relational operation must have exactly one WIP operation identity link.');
    }
    const wipSnapshot = await prisma.wipStateSnapshot.findUnique({ where: { id: 'production-wip-state' } });
    const wipPayload = wipSnapshot?.payload as any;
    const mirroredOrders = (wipPayload?.manufacturingOrders || []).filter((item: any) => bridgedWipOrderIds.includes(item.id));
    assert(mirroredOrders.length === releasedMoIds.length, 'Every released MO must be present in the durable WIP execution snapshot.');
    for (const mirrored of mirroredOrders) {
      assert(mirrored.initialInputQuantity === 0, 'Plan release must not fabricate an initial material issue or WIP quantity.');
      assert(mirrored.operations[0]?.status === 'READY' && mirrored.operations[0]?.waitingInputQty === 0, 'First operation is ready for material input but must have zero waiting quantity until material is issued.');
      assert(mirrored.operations.slice(1).every((item: any) => item.status === 'PENDING'), 'Downstream WIP operations must remain pending.');
    }
    console.log('PASS: Relational MO and operation identities are bridged into WIP atomically without inventing material input.');

    const issueOptions = await requestJson(baseUrl, '/api/inventory/coils/issue-options');
    assert(issueOptions.response.status === 200 && issueOptions.payload.success, 'Coil issue options must load from the relational manufacturing-order ledger.');
    for (const releasedMo of release.payload.data.manufacturingOrders) {
      const issueOption = issueOptions.payload.data.find((item: any) => item.id === releasedMo.id);
      assert(issueOption, 'Every newly released relational MO with a READY first operation must be available for raw-material issue.');
      assert(issueOption.wipManufacturingOrderId === `WIP-${releasedMo.id}`, 'Coil issue options must resolve the exact durable WIP bridge identity, not infer it from part and MO labels.');
      assert(issueOption.operations[0]?.isFirstOperation && issueOption.operations[0]?.status === 'READY', 'The first released operation must be exposed as the initial material-input target.');
    }
    console.log('PASS: Newly released relational MOs appear in coil issue options with their durable WIP identity.');

    // Full E2E: use the newly released MO (not a seeded/legacy WIP fixture),
    // receive and allocate a real physical coil, issue it into first-stage WIP,
    // load the operation, and post its first production report atomically.
    const e2eMo = await prisma.manufacturingOrder.findUnique({
      where: { id: linkedPlanLine.manufacturingOrders[0].id },
      include: {
        part: { include: { unit: true } },
        operations: { include: { operation: true, plannedMachine: true }, orderBy: { stepNumber: 'asc' } },
      },
    });
    assert(e2eMo && e2eMo.operations.length >= 2, 'E2E released MO must contain at least two relational operations.');
    assert(e2eMo.part.unit.code === 'PCS' && Number(e2eMo.part.weightNetKg || 0) > 0, 'E2E finished part must use PCS and have positive engineering net weight.');
    const rawParts = await prisma.part.findMany({
      where: { active: true, category: 'RAW_MATERIAL', materialId: { not: null } },
      include: { material: true, unit: true },
    });
    const rawPart = rawParts.find(item => item.unit.code === 'KG' && item.material);
    const appRawPart = rawPart ? INITIAL_PARTS.find(item => item.code === rawPart.partNumber) : undefined;
    const rawWarehouse = await prisma.warehouse.findFirst({ where: { code: 'WH-RAW', active: true } });
    const supplier = await prisma.customer.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } });
    assert(rawPart?.material && appRawPart && rawWarehouse && supplier, 'E2E requires a KG raw-material item mapped to the app catalog, WH-RAW and an active supplier/customer.');

    // Non-coil component issue: a bolt/consumable is transferred to the
    // released MO operation's WIP staging location without changing produced-part WIP.
    const pcsUnit = await prisma.unitOfMeasure.findUnique({ where: { code: 'PCS' } });
    const activeUser = await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } });
    assert(pcsUnit && activeUser, 'Non-coil material issue test requires PCS UoM and an active user.');
    let wipWarehouse = await prisma.warehouse.findFirst({ where: { active: true, type: 'WIP' } });
    if (!wipWarehouse) {
      wipWarehouse = await prisma.warehouse.create({
        data: { code: `${nonce}-WIP`, name: 'CI Non-coil Material WIP', type: 'WIP' },
      });
      materialIssueWarehouseId = wipWarehouse.id;
      createdMaterialIssueWarehouse = true;
    }
    const stagingLocation = await prisma.warehouseLocation.create({
      data: { warehouseId: wipWarehouse.id, code: `${nonce}-STAGE`, aisle: 'CI', rack: 'MATERIAL' },
    });
    materialIssueLocationId = stagingLocation.id;
    const componentPart = await prisma.part.create({
      data: {
        partNumber: `${nonce}-BOLT`,
        name: 'CI Bolt Component',
        category: 'CONSUMABLE',
        unitId: pcsUnit.id,
      },
    });
    materialIssuePartId = componentPart.id;
    const sourceBalance = await prisma.stockBalance.create({
      data: {
        partId: componentPart.id,
        warehouseId: rawWarehouse.id,
        quantityOnHand: 50,
        quantityReserved: 0,
        quantityAvailable: 50,
        weightKgOnHand: 0,
        weightKgReserved: 0,
        weightKgAvailable: 0,
        ownership: 'COMPANY_OWNED',
        qualityStatus: 'AVAILABLE',
      },
    });
    const targetOperation = e2eMo!.operations[0];
    const operationBefore = await prisma.productionOperation.findUnique({ where: { id: targetOperation.id } });
    const issueKey = `${nonce}-MAT-ISSUE`;
    const issueBody = {
      sourceStockBalanceId: sourceBalance.id,
      productionOperationId: targetOperation.id,
      targetWarehouseId: wipWarehouse.id,
      targetLocationId: stagingLocation.id,
      quantity: 10,
      weightKg: 0,
      unitId: pcsUnit.id,
      createdByUserId: activeUser.id,
      issueRequestKey: issueKey,
      notes: 'CI operation-linked component issue',
    };
    const materialIssueOptions = await requestJson(baseUrl, '/api/inventory/material-issue-options');
    assert(materialIssueOptions.response.status === 200 && materialIssueOptions.payload.success, 'Non-coil issue UI options endpoint must load.');
    assert(materialIssueOptions.payload.data.stockBalances.some((item: any) => item.id === sourceBalance.id), 'Issue options must include the selected available non-coil stock balance.');
    assert(materialIssueOptions.payload.data.operations.some((item: any) => item.id === targetOperation.id), 'Issue options must include the released operation with a WIP identity link.');
    assert(materialIssueOptions.payload.data.warehouses.some((item: any) => item.id === wipWarehouse!.id && item.locations.some((location: any) => location.id === stagingLocation.id)), 'Issue options must include the active WIP staging warehouse and location.');
    const materialIssue = await requestJson(baseUrl, '/api/inventory/material-issues', 'POST', issueBody);
    assert(materialIssue.response.status === 201 && materialIssue.payload.success, `Non-coil material issue failed: ${JSON.stringify(materialIssue.payload)}`);
    materialIssueDocumentId = materialIssue.payload.data.id;
    assert(materialIssue.payload.data.lines[0].productionOperationId === targetOperation.id, 'Material issue document line must reference the exact production operation.');
    assert(materialIssue.payload.data.transactions.length === 2, 'Material issue must create paired transfer-out and transfer-in ledger rows.');
    assert(materialIssue.payload.data.transactions.reduce((sum: number, row: any) => sum + Number(row.quantitySigned), 0) === 0, 'Paired quantity movements must balance to zero.');
    const sourceAfterIssue = await prisma.stockBalance.findUnique({ where: { id: sourceBalance.id } });
    const targetAfterIssue = await prisma.stockBalance.findFirst({
      where: { partId: componentPart.id, warehouseId: wipWarehouse.id, locationId: stagingLocation.id },
    });
    assert(Number(sourceAfterIssue?.quantityOnHand) === 40 && Number(sourceAfterIssue?.quantityAvailable) === 40, 'Source material stock must decrease by exactly 10 PCS.');
    assert(Number(targetAfterIssue?.quantityOnHand) === 10 && Number(targetAfterIssue?.quantityAvailable) === 10, 'Operation staging stock must increase by exactly 10 PCS.');
    assert(materialIssue.payload.producedPartWipChanged === false, 'Component issue must not create or alter produced-part WIP quantities.');
    const replayIssue = await requestJson(baseUrl, '/api/inventory/material-issues', 'POST', issueBody);
    assert(replayIssue.response.status === 200 && replayIssue.payload.replayed, 'Same-key material issue retry must return the original document.');
    const changedIssue = await requestJson(baseUrl, '/api/inventory/material-issues', 'POST', { ...issueBody, quantity: 11 });
    assert(changedIssue.response.status === 409, 'Reusing an issue key with a changed payload must be rejected.');
    const insufficientIssue = await requestJson(baseUrl, '/api/inventory/material-issues', 'POST', { ...issueBody, issueRequestKey: `${nonce}-MAT-LOW`, quantity: 1000 });
    assert(insufficientIssue.response.status === 409, 'Insufficient component stock must be rejected.');
    const sourceAfterRejected = await prisma.stockBalance.findUnique({ where: { id: sourceBalance.id } });
    assert(Number(sourceAfterRejected?.quantityOnHand) === 40, 'Rejected and duplicate requests must not change source stock.');
    const operationAfter = await prisma.productionOperation.findUnique({ where: { id: targetOperation.id } });
    assert(Number(operationAfter?.inputQty) === Number(operationBefore?.inputQty), 'Component staging must not alter the manufactured part operation input counter.');
    console.log('PASS: Non-coil material issue transfers component stock to an operation WIP location, preserves ledger balance, and rejects duplicate/conflicting/insufficient requests.');

    assert(e2eMo.operations[0].plannedMachineId, 'E2E first operation must have an eligible machine assigned by the released plan.');
    const firstOperation = e2eMo.operations[0];
    const wipMoId = `WIP-${e2eMo.id}`;
    const wipOperationId = `WIPOP-${firstOperation.id}`;
    const releasedSnapshot = await prisma.wipStateSnapshot.findUnique({ where: { id: 'production-wip-state' } });
    const releasedWipOrder = ((releasedSnapshot?.payload as any)?.manufacturingOrders || []).find((row: any) => row.id === wipMoId);
    const firstWipOperation = releasedWipOrder?.operations?.find((row: any) => row.id === wipOperationId);
    const firstStageLocation = firstWipOperation
      ? await prisma.warehouseLocation.findFirst({ where: { code: firstWipOperation.warehouseLocation, active: true } })
      : null;
    assert(firstStageLocation, 'E2E first operation requires its configured WIP warehouse location.');
    const contract = await prisma.materialContract.create({
      data: {
        contractNumber: `${nonce}-E2E-CONTRACT`,
        supplierCustomerId: supplier.id,
        title: 'CI relational plan to production E2E',
        materialId: rawPart.materialId!,
        totalAllocatedWeightKg: 100,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
      },
    });
    contractId = contract.id;

    await loadInventoryAppState();
    await loadProductionWipState();
    const receipt = await requestJson(baseUrl, '/api/inventory/coils', 'POST', {
      coilId: `${nonce}-E2E-COIL`,
      coilPackNumber: `${nonce}-E2E-PACK`,
      partId: appRawPart.id,
      partCode: appRawPart.code,
      partName: appRawPart.name,
      materialGrade: rawPart.material.grade,
      thicknessMm: Number(rawPart.thicknessMm || 1),
      widthMm: 1000,
      originalWeightKg: 100,
      remainingWeightKg: 100,
      warehouseId: rawWarehouse.code,
      warehouseLocationCode: 'LOC-RAW-A1',
      ownership: 'SAPCO_SUPPLIER_OWNED',
      qualityStatus: 'AVAILABLE',
      physicalStatus: 'AVAILABLE',
      allocations: [],
    });
    assert(receipt.response.status === 201 && receipt.payload.success && receipt.payload.data?.id, `E2E physical coil receipt failed: ${JSON.stringify(receipt.payload)}`);
    coilId = receipt.payload.data.id;
    materialLotId = (await prisma.physicalCoil.findUnique({ where: { id: coilId } }))?.materialLotId || undefined;
    assert(materialLotId, 'E2E coil receipt must create and retain its material lot.');
    const allocated = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/allocate`, 'POST', {
      allocations: [{ contractId: contract.id, contractNumber: contract.contractNumber, allocatedWeightKg: 100 }],
    });
    assert(allocated.response.status === 200 && allocated.payload.success, 'E2E physical coil must be allocated to its material contract.');

    const issuePayload = {
      issueRequestKey: `${nonce}-E2E-ISSUE-KEY`,
      issuedWeightKg: 70,
      moId: e2eMo.moNumber,
      moOperationId: firstOperation.id,
      partId: e2eMo.partId,
      scrappedKg: 0,
      initialInputQuantityPcs: 15,
      wipManufacturingOrderId: wipMoId,
    };
    const issued = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/issue`, 'POST', issuePayload);
    assert(issued.response.status === 200 && issued.payload.success && !issued.payload.duplicate,
      `E2E coil issue into the released relational MO failed: ${JSON.stringify(issued.payload)}`);
    const issueRetry = await requestJson(baseUrl, `/api/inventory/coils/${coilId}/issue`, 'POST', issuePayload);
    const coilAfterIssue = await prisma.physicalCoil.findUnique({ where: { id: coilId } });
    assert(issueRetry.response.status === 200 && issueRetry.payload.duplicate === true && Number(coilAfterIssue?.remainingWeightKg) === 30,
      'E2E duplicate coil issue must not deduct the physical coil or WIP input twice.');
    const initialWipBalance = await prisma.stockBalance.findFirst({
      where: { physicalCoilId: coilId, partId: e2eMo.partId, locationId: firstStageLocation.id, qualityStatus: 'AVAILABLE' },
    });
    assert(Number(initialWipBalance?.quantityOnHand) === 15 && initialWipBalance?.contractId === contract.id,
      'E2E issue must create 15 PCS at first-stage WIP while retaining physical coil and contract identity.');
    console.log('PASS: Released relational MO receives operator-confirmed first-stage PCS from a real physical coil.');

    const postingContext = await requestJson(baseUrl, `/api/wip/production-posting-context?wipMoId=${encodeURIComponent(wipMoId)}`);
    assert(postingContext.response.status === 200 && postingContext.payload.success && postingContext.payload.data.identityLink?.manufacturingOrderId === e2eMo.id,
      'E2E WIP production context must resolve the same released relational MO.');
    const shift = postingContext.payload.data.shifts[0];
    const user = postingContext.payload.data.users[0];
    assert(shift && user, 'E2E production posting requires an active shift and active user.');
    const machineId = firstOperation.plannedMachineId || postingContext.payload.data.machines[0]?.id;
    assert(machineId, 'E2E production posting requires an active machine.');
    const loaded = await requestJson(baseUrl, '/api/wip/operations/input', 'POST', {
      moId: wipMoId,
      operationId: wipOperationId,
      quantity: 15,
      operatorName: 'CI E2E Operator',
      machineId,
      notes: 'Load 15 PCS issued from the relational plan E2E coil',
    });
    assert(loaded.response.status === 200 && loaded.payload.success, `E2E first-operation input load failed: ${JSON.stringify(loaded.payload)}`);

    const productionPayload = {
      moId: wipMoId,
      operationId: wipOperationId,
      relationalManufacturingOrderId: e2eMo.id,
      idempotencyKey: `${nonce}-E2E-PRODUCTION-KEY`,
      relationalMachineId: machineId,
      shiftId: shift.id,
      createdByUserId: user.id,
      goodQty: 14,
      scrapQty: 1,
      reworkQty: 0,
      rejectedQty: 0,
      scrapReason: 'CI E2E validation scrap',
      operatorName: 'CI E2E Operator',
      notes: 'First operation production report after relational plan release and coil issue',
    };
    const production = await requestJson(baseUrl, '/api/wip/operations/production', 'POST', productionPayload);
    assert(production.response.status === 201 && production.payload.success && production.payload.inventoryPosted === true,
      `E2E atomic first production report failed: ${JSON.stringify(production.payload)}`);
    const productionRetry = await requestJson(baseUrl, '/api/wip/operations/production', 'POST', productionPayload);
    assert(productionRetry.response.status === 200 && productionRetry.payload.duplicate === true,
      'E2E retry of the first production report must return the original report without duplicate ledger postings.');

    const [reportCount, sourceAfter, nextOperation, scrapWarehouse, wipAfterProduction, postedTransactions] = await Promise.all([
      prisma.productionReport.count({ where: { wipIdempotencyKey: productionPayload.idempotencyKey } }),
      prisma.stockBalance.findFirst({ where: { physicalCoilId: coilId, partId: e2eMo.partId, locationId: firstStageLocation.id, qualityStatus: 'AVAILABLE' } }),
      prisma.productionOperation.findUnique({ where: { id: firstOperation.id } }),
      prisma.warehouse.findFirst({ where: { type: 'SCRAP', active: true }, include: { locations: { where: { active: true }, orderBy: { code: 'asc' }, take: 1 } } }),
      prisma.wipStateSnapshot.findUnique({ where: { id: 'production-wip-state' } }),
      prisma.inventoryTransaction.findMany({ where: { productionReportId: production.payload.report?.id } }),
    ]);
    assert(reportCount === 1, 'E2E production report must be persisted exactly once.');
    assert(Number(sourceAfter?.quantityOnHand || 0) === 0, 'E2E production posting must consume all 15 PCS from first-stage WIP.');
    assert(Number(nextOperation?.outputGoodQty) === 14 && Number(nextOperation?.inputQty) === 15 && Number(nextOperation?.outputScrapQty) === 1,
      `E2E reported relational operation must record 15 input, 14 good and 1 scrap (actual input=${nextOperation?.inputQty}, good=${nextOperation?.outputGoodQty}, scrap=${nextOperation?.outputScrapQty}).`);
    assert(scrapWarehouse?.locations?.[0], 'E2E scrap posting requires an active scrap warehouse location.');
    const nextWipOperation = releasedWipOrder.operations.find((row: any) => row.sequence === firstWipOperation.sequence + 1);
    const nextLocation = nextWipOperation
      ? await prisma.warehouseLocation.findFirst({ where: { code: nextWipOperation.warehouseLocation, active: true } })
      : null;
    assert(nextLocation, 'E2E next operation requires the configured downstream WIP location.');
    const nextBalance = await prisma.stockBalance.findFirst({
      where: { partId: e2eMo.partId, locationId: nextLocation.id, qualityStatus: 'AVAILABLE', physicalCoilId: coilId },
    });
    const scrapBalance = await prisma.stockBalance.findFirst({
      where: { partId: e2eMo.partId, locationId: scrapWarehouse.locations[0].id, qualityStatus: 'SCRAP', physicalCoilId: coilId },
    });
    assert(Number(nextBalance?.quantityOnHand) === 14 && Number(scrapBalance?.quantityOnHand) === 1,
      'E2E 14 good PCS must move automatically to the next operation and 1 scrap PCS to the scrap location.');
    assert(postedTransactions.length === 3, 'E2E first production report must create one source, one good-output and one scrap ledger transaction.');
    const snapshotOrderAfterProduction = ((wipAfterProduction?.payload as any)?.manufacturingOrders || []).find((row: any) => row.id === wipMoId);
    assert(snapshotOrderAfterProduction?.operations[0]?.status === 'COMPLETED' &&
      snapshotOrderAfterProduction?.operations[1]?.status === 'READY' &&
      Number(snapshotOrderAfterProduction.operations[1]?.waitingInputQty) === 14,
      'E2E WIP snapshot must complete the first operation and automatically queue 14 good PCS at the next operation without receiving confirmation.');
    console.log('PASS: End-to-end relational plan → coil issue → first-stage input → atomic production report → automatic next-stage WIP transfer.');

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
    const cleanupMoIds = planId
      ? (await prisma.manufacturingOrder.findMany({ where: { planId }, select: { id: true } })).map((item: any) => item.id)
      : [];
    if (cleanupMoIds.length) {
      await prisma.inventoryTransaction.deleteMany({ where: { manufacturingOrderId: { in: cleanupMoIds } } });
      await prisma.productionReport.deleteMany({ where: { manufacturingOrderId: { in: cleanupMoIds } } });
    }
    if (materialIssueDocumentId) {
      await prisma.inventoryTransaction.deleteMany({ where: { documentId: materialIssueDocumentId } });
      await prisma.inventoryDocumentLine.deleteMany({ where: { documentId: materialIssueDocumentId } });
      await prisma.inventoryDocument.deleteMany({ where: { id: materialIssueDocumentId } });
    }
    if (materialIssuePartId) {
      await prisma.stockBalance.deleteMany({ where: { partId: materialIssuePartId } });
      await prisma.part.deleteMany({ where: { id: materialIssuePartId } });
    }
    if (materialIssueLocationId) await prisma.warehouseLocation.deleteMany({ where: { id: materialIssueLocationId } });
    if (createdMaterialIssueWarehouse && materialIssueWarehouseId) {
      await prisma.warehouse.deleteMany({ where: { id: materialIssueWarehouseId } });
    }
    if (coilId) {
      const coilDocs = await prisma.inventoryDocument.findMany({ where: { lines: { some: { physicalCoilId: coilId } } }, select: { id: true } });
      await prisma.inventoryTransaction.deleteMany({ where: { physicalCoilId: coilId } });
      await prisma.inventoryDocumentLine.deleteMany({ where: { physicalCoilId: coilId } });
      await prisma.coilIssueReturnRecord.deleteMany({ where: { coilId } });
      await prisma.stockBalance.deleteMany({ where: { physicalCoilId: coilId } });
      await prisma.contractCoilAllocation.deleteMany({ where: { coilId } });
      if (coilDocs.length) await prisma.inventoryDocument.deleteMany({ where: { id: { in: coilDocs.map(row => row.id) } } });
      await prisma.physicalCoil.deleteMany({ where: { id: coilId } });
    }
    if (materialLotId) await prisma.materialLot.deleteMany({ where: { id: materialLotId } });
    if (contractId) {
      await prisma.materialContractTransaction.deleteMany({ where: { contractId } });
      await prisma.materialContract.deleteMany({ where: { id: contractId } });
    }
    if (planId) {
      const releasedMoIds = (await prisma.manufacturingOrder.findMany({ where: { planId }, select: { id: true } })).map((item: any) => item.id);
      if (releasedMoIds.length) {
        await prisma.inventoryTransaction.deleteMany({ where: { manufacturingOrderId: { in: releasedMoIds } } });
        await prisma.productionReport.deleteMany({ where: { manufacturingOrderId: { in: releasedMoIds } } });
      }
      if (releasedMoIds.length) {
        await prisma.wipManufacturingOrderLink.deleteMany({ where: { manufacturingOrderId: { in: releasedMoIds } } });
      }
      const snapshot = await prisma.wipStateSnapshot.findUnique({ where: { id: 'production-wip-state' } });
      const cleanupWipOrderIds = releasedMoIds.map((id: string) => `WIP-${id}`);
      if (snapshot && cleanupWipOrderIds.length) {
        const payload = snapshot.payload as any;
        if (payload && Array.isArray(payload.manufacturingOrders)) {
          await prisma.wipStateSnapshot.updateMany({
            where: { id: 'production-wip-state', version: snapshot.version },
            data: {
              payload: {
                ...payload,
                manufacturingOrders: payload.manufacturingOrders.filter((item: any) => !cleanupWipOrderIds.includes(item.id)),
                wipTransfers: (payload.wipTransfers || []).filter((item: any) => !cleanupWipOrderIds.includes(item.moId)),
                productionLogs: (payload.productionLogs || []).filter((item: any) => !cleanupWipOrderIds.includes(item.moId)),
              },
              version: { increment: 1 },
            },
          });
        }
      }
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
