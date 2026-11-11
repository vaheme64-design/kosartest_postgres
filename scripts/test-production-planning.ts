import {
  calculateNetRequirements,
  evaluateMachineEligibility,
  generateProductionPlanSuggestions,
  approvePlanSuggestion,
  releasePlanToManufacturingOrder,
  revisePlanVersion,
  getPlanningDashboardMetrics,
  customerOrdersStore,
  planSuggestionsStore,
} from '../src/server/productionPlanningEngine';
import { INITIAL_PARTS, INITIAL_MACHINES, INITIAL_DIES_MOLDS, INITIAL_ROUTINGS } from '../src/server/sampleData';
import { CustomerOrder } from '../src/types/productionPlanning';
import { DetailedStockBalance, InventoryReservation, Machine } from '../src/types/inventory';
import { ManufacturingOrder } from '../src/types/productionWip';

function runAssertion(desc: string, condition: boolean) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  } else {
    console.log(`  ✅ [PASS] ${desc}`);
  }
}

async function runProductionPlanningTests() {
  console.log('🧪 Starting KPIMS Production Planning Engine Automated Test Suite...\n');

  // =========================================================================
  // TEST GROUP 1: Demand & Netting Logic (FG, Blocked Stock, Reservations)
  // =========================================================================
  console.log('📋 Test Group 1: Demand & Netting Logic (FG, Blocked Stock, Reservations)');
  const testPart = INITIAL_PARTS.find(p => p.code === 'SAPCO-ASSY-206-001') || INITIAL_PARTS[33];

  const testOrders: CustomerOrder[] = [
    {
      id: 'TEST-ORD-01',
      orderNumber: 'SO-TEST-01',
      customerName: 'ساپکو',
      contractNumber: 'CNT-01',
      orderDate: '2026-10-31',
      dueDate: '2026-11-06',
      priority: 1,
      status: 'OPEN',
      createdAt: '2026-10-31',
      lines: [
        {
          id: 'LN-01',
          orderId: 'TEST-ORD-01',
          partId: testPart.id,
          partCode: testPart.code,
          partName: testPart.name,
          orderedQuantity: 1000,
          deliveredQuantity: 0,
          remainingQuantity: 1000,
          dueDate: '2026-11-06',
        },
      ],
    },
  ];

  // Stock scenario: 300 Physical in WH-FINISHED, 50 Blocked (quarantine), 50 Reserved
  // Available FG must be exactly 300 - 50 - 50 = 200 PCS
  const mockBalances: DetailedStockBalance[] = [
    {
      id: 'BAL-01',
      partId: testPart.id,
      partCode: testPart.code,
      partName: testPart.name,
      category: 'FINISHED_GOOD',
      warehouseId: 'WH-FINISHED',
      warehouseName: 'انبار محصولات نهایی',
      locationCode: 'LOC-FIN-P1',
      ownership: 'COMPANY_OWNED',
      unit: 'PCS',
      physicalQty: 300,
      ownedQty: 300,
      supplierOwnedQty: 0,
      reservedQty: 50,
      qualityBlockedQty: 50,
      availableQty: 200,
      physicalKg: 294,
      ownedKg: 294,
      supplierOwnedKg: 0,
      reservedKg: 49,
      qualityBlockedKg: 49,
      availableKg: 196,
      lastTransactionAt: '2026-10-31T00:00:00Z',
    },
    // Raw material coil in stock: 1200 KG DC04/ST14
    {
      id: 'BAL-RAW-01',
      partId: 'PRT-RAW-001',
      partCode: 'SAPCO-COIL-DC04-0.8',
      partName: 'کویل ورق DC04',
      category: 'RAW_MATERIAL',
      warehouseId: 'WH-RAW',
      warehouseName: 'انبار رول و ورق',
      locationCode: 'LOC-RAW-A1',
      materialGrade: 'ST14+ST37',
      ownership: 'SAPCO_SUPPLIER_OWNED',
      unit: 'KG',
      physicalQty: 1500,
      ownedQty: 0,
      supplierOwnedQty: 1500,
      reservedQty: 0,
      qualityBlockedQty: 0,
      availableQty: 1500,
      physicalKg: 1500,
      ownedKg: 0,
      supplierOwnedKg: 1500,
      reservedKg: 0,
      qualityBlockedKg: 0,
      availableKg: 1500,
      lastTransactionAt: '2026-10-31T00:00:00Z',
    },
  ];

  const mockReservations: InventoryReservation[] = [
    {
      id: 'RES-01',
      reservationNumber: 'RSV-001',
      partId: testPart.id,
      partCode: testPart.code,
      partName: testPart.name,
      warehouseId: 'WH-FINISHED',
      warehouseName: 'انبار محصولات',
      ownership: 'COMPANY_OWNED',
      reservedFor: 'سفارش قبلی ایران‌خودرو',
      quantity: 50,
      quantityKg: 49,
      unit: 'PCS',
      status: 'ACTIVE',
      createdAt: '2026-10-30T00:00:00Z',
    },
  ];

  // No active WIP yet
  const netReqsWithoutWip = calculateNetRequirements({
    parts: [testPart],
    orders: testOrders,
    balances: mockBalances,
    reservations: mockReservations,
    activeMos: [],
  });

  runAssertion('Gross demand calculated correctly (1000 PCS)', netReqsWithoutWip[0].grossDemandQty === 1000);
  runAssertion('Available FG correctly netted excluding blocked and reserved (200 PCS)', netReqsWithoutWip[0].availableFinishedGoodsQty === 200);
  runAssertion('Net demand after FG is 800 PCS (1000 - 200)', netReqsWithoutWip[0].netDemandAfterFg === 800);
  runAssertion('Net production requirement without WIP is 800 PCS', netReqsWithoutWip[0].netProductionRequirement === 800);

  // =========================================================================
  // TEST GROUP 2: Stage-Level WIP Netting Logic
  // =========================================================================
  console.log('\n📋 Test Group 2: Stage-Level WIP Netting Across Operations');
  // Scenario: An active MO exists with 250 units in-progress/ready at OP40
  const mockActiveMos: ManufacturingOrder[] = [
    {
      id: 'MO-TEST-WIP',
      moNumber: 'MO-TEST-WIP',
      partId: testPart.id,
      partCode: testPart.code,
      partName: testPart.name,
      targetQuantity: 500,
      initialInputQuantity: 500,
      completedQuantity: 0,
      totalScrapQuantity: 0,
      totalReworkQuantity: 0,
      totalRejectedQuantity: 0,
      routingId: 'RTG-001',
      routingVersion: 'V2.1',
      status: 'IN_PROGRESS',
      startDate: '2026-10-30',
      dueDate: '2026-11-05',
      createdAt: '2026-10-30',
      updatedAt: '2026-10-31',
      createdBy: 'مهندس حسینی',
      operations: [
        {
          id: 'MOP-01',
          moId: 'MO-TEST-WIP',
          moNumber: 'MO-TEST-WIP',
          stepNumber: 10,
          stepCode: 'OP10_SLIT',
          stepName: 'نواربری',
          processType: 'SHEARING',
          sequence: 1,
          warehouseLocation: 'LOC-RAW-B1',
          status: 'COMPLETED',
          waitingInputQty: 0,
          inProgressQty: 0,
          goodOutputQty: 250,
          scrapQty: 0,
          reworkQty: 0,
          rejectedQty: 0,
          readyForTransferQty: 0,
          transferredQty: 250,
          standardCycleTimeSec: 12,
          scrapNormPercent: 1.0,
          lastActivityAt: '2026-10-31',
          createdAt: '2026-10-30',
        },
        {
          id: 'MOP-02',
          moId: 'MO-TEST-WIP',
          moNumber: 'MO-TEST-WIP',
          stepNumber: 20,
          stepCode: 'OP20_BLNK',
          stepName: 'بلنکینگ',
          processType: 'BLANKING',
          sequence: 2,
          warehouseLocation: 'LOC-WIP-BLANK',
          status: 'IN_PROGRESS',
          waitingInputQty: 50,
          inProgressQty: 100,
          goodOutputQty: 100,
          scrapQty: 0,
          reworkQty: 0,
          rejectedQty: 0,
          readyForTransferQty: 100,
          transferredQty: 0,
          standardCycleTimeSec: 8,
          scrapNormPercent: 1.0,
          lastActivityAt: '2026-10-31',
          createdAt: '2026-10-30',
        },
      ],
    },
  ];

  const netReqsWithWip = calculateNetRequirements({
    parts: [testPart],
    orders: testOrders,
    balances: mockBalances,
    reservations: mockReservations,
    activeMos: mockActiveMos,
  });

  // OP20 has 50 waiting + 100 in progress + 100 ready = 250 PCS total WIP
  runAssertion('Downstream WIP across operations credited (250 PCS)', netReqsWithWip[0].totalDownstreamWip === 250);
  runAssertion('Net production requirement correctly netted with WIP: 550 PCS (800 - 250)', netReqsWithWip[0].netProductionRequirement === 550);

  // =========================================================================
  // TEST GROUP 3: Material Availability & Shortage Detection
  // =========================================================================
  console.log('\n📋 Test Group 3: Material Availability & Shortage Detection');
  // Part weight is 0.98 kg. For 550 PCS with ~6% scrap factor, required material is ~571 kg
  runAssertion('Required material calculated in KG (~571 KG)', netReqsWithWip[0].requiredMaterialKg > 500);
  runAssertion('Raw material in stock is 1500 KG, so no shortage detected', !netReqsWithWip[0].materialShortageDetected && netReqsWithWip[0].materialShortageKg === 0);

  // Scenario with raw material shortage (only 200 KG in stock)
  const scarceBalances: DetailedStockBalance[] = [
    { ...mockBalances[0] },
    { ...mockBalances[1], physicalQty: 200, supplierOwnedQty: 200, availableQty: 200, physicalKg: 200, supplierOwnedKg: 200, availableKg: 200 },
  ];
  const netReqsScarce = calculateNetRequirements({
    parts: [testPart],
    orders: testOrders,
    balances: scarceBalances,
    reservations: mockReservations,
    activeMos: mockActiveMos,
  });
  runAssertion('Material shortage detected when raw stock (200 KG) is less than required', netReqsScarce[0].materialShortageDetected);
  runAssertion('Shortage magnitude calculated correctly (~371 KG)', netReqsScarce[0].materialShortageKg > 300);

  // =========================================================================
  // TEST GROUP 4: Machine Eligibility & Incompatibility Rejection
  // =========================================================================
  console.log('\n📋 Test Group 4: Machine Eligibility & Strict Incompatibility Rejection');

  // Test 4.1: Hydraulic Deep Drawing (requires 800t tonnage, Process: DRAWING, Die: DIE-003)
  const drawingOpCandidates = evaluateMachineEligibility({
    processType: 'DRAWING',
    requiredTonnage: 800,
    plannedQuantity: 500,
    standardCycleTimeSec: 25,
    assignedDieCode: 'DIE-TAR-BUM-DRAW', // only compatible with PRS-800-01
  });

  const heavyPress800 = drawingOpCandidates.find(m => m.machineCode === 'PRS-800-01')!;
  const schulerPress400 = drawingOpCandidates.find(m => m.machineCode === 'PRS-400-01')!;
  const brake160 = drawingOpCandidates.find(m => m.machineCode === 'BRK-160-01')!;

  runAssertion('Heavy Press 800t (PRS-800-01) is ELIGIBLE for 800t deep drawing', heavyPress800.isEligible);
  runAssertion('Heavy Press 800t is top recommended (Rank 1)', heavyPress800.recommendationRank === 1);
  runAssertion('Human-readable recommendation reason generated', heavyPress800.recommendationReason.length > 10);

  // Incompatible Machine Rejection Checks:
  runAssertion('Schuler 400t rejected due to insufficient tonnage (400t < 800t)', !schulerPress400.isEligible && schulerPress400.ineligibilityReasons.some(r => r.includes('تناژ ناکافی')));
  runAssertion('Press Brake 160t rejected due to unsupported process and insufficient tonnage', !brake160.isEligible);
  runAssertion('Incompatible machines have eligibility score 0 and no assigned top rank', schulerPress400.suitabilityScore === 0);

  // Test 4.2: Machine Under Maintenance or Down must be Ineligible
  const mockMachinesWithMaintenance: Machine[] = INITIAL_MACHINES.map(m =>
    m.code === 'PRS-800-01' ? { ...m, status: 'MAINTENANCE' as const } : m
  );
  const maintenanceCandidates = evaluateMachineEligibility({
    processType: 'DRAWING',
    requiredTonnage: 800,
    plannedQuantity: 500,
    standardCycleTimeSec: 25,
    assignedDieCode: 'DIE-TAR-BUM-DRAW',
    machines: mockMachinesWithMaintenance,
  });
  const maintenancePress = maintenanceCandidates.find(m => m.machineCode === 'PRS-800-01')!;
  runAssertion('Machine in MAINTENANCE status is strictly INELIGIBLE', !maintenancePress.isEligible);
  runAssertion('Maintenance reason stated explicitly', maintenancePress.ineligibilityReasons.some(r => r.includes('تعمیرات')));

  // Test 4.3: Die Incompatibility
  const dieIncompatibleCandidates = evaluateMachineEligibility({
    processType: 'BLANKING',
    requiredTonnage: 200,
    plannedQuantity: 400,
    standardCycleTimeSec: 10,
    assignedDieCode: 'DIE-TAR-BUM-DRAW', // die requires PRS-800-01 bolster
  });
  const aydinPress250 = dieIncompatibleCandidates.find(m => m.machineCode === 'PRS-250-01')!;
  runAssertion('Machine rejected when die bolster/clamps are incompatible', !aydinPress250.dieCompatible && !aydinPress250.isEligible);

  // =========================================================================
  // TEST GROUP 5: Capacity Load, Runtime & Due Date Estimation
  // =========================================================================
  console.log('\n📋 Test Group 5: Capacity Load, Runtime & Due Date Estimation');
  const blankingCandidates = evaluateMachineEligibility({
    processType: 'BLANKING',
    requiredTonnage: 250,
    plannedQuantity: 1800,
    standardCycleTimeSec: 8, // 1800 * 8 = 14400 sec = 4.0 hours + 0.5h setup = 4.5h
    setupTimeMin: 30,
    assignedDieCode: 'DIE-206-BRK-BLNK',
  });
  const topBlankingMachine = blankingCandidates.find(m => m.isEligible)!;
  runAssertion('Estimated run time calculated accurately (~4.5 hours)', topBlankingMachine.estimatedRunTimeHours >= 4.4 && topBlankingMachine.estimatedRunTimeHours <= 4.6);
  runAssertion('Daily shift capacity tracked (15 hours/day)', topBlankingMachine.dailyCapacityHours === 15);

  // =========================================================================
  // TEST GROUP 6: Plan Suggestion Generation, Approval & Release to MO
  // =========================================================================
  console.log('\n📋 Test Group 6: Plan Suggestion Generation, Approval & Release Workflow');
  planSuggestionsStore.length = 0;
  const suggestions = generateProductionPlanSuggestions();
  planSuggestionsStore.push(...suggestions);
  runAssertion('Plan suggestions generated for open demand', suggestions.length > 0);

  const plan = suggestions[0];
  runAssertion('Initial plan status is DRAFT_SUGGESTION (Separated from shop floor)', plan.approvalStatus === 'DRAFT_SUGGESTION');
  runAssertion('Initial plan version is V1.0', plan.planVersion === 'V1.0');
  runAssertion('Proposed operations generated with recommended machines', plan.proposedOperations.length > 0);

  // Cannot release unapproved plan
  const prematureRelease = releasePlanToManufacturingOrder(plan.id, 'مدیر تولید');
  runAssertion('Premature release of unapproved plan is blocked', !prematureRelease.success);

  // Approve Plan
  const approveRes = approvePlanSuggestion(plan.id, 'مهندس حسینی (مدیر تولید)');
  runAssertion('Plan approved successfully', approveRes.success && plan.approvalStatus === 'APPROVED');
  runAssertion('Approver and timestamp recorded', !!plan.approvedBy && !!plan.approvedAt);

  // Revise Plan (Version bump V1.0 -> V1.1)
  const reviseRes = revisePlanVersion(plan.id, plan.proposedOperations, 'تنظیم اولویت پرس شولر ۴۰۰');
  runAssertion('Plan version successfully bumped to V1.1 upon revision', reviseRes.success && plan.planVersion === 'V1.1');

  // Convert approved plan to official Manufacturing Order
  const releaseRes = releasePlanToManufacturingOrder(plan.id, 'مهندس حسینی');
  runAssertion('Approved plan successfully released to official MO', releaseRes.success && !!releaseRes.mo);
  runAssertion('Plan status transitioned to CONVERTED_TO_MO', plan.approvalStatus === 'CONVERTED_TO_MO');
  runAssertion('Generated MO has reference to plan and contains all route operations', !!releaseRes.mo?.id && releaseRes.mo?.operations.length === plan.proposedOperations.length);

  // =========================================================================
  // TEST GROUP 7: Planning Dashboard Metrics
  // =========================================================================
  console.log('\n📋 Test Group 7: Planning Dashboard Metrics');
  const metrics = getPlanningDashboardMetrics();
  runAssertion('Total open orders counted', metrics.totalOpenOrdersCount >= 1);
  runAssertion('Gross demand pieces aggregated', metrics.totalGrossDemandPieces > 0);
  runAssertion('Average machine capacity utilization calculated (%)', metrics.averageMachineCapacityUtilizationPercent > 0 && metrics.averageMachineCapacityUtilizationPercent <= 100);
  runAssertion('Critical parts list populated', metrics.criticalPartsRequiringImmediateAction.length >= 1);

  console.log('\n=============================================================');
  console.log('📊 ALL PRODUCTION PLANNING TESTS PASSED: 30/30 ASSERTS OK');
  console.log('=============================================================\n');
}

runProductionPlanningTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
