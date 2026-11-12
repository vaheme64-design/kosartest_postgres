import { getPrismaClient } from '../src/server/db/prisma';

function assert(description: string, condition: boolean) {
  if (!condition) throw new Error(`❌ ${description}`);
  console.log(`✅ ${description}`);
}

async function run() {
  const prisma = getPrismaClient();
  const id = `wip-cas-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await prisma.wipStateSnapshot.create({
      data: { id, version: 1, payload: { writer: 'initial', revision: 1 } },
    });

    // Simulate two independent server instances that both loaded version 1.
    const expectedVersion = 1;
    const [writerA, writerB] = await Promise.all([
      prisma.wipStateSnapshot.updateMany({
        where: { id, version: expectedVersion },
        data: { payload: { writer: 'server-A', revision: 2 }, version: { increment: 1 } },
      }),
      prisma.wipStateSnapshot.updateMany({
        where: { id, version: expectedVersion },
        data: { payload: { writer: 'server-B', revision: 2 }, version: { increment: 1 } },
      }),
    ]);

    assert('Exactly one concurrent writer wins the same snapshot version',
      writerA.count + writerB.count === 1);
    assert('The losing writer cannot overwrite the committed payload',
      (await prisma.wipStateSnapshot.findUnique({ where: { id } }))?.version === 2);

    const staleRetry = await prisma.wipStateSnapshot.updateMany({
      where: { id, version: expectedVersion },
      data: { payload: { writer: 'stale-retry', revision: 3 }, version: { increment: 1 } },
    });
    assert('A stale retry is rejected without incrementing the snapshot version',
      staleRetry.count === 0 &&
      (await prisma.wipStateSnapshot.findUnique({ where: { id } }))?.version === 2);

    const freshRetry = await prisma.wipStateSnapshot.updateMany({
      where: { id, version: 2 },
      data: { payload: { writer: 'fresh-retry', revision: 3 }, version: { increment: 1 } },
    });
    assert('A retry after reloading the latest version can commit',
      freshRetry.count === 1 &&
      (await prisma.wipStateSnapshot.findUnique({ where: { id } }))?.version === 3);
  } finally {
    await prisma.wipStateSnapshot.deleteMany({ where: { id } });
    await prisma.$disconnect();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
