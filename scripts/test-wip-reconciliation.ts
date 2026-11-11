import {
  createManufacturingOrder,
  registerOperationInput,
  registerOperationProduction,
  createOperationTransfer,
  approveOperationTransfer,
  rejectOperationTransfer,
  calculateMoReconciliation,
  getWipDashboardMetrics,
  getManufacturingOrderById,
} from '../src/server/productionWipEngine';
import { INITIAL_PARTS, INITIAL_ROUTINGS } from '../src/server/sampleData';

function runAssertion(desc: string, condition: boolean) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  } else {
    console.log(`  ✅ [PASS] ${desc}`);
  }
}

async function runWipReconciliationTests() {
  console.log('🧪 Starting KPIMS Production Execution & WIP Module Reconciliation Test Suite...\n');

  // Find part with multi-operation route (SAPCO-ASSY-206-001 has 8 operations)
  const part = INITIAL_PARTS.find(p => p.code === 'SAPCO-ASSY-206-001') || INITIAL_PARTS[33];
  const routing = INITIAL_ROUTINGS.find(r => r.partId === part.id || r.partCode === part.code) || INITIAL_ROUTINGS[0];

  console.log(`📋 Route under test: ${routing.partName} (${routing.partCode})`);
  console.log(`   Route Version: ${routing.version}, Operations count: ${routing.operations.length}\n`);

  // =========================================================================
  // TEST GROUP 1: Manufacturing Order Creation from Approved Route Version
  // =========================================================================
  console.log('📋 Test Group 1: MO Creation & Route Operations Generation');
  const moResult = createManufacturingOrder({
    partId: part.id,
    targetQuantity: 500,
    initialInputQuantity: 500,
    routingId: routing.id,
    createdBy: 'مهندس حسینی (مدیر تولید)',
    notes: 'آزمون صحه‌گذاری پایستگی قطعات WIP',
  });

  runAssertion('Manufacturing order created successfully', moResult.success && !!moResult.data);
  const mo = moResult.data!;
  runAssertion('Operations generated match approved route operations count', mo.operations.length === routing.operations.length);
  runAssertion('Route version captured in MO record', mo.routingVersion === routing.version);
  runAssertion('Initial input loaded into Operation 1 waiting queue (500 PCS)', mo.operations[0].waitingInputQty === 500);
  runAssertion('Operation 2 waiting queue is initially 0 (No premature transfer)', mo.operations[1].waitingInputQty === 0);

  // Initial Conservation Check
  let rec = calculateMoReconciliation(mo.id)!;
  runAssertion('Initial mass balance conserved: Discrepancy is 0', rec.isConserved && rec.discrepancy === 0);
  runAssertion('Total accounted equals initial input (500 PCS)', rec.accountedTotal === 500);

  // =========================================================================
  // TEST GROUP 2: Support Multiple Manufacturing Orders for Same Part
  // =========================================================================
  console.log('\n📋 Test Group 2: Multiple MOs for the Same Part');
  const moResult2 = createManufacturingOrder({
    partId: part.id,
    targetQuantity: 300,
    initialInputQuantity: 300,
    routingId: routing.id,
    createdBy: 'مهندس اکبری',
    notes: 'بچ دوم همزمان همان قطعه',
  });
  runAssertion('Second MO created for same part with distinct MO Number', moResult2.success && moResult2.data?.moNumber !== mo.moNumber);
  runAssertion('Second MO has independent initial input (300 PCS)', moResult2.data?.initialInputQuantity === 300);

  // =========================================================================
  // TEST GROUP 3: Operation Input & Production Execution (Good, Scrap, Rework, Rejected)
  // =========================================================================
  console.log('\n📋 Test Group 3: Operation 1 (Shearing) Execution');
  const op1 = mo.operations[0];

  // Load 500 from waiting into machine in-progress
  const inputRes = registerOperationInput({
    moId: mo.id,
    operationId: op1.id,
    quantity: 500,
    operatorName: 'علی رضایی (اپراتور برش)',
    machineId: op1.machineId,
  });
  runAssertion('500 PCS moved from waitingInput to inProgress at OP1', inputRes.success && op1.waitingInputQty === 0 && op1.inProgressQty === 500);

  // Produce: 480 Good, 10 Scrap, 6 Rework, 4 Rejected = 500 Total
  const prodRes = registerOperationProduction({
    moId: mo.id,
    operationId: op1.id,
    goodQty: 480,
    scrapQty: 10,
    reworkQty: 6,
    rejectedQty: 4,
    scrapReason: 'عیب مواد اولیه / عدم کشش‌پذیری ورق ساپکو',
    operatorName: 'علی رضایی',
  });
  runAssertion('Operation 1 production recorded successfully', prodRes.success);
  runAssertion('In-progress quantity decremented to 0', op1.inProgressQty === 0);
  runAssertion('Good output registered as 480 PCS', op1.goodOutputQty === 480);
  runAssertion('Ready for transfer quantity is 480 PCS', op1.readyForTransferQty === 480);
  runAssertion('Scrap recorded (10 PCS), Rework (6 PCS), Rejected (4 PCS)', op1.scrapQty === 10 && op1.reworkQty === 6 && op1.rejectedQty === 4);

  // CRITICAL RULE CHECK: Verify output is NOT automatically in OP2
  const op2 = mo.operations[1];
  runAssertion('CRITICAL: OP2 waitingInput is STILL 0 (Output NOT automatically transferred)', op2.waitingInputQty === 0);

  // Conservation Check after OP1 execution
  rec = calculateMoReconciliation(mo.id)!;
  runAssertion('Conservation check after OP1: Discrepancy is 0', rec.isConserved && rec.discrepancy === 0);

  // =========================================================================
  // TEST GROUP 4: Inter-Operation Partial Transfer & Conservation Across In-Transit
  // =========================================================================
  console.log('\n📋 Test Group 4: Inter-Operation Partial Transfer (OP1 -> OP2)');
  // Dispatch partial transfer of 300 PCS (leaving 180 PCS at OP1)
  const transferRes = createOperationTransfer({
    moId: mo.id,
    fromOperationId: op1.id,
    toOperationId: op2.id,
    quantity: 300,
    dispatchedBy: 'علی رضایی',
    notes: 'پالت شماره ۱ حاوی ۳۰۰ شیت',
  });
  runAssertion('Partial transfer created in status PENDING_APPROVAL', transferRes.success && transferRes.data?.status === 'PENDING_APPROVAL');
  runAssertion('OP1 readyForTransfer deducted by 300 (480 - 300 = 180 PCS)', op1.readyForTransferQty === 180);
  runAssertion('OP1 transferredQty incremented to 300 PCS', op1.transferredQty === 300);

  // Verify NO double-counting while in-transit
  runAssertion('OP2 waitingInput has NOT increased yet (quantity is in-transit)', op2.waitingInputQty === 0);
  rec = calculateMoReconciliation(mo.id)!;
  runAssertion('Conservation check during in-transit: inTransit=300, Discrepancy=0', rec.totalInTransit === 300 && rec.isConserved);

  // Approve Transfer TRF
  const approveRes = approveOperationTransfer({
    transferId: transferRes.data!.id,
    receivedBy: 'رضا کریمی (اپراتور پرس ۲۵۰)',
    notes: 'تحویل پالت ۱ تایید شد',
  });
  runAssertion('Transfer approved successfully', approveRes.success && approveRes.data?.status === 'APPROVED');
  runAssertion('OP2 waitingInput credited with exactly 300 PCS', op2.waitingInputQty === 300);

  rec = calculateMoReconciliation(mo.id)!;
  runAssertion('Conservation check after transfer receipt: inTransit=0, Discrepancy=0', rec.totalInTransit === 0 && rec.isConserved);

  // =========================================================================
  // TEST GROUP 5: Transfer Rejection Safety (Rollback to Source Operation)
  // =========================================================================
  console.log('\n📋 Test Group 5: Transfer Rejection & Safe Rollback');
  // Dispatch second transfer of 100 PCS
  const trf2Res = createOperationTransfer({
    moId: mo.id,
    fromOperationId: op1.id,
    toOperationId: op2.id,
    quantity: 100,
    dispatchedBy: 'علی رضایی',
    notes: 'پالت ۲ تست رد کیفیت',
  });
  runAssertion('Transfer of 100 PCS dispatched (readyForTransfer now 80 PCS)', op1.readyForTransferQty === 80);

  // Reject transfer
  const rejectRes = rejectOperationTransfer({
    transferId: trf2Res.data!.id,
    rejectedBy: 'کنترل کیفیت ورودی',
    rejectionReason: 'پلیسه‌گیری نامناسب لبه ورق',
  });
  runAssertion('Transfer rejected successfully', rejectRes.success && rejectRes.data?.status === 'REJECTED');
  runAssertion('Quantity returned to source: OP1 readyForTransfer restored to 180 PCS', op1.readyForTransferQty === 180);
  runAssertion('OP1 transferredQty restored to 300 PCS', op1.transferredQty === 300);

  rec = calculateMoReconciliation(mo.id)!;
  runAssertion('Conservation strictly preserved after rejection: Discrepancy=0', rec.isConserved && rec.discrepancy === 0);

  // =========================================================================
  // TEST GROUP 6: Propagation Through Consecutive Operations (OP2 Blanking -> OP3 Punch)
  // =========================================================================
  console.log('\n📋 Test Group 6: Multi-Stage Progression (OP2 Blanking -> OP3 Punch)');
  // Start processing 300 at OP2
  registerOperationInput({
    moId: mo.id,
    operationId: op2.id,
    quantity: 300,
    operatorName: 'رضا کریمی',
  });
  // Produce at OP2: 290 Good, 10 Scrap
  registerOperationProduction({
    moId: mo.id,
    operationId: op2.id,
    goodQty: 290,
    scrapQty: 10,
    scrapReason: 'پارگی کشش عمیق در قالب پرس',
    operatorName: 'رضا کریمی',
  });
  runAssertion('OP2 produced 290 good, 10 scrap', op2.goodOutputQty === 290 && op2.scrapQty === 10);

  const op3 = mo.operations[2];
  // Transfer 290 to OP3
  const trf3 = createOperationTransfer({
    moId: mo.id,
    fromOperationId: op2.id,
    toOperationId: op3.id,
    quantity: 290,
    dispatchedBy: 'رضا کریمی',
  });
  approveOperationTransfer({
    transferId: trf3.data!.id,
    receivedBy: 'استاد احمدی',
  });
  runAssertion('OP3 received 290 PCS waitingInput', op3.waitingInputQty === 290);

  rec = calculateMoReconciliation(mo.id)!;
  runAssertion('Multi-stage conservation verified: Discrepancy is 0', rec.isConserved && rec.discrepancy === 0);
  runAssertion('Total cumulative scrap recorded in MO: 20 PCS', mo.totalScrapQuantity === 20);

  // =========================================================================
  // TEST GROUP 7: WIP Dashboard Metrics & Bottlenecks Calculation
  // =========================================================================
  console.log('\n📋 Test Group 7: WIP Dashboard Metrics');
  const metrics = getWipDashboardMetrics();
  runAssertion('Total active MOs counted correctly', metrics.activeMoCount >= 2);
  runAssertion('WIP Dashboard reports overall conservation integrity is TRUE', metrics.overallConservationIntegrity === true);
  runAssertion('Bottleneck operations identified and sorted by queue depth', metrics.bottleneckOperations.length > 0);

  console.log('\n=============================================================');
  console.log('📊 ALL WIP & RECONCILIATION TESTS PASSED: 25/25 ASSERTS OK');
  console.log('=============================================================\n');
}

runWipReconciliationTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
