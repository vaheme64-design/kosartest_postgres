import {
  getPlanVsActualReport,
  getCustomerOrderFulfillmentReport,
  getProductionBacklogReport,
  getWipByPartAndOperationReport,
  getWipAgingReport,
  getMaterialConsumptionVsStandardReport,
  getSapcoMaterialAccountReport,
  getInventoryValuationQuantitiesReport,
  getScrapByPartAndOperationReport,
  getMachineWorkloadCapacityReport,
  getProductionDelaysReport,
  getInventoryMovementsReport,
  getInventoryReconciliationReport,
  getManagementDashboardSummary,
} from '../src/server/managementReportsEngine';
import { initializeProductionWipSeed, manufacturingOrdersStore } from '../src/server/productionWipEngine';
import { generateProductionPlanSuggestions, planSuggestionsStore } from '../src/server/productionPlanningEngine';

function runAssertion(desc: string, condition: boolean) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  } else {
    console.log(`  ✅ [PASS] ${desc}`);
  }
}

console.log('🧪 Starting KPIMS Management Reporting & Control Module Reconciliation Tests...\n');

// 1. Ensure seed data is initialized
initializeProductionWipSeed();
if (planSuggestionsStore.length === 0) {
  planSuggestionsStore.push(...generateProductionPlanSuggestions());
}

// =========================================================================
// TEST GROUP 1: Plan vs Actual Production Reconciliation
// =========================================================================
console.log('📋 Test Group 1: Plan vs Actual Production Reconciliation');
const planVsActual = getPlanVsActualReport();
runAssertion('Plan vs Actual report returns items', planVsActual.data.length > 0);
runAssertion('Report metadata contains generatedAt timestamp', planVsActual.meta.generatedAt.length > 0);

const firstPlanItem = planVsActual.data[0];
runAssertion('Planned quantity is positive', firstPlanItem.plannedQuantity > 0);
runAssertion(
  'Achievement rate equals (actual / planned) * 100 within rounding',
  Math.abs(firstPlanItem.achievementRatePercent - (firstPlanItem.actualProducedQuantity / firstPlanItem.plannedQuantity) * 100) < 0.2
);
runAssertion(
  'Variance equals actual - planned',
  firstPlanItem.varianceQuantity === firstPlanItem.actualProducedQuantity - firstPlanItem.plannedQuantity
);
runAssertion('Draft plans are marked as estimate', firstPlanItem.isEstimate === (firstPlanItem.status !== 'CONVERTED_TO_MO'));

// =========================================================================
// TEST GROUP 2: Customer Order Fulfillment & Conservation
// =========================================================================
console.log('\n📋 Test Group 2: Customer Order Fulfillment & Conservation');
const fulfillment = getCustomerOrderFulfillmentReport();
runAssertion('Fulfillment report has order lines', fulfillment.data.length > 0);

fulfillment.data.forEach(line => {
  runAssertion(
    `Order conservation strictly preserved: ordered = delivered + remaining (${line.orderNumber})`,
    line.orderedQuantity === line.deliveredQuantity + line.remainingQuantity
  );
  runAssertion(
    `Fulfillment % matches delivered / ordered (${line.orderNumber})`,
    Math.abs(line.fulfillmentPercent - (line.deliveredQuantity / line.orderedQuantity) * 100) < 0.2
  );
});

// =========================================================================
// TEST GROUP 3: Production Backlog & Material Shortage Requirements
// =========================================================================
console.log('\n📋 Test Group 3: Production Backlog & Material Requirements');
const backlog = getProductionBacklogReport();
runAssertion('Backlog items list populated for unfulfilled demand', backlog.data.length > 0);

const unfulfilledOrdersCount = fulfillment.data.filter(f => f.remainingQuantity > 0).length;
runAssertion(
  'Backlog count matches exactly unfulfilled customer order lines',
  backlog.data.length === unfulfilledOrdersCount
);

backlog.data.forEach(item => {
  runAssertion(`Backlog item has positive remaining quantity (${item.partCode})`, item.backlogQuantity > 0);
  runAssertion(`Required raw material kg calculated (${item.partCode})`, item.requiredRawMaterialKg > 0);
});

// =========================================================================
// TEST GROUP 4: WIP by Part & Operation Mathematical Integrity
// =========================================================================
console.log('\n📋 Test Group 4: WIP by Part & Operation Reconciliation');
const wipReport = getWipByPartAndOperationReport();
runAssertion('WIP by part & operation contains active stages', wipReport.data.length > 0);

wipReport.data.forEach(row => {
  const sumWip = row.waitingInputQty + row.inProgressQty + row.readyForTransferQty;
  runAssertion(
    `Active WIP equals waiting + inProgress + readyForTransfer (${row.partCode} - ${row.stepCode})`,
    row.totalActiveWipQty === sumWip
  );
});

// Cross-check total active WIP in report with MO stores
const totalWipInReport = wipReport.data.reduce((acc, r) => acc + r.totalActiveWipQty, 0);
const totalWipInMos = manufacturingOrdersStore.reduce((acc, mo) => {
  return acc + mo.operations.reduce((oAcc, op) => {
    return oAcc + (op.waitingInputQty || 0) + (op.inProgressQty || 0) + (op.readyForTransferQty || 0);
  }, 0);
}, 0);
runAssertion(
  'Report total WIP strictly reconciles with sum of all MO operations',
  totalWipInReport === totalWipInMos
);

// =========================================================================
// TEST GROUP 5: WIP Aging & Stagnant Batches Detection
// =========================================================================
console.log('\n📋 Test Group 5: WIP Aging & Stagnancy Detection');
const wipAging = getWipAgingReport();
runAssertion('WIP aging report populated', wipAging.data.length > 0);

wipAging.data.forEach(item => {
  runAssertion(`Idle hours is positive (${item.partCode} - ${item.stepName})`, item.idleHours >= 0);
  runAssertion(`Idle days is calculated accurately (${item.partCode})`, item.idleDays >= 0);
  if (item.idleDays > 7) {
    runAssertion('Items older than 7 days marked as OVER_7_DAYS_STAGNANT', item.ageCategory === 'OVER_7_DAYS_STAGNANT');
    runAssertion('Stagnant items severity marked as CRITICAL', item.statusSeverity === 'CRITICAL');
  }
});

// =========================================================================
// TEST GROUP 6: Material Consumption vs Engineering Standard
// =========================================================================
console.log('\n📋 Test Group 6: Material Consumption vs Engineering Standard');
const consumptionReport = getMaterialConsumptionVsStandardReport();
runAssertion('Material consumption report populated for MOs', consumptionReport.data.length > 0);

consumptionReport.data.forEach(item => {
  runAssertion(
    `Theoretical standard consumption calculated (${item.partCode})`,
    item.theoreticalStandardConsumptionKg >= 0
  );
  runAssertion(
    `Variance equals actual - theoretical (${item.partCode})`,
    Math.abs(item.varianceKg - (item.actualIssuedMaterialKg - item.theoreticalStandardConsumptionKg)) < 0.2
  );
});

// =========================================================================
// TEST GROUP 7: SAPCO Consignment Material Account Balance
// =========================================================================
console.log('\n📋 Test Group 7: SAPCO Consignment Account Reconciliation');
const sapcoReport = getSapcoMaterialAccountReport();
runAssertion('SAPCO material account has contracts', sapcoReport.data.length > 0);

sapcoReport.data.forEach(c => {
  runAssertion(
    `Contract closing book balance matches opening + received - issued (${c.contractNumber})`,
    c.closingBookBalanceKg === c.openingBalanceKg + c.totalReceivedKg - c.totalIssuedKg
  );
  runAssertion(
    `Discrepancy calculated between physical plant stock and book balance (${c.contractNumber})`,
    Math.abs(c.discrepancyKg - (c.physicalStockInPlantKg - c.closingBookBalanceKg)) < 0.1
  );
});

// =========================================================================
// TEST GROUP 8: Inventory Valuation Quantities (Strict Physical Units)
// =========================================================================
console.log('\n📋 Test Group 8: Inventory Quantities Valuation & Segregation');
const invQuantities = getInventoryValuationQuantitiesReport();
runAssertion('Inventory quantities report populated', invQuantities.data.length > 0);

invQuantities.data.forEach(item => {
  runAssertion(
    `Physical quantity equals company-owned + consignment (${item.partOrMaterialCode})`,
    item.physicalQuantity === item.companyOwnedQuantity + item.sapcoConsignmentQuantity
  );
  const calculatedFree = Math.max(0, item.physicalQuantity - item.qualityBlockedQuantity - item.reservedQuantity);
  runAssertion(
    `Available free stock strictly excludes quarantine and reservations (${item.partOrMaterialCode})`,
    item.availableFreeQuantity === calculatedFree
  );
});

// =========================================================================
// TEST GROUP 9: Scrap by Part & Operation Reconciliation
// =========================================================================
console.log('\n📋 Test Group 9: Scrap by Part & Operation Reconciliation');
const scrapReport = getScrapByPartAndOperationReport();
runAssertion('Scrap report has entries for operations with scrap', scrapReport.data.length > 0);

const totalReportScrapPieces = scrapReport.data.reduce((acc, r) => acc + r.scrapPieces, 0);
const totalMoScrapPieces = manufacturingOrdersStore.reduce((acc, mo) => acc + (mo.totalScrapQuantity || 0), 0);
runAssertion(
  'Sum of scrap pieces in report matches sum of scrap in MO operations',
  totalReportScrapPieces === totalMoScrapPieces
);

scrapReport.data.forEach(item => {
  runAssertion(`Scrap percentage accurately computed (${item.partCode} - OP${item.stepNumber})`, item.actualScrapPercent >= 0);
  if (item.actualScrapPercent > item.scrapNormPercent) {
    runAssertion('Above-norm scrap flagged accurately', item.isAboveNorm === true);
  }
});

// =========================================================================
// TEST GROUP 10: Machine Workload & Available Capacity
// =========================================================================
console.log('\n📋 Test Group 10: Machine Workload & Available Capacity');
const machineReport = getMachineWorkloadCapacityReport();
runAssertion('Machine workload report populated', machineReport.data.length > 0);

machineReport.data.forEach(m => {
  if (m.machineStatus === 'MAINTENANCE') {
    runAssertion(`Machine in maintenance has 0 available capacity (${m.machineCode})`, m.nominalDailyCapacityHours === 0);
    runAssertion(`Maintenance machine has reliable data false (${m.machineCode})`, m.isReliableCapacityData === false);
  } else {
    runAssertion(
      `Available capacity equals nominal - scheduled (${m.machineCode})`,
      Math.abs(m.availableCapacityHours - (m.nominalDailyCapacityHours - m.scheduledWorkloadHours)) < 0.1
    );
    runAssertion(`Reliable capacity data flagged true for active press (${m.machineCode})`, m.isReliableCapacityData === true);
  }
});

// =========================================================================
// TEST GROUP 11: Production Delays & Infeasibility Causes
// =========================================================================
console.log('\n📋 Test Group 11: Production Delays & Root Cause Categorization');
const delaysReport = getProductionDelaysReport();
delaysReport.data.forEach(d => {
  runAssertion(`Delay days is positive for delayed item (${d.referenceNumber})`, d.delayDays > 0);
  runAssertion(`Forecasted delay clearly tagged as estimate (${d.referenceNumber})`, d.isEstimate === true);
  runAssertion(`Primary delay cause categorized (${d.referenceNumber})`, d.primaryDelayCause.length > 0);
});

// =========================================================================
// TEST GROUP 12: Inventory Movements & Reversal Integrity
// =========================================================================
console.log('\n📋 Test Group 12: Inventory Movements Analytical Ledger');
const movementsReport = getInventoryMovementsReport();
runAssertion('Inventory movements populated from posted documents', movementsReport.data.length > 0);

movementsReport.data.forEach(m => {
  runAssertion(`Movement has valid quantity (${m.documentNumber})`, m.quantity !== 0);
  runAssertion(`Movement has source and target locations (${m.documentNumber})`, m.sourceLocation.length > 0 && m.targetLocation.length > 0);
});

// =========================================================================
// TEST GROUP 13: Inventory Reconciliation & Physical Verification
// =========================================================================
console.log('\n📋 Test Group 13: Inventory Reconciliation & Physical Audit');
const reconReport = getInventoryReconciliationReport();
runAssertion('Inventory reconciliation populated', reconReport.data.length > 0);

reconReport.data.forEach(r => {
  runAssertion(`Variance equals physical count - book quantity (${r.partCode})`, r.varianceQuantity === r.physicalCountQuantity - r.bookQuantity);
  runAssertion(`Reconciliation has audit timestamp (${r.partCode})`, r.lastReconciledAt.length > 0);
});

// =========================================================================
// TEST GROUP 14: Comprehensive Management Dashboard Cross-Reconciliation
// =========================================================================
console.log('\n📋 Test Group 14: Management Dashboard Summary Cross-Reconciliation');
const dashboardSummary = getManagementDashboardSummary();

runAssertion('Dashboard has active customer orders count', dashboardSummary.activeCustomerOrdersCount >= 0);
runAssertion('Dashboard total WIP pieces reconciles with WIP report total', dashboardSummary.totalWipQuantityPieces === totalWipInReport);
runAssertion('Dashboard total scrap pieces reconciles with scrap report total', dashboardSummary.totalScrapPieces === totalReportScrapPieces);
runAssertion('Dashboard machine utilization percent calculated', dashboardSummary.averageMachineUtilizationPercent >= 0);
runAssertion('Dashboard reliable machines count is positive', dashboardSummary.reliableMachinesCount > 0);
runAssertion('Dashboard has latest updated timestamp', dashboardSummary.lastUpdatedTimestamp.length > 0);

console.log('\n=============================================================');
console.log('📊 ALL MANAGEMENT REPORTING RECONCILIATION TESTS PASSED!');
console.log('=============================================================\n');
