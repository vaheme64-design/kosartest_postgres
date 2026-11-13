import { getPrismaClient } from './db/prisma';
import { manufacturingOrdersStore } from './productionWipEngine';

export interface WipIdentityLinkResult {
  linkId: string;
  wipManufacturingOrderId: string;
  manufacturingOrderId: string;
  operationLinks: Array<{
    wipOperationId: string;
    productionOperationId: string;
    stepNumber: number;
  }>;
}

/**
 * Creates an explicit, one-to-one bridge from snapshot WIP identifiers to
 * normalized ManufacturingOrder/ProductionOperation identifiers.
 *
 * It deliberately does not infer IDs from labels or write inventory movements.
 * Every operation must match by step number and process type before linking.
 */
export async function linkWipManufacturingOrderToRelational(
  wipManufacturingOrderId: string,
  manufacturingOrderId: string,
  createdBy?: string,
  notes?: string,
): Promise<WipIdentityLinkResult> {
  const wipOrder = manufacturingOrdersStore.find(order => order.id === wipManufacturingOrderId);
  if (!wipOrder) {
    throw new Error(`WIP manufacturing order "${wipManufacturingOrderId}" was not found in the loaded WIP state.`);
  }

  const prisma = getPrismaClient();
  const relationalOrder = await prisma.manufacturingOrder.findUnique({
    where: { id: manufacturingOrderId },
    include: {
      part: true,
      operations: { include: { operation: true }, orderBy: { stepNumber: 'asc' } },
    },
  });

  if (!relationalOrder) {
    throw new Error(`Relational manufacturing order "${manufacturingOrderId}" was not found.`);
  }

  if (relationalOrder.part.partNumber !== wipOrder.partCode) {
    throw new Error(
      `Part mismatch: WIP part "${wipOrder.partCode}" does not match relational part "${relationalOrder.part.partNumber}".`,
    );
  }

  if (wipOrder.operations.length !== relationalOrder.operations.length) {
    throw new Error(
      `Routing mismatch: WIP has ${wipOrder.operations.length} operations; relational order has ${relationalOrder.operations.length}.`,
    );
  }

  const relationalByStep = new Map(relationalOrder.operations.map(operation => [operation.stepNumber, operation]));
  const matchedOperations = wipOrder.operations.map(wipOperation => {
    const relationalOperation = relationalByStep.get(wipOperation.stepNumber);
    if (!relationalOperation) {
      throw new Error(`No relational operation matches WIP step ${wipOperation.stepNumber}.`);
    }
    if (relationalOperation.operation.processType !== wipOperation.processType) {
      throw new Error(
        `Process mismatch at step ${wipOperation.stepNumber}: WIP "${wipOperation.processType}" vs relational "${relationalOperation.operation.processType}".`,
      );
    }
    return {
      wipOperationId: wipOperation.id,
      productionOperationId: relationalOperation.id,
      stepNumber: wipOperation.stepNumber,
    };
  });

  return prisma.$transaction(async tx => {
    const existingOrderLink = await tx.wipManufacturingOrderLink.findFirst({
      where: {
        OR: [
          { wipManufacturingOrderId },
          { manufacturingOrderId },
        ],
      },
      include: { operationLinks: true },
    });

    if (existingOrderLink) {
      const sameOrder =
        existingOrderLink.wipManufacturingOrderId === wipManufacturingOrderId &&
        existingOrderLink.manufacturingOrderId === manufacturingOrderId;
      const sameOperations =
        existingOrderLink.operationLinks.length === matchedOperations.length &&
        matchedOperations.every(match =>
          existingOrderLink.operationLinks.some(link =>
            link.wipOperationId === match.wipOperationId &&
            link.productionOperationId === match.productionOperationId
          )
        );
      if (sameOrder && sameOperations) {
        return {
          linkId: existingOrderLink.id,
          wipManufacturingOrderId,
          manufacturingOrderId,
          operationLinks: matchedOperations,
        };
      }
      throw new Error('A conflicting WIP-to-relational identity link already exists. No changes were made.');
    }

    const created = await tx.wipManufacturingOrderLink.create({
      data: {
        wipManufacturingOrderId,
        manufacturingOrderId,
        createdBy: createdBy?.trim() || null,
        notes: notes?.trim() || null,
        operationLinks: {
          create: matchedOperations.map(match => ({
            wipOperationId: match.wipOperationId,
            productionOperationId: match.productionOperationId,
          })),
        },
      },
      include: { operationLinks: true },
    });

    return {
      linkId: created.id,
      wipManufacturingOrderId,
      manufacturingOrderId,
      operationLinks: matchedOperations,
    };
  });
}
