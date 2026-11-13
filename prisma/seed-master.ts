import { PrismaClient, PartCategory, WarehouseType } from '@prisma/client';
import { INITIAL_PARTS } from '../src/server/sampleData';
import { WAREHOUSES_LIST } from '../src/types/inventory';

const prisma = new PrismaClient();

const categoryMap: Record<string, PartCategory> = {
  RAW_MATERIAL: PartCategory.RAW_MATERIAL,
  WIP_PART: PartCategory.WIP_PART,
  FINISHED_GOOD: PartCategory.FINISHED_GOOD,
};

const warehouseTypeMap: Record<string, WarehouseType> = {
  RAW_MATERIALS: WarehouseType.RAW_MATERIALS,
  WIP: WarehouseType.WIP,
  FINISHED_GOODS: WarehouseType.FINISHED_GOODS,
  SCRAP: WarehouseType.SCRAP,
  TOOLING: WarehouseType.TOOLING_DIES,
};

async function main() {
  console.log('Seeding canonical master data only (no demo stock, lots, contracts or transactions)...');

  const units = [
    { code: 'KG', name: 'کیلوگرم', symbol: 'kg', isBase: true },
    { code: 'PCS', name: 'عدد', symbol: 'pcs', isBase: true },
  ];
  const unitMap: Record<string, string> = {};
  for (const unit of units) {
    const row = await prisma.unitOfMeasure.upsert({
      where: { code: unit.code },
      update: { name: unit.name, symbol: unit.symbol, isBase: unit.isBase, active: true },
      create: unit,
    });
    unitMap[unit.code] = row.id;
  }

  const grades = [...new Set(INITIAL_PARTS.map(part => part.materialGrade).filter((grade): grade is string => Boolean(grade)))];
  const materialMap: Record<string, string> = {};
  for (const grade of grades) {
    const code = `MAT-${grade}`;
    const row = await prisma.material.upsert({
      where: { code },
      update: { name: `ورق فولادی ${grade}`, grade, standard: 'EN 10130', active: true },
      create: { code, name: `ورق فولادی ${grade}`, grade, standard: 'EN 10130', densityKgM3: 7850 },
    });
    materialMap[grade] = row.id;
  }

  for (const part of INITIAL_PARTS) {
    const unitId = unitMap[part.unit];
    if (!unitId) throw new Error(`Unit ${part.unit} is not configured for part ${part.code}.`);

    await prisma.part.upsert({
      where: { partNumber: part.code },
      update: {
        name: part.name,
        category: categoryMap[part.category],
        materialId: part.materialGrade ? materialMap[part.materialGrade] : null,
        thicknessMm: part.thicknessMm ?? null,
        weightNetKg: part.weightPerUnitKg ?? 0,
        weightGrossKg: part.weightPerUnitKg ?? 0,
        supplierPartNumber: part.sapcoCode ?? null,
        carModel: part.carModel ?? null,
        minSafetyStock: part.minStock ?? 0,
        maxStock: part.maxStock ?? null,
        active: true,
      },
      create: {
        partNumber: part.code,
        name: part.name,
        category: categoryMap[part.category],
        unitId,
        materialId: part.materialGrade ? materialMap[part.materialGrade] : undefined,
        thicknessMm: part.thicknessMm ?? null,
        weightNetKg: part.weightPerUnitKg ?? 0,
        weightGrossKg: part.weightPerUnitKg ?? 0,
        supplierPartNumber: part.sapcoCode ?? null,
        carModel: part.carModel ?? null,
        minSafetyStock: part.minStock ?? 0,
        maxStock: part.maxStock ?? null,
      },
    });
  }

  const warehouseMap: Record<string, string> = {};
  for (const warehouse of WAREHOUSES_LIST) {
    const row = await prisma.warehouse.upsert({
      where: { code: warehouse.code },
      update: {
        name: warehouse.name,
        type: warehouseTypeMap[warehouse.type],
        managerName: warehouse.managerName ?? null,
        active: true,
      },
      create: {
        code: warehouse.code,
        name: warehouse.name,
        type: warehouseTypeMap[warehouse.type],
        managerName: warehouse.managerName ?? null,
      },
    });
    warehouseMap[warehouse.code] = row.id;

    for (const locationCode of warehouse.locations) {
      await prisma.warehouseLocation.upsert({
        where: { warehouseId_code: { warehouseId: row.id, code: locationCode } },
        update: { active: true },
        create: { warehouseId: row.id, code: locationCode },
      });
    }
  }

  await prisma.savedReportConfig.upsert({
    where: { id: 'REP-CFG-01' },
    update: {},
    create: {
      id: 'REP-CFG-01',
      name: 'موجودی کل کلاف‌ها بر اساس پکینگ و گرید',
      reportType: 'COILS_SUMMARY',
      selectedColumns: ['materialGrade', 'thicknessMm', 'widthMm', 'coilPackNumber', 'totalCoilsCount', 'totalRemainingWeightKg'],
      groupBy: ['materialGrade', 'coilPackNumber'],
      filters: {},
    },
  });

  console.log(`Canonical master data ready: ${INITIAL_PARTS.length} parts, ${grades.length} material grades, ${WAREHOUSES_LIST.length} warehouses.`);
}

main()
  .catch(error => {
    console.error('Canonical master-data seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
