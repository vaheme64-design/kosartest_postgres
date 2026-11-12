import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const nonce = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const ids = {
  coil: `TEST-COIL-${nonce}`,
  lot: `TEST-LOT-${nonce}`,
  receipt: `TEST-RCV-${nonce}`,
  issue: `TEST-ISS-${nonce}`,
  returned: `TEST-RET-${nonce}`,
  contracts: [`TEST-CNT-A-${nonce}`, `TEST-CNT-B-${nonce}`],
};

async function main() {
  const [user, customer, warehouse] = await Promise.all([
    prisma.user.findFirst({ where: { active: true } }),
    prisma.customer.findFirst(),
    prisma.warehouse.findFirst({ where: { active: true, type: 'RAW_MATERIALS' } }),
  ]);
  if (!user || !customer || !warehouse) throw new Error('CI fixture requires an active user, customer and raw-material warehouse.');

  const location = await prisma.warehouseLocation.findFirst({ where: { warehouseId: warehouse.id, active: true } });
  const partCandidates = await prisma.part.findMany({
    where: { active: true, category: 'RAW_MATERIAL', materialId: { not: null } },
    include: { unit: true, material: true },
    take: 50,
  });
  const part = partCandidates.find(row => row.unit.code === 'KG' && row.material);
  if (!location || !part || !part.material) throw new Error('CI fixture requires a raw-material part measured in KG with a material and warehouse location.');

  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const createdContractIds: string[] = [];
  let physicalCoilId: string | undefined;
  let materialLotId: string | undefined;
  const documentIds: string[] = [];

  try {
    await prisma.$transaction(async tx => {
      const contractA = await tx.materialContract.create({
        data: {
          contractNumber: ids.contracts[0],
          supplierCustomerId: customer.id,
          title: 'CI contract allocation A',
          materialId: part.materialId!,
          totalAllocatedWeightKg: 60,
          startDate: now,
          endDate: future,
        },
      });
      createdContractIds.push(contractA.id);
      const contractB = await tx.materialContract.create({
        data: {
          contractNumber: ids.contracts[1],
          supplierCustomerId: customer.id,
          title: 'CI contract allocation B',
          materialId: part.materialId!,
          totalAllocatedWeightKg: 40,
          startDate: now,
          endDate: future,
        },
      });
      createdContractIds.push(contractB.id);

      const lot = await tx.materialLot.create({
        data: {
          lotNumber: ids.lot,
          materialId: part.materialId!,
          partId: part.id,
          thicknessMm: part.thicknessMm || 1,
          widthMm: 1000,
          initialWeightKg: 100,
          remainingWeightKg: 100,
          warehouseLocationId: location.id,
          receivedDate: now,
        },
      });
      materialLotId = lot.id;
      const coil = await tx.physicalCoil.create({
        data: {
          coilId: ids.coil,
          coilPackNumber: ids.coil,
          partId: part.id,
          materialId: part.materialId!,
          materialLotId: lot.id,
          thicknessMm: part.thicknessMm || 1,
          widthMm: 1000,
          originalWeightKg: 100,
          remainingWeightKg: 100,
          warehouseId: warehouse.id,
          warehouseLocationId: location.id,
          ownership: 'SAPCO_SUPPLIER_OWNED',
        },
      });
      physicalCoilId = coil.id;

      const receipt = await tx.inventoryDocument.create({
        data: {
          documentNumber: ids.receipt,
          documentType: 'RECEIPT',
          documentDate: now,
          documentStatus: 'CONFIRMED',
          postingStatus: 'POSTED',
          warehouseId: warehouse.id,
          referenceType: 'SAPCO_COIL',
          referenceNumber: ids.coil,
          createdByUserId: user.id,
          postedByUserId: user.id,
          postedAt: now,
        },
      });
      documentIds.push(receipt.id);

      const contractSegments = [
        { contract: contractA, weight: 60 },
        { contract: contractB, weight: 40 },
      ];
      for (let index = 0; index < contractSegments.length; index += 1) {
        const segment = contractSegments[index];
        await tx.contractCoilAllocation.create({
          data: {
            contractId: segment.contract.id,
            coilId: coil.id,
            allocatedWeightKg: segment.weight,
            ownership: 'SAPCO_SUPPLIER_OWNED',
            sourceDocumentId: receipt.id,
          },
        });
        await tx.materialContract.update({
          where: { id: segment.contract.id },
          data: { receivedWeightKg: { increment: segment.weight } },
        });
        const line = await tx.inventoryDocumentLine.create({
          data: {
            documentId: receipt.id,
            lineNumber: index + 1,
            partId: part.id,
            materialLotId: lot.id,
            physicalCoilId: coil.id,
            locationId: location.id,
            quantity: segment.weight,
            unitId: part.unitId,
            weightKg: segment.weight,
            ownership: 'SAPCO_SUPPLIER_OWNED',
            contractId: segment.contract.id,
            contractNumber: segment.contract.contractNumber,
          },
        });
        await tx.inventoryTransaction.create({
          data: {
            transactionNumber: `TEST-TRX-RCV-${nonce}-${index}`,
            documentId: receipt.id,
            documentLineId: line.id,
            partId: part.id,
            materialLotId: lot.id,
            physicalCoilId: coil.id,
            warehouseId: warehouse.id,
            locationId: location.id,
            transactionType: 'INBOUND',
            quantity: segment.weight,
            quantitySigned: segment.weight,
            unitId: part.unitId,
            weightKg: segment.weight,
            weightKgSigned: segment.weight,
            ownership: 'SAPCO_SUPPLIER_OWNED',
            contractId: segment.contract.id,
            contractNumber: segment.contract.contractNumber,
            transactionDate: now,
            createdByUserId: user.id,
          },
        });
        await tx.stockBalance.create({
          data: {
            partId: part.id,
            warehouseId: warehouse.id,
            locationId: location.id,
            materialLotId: lot.id,
            physicalCoilId: coil.id,
            quantityOnHand: segment.weight,
            quantityAvailable: segment.weight,
            weightKgOnHand: segment.weight,
            weightKgAvailable: segment.weight,
            ownership: 'SAPCO_SUPPLIER_OWNED',
            contractId: segment.contract.id,
            contractNumber: segment.contract.contractNumber,
            qualityStatus: 'AVAILABLE',
            lastTransactionAt: now,
          },
        });
      }

      const issueDoc = await tx.inventoryDocument.create({
        data: {
          documentNumber: ids.issue,
          documentType: 'ISSUE',
          documentDate: now,
          documentStatus: 'CONFIRMED',
          postingStatus: 'POSTED',
          warehouseId: warehouse.id,
          referenceType: 'MANUFACTURING_ORDER',
          referenceNumber: 'CI-MO',
          createdByUserId: user.id,
          postedByUserId: user.id,
          postedAt: now,
        },
      });
      documentIds.push(issueDoc.id);

      const issueSegments = [
        { contract: contractA, weight: 20, line: 1 },
        { contract: contractB, weight: 10, line: 2 },
      ];
      for (const segment of issueSegments) {
        const balance = await tx.stockBalance.findFirst({
          where: { physicalCoilId: coil.id, contractId: segment.contract.id, qualityStatus: 'AVAILABLE' },
        });
        if (!balance || Number(balance.weightKgAvailable) < segment.weight) throw new Error('Insufficient contract-specific coil balance in test fixture.');
        await tx.stockBalance.update({
          where: { id: balance.id },
          data: {
            quantityOnHand: { decrement: segment.weight },
            quantityAvailable: { decrement: segment.weight },
            weightKgOnHand: { decrement: segment.weight },
            weightKgAvailable: { decrement: segment.weight },
          },
        });
        const line = await tx.inventoryDocumentLine.create({
          data: {
            documentId: issueDoc.id,
            lineNumber: segment.line,
            partId: part.id,
            materialLotId: lot.id,
            physicalCoilId: coil.id,
            locationId: location.id,
            quantity: segment.weight,
            unitId: part.unitId,
            weightKg: segment.weight,
            ownership: 'SAPCO_SUPPLIER_OWNED',
            contractId: segment.contract.id,
            contractNumber: segment.contract.contractNumber,
          },
        });
        await tx.inventoryTransaction.create({
          data: {
            transactionNumber: `TEST-TRX-ISS-${nonce}-${segment.line}`,
            documentId: issueDoc.id,
            documentLineId: line.id,
            partId: part.id,
            materialLotId: lot.id,
            physicalCoilId: coil.id,
            warehouseId: warehouse.id,
            locationId: location.id,
            transactionType: 'OUTBOUND',
            quantity: segment.weight,
            quantitySigned: -segment.weight,
            unitId: part.unitId,
            weightKg: segment.weight,
            weightKgSigned: -segment.weight,
            ownership: 'SAPCO_SUPPLIER_OWNED',
            contractId: segment.contract.id,
            contractNumber: segment.contract.contractNumber,
            transactionDate: now,
            createdByUserId: user.id,
          },
        });
        await tx.coilIssueReturnRecord.create({
          data: {
            coilId: coil.id,
            inventoryDocumentId: issueDoc.id,
            contractId: segment.contract.id,
            partId: part.id,
            documentNumber: ids.issue,
            issuedWeightKg: segment.weight,
            outstandingWeightKg: segment.weight,
            status: 'ISSUED',
            issuedAt: now,
          },
        });
      }
      await tx.physicalCoil.update({ where: { id: coil.id }, data: { remainingWeightKg: { decrement: 30 }, physicalStatus: 'PARTIALLY_ISSUED' } });
      await tx.materialLot.update({ where: { id: lot.id }, data: { remainingWeightKg: { decrement: 30 } } });

      const returnDoc = await tx.inventoryDocument.create({
        data: {
          documentNumber: ids.returned,
          documentType: 'RETURN',
          documentDate: now,
          documentStatus: 'CONFIRMED',
          postingStatus: 'POSTED',
          warehouseId: warehouse.id,
          referenceType: 'MANUFACTURING_ORDER',
          referenceNumber: 'CI-MO',
          createdByUserId: user.id,
          postedByUserId: user.id,
          postedAt: now,
        },
      });
      documentIds.push(returnDoc.id);

      const issueRecord = await tx.coilIssueReturnRecord.findFirst({
        where: { coilId: coil.id, contractId: contractA.id, issuedWeightKg: { gt: 0 } },
      });
      if (!issueRecord) throw new Error('Issue genealogy row was not created.');
      await tx.coilIssueReturnRecord.update({
        where: { id: issueRecord.id },
        data: { returnedWeightKg: 12, outstandingWeightKg: 8, status: 'PARTIALLY_RETURNED', returnedAt: now },
      });
      const returnBalance = await tx.stockBalance.findFirst({
        where: { physicalCoilId: coil.id, contractId: contractA.id, qualityStatus: 'AVAILABLE' },
      });
      if (!returnBalance) throw new Error('Contract balance for return was not found.');
      await tx.stockBalance.update({
        where: { id: returnBalance.id },
        data: {
          quantityOnHand: { increment: 12 },
          quantityAvailable: { increment: 12 },
          weightKgOnHand: { increment: 12 },
          weightKgAvailable: { increment: 12 },
        },
      });
      const returnLine = await tx.inventoryDocumentLine.create({
        data: {
          documentId: returnDoc.id,
          lineNumber: 1,
          partId: part.id,
          materialLotId: lot.id,
          physicalCoilId: coil.id,
          locationId: location.id,
          quantity: 12,
          unitId: part.unitId,
          weightKg: 12,
          ownership: 'SAPCO_SUPPLIER_OWNED',
          contractId: contractA.id,
          contractNumber: contractA.contractNumber,
        },
      });
      await tx.inventoryTransaction.create({
        data: {
          transactionNumber: `TEST-TRX-RET-${nonce}`,
          documentId: returnDoc.id,
          documentLineId: returnLine.id,
          partId: part.id,
          materialLotId: lot.id,
          physicalCoilId: coil.id,
          warehouseId: warehouse.id,
          locationId: location.id,
          transactionType: 'INBOUND',
          quantity: 12,
          quantitySigned: 12,
          unitId: part.unitId,
          weightKg: 12,
          weightKgSigned: 12,
          ownership: 'SAPCO_SUPPLIER_OWNED',
          contractId: contractA.id,
          contractNumber: contractA.contractNumber,
          transactionDate: now,
          createdByUserId: user.id,
        },
      });
      await tx.coilIssueReturnRecord.create({
        data: {
          coilId: coil.id,
          inventoryDocumentId: returnDoc.id,
          contractId: contractA.id,
          partId: part.id,
          documentNumber: ids.returned,
          returnedWeightKg: 12,
          outstandingWeightKg: 0,
          status: 'FULLY_RETURNED',
          issuedAt: now,
          returnedAt: now,
        },
      });
      await tx.physicalCoil.update({ where: { id: coil.id }, data: { remainingWeightKg: { increment: 12 } } });
      await tx.materialLot.update({ where: { id: lot.id }, data: { remainingWeightKg: { increment: 12 } } });

      const [freshCoil, freshLot, balances, issueRecords, linkedTransactions, linkedLines] = await Promise.all([
        tx.physicalCoil.findUnique({ where: { id: coil.id } }),
        tx.materialLot.findUnique({ where: { id: lot.id } }),
        tx.stockBalance.findMany({ where: { physicalCoilId: coil.id } }),
        tx.coilIssueReturnRecord.findMany({ where: { coilId: coil.id } }),
        tx.inventoryTransaction.findMany({ where: { physicalCoilId: coil.id } }),
        tx.inventoryDocumentLine.findMany({ where: { physicalCoilId: coil.id } }),
      ]);
      const balanceWeight = balances.reduce((sum: number, row: any) => sum + Number(row.weightKgOnHand), 0);
      const outstanding = issueRecords.filter((row: any) => Number(row.issuedWeightKg) > 0).reduce((sum: number, row: any) => sum + Number(row.outstandingWeightKg), 0);
      if (Number(freshCoil.remainingWeightKg) !== 82) throw new Error(`Expected physical coil balance 82, got ${freshCoil.remainingWeightKg}.`);
      if (Number(freshLot.remainingWeightKg) !== 82) throw new Error(`Expected material lot balance 82, got ${freshLot.remainingWeightKg}.`);
      if (balanceWeight !== 82) throw new Error(`Expected stock ledger balance 82, got ${balanceWeight}.`);
      if (outstanding !== 18) throw new Error(`Expected line-side outstanding 18, got ${outstanding}.`);
      if (linkedTransactions.length !== 5 || linkedLines.length !== 5) throw new Error('Expected five coil-linked receipt, issue and return ledger rows.');
      console.log('PASS: physical coil, material lot, contract allocations, inventory documents, transactions, stock balances and issue/return genealogy reconcile to 82 kg.');
    });
  } finally {
    if (physicalCoilId) {
      await prisma.inventoryTransaction.deleteMany({ where: { physicalCoilId: physicalCoilId } });
      await prisma.inventoryDocumentLine.deleteMany({ where: { physicalCoilId: physicalCoilId } });
      await prisma.coilIssueReturnRecord.deleteMany({ where: { coilId: physicalCoilId } });
      await prisma.stockBalance.deleteMany({ where: { physicalCoilId: physicalCoilId } });
      await prisma.contractCoilAllocation.deleteMany({ where: { coilId: physicalCoilId } });
      await prisma.physicalCoil.deleteMany({ where: { id: physicalCoilId } });
    }
    if (documentIds.length) await prisma.inventoryDocument.deleteMany({ where: { id: { in: documentIds } } });
    if (materialLotId) await prisma.materialLot.deleteMany({ where: { id: materialLotId } });
    if (createdContractIds.length) await prisma.materialContract.deleteMany({ where: { id: { in: createdContractIds } } });
  }
}

main()
  .catch(error => {
    console.error('Physical coil persistence integration test failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
