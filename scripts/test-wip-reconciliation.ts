import {
  createManufacturingOrder,
  registerOperationInput,
  registerOperationProduction,
  calculateMoReconciliation,
  getWipDashboardMetrics,
  manufacturingOrdersStore,
  wipTransfersStore,
  productionLogsStore,
  loadProductionWipState,
  persistProductionWipState,
} from '../src/server/productionWipEngine';
import { INITIAL_PARTS, INITIAL_ROUTINGS } from '../src/server/sampleData';
import { isDatabaseUrlConfigured } from '../src/server/db/prisma';

function assert(desc: string, condition: boolean) {
  if (!condition) throw new Error(`❌ ${desc}`);
  console.log(`✅ ${desc}`);
}

async function run() {
  console.log('KPIMS automatic WIP progression tests');
  const part = INITIAL_PARTS.find(p => p.code === 'WIP-ECU-MAIN-BRK');
  if (!part) throw new Error('Canonical WIP test part is missing.');
  const route = INITIAL_ROUTINGS.find(r => r.partId === part.id || r.partCode === part.code);
  if (!route || route.operations.length < 3) throw new Error('Test routing must contain at least three operations.');

  const created = createManufacturingOrder({
    partId: part.id,
    targetQuantity: 500,
    initialInputQuantity: 500,
    routingId: route.id,
    createdBy: 'آزمون سیستم',
  });
  assert('Manufacturing order created', created.success && !!created.data);
  const mo = created.data!;
  const [op1, op2, op3] = mo.operations;
  assert('Initial material is in first operation queue', op1.waitingInputQty === 500);
  assert('Next operation starts with zero waiting input', op2.waitingInputQty === 0);
  assert('Initial quantity is conserved', calculateMoReconciliation(mo.id)?.isConserved === true);

  const input1 = registerOperationInput({ moId: mo.id, operationId: op1.id, quantity: 500, operatorName: 'اپراتور برش' });
  assert('500 pieces loaded to operation 1', input1.success && op1.inProgressQty === 500);

  const production1 = registerOperationProduction({
    moId: mo.id,
    operationId: op1.id,
    goodQty: 480,
    scrapQty: 10,
    reworkQty: 6,
    rejectedQty: 4,
    scrapReason: 'عیب مواد اولیه',
    operatorName: 'اپراتور برش',
  });
  assert('Production result posted', production1.success);
  assert('480 good pieces automatically enter operation 2 waiting queue', op2.waitingInputQty === 480);
  assert('Good output is not left in a separate transfer queue', op1.readyForTransferQty === 0);
  assert('Source operation records 480 transferred pieces', op1.transferredQty === 480);
  assert('Scrap, rework and rejected quantities are separately recorded', op1.scrapQty === 10 && op1.reworkQty === 6 && op1.rejectedQty === 4);
  assert('Automatic transfer is traceable without recipient approval', wipTransfersStore.some(t => t.moId === mo.id && t.quantity === 480 && t.status === 'AUTO_TRANSFERRED' && !t.receivedBy));
  assert('Automatic transfer activity is logged', productionLogsStore.some(log => log.moId === mo.id && log.activityType === 'AUTO_TRANSFER' && log.quantity === 480));
  assert('WIP conservation after operation 1', calculateMoReconciliation(mo.id)?.isConserved === true);

  const input2 = registerOperationInput({ moId: mo.id, operationId: op2.id, quantity: 480, operatorName: 'اپراتور پرس' });
  assert('Operation 2 can start from auto-transferred waiting stock', input2.success && op2.inProgressQty === 480);
  const production2 = registerOperationProduction({
    moId: mo.id,
    operationId: op2.id,
    goodQty: 470,
    scrapQty: 10,
    scrapReason: 'ضایعات فرآیندی',
    operatorName: 'اپراتور پرس',
  });
  assert('Operation 2 production posted', production2.success);
  assert('470 good pieces automatically enter operation 3', op3.waitingInputQty === 470);
  assert('Cumulative scrap is 20 pieces', mo.totalScrapQuantity === 20);
  assert('WIP conservation after operation 2', calculateMoReconciliation(mo.id)?.isConserved === true);

  const metrics = getWipDashboardMetrics();
  assert('Dashboard conservation integrity remains true', metrics.overallConservationIntegrity === true);
  assert('Routine production creates no approval-pending transfer', !wipTransfersStore.some(t => t.moId === mo.id && t.status === 'PENDING_APPROVAL'));

  if (isDatabaseUrlConfigured()) {
    const expected = JSON.stringify({
      moIds: manufacturingOrdersStore.map(x => x.id).sort(),
      transferIds: wipTransfersStore.map(x => x.id).sort(),
      logIds: productionLogsStore.map(x => x.id).sort(),
    });
    await persistProductionWipState();
    manufacturingOrdersStore.splice(0);
    wipTransfersStore.splice(0);
    productionLogsStore.splice(0);
    await loadProductionWipState();
    const actual = JSON.stringify({
      moIds: manufacturingOrdersStore.map(x => x.id).sort(),
      transferIds: wipTransfersStore.map(x => x.id).sort(),
      logIds: productionLogsStore.map(x => x.id).sort(),
    });
    assert('WIP state and automatic transfer audit survive PostgreSQL reload', actual === expected);
  } else {
    console.log('ℹ️ PostgreSQL snapshot persistence check skipped: DATABASE_URL is not configured.');
  }
  console.log('ALL AUTOMATIC WIP PROGRESSION TESTS PASSED');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
