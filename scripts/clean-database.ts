import { getPrismaClient } from '../src/server/db/prisma';

const prisma = getPrismaClient();

async function cleanDatabase() {
  console.log('🧹 Starting full database cleanup (WIP, Customer Orders, Inventory, Plans)...');

  try {
    // 1. Wipe WIP & Production Execution
    await prisma.productionScrap.deleteMany({});
    await prisma.machineAssignment.deleteMany({});
    await prisma.productionReport.deleteMany({});
    await prisma.productionTransfer.deleteMany({});
    await prisma.productionOperation.deleteMany({});
    await prisma.manufacturingOrder.deleteMany({});
    console.log('  -> Cleared all WIP orders, operations, reports, scraps, and transfers.');

    // 2. Wipe Customer Orders & Lines
    await prisma.customerOrderLine.deleteMany({});
    await prisma.customerOrder.deleteMany({});
    console.log('  -> Cleared all Customer Orders.');

    // 3. Wipe Production Plans & Lines
    await prisma.productionPlanLine.deleteMany({});
    await prisma.productionPlan.deleteMany({});
    console.log('  -> Cleared all Production Plans.');

    // 4. Wipe Inventory Transactions, Documents, Coils, and Contracts
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.inventoryDocumentLine.deleteMany({});
    await prisma.inventoryDocument.deleteMany({});
    await prisma.inventoryReservation.deleteMany({});
    await prisma.coilIssueReturnRecord.deleteMany({});
    await prisma.contractCoilAllocation.deleteMany({});
    await prisma.physicalCoil.deleteMany({});
    await prisma.contractCommercialLine.deleteMany({});
    await prisma.materialContractTransaction.deleteMany({});
    await prisma.materialContract.deleteMany({});
    await prisma.materialLot.deleteMany({});
    await prisma.stockBalance.deleteMany({});
    console.log('  -> Cleared all Inventory documents, transactions, and coils.');

    console.log('✅ Full database cleanup finished successfully! All test orders, WIP, and stocks have been reset to zero.');
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
