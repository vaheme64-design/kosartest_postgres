/**
 * =========================================================================
 * KPIMS (Kosar Production & Inventory Management System)
 * Relational Database Demonstration Seed Script
 * =========================================================================
 * Populates realistic demonstration data for an automotive sheet metal stamping plant:
 * - Master Data: Units, Materials, Parts (52 automotive parts catalog),
 *   Machines, Dies, Capabilities, Warehouses, Locations, Shifts, Customers.
 * - Production Data: Routes, Customer Orders, Production Plans, Manufacturing Orders,
 *   Operations, Shift Reports, Scraps.
 * - Inventory Data: SAPCO Material Contracts, Coils (Lots), Inventory Documents,
 *   Immutable Kardex Ledger Transactions (UTC timestamps, running balances), Stock Balances.
 * - Control Data: Roles, Permissions, Role-Permissions, Admin/Supervisor Users,
 *   Document Sequences, System Settings.
 */

import { PartCategory, ProcessType, MachineType, MachineStatus, DieType, DieStatus, WarehouseType, DocumentStatus, PostingStatus, InventoryDocType, DocReferenceType, TransactionType, OrderLineStatus, PlanStatus, PlanLineStatus, MOStatus, ProductionOpStatus, ScrapReason, TransferStatus, LotStatus, ContractStatus, ContractTxType, RouteStatus } from '@prisma/client';
import { getPrismaClient } from '../src/server/db/prisma';

const prisma = getPrismaClient();

async function main() {
  console.log('🌱 Starting KPIMS Relational Database Seed...');

  // -------------------------------------------------------------------------
  // 1. CONTROL DATA: Roles & Permissions
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Roles & Permissions...');

  const roles = [
    { name: 'ADMIN', displayName: 'مدیر ارشد سیستم', description: 'دسترسی کامل به تمامی بخش‌های مهندسی، انبار و تولید' },
    { name: 'PRODUCTION_MANAGER', displayName: 'مدیر برنامه‌ریزی و تولید', description: 'مدیریت برنامه‌ریزی، صدور دستورات ساخت و مانیتورینگ خطوط' },
    { name: 'WAREHOUSE_KEEPER', displayName: 'سرپرست انبار مواد و محصول', description: 'رسید و حواله کلاف‌های ساپکو، گردش انبار و کاردکس' },
    { name: 'QC_INSPECTOR', displayName: 'بازرس کنترل کیفیت', description: 'تایید کیفیت متریال، ثبت ضایعات و گزارشات عدم انطباق' },
    { name: 'LINE_SUPERVISOR', displayName: 'سرپرست خط و شیفت پرس', description: 'ثبت عملکرد ساعتی پرس‌ها، ضرب قالب و گزارش شیفت' },
    { name: 'OPERATOR', displayName: 'اپراتور ماشین‌کاری و پرس', description: 'مشاهده دستور ساخت و ثبت شروع/پایان عملیات' },
  ];

  const createdRoles: Record<string, string> = {};
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { displayName: r.displayName, description: r.description },
      create: r,
    });
    createdRoles[r.name] = role.id;
  }

  const permissions = [
    { code: 'PARTS_READ', module: 'MASTER_DATA', name: 'مشاهده کاتالوگ قطعات' },
    { code: 'PARTS_WRITE', module: 'MASTER_DATA', name: 'تعریف و ویرایش قطعات و مشخصات فنی' },
    { code: 'MACHINES_MANAGE', module: 'MASTER_DATA', name: 'مدیریت پرس‌ها و ماتریس قابلیت' },
    { code: 'DIES_MANAGE', module: 'MASTER_DATA', name: 'مدیریت قالب‌ها و طول عمر ضرب' },
    { code: 'ROUTES_MANAGE', module: 'MASTER_DATA', name: 'طراحی مسیر تولید و نسخه‌گذاری فرآیند' },
    { code: 'MO_CREATE', module: 'PRODUCTION', name: 'صدور کارت و دستور ساخت (MO)' },
    { code: 'MO_RELEASE', module: 'PRODUCTION', name: 'ابلاغ و آزادسازی دستور کار به سالن' },
    { code: 'REPORT_SUBMIT', module: 'PRODUCTION', name: 'ثبت و تایید گزارش شیفت و تولید روزانه' },
    { code: 'INVENTORY_RECEIPT', module: 'INVENTORY', name: 'ثبت رسید کویل و مواد ورودی ساپکو' },
    { code: 'INVENTORY_ISSUE', module: 'INVENTORY', name: 'صدور حواله مصرف مواد اولیه به خطوط' },
    { code: 'INVENTORY_POST', module: 'INVENTORY', name: 'تایید قطعی و اثرگذاری بر کاردکس' },
    { code: 'INVENTORY_REVERSE', module: 'INVENTORY', name: 'ابطال و صدور سند معکوس اصلاحیه' },
    { code: 'AUDIT_VIEW', module: 'CONTROL', name: 'مشاهده لاگ ممیزی و امنیت داده‌ها' },
  ];

  for (const p of permissions) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { module: p.module, name: p.name },
      create: p,
    });

    // Assign to Admin role
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: createdRoles['ADMIN'],
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: createdRoles['ADMIN'],
        permissionId: perm.id,
      },
    });
  }

  // Users
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@kosar-metal.ir',
      fullName: 'مهندس حسینی (مدیر سیستم)',
      personnelCode: 'EMP-1001',
      roleId: createdRoles['ADMIN'],
      active: true,
    },
  });

  const supervisorUser = await prisma.user.upsert({
    where: { username: 'supervisor_press' },
    update: {},
    create: {
      username: 'supervisor_press',
      email: 'supervisor@kosar-metal.ir',
      fullName: 'مهندس رضایی (سرپرست سالن پرس)',
      personnelCode: 'EMP-2045',
      roleId: createdRoles['LINE_SUPERVISOR'],
      active: true,
    },
  });

  const warehouseUser = await prisma.user.upsert({
    where: { username: 'wh_keeper' },
    update: {},
    create: {
      username: 'wh_keeper',
      email: 'warehouse@kosar-metal.ir',
      fullName: 'آقای مرادی (سرپرست انبار ورق و محصول)',
      personnelCode: 'EMP-3012',
      roleId: createdRoles['WAREHOUSE_KEEPER'],
      active: true,
    },
  });

  // Document Sequences
  const sequences = [
    { code: 'DOC_REC_1403', prefix: 'REC-1403-', currentValue: 142, year: '1403' },
    { code: 'DOC_ISS_1403', prefix: 'ISS-1403-', currentValue: 89, year: '1403' },
    { code: 'DOC_TRF_1403', prefix: 'TRF-1403-', currentValue: 215, year: '1403' },
    { code: 'MO_1403', prefix: 'MO-1403-', currentValue: 1084, year: '1403' },
    { code: 'TRX_1403', prefix: 'TRX-1403-', currentValue: 3410, year: '1403' },
    { code: 'PR_1403', prefix: 'PR-1403-', currentValue: 720, year: '1403' },
  ];
  for (const seq of sequences) {
    await prisma.documentSequence.upsert({
      where: { code: seq.code },
      update: { prefix: seq.prefix, currentValue: seq.currentValue },
      create: seq,
    });
  }

  // System Settings
  const settings = [
    { key: 'SCRAP_NORM_MAX_TOLERANCE', value: '2.5', category: 'PRODUCTION', description: 'حداکثر انحراف مجاز ضایعات بدون نیاز به تایید مدیر کارخانه (%)' },
    { key: 'SAPCO_CONTRACT_WARNING_PERCENT', value: '85', category: 'INVENTORY', description: 'درصد هشدار مصرف سهمیه کلاف ساپکو' },
    { key: 'DEFAULT_STAMPING_SETUP_MIN', value: '45', category: 'PRODUCTION', description: 'زمان استاندارد ستاپ و بستن قالب سنگین پرس (دقیقه)' },
    { key: 'FACTORY_CALENDAR_DEFAULT', value: 'JALALI', category: 'GENERAL', description: 'تقویم پیش‌فرض رابط کاربری (جلالی / خورشیدی)' },
  ];
  for (const set of settings) {
    await prisma.systemSetting.upsert({
      where: { key: set.key },
      update: { value: set.value, description: set.description },
      create: set,
    });
  }

  // -------------------------------------------------------------------------
  // 2. MASTER DATA: Units of Measure
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Units of Measure...');
  const uoms = [
    { code: 'KG', name: 'کیلوگرم', symbol: 'kg', isBase: true },
    { code: 'PCS', name: 'عدد', symbol: 'pcs', isBase: false },
    { code: 'M', name: 'متر', symbol: 'm', isBase: false },
    { code: 'MM', name: 'میلیمتر', symbol: 'mm', isBase: false },
    { code: 'TON', name: 'تن', symbol: 't', isBase: false },
    { code: 'ROLL', name: 'کلاف / رول', symbol: 'roll', isBase: false },
  ];
  const uomMap: Record<string, string> = {};
  for (const u of uoms) {
    const created = await prisma.unitOfMeasure.upsert({
      where: { code: u.code },
      update: { name: u.name, symbol: u.symbol },
      create: u,
    });
    uomMap[u.code] = created.id;
  }

  // -------------------------------------------------------------------------
  // 3. MASTER DATA: Materials (Automotive Steels)
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Materials (Steel Grades)...');
  const materials = [
    { code: 'MAT-DC04', name: 'ورق فولادی روغنی DC04 کشش عمیق فوق ویژه', grade: 'DC04', standard: 'EN 10130', densityKgM3: 7850, yieldStrengthMpa: 210, tensileStrengthMpa: 350, elongationPercent: 38 },
    { code: 'MAT-ST14', name: 'ورق روغنی نورد سرد ST14 کشش عمیق', grade: 'ST14', standard: 'DIN 1623', densityKgM3: 7850, yieldStrengthMpa: 220, tensileStrengthMpa: 360, elongationPercent: 36 },
    { code: 'MAT-ST12', name: 'ورق روغنی معمولی ST12 فرم‌دهی و خمش', grade: 'ST12', standard: 'DIN 1623', densityKgM3: 7850, yieldStrengthMpa: 280, tensileStrengthMpa: 420, elongationPercent: 28 },
    { code: 'MAT-DX51D', name: 'ورق گالوانیزه ضد زنگ بدنه DX51D+Z', grade: 'DX51D', standard: 'EN 10346', densityKgM3: 7850, yieldStrengthMpa: 260, tensileStrengthMpa: 400, elongationPercent: 26 },
    { code: 'MAT-ST37', name: 'ورق سیاه ساختمانی ST37-2 نواربری و تقویتی', grade: 'ST37-2', standard: 'DIN 17100', densityKgM3: 7850, yieldStrengthMpa: 235, tensileStrengthMpa: 370, elongationPercent: 25 },
  ];
  const materialMap: Record<string, string> = {};
  for (const m of materials) {
    const created = await prisma.material.upsert({
      where: { code: m.code },
      update: { name: m.name, grade: m.grade },
      create: m,
    });
    materialMap[m.code] = created.id;
  }

  // -------------------------------------------------------------------------
  // 4. MASTER DATA: Warehouses & Locations
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Warehouses & Locations...');
  const warehouses = [
    { code: 'WH-RAW', name: 'انبار مواد اولیه و کویل ورق ساپکو', type: WarehouseType.RAW_MATERIALS, managerName: 'آقای مرادی' },
    { code: 'WH-WIP-STAMP', name: 'انبار کار در جریان پای کار سالن پرس', type: WarehouseType.WIP, managerName: 'سرپرست پرس' },
    { code: 'WH-WIP-WELD', name: 'انبار کار در جریان سالن جوشکاری', type: WarehouseType.WIP, managerName: 'سرپرست جوش' },
    { code: 'WH-FINISHED', name: 'انبار محصولات نهایی آماده ارسال به ساپکو', type: WarehouseType.FINISHED_GOODS, managerName: 'آقای محمدی' },
    { code: 'WH-SCRAP', name: 'انبار ضایعات آهن و پرت ورق پرسی', type: WarehouseType.SCRAP, managerName: 'مسئول بازیافت' },
    { code: 'WH-DIES', name: 'انبار و پالت‌های نگهداری قالب‌های پرس', type: WarehouseType.TOOLING_DIES, managerName: 'سرپرست قالب‌سازی' },
  ];
  const whMap: Record<string, string> = {};
  for (const w of warehouses) {
    const created = await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name, managerName: w.managerName },
      create: w,
    });
    whMap[w.code] = created.id;
  }

  // Warehouse Locations
  const locations = [
    { warehouseCode: 'WH-RAW', code: 'LOC-RAW-COIL-01', aisle: 'A', rack: '01', bin: 'C-01', maxCapacityKg: 50000 },
    { warehouseCode: 'WH-RAW', code: 'LOC-RAW-COIL-02', aisle: 'A', rack: '02', bin: 'C-02', maxCapacityKg: 50000 },
    { warehouseCode: 'WH-RAW', code: 'LOC-RAW-SHEET-01', aisle: 'B', rack: '01', bin: 'S-01', maxCapacityKg: 25000 },
    { warehouseCode: 'WH-WIP-STAMP', code: 'LOC-WIP-BLANK-01', aisle: 'P', rack: 'BLANK', bin: 'B-01', maxCapacityKg: 10000 },
    { warehouseCode: 'WH-WIP-STAMP', code: 'LOC-WIP-DRAWN-01', aisle: 'P', rack: 'DRAW', bin: 'D-01', maxCapacityKg: 10000 },
    { warehouseCode: 'WH-FINISHED', code: 'LOC-FIN-PALLET-01', aisle: 'F', rack: 'P-01', bin: 'F-01', maxCapacityKg: 15000 },
    { warehouseCode: 'WH-FINISHED', code: 'LOC-FIN-PALLET-02', aisle: 'F', rack: 'P-02', bin: 'F-02', maxCapacityKg: 15000 },
  ];
  const locMap: Record<string, string> = {};
  for (const loc of locations) {
    const created = await prisma.warehouseLocation.upsert({
      where: {
        warehouseId_code: {
          warehouseId: whMap[loc.warehouseCode],
          code: loc.code,
        },
      },
      update: { aisle: loc.aisle, rack: loc.rack, maxCapacityKg: loc.maxCapacityKg },
      create: {
        warehouseId: whMap[loc.warehouseCode],
        code: loc.code,
        aisle: loc.aisle,
        rack: loc.rack,
        bin: loc.bin,
        maxCapacityKg: loc.maxCapacityKg,
      },
    });
    locMap[loc.code] = created.id;
  }

  // -------------------------------------------------------------------------
  // 5. MASTER DATA: Shifts & Customers
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Shifts & Customers...');
  const shifts = [
    { code: 'SHIFT-MORN', name: 'شیفت صبح (۰۷:۰۰ الی ۱۵:۳۰)', startTime: '07:00', endTime: '15:30', productiveHours: 7.5 },
    { code: 'SHIFT-EVE', name: 'شیفت عصر (۱۵:۳۰ الی ۲۳:۳۰)', startTime: '15:30', endTime: '23:30', productiveHours: 7.5 },
    { code: 'SHIFT-NIGHT', name: 'شیفت شب (۲۳:۳۰ الی ۰۷:۰۰)', startTime: '23:30', endTime: '07:00', productiveHours: 7.0 },
  ];
  const shiftMap: Record<string, string> = {};
  for (const s of shifts) {
    const created = await prisma.shift.upsert({
      where: { code: s.code },
      update: { name: s.name, startTime: s.startTime, endTime: s.endTime },
      create: s,
    });
    shiftMap[s.code] = created.id;
  }

  const customers = [
    { code: 'CUST-SAPCO', name: 'ساپکو - شرکت طراحی مهندسی و تامین قطعات ایران خودرو', economicCode: '411135456781', contactPerson: 'اداره تدارکات بدنه و پرس', phone: '021-48900000' },
    { code: 'CUST-IKCO', name: 'ایران خودرو - کارخانه مرکزی جاده مخصوص', economicCode: '411135456782', contactPerson: 'سالن مونتاژ بدنه شماره ۱', phone: '021-48901111' },
    { code: 'CUST-SAIPA', name: 'سازه گستر سایپا - مدیریت زنجیره تامین قطعات پرسی', economicCode: '411135456783', contactPerson: 'مهندسی تامین بدنه', phone: '021-44980000' },
  ];
  const customerMap: Record<string, string> = {};
  for (const c of customers) {
    const created = await prisma.customer.upsert({
      where: { code: c.code },
      update: { name: c.name, contactPerson: c.contactPerson },
      create: c,
    });
    customerMap[c.code] = created.id;
  }

  // -------------------------------------------------------------------------
  // 6. MASTER DATA: Standard Operations
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Standard Operations...');
  const operations = [
    { code: 'OP-SHEAR', name: 'برش و نواربری ورق از کلاف', processType: ProcessType.SHEARING, standardLaborCostPerHour: 450000, standardMachineCostPerHour: 650000 },
    { code: 'OP-BLANK', name: 'بلنکینگ و پولک‌زنی اولیه', processType: ProcessType.BLANKING, standardLaborCostPerHour: 500000, standardMachineCostPerHour: 950000 },
    { code: 'OP-DRAW', name: 'کشش عمیق هیدرولیک پوسته', processType: ProcessType.DRAWING, standardLaborCostPerHour: 600000, standardMachineCostPerHour: 1800000 },
    { code: 'OP-TRIM', name: 'دوربری و پلیسه‌گیری لبه‌ها', processType: ProcessType.TRIMMING, standardLaborCostPerHour: 480000, standardMachineCostPerHour: 800000 },
    { code: 'OP-PIERCE', name: 'سوراخ‌کاری و پانچ هندسی', processType: ProcessType.PUNCH_FORM, standardLaborCostPerHour: 480000, standardMachineCostPerHour: 800000 },
    { code: 'OP-BEND', name: 'خم‌کاری با قالب خم یا پرس برک', processType: ProcessType.BENDING, standardLaborCostPerHour: 480000, standardMachineCostPerHour: 750000 },
    { code: 'OP-SPOT-WELD', name: 'پرس‌جوش نقطه‌ای مهره و تقویت', processType: ProcessType.SPOT_WELD, standardLaborCostPerHour: 550000, standardMachineCostPerHour: 600000 },
    { code: 'OP-CO2-WELD', name: 'جوشکاری تحت گاز محافظ CO2', processType: ProcessType.CO2_WELD, standardLaborCostPerHour: 700000, standardMachineCostPerHour: 500000 },
    { code: 'OP-PAINT', name: 'شستشو و رنگ کاتافورز ضد زنگ', processType: ProcessType.PAINT, standardLaborCostPerHour: 650000, standardMachineCostPerHour: 1200000 },
    { code: 'OP-ASSY', name: 'مونتاژ نهایی و بسته‌بندی پالت', processType: ProcessType.ASSEMBLY, standardLaborCostPerHour: 450000, standardMachineCostPerHour: 200000 },
  ];
  const operationMap: Record<string, string> = {};
  for (const op of operations) {
    const created = await prisma.operation.upsert({
      where: { code: op.code },
      update: { name: op.name, processType: op.processType },
      create: op,
    });
    operationMap[op.code] = created.id;
  }

  // -------------------------------------------------------------------------
  // 7. MASTER DATA: Machines (Stamping & Press Lines)
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Machines...');
  const machines = [
    { code: 'PRS-800-01', name: 'پرس هیدرولیک ۸۰۰ تن کشش عمیق شولر', machineType: MachineType.HYDRAULIC_PRESS, tonnageCapacity: 800, bolsterLengthMm: 3100, bolsterWidthMm: 2000, strokeLengthMm: 800, maxStrokesPerMinute: 16, shutHeightMm: 1100, hallLocation: 'سالن پرس سنگین' },
    { code: 'PRS-630-01', name: 'پرس مکانیکی دو نقطه ۶۳۰ تن ارفورت', machineType: MachineType.MECHANICAL_PRESS, tonnageCapacity: 630, bolsterLengthMm: 2800, bolsterWidthMm: 1800, strokeLengthMm: 500, maxStrokesPerMinute: 22, shutHeightMm: 950, hallLocation: 'سالن پرس سنگین' },
    { code: 'PRS-400-01', name: 'پرس ضربه‌ای ۴۰۰ تن بلنکینگ فورماکس', machineType: MachineType.MECHANICAL_PRESS, tonnageCapacity: 400, bolsterLengthMm: 2500, bolsterWidthMm: 1500, strokeLengthMm: 400, maxStrokesPerMinute: 30, shutHeightMm: 800, hallLocation: 'سالن پرس متوسط' },
    { code: 'PRS-250-01', name: 'پرس C فریم ۲۵۰ تن پانچ و دوربری', machineType: MachineType.MECHANICAL_PRESS, tonnageCapacity: 250, bolsterLengthMm: 1600, bolsterWidthMm: 1100, strokeLengthMm: 300, maxStrokesPerMinute: 45, shutHeightMm: 650, hallLocation: 'سالن پرس متوسط' },
    { code: 'BRK-CNC-01', name: 'پرس برک CNC ۲۰۰ تن دورما', machineType: MachineType.PRESS_BRAKE, tonnageCapacity: 200, bolsterLengthMm: 3200, bolsterWidthMm: 300, strokeLengthMm: 260, maxStrokesPerMinute: 18, shutHeightMm: 450, hallLocation: 'سالن فرم‌دهی و خم' },
    { code: 'SHR-NC-01', name: 'قیچی گیوتین هیدرولیک ۶ متری ورق', machineType: MachineType.SHEARING_MACHINE, tonnageCapacity: 120, bolsterLengthMm: 3000, bolsterWidthMm: 800, strokeLengthMm: 150, maxStrokesPerMinute: 25, shutHeightMm: 300, hallLocation: 'سالن نواربری و برش' },
    { code: 'WLD-SPOT-01', name: 'دستگاه پرس‌جوش مقاومتی آویز ۱۰۰ کاوا', machineType: MachineType.SPOT_WELDER, tonnageCapacity: 20, bolsterLengthMm: 500, bolsterWidthMm: 500, strokeLengthMm: 80, maxStrokesPerMinute: 60, shutHeightMm: 250, hallLocation: 'سالن جوشکاری' },
  ];
  const machineMap: Record<string, string> = {};
  for (const m of machines) {
    const created = await prisma.machine.upsert({
      where: { code: m.code },
      update: { name: m.name, tonnageCapacity: m.tonnageCapacity, hallLocation: m.hallLocation },
      create: m,
    });
    machineMap[m.code] = created.id;
  }

  // Machine Capabilities
  await prisma.machineCapability.upsert({
    where: { machineId_operationId: { machineId: machineMap['PRS-800-01'], operationId: operationMap['OP-DRAW'] } },
    update: {},
    create: { machineId: machineMap['PRS-800-01'], operationId: operationMap['OP-DRAW'], maxTonnage: 800, minThicknessMm: 0.6, maxThicknessMm: 3.5, efficiencyFactor: 1.0, isPreferred: true },
  });
  await prisma.machineCapability.upsert({
    where: { machineId_operationId: { machineId: machineMap['PRS-630-01'], operationId: operationMap['OP-TRIM'] } },
    update: {},
    create: { machineId: machineMap['PRS-630-01'], operationId: operationMap['OP-TRIM'], maxTonnage: 630, minThicknessMm: 0.5, maxThicknessMm: 3.0, efficiencyFactor: 1.0, isPreferred: true },
  });
  await prisma.machineCapability.upsert({
    where: { machineId_operationId: { machineId: machineMap['PRS-400-01'], operationId: operationMap['OP-BLANK'] } },
    update: {},
    create: { machineId: machineMap['PRS-400-01'], operationId: operationMap['OP-BLANK'], maxTonnage: 400, minThicknessMm: 0.5, maxThicknessMm: 2.5, efficiencyFactor: 1.0, isPreferred: true },
  });

  // -------------------------------------------------------------------------
  // 8. MASTER DATA: Parts Catalog (Automotive metal parts)
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Automotive Metal Parts...');

  // Representative subset of key automotive stamped parts
  const partsData = [
    // Raw Materials (Coils & Sheets)
    { partNumber: 'SAP-COIL-DC04-08', name: 'کویل ورق روغنی DC04 ضخامت ۰.۸ عرض ۱۲۵۰', category: PartCategory.RAW_MATERIAL, unitCode: 'KG', materialCode: 'MAT-DC04', thicknessMm: 0.8, weightNetKg: 1.0, weightGrossKg: 1.0, customerPartNumber: 'SAP-MAT-0498', carModel: 'عمومی بدنه', minSafetyStock: 5000 },
    { partNumber: 'SAP-COIL-ST14-12', name: 'کویل ورق روغنی ST14 ضخامت ۱.۲ عرض ۱۱۰۰', category: PartCategory.RAW_MATERIAL, unitCode: 'KG', materialCode: 'MAT-ST14', thicknessMm: 1.2, weightNetKg: 1.0, weightGrossKg: 1.0, customerPartNumber: 'SAP-MAT-0520', carModel: 'عمومی شاسی', minSafetyStock: 4000 },
    { partNumber: 'SAP-COIL-DX51-10', name: 'کویل ورق گالوانیزه DX51D ضخامت ۱.۰ عرض ۱۰۰۰', category: PartCategory.RAW_MATERIAL, unitCode: 'KG', materialCode: 'MAT-DX51D', thicknessMm: 1.0, weightNetKg: 1.0, weightGrossKg: 1.0, customerPartNumber: 'SAP-MAT-0610', carModel: 'عمومی کف', minSafetyStock: 3500 },

    // WIP Parts (Blanks & Stamped Shells)
    { partNumber: 'WIP-206-BRK-BLANK', name: 'بلنک اولیه براکت رام پژو ۲۰۶', category: PartCategory.WIP_PART, unitCode: 'PCS', materialCode: 'MAT-DC04', thicknessMm: 0.8, weightNetKg: 1.85, weightGrossKg: 2.10, carModel: 'پژو ۲۰۶', minSafetyStock: 400 },
    { partNumber: 'WIP-206-BRK-DRAWN', name: 'پوسته کشش یافته براکت رام پژو ۲۰۶', category: PartCategory.WIP_PART, unitCode: 'PCS', materialCode: 'MAT-DC04', thicknessMm: 0.8, weightNetKg: 1.85, weightGrossKg: 2.10, carModel: 'پژو ۲۰۶', minSafetyStock: 300 },
    { partNumber: 'WIP-TARA-REINF-BLANK', name: 'بلنک خام تقویتی ستون وسط تارا', category: PartCategory.WIP_PART, unitCode: 'PCS', materialCode: 'MAT-ST14', thicknessMm: 1.2, weightNetKg: 2.45, weightGrossKg: 2.80, carModel: 'تارا', minSafetyStock: 350 },
    { partNumber: 'WIP-DENA-CROSS-BLANK', name: 'بلنک تیرک عرضی داشبورد دنا پلاس', category: PartCategory.WIP_PART, unitCode: 'PCS', materialCode: 'MAT-ST14', thicknessMm: 1.2, weightNetKg: 3.10, weightGrossKg: 3.50, carModel: 'دنا پلاس', minSafetyStock: 250 },

    // Finished Goods (Automotive assemblies delivered to SAPCO/IKCO)
    { partNumber: 'IKCO-206-BRK01', name: 'براکت اتصال رام جلو پژو ۲۰۶ و ۲۰۷', category: PartCategory.FINISHED_GOOD, unitCode: 'PCS', materialCode: 'MAT-DC04', thicknessMm: 0.8, weightNetKg: 1.72, weightGrossKg: 2.10, customerPartNumber: '9638421080', carModel: 'پژو ۲۰۶ / ۲۰۷', minSafetyStock: 600 },
    { partNumber: 'IKCO-TARA-ST02', name: 'مجموعه تقویتی ستون وسط (B-Pillar) تارا', category: PartCategory.FINISHED_GOOD, unitCode: 'PCS', materialCode: 'MAT-ST14', thicknessMm: 1.2, weightNetKg: 2.30, weightGrossKg: 2.80, customerPartNumber: '821034001', carModel: 'تارا', minSafetyStock: 500 },
    { partNumber: 'IKCO-DENA-CR03', name: 'تیرک ضربه‌گیر عرضی داشبورد دنا پلاس', category: PartCategory.FINISHED_GOOD, unitCode: 'PCS', materialCode: 'MAT-ST14', thicknessMm: 1.2, weightNetKg: 2.95, weightGrossKg: 3.50, customerPartNumber: '741289004', carModel: 'دنا پلاس', minSafetyStock: 400 },
    { partNumber: 'SAIPA-SHAH-PL04', name: 'پایه نگه‌دارنده رادیاتور و سینی فن شاهین', category: PartCategory.FINISHED_GOOD, unitCode: 'PCS', materialCode: 'MAT-DX51D', thicknessMm: 1.0, weightNetKg: 1.45, weightGrossKg: 1.80, customerPartNumber: 'SP100-34102', carModel: 'شاهین', minSafetyStock: 450 },
  ];

  const partMap: Record<string, string> = {};
  for (const p of partsData) {
    const created = await prisma.part.upsert({
      where: { partNumber: p.partNumber },
      update: {
        name: p.name,
        category: p.category,
        thicknessMm: p.thicknessMm,
        weightNetKg: p.weightNetKg,
        weightGrossKg: p.weightGrossKg,
        customerPartNumber: p.customerPartNumber,
        carModel: p.carModel,
        minSafetyStock: p.minSafetyStock,
      },
      create: {
        partNumber: p.partNumber,
        name: p.name,
        category: p.category,
        unitId: uomMap[p.unitCode],
        materialId: p.materialCode ? materialMap[p.materialCode] : undefined,
        thicknessMm: p.thicknessMm,
        weightNetKg: p.weightNetKg,
        weightGrossKg: p.weightGrossKg,
        customerPartNumber: p.customerPartNumber,
        carModel: p.carModel,
        minSafetyStock: p.minSafetyStock,
      },
    });
    partMap[p.partNumber] = created.id;
  }

  // -------------------------------------------------------------------------
  // 9. MASTER DATA: Dies & Machine-Die Compatibility
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Tooling & Dies...');
  const dies = [
    { code: 'DIE-206-BRK-OP10', name: 'قالب بلنکینگ و برش اولیه براکت ۲۰۶', partNumber: 'IKCO-206-BRK01', dieType: DieType.BLANKING_DIE, tonnageRequired: 350, totalStrokeTarget: 250000, currentStrokes: 34200, storageLocation: 'RACK-D-01' },
    { code: 'DIE-206-BRK-OP20', name: 'قالب کشش عمیق پوسته براکت ۲۰۶', partNumber: 'IKCO-206-BRK01', dieType: DieType.DRAWING_DIE, tonnageRequired: 750, totalStrokeTarget: 200000, currentStrokes: 34200, storageLocation: 'RACK-D-02' },
    { code: 'DIE-206-BRK-OP30', name: 'قالب دوربری و سوراخ‌کاری براکت ۲۰۶', partNumber: 'IKCO-206-BRK01', dieType: DieType.TRIMMING_DIE, tonnageRequired: 300, totalStrokeTarget: 200000, currentStrokes: 34200, storageLocation: 'RACK-D-03' },
    { code: 'DIE-TARA-ST-OP10', name: 'قالب بلنک و سوراخ‌کاری تقویتی ستون تارا', partNumber: 'IKCO-TARA-ST02', dieType: DieType.BLANKING_DIE, tonnageRequired: 380, totalStrokeTarget: 250000, currentStrokes: 18500, storageLocation: 'RACK-D-04' },
    { code: 'DIE-TARA-ST-OP20', name: 'قالب فرم و خم‌کاری دقیق ستون تارا', partNumber: 'IKCO-TARA-ST02', dieType: DieType.FORMING_DIE, tonnageRequired: 500, totalStrokeTarget: 200000, currentStrokes: 18500, storageLocation: 'RACK-D-05' },
  ];

  const dieMap: Record<string, string> = {};
  for (const d of dies) {
    const created = await prisma.die.upsert({
      where: { code: d.code },
      update: { name: d.name, tonnageRequired: d.tonnageRequired, currentStrokes: d.currentStrokes },
      create: {
        code: d.code,
        name: d.name,
        partId: partMap[d.partNumber],
        dieType: d.dieType,
        tonnageRequired: d.tonnageRequired,
        totalStrokeTarget: d.totalStrokeTarget,
        currentStrokes: d.currentStrokes,
        storageLocation: d.storageLocation,
        status: DieStatus.READY,
      },
    });
    dieMap[d.code] = created.id;
  }

  // Machine-Die Compatibility
  await prisma.machineDieCompatibility.upsert({
    where: { machineId_dieId: { machineId: machineMap['PRS-400-01'], dieId: dieMap['DIE-206-BRK-OP10'] } },
    update: {},
    create: { machineId: machineMap['PRS-400-01'], dieId: dieMap['DIE-206-BRK-OP10'], isOptimal: true, clampingType: 'T_BOLT' },
  });
  await prisma.machineDieCompatibility.upsert({
    where: { machineId_dieId: { machineId: machineMap['PRS-800-01'], dieId: dieMap['DIE-206-BRK-OP20'] } },
    update: {},
    create: { machineId: machineMap['PRS-800-01'], dieId: dieMap['DIE-206-BRK-OP20'], isOptimal: true, clampingType: 'HYDRAULIC' },
  });
  await prisma.machineDieCompatibility.upsert({
    where: { machineId_dieId: { machineId: machineMap['PRS-630-01'], dieId: dieMap['DIE-206-BRK-OP30'] } },
    update: {},
    create: { machineId: machineMap['PRS-630-01'], dieId: dieMap['DIE-206-BRK-OP30'], isOptimal: true, clampingType: 'T_BOLT' },
  });

  // -------------------------------------------------------------------------
  // 10. MASTER DATA: Production Routes & Route Operations
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Production Routes (Versioning Supported)...');

  const route206 = await prisma.partRoute.upsert({
    where: {
      partId_version: {
        partId: partMap['IKCO-206-BRK01'],
        version: 'V1.0',
      },
    },
    update: { status: RouteStatus.ACTIVE, isDefault: true },
    create: {
      partId: partMap['IKCO-206-BRK01'],
      version: 'V1.0',
      status: RouteStatus.ACTIVE,
      isDefault: true,
      notes: 'مسیر استاندارد تولید براکت ۲۰۶ مورد تایید کیفیت ساپکو',
    },
  });

  const routeOperations206 = [
    { routeId: route206.id, stepNumber: 10, stepCode: 'OP10_BLANK', stepName: 'بلنکینگ اولیه از ورق روغنی ۰.۸', opCode: 'OP-BLANK', machineCode: 'PRS-400-01', dieCode: 'DIE-206-BRK-OP10', setupTimeMin: 40, standardCycleTimeSec: 25, scrapNormPercent: 1.8, transferBatchQty: 200 },
    { routeId: route206.id, stepNumber: 20, stepCode: 'OP20_DRAW', stepName: 'کشش عمیق هیدرولیک پوسته', opCode: 'OP-DRAW', machineCode: 'PRS-800-01', dieCode: 'DIE-206-BRK-OP20', setupTimeMin: 60, standardCycleTimeSec: 40, scrapNormPercent: 1.2, transferBatchQty: 200 },
    { routeId: route206.id, stepNumber: 30, stepCode: 'OP30_TRIM', stepName: 'دوربری و سوراخ‌کاری نهایی', opCode: 'OP-TRIM', machineCode: 'PRS-630-01', dieCode: 'DIE-206-BRK-OP30', setupTimeMin: 35, standardCycleTimeSec: 30, scrapNormPercent: 0.8, transferBatchQty: 200 },
    { routeId: route206.id, stepNumber: 40, stepCode: 'OP40_WELD', stepName: 'پرس‌جوش مهره شش‌گوش M8', opCode: 'OP-SPOT-WELD', machineCode: 'WLD-SPOT-01', setupTimeMin: 20, standardCycleTimeSec: 20, scrapNormPercent: 0.5, transferBatchQty: 200 },
  ];

  for (const ro of routeOperations206) {
    await prisma.routeOperation.upsert({
      where: { routeId_stepNumber: { routeId: ro.routeId, stepNumber: ro.stepNumber } },
      update: { stepName: ro.stepName, scrapNormPercent: ro.scrapNormPercent },
      create: {
        routeId: ro.routeId,
        stepNumber: ro.stepNumber,
        stepCode: ro.stepCode,
        stepName: ro.stepName,
        operationId: operationMap[ro.opCode],
        machineId: ro.machineCode ? machineMap[ro.machineCode] : undefined,
        dieId: ro.dieCode ? dieMap[ro.dieCode] : undefined,
        setupTimeMin: ro.setupTimeMin,
        standardCycleTimeSec: ro.standardCycleTimeSec,
        scrapNormPercent: ro.scrapNormPercent,
        transferBatchQty: ro.transferBatchQty,
      },
    });
  }

  // -------------------------------------------------------------------------
  // 11. INVENTORY: SAPCO Material Contracts & Lots (Coils)
  // -------------------------------------------------------------------------
  console.log('  -> Seeding SAPCO Quotas & Coils (MaterialLots)...');

  const contract = await prisma.materialContract.upsert({
    where: { contractNumber: 'CNT-SAPCO-1403-Q3' },
    update: { totalAllocatedWeightKg: 150000, receivedWeightKg: 42500 },
    create: {
      contractNumber: 'CNT-SAPCO-1403-Q3',
      supplierCustomerId: customerMap['CUST-SAPCO'],
      title: 'سهمیه پاییز ۱۴۰۳ ورق روغنی DC04 قطعات پرسی بدنه ایران خودرو',
      materialId: materialMap['MAT-DC04'],
      totalAllocatedWeightKg: 150000,
      receivedWeightKg: 42500,
      startDate: new Date('2024-09-22T00:00:00.000Z'),
      endDate: new Date('2024-12-21T00:00:00.000Z'),
      status: ContractStatus.ACTIVE,
      notes: 'تخصیص شرکت ساپکو جهت خطوط مونتاژ ۲۰۶ و تارا',
    },
  });

  const coils = [
    { lotNumber: 'COIL-SAP-1403-0498', materialCode: 'MAT-DC04', partNumber: 'SAP-COIL-DC04-08', heatNumber: 'HT-MOB-98241', coilSerialNumber: 'MSC-77401-A', thicknessMm: 0.8, widthMm: 1250, initialWeightKg: 14200, remainingWeightKg: 8750, locationCode: 'LOC-RAW-COIL-01', status: LotStatus.IN_USE },
    { lotNumber: 'COIL-SAP-1403-0501', materialCode: 'MAT-DC04', partNumber: 'SAP-COIL-DC04-08', heatNumber: 'HT-MOB-98242', coilSerialNumber: 'MSC-77402-B', thicknessMm: 0.8, widthMm: 1250, initialWeightKg: 13800, remainingWeightKg: 13800, locationCode: 'LOC-RAW-COIL-02', status: LotStatus.AVAILABLE },
    { lotNumber: 'COIL-SAP-1403-0525', materialCode: 'MAT-ST14', partNumber: 'SAP-COIL-ST14-12', heatNumber: 'HT-MOB-77103', coilSerialNumber: 'MSC-81203-C', thicknessMm: 1.2, widthMm: 1100, initialWeightKg: 14500, remainingWeightKg: 14500, locationCode: 'LOC-RAW-SHEET-01', status: LotStatus.AVAILABLE },
  ];

  const lotMap: Record<string, string> = {};
  for (const c of coils) {
    const created = await prisma.materialLot.upsert({
      where: { lotNumber: c.lotNumber },
      update: { remainingWeightKg: c.remainingWeightKg, status: c.status },
      create: {
        lotNumber: c.lotNumber,
        materialId: materialMap[c.materialCode],
        partId: partMap[c.partNumber],
        supplierContractId: contract.id,
        heatNumber: c.heatNumber,
        coilSerialNumber: c.coilSerialNumber,
        thicknessMm: c.thicknessMm,
        widthMm: c.widthMm,
        initialWeightKg: c.initialWeightKg,
        remainingWeightKg: c.remainingWeightKg,
        warehouseLocationId: locMap[c.locationCode],
        status: c.status,
        receivedDate: new Date('2024-10-15T08:30:00.000Z'),
      },
    });
    lotMap[c.lotNumber] = created.id;
  }

  // Contract transaction record
  await prisma.materialContractTransaction.create({
    data: {
      contractId: contract.id,
      lotId: lotMap['COIL-SAP-1403-0498'],
      transactionType: ContractTxType.RECEIPT,
      weightKg: 14200,
      waybillNumber: 'WB-SAP-892401',
      receiptDate: new Date('2024-10-15T08:30:00.000Z'),
      notes: 'ورود کلاف اول ورق روغنی DC04 با بارنامه ساپکو',
    },
  });

  // -------------------------------------------------------------------------
  // 12. PRODUCTION: Customer Orders & Plans
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Customer Orders & Production Plans...');

  const customerOrder = await prisma.customerOrder.upsert({
    where: { orderNumber: 'CO-1403-0901' },
    update: { documentStatus: DocumentStatus.CONFIRMED },
    create: {
      orderNumber: 'CO-1403-0901',
      customerId: customerMap['CUST-SAPCO'],
      orderDate: new Date('2024-10-20T00:00:00.000Z'),
      requestedDeliveryDate: new Date('2024-11-20T00:00:00.000Z'),
      customerContractNumber: 'SAP-DELIV-1403-88',
      documentStatus: DocumentStatus.CONFIRMED,
      totalAmount: 1850000000,
      notes: 'سفارش تحویل آبان ماه قطعات بدنه ۲۰۶',
    },
  });

  await prisma.customerOrderLine.upsert({
    where: { orderId_lineNumber: { orderId: customerOrder.id, lineNumber: 1 } },
    update: { orderedQty: 5000 },
    create: {
      orderId: customerOrder.id,
      partId: partMap['IKCO-206-BRK01'],
      lineNumber: 1,
      orderedQty: 5000,
      deliveredQty: 1200,
      unitPrice: 370000,
      requestedDate: new Date('2024-11-20T00:00:00.000Z'),
      status: OrderLineStatus.IN_PRODUCTION,
    },
  });

  const prodPlan = await prisma.productionPlan.upsert({
    where: { planNumber: 'PLN-1403-W44' },
    update: { status: PlanStatus.APPROVED },
    create: {
      planNumber: 'PLN-1403-W44',
      title: 'برنامه هفتگی خط پرس قطعات ۲۰۶ و تارا - هفته اول آبان',
      startDate: new Date('2024-10-26T00:00:00.000Z'),
      endDate: new Date('2024-11-01T23:59:59.000Z'),
      status: PlanStatus.APPROVED,
      approvedByUserId: adminUser.id,
      approvedAt: new Date('2024-10-25T14:00:00.000Z'),
      notes: 'برنامه اولویت‌دار جهت جلوگیری از توقف خط ایران خودرو',
    },
  });

  const planLine = await prisma.productionPlanLine.upsert({
    where: { id: 'plan-line-206-w44' },
    update: { plannedQty: 3000 },
    create: {
      id: 'plan-line-206-w44',
      planId: prodPlan.id,
      partId: partMap['IKCO-206-BRK01'],
      customerOrderId: customerOrder.id,
      plannedQty: 3000,
      producedQty: 1850,
      plannedStartDate: new Date('2024-10-26T07:00:00.000Z'),
      plannedEndDate: new Date('2024-10-31T19:00:00.000Z'),
      priority: 2,
      status: PlanLineStatus.IN_PROGRESS,
    },
  });

  // Manufacturing Order
  const mo = await prisma.manufacturingOrder.upsert({
    where: { moNumber: 'MO-1403-1082' },
    update: { status: MOStatus.IN_PROGRESS, completedQty: 1850 },
    create: {
      moNumber: 'MO-1403-1082',
      partId: partMap['IKCO-206-BRK01'],
      routeId: route206.id,
      planId: prodPlan.id,
      planLineId: planLine.id,
      targetQty: 3000,
      completedQty: 1850,
      scrapQty: 42,
      scheduledStartDate: new Date('2024-10-26T07:00:00.000Z'),
      scheduledEndDate: new Date('2024-10-31T19:00:00.000Z'),
      actualStartDate: new Date('2024-10-26T07:30:00.000Z'),
      priority: 2,
      status: MOStatus.IN_PROGRESS,
      notes: 'دستور ساخت فوری کارت تولید شماره ۱۰۸۲ براکت رام ۲۰۶',
    },
  });

  // Manufacturing Operations
  const moOp10 = await prisma.productionOperation.upsert({
    where: { manufacturingOrderId_stepNumber: { manufacturingOrderId: mo.id, stepNumber: 10 } },
    update: { outputGoodQty: 2500, outputScrapQty: 25 },
    create: {
      manufacturingOrderId: mo.id,
      operationId: operationMap['OP-BLANK'],
      stepNumber: 10,
      plannedMachineId: machineMap['PRS-400-01'],
      plannedDieId: dieMap['DIE-206-BRK-OP10'],
      plannedQty: 3000,
      inputQty: 3000,
      outputGoodQty: 2500,
      outputScrapQty: 25,
      status: ProductionOpStatus.COMPLETED,
    },
  });

  const moOp20 = await prisma.productionOperation.upsert({
    where: { manufacturingOrderId_stepNumber: { manufacturingOrderId: mo.id, stepNumber: 20 } },
    update: { outputGoodQty: 1950, outputScrapQty: 17 },
    create: {
      manufacturingOrderId: mo.id,
      operationId: operationMap['OP-DRAW'],
      stepNumber: 20,
      plannedMachineId: machineMap['PRS-800-01'],
      plannedDieId: dieMap['DIE-206-BRK-OP20'],
      plannedQty: 2500,
      inputQty: 2000,
      outputGoodQty: 1950,
      outputScrapQty: 17,
      status: ProductionOpStatus.IN_PROGRESS,
    },
  });

  // Shift Production Report
  const prodReport = await prisma.productionReport.upsert({
    where: { reportNumber: 'PR-1403-1028-01' },
    update: { goodQuantity: 650, scrapQuantity: 8 },
    create: {
      reportNumber: 'PR-1403-1028-01',
      manufacturingOrderId: mo.id,
      productionOperationId: moOp20.id,
      machineId: machineMap['PRS-800-01'],
      dieId: dieMap['DIE-206-BRK-OP20'],
      shiftId: shiftMap['SHIFT-MORN'],
      operatorUserId: supervisorUser.id,
      supervisorUserId: supervisorUser.id,
      reportDate: new Date('2024-10-28T07:00:00.000Z'),
      strokeCounterStart: 33550,
      strokeCounterEnd: 34208,
      goodQuantity: 650,
      scrapQuantity: 8,
      reworkQuantity: 0,
      runTimeMinutes: 410,
      downtimeMinutes: 40,
      downtimeReason: 'تعویض پالت بلنک ورودی و تمیزکاری سطح سنبه کشش',
      notes: 'کیفیت کشش مطلوب، بدون خطوط پلیسه یا لغزش ورق',
      documentStatus: DocumentStatus.CONFIRMED,
      postingStatus: PostingStatus.POSTED,
    },
  });

  // Scrap breakdown
  await prisma.productionScrap.create({
    data: {
      productionReportId: prodReport.id,
      productionOperationId: moOp20.id,
      scrapReason: ScrapReason.TEAR_CRACK,
      quantity: 5,
      weightKg: 9.25, // 5 * 1.85 kg
      isRecoverable: false,
      notes: 'پارگی در گوشه عمیق کشش به علت افت فشار روغن بالشتک',
    },
  });
  await prisma.productionScrap.create({
    data: {
      productionReportId: prodReport.id,
      productionOperationId: moOp20.id,
      scrapReason: ScrapReason.SURFACE_SCRATCH,
      quantity: 3,
      weightKg: 5.55,
      isRecoverable: true,
      notes: 'خط و خش سطحی قابل استفاده برای تولید قطعات تقویتی کوچک',
    },
  });

  // -------------------------------------------------------------------------
  // 13. INVENTORY: Documents, Immutable Transactions & Balances
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Inventory Documents, Kardex Ledger & Stock Balances...');

  // Receipt Document for SAPCO Coil
  const recDoc = await prisma.inventoryDocument.upsert({
    where: { documentNumber: 'DOC-REC-1403-0142' },
    update: { postingStatus: PostingStatus.POSTED },
    create: {
      documentNumber: 'DOC-REC-1403-0142',
      documentType: InventoryDocType.RECEIPT,
      documentDate: new Date('2024-10-15T09:00:00.000Z'),
      documentStatus: DocumentStatus.CONFIRMED,
      postingStatus: PostingStatus.POSTED,
      warehouseId: whMap['WH-RAW'],
      referenceType: DocReferenceType.SAPCO_COIL,
      referenceNumber: 'WB-SAP-892401',
      createdByUserId: warehouseUser.id,
      postedByUserId: warehouseUser.id,
      postedAt: new Date('2024-10-15T09:15:00.000Z'),
      notes: 'رسید مستقیم کلاف ارسالی فولاد مبارکه با حواله ساپکو',
    },
  });

  await prisma.inventoryDocumentLine.upsert({
    where: { documentId_lineNumber: { documentId: recDoc.id, lineNumber: 1 } },
    update: {},
    create: {
      documentId: recDoc.id,
      lineNumber: 1,
      partId: partMap['SAP-COIL-DC04-08'],
      materialLotId: lotMap['COIL-SAP-1403-0498'],
      locationId: locMap['LOC-RAW-COIL-01'],
      quantity: 14200,
      unitId: uomMap['KG'],
      weightKg: 14200,
      unitCost: 48000,
    },
  });

  // Immutable Ledger Transaction (Inbound)
  await prisma.inventoryTransaction.upsert({
    where: { transactionNumber: 'TRX-1403-3410' },
    update: {},
    create: {
      transactionNumber: 'TRX-1403-3410',
      documentId: recDoc.id,
      partId: partMap['SAP-COIL-DC04-08'],
      materialLotId: lotMap['COIL-SAP-1403-0498'],
      warehouseId: whMap['WH-RAW'],
      locationId: locMap['LOC-RAW-COIL-01'],
      transactionType: TransactionType.INBOUND,
      quantity: 14200,
      quantitySigned: 14200,
      unitId: uomMap['KG'],
      weightKg: 14200,
      weightKgSigned: 14200,
      balanceAfter: 14200,
      balanceKgAfter: 14200,
      transactionDate: new Date('2024-10-15T09:15:00.000Z'), // UTC
      postingStatus: PostingStatus.POSTED,
      createdByUserId: warehouseUser.id,
    },
  });

  // Stock Balance Snapshot
  await prisma.stockBalance.upsert({
    where: {
      partId_warehouseId_locationId_materialLotId: {
        partId: partMap['SAP-COIL-DC04-08'],
        warehouseId: whMap['WH-RAW'],
        locationId: locMap['LOC-RAW-COIL-01'],
        materialLotId: lotMap['COIL-SAP-1403-0498'],
      },
    },
    update: {
      quantityOnHand: 8750,
      quantityAvailable: 8750,
      weightKgOnHand: 8750,
      weightKgAvailable: 8750,
    },
    create: {
      partId: partMap['SAP-COIL-DC04-08'],
      warehouseId: whMap['WH-RAW'],
      locationId: locMap['LOC-RAW-COIL-01'],
      materialLotId: lotMap['COIL-SAP-1403-0498'],
      quantityOnHand: 8750,
      quantityReserved: 0,
      quantityAvailable: 8750,
      weightKgOnHand: 8750,
      weightKgReserved: 0,
      weightKgAvailable: 8750,
      lastTransactionAt: new Date('2024-10-28T08:00:00.000Z'),
    },
  });

  // Finished Goods stock balance
  await prisma.stockBalance.upsert({
    where: {
      partId_warehouseId_locationId_materialLotId: {
        partId: partMap['IKCO-206-BRK01'],
        warehouseId: whMap['WH-FINISHED'],
        locationId: locMap['LOC-FIN-PALLET-01'],
        materialLotId: lotMap['COIL-SAP-1403-0498'], // traced back to parent lot
      },
    },
    update: {
      quantityOnHand: 1850,
      quantityAvailable: 1850,
      weightKgOnHand: 3182,
      weightKgAvailable: 3182,
    },
    create: {
      partId: partMap['IKCO-206-BRK01'],
      warehouseId: whMap['WH-FINISHED'],
      locationId: locMap['LOC-FIN-PALLET-01'],
      materialLotId: lotMap['COIL-SAP-1403-0498'],
      quantityOnHand: 1850,
      quantityReserved: 0,
      quantityAvailable: 1850,
      weightKgOnHand: 3182,
      weightKgReserved: 0,
      weightKgAvailable: 3182,
      lastTransactionAt: new Date('2024-10-28T16:00:00.000Z'),
    },
  });

  // Finished goods ledger transaction
  await prisma.inventoryTransaction.upsert({
    where: { transactionNumber: 'TRX-1403-3415' },
    update: {},
    create: {
      transactionNumber: 'TRX-1403-3415',
      partId: partMap['IKCO-206-BRK01'],
      materialLotId: lotMap['COIL-SAP-1403-0498'],
      warehouseId: whMap['WH-FINISHED'],
      locationId: locMap['LOC-FIN-PALLET-01'],
      transactionType: TransactionType.INBOUND,
      quantity: 650,
      quantitySigned: 650,
      unitId: uomMap['PCS'],
      weightKg: 1118, // 650 * 1.72 kg
      weightKgSigned: 1118,
      balanceAfter: 1850,
      balanceKgAfter: 3182,
      transactionDate: new Date('2024-10-28T16:00:00.000Z'),
      postingStatus: PostingStatus.POSTED,
      createdByUserId: warehouseUser.id,
      productionReportId: prodReport.id,
      manufacturingOrderId: mo.id,
    },
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SYSTEM_SEED',
      entityName: 'Database',
      entityId: 'ALL',
      newValues: { message: 'Initial relational database demo dataset seeded successfully' },
      timestamp: new Date(),
    },
  });

  // -------------------------------------------------------------------------
  // 14. ENTERPRISE ZERO-HARDCODING: Master Categories & Items
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Dynamic Master Categories & Master Items (Zero-Hardcoding)...');

  const masterCategoriesData = [
    {
      code: 'UNIT_OF_MEASURE',
      name: 'واحدهای سنجش و اندازه‌گیری',
      description: 'واحدهای مصرف، بسته‌بندی و وزن‌سنجی قطعات و کلاف‌ها',
      items: [
        { code: 'KG', value: 'کیلوگرم', orderIndex: 1 },
        { code: 'PCS', value: 'عدد', orderIndex: 2 },
        { code: 'TON', value: 'تن', orderIndex: 3 },
        { code: 'M', value: 'متر', orderIndex: 4 },
      ],
    },
    {
      code: 'DOWNTIME_REASON',
      name: 'علل توقف خطوط و ماشین‌آلات (Downtime Reasons)',
      description: 'کدهای استاندارد ثبت توقفات پای پرس، عیوب مکانیکی و لجستیک',
      items: [
        { code: 'DIE_BREAKDOWN', value: 'شکستگی یا گیر سنبه و ماتریس قالب', orderIndex: 1 },
        { code: 'COIL_REPLACE', value: 'تعویض کلاف ورق و ستاپ فیدر', orderIndex: 2 },
        { code: 'MAINTENANCE_PM', value: 'سرویس دوره‌ای و روان‌کاری برنامه‌ریزی‌شده (PM)', orderIndex: 3 },
        { code: 'HYDRAULIC_LEAK', value: 'افت فشار یا نشتی سیستم هیدرولیک', orderIndex: 4 },
        { code: 'ELECTRICAL_FAULT', value: 'خطای مدارهای فرمان و سنسورهای ایمنی', orderIndex: 5 },
        { code: 'NO_MATERIAL', value: 'کسری و تاخیر در تحویل مواد اولیه پای خط', orderIndex: 6 },
      ],
    },
    {
      code: 'SCRAP_REASON',
      name: 'دلایل ایجاد ضایعات فلزی (Scrap Reasons)',
      description: 'علل مهندسی تولید قطعات معیوب در فرآیند پرس‌کاری',
      items: [
        { code: 'TEAR_CRACK', value: 'پارگی و ترک‌خوردگی در کشش عمیق', orderIndex: 1 },
        { code: 'WRINKLING', value: 'چروک‌افتادگی در بلنک یا لبه ورق', orderIndex: 2 },
        { code: 'BURR_HIGH', value: 'پلیسه بیش از حد مجاز برش گیوتین', orderIndex: 3 },
        { code: 'SURFACE_DEFECT', value: 'خط و خش، زدگی یا ناخالصی متالورژیکی', orderIndex: 4 },
      ],
    },
    {
      code: 'QUALITY_CLASS',
      name: 'کلاس‌های کیفی بازرسی (Quality Classes)',
      description: 'رتبه‌بندی کیفی قطعات تولیدی در ایستگاه‌های کنترل',
      items: [
        { code: 'GRADE_A', value: 'تایید کامل استاندارد (کیفیت ممتاز)', orderIndex: 1 },
        { code: 'GRADE_B', value: 'تایید مشروط / نیازمند دوباره‌کاری جزیی', orderIndex: 2 },
        { code: 'REJECTED', value: 'عدم انطباق قطعی (اسقاط)', orderIndex: 3 },
      ],
    },
  ];

  const masterItemMap: Record<string, string> = {};
  for (const catData of masterCategoriesData) {
    const cat = await prisma.masterCategory.upsert({
      where: { code: catData.code },
      update: { name: catData.name, description: catData.description },
      create: {
        code: catData.code,
        name: catData.name,
        description: catData.description,
        isSystem: true,
      },
    });

    for (const itemData of catData.items) {
      const item = await prisma.masterItem.upsert({
        where: {
          categoryId_code: {
            categoryId: cat.id,
            code: itemData.code,
          },
        },
        update: { value: itemData.value, orderIndex: itemData.orderIndex },
        create: {
          categoryId: cat.id,
          code: itemData.code,
          value: itemData.value,
          orderIndex: itemData.orderIndex,
        },
      });
      masterItemMap[`${catData.code}_${itemData.code}`] = item.id;
    }
  }

  // -------------------------------------------------------------------------
  // 15. ENTERPRISE MENUS: Dynamic Self-Referencing Tree Menus
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Dynamic Tree Menus (Menu Hierarchy)...');

  const rootMenus = [
    { title: 'داشبورد و مانیتورینگ کارخانه', path: '/dashboard', icon: 'LayoutDashboard', orderIndex: 1 },
    { title: 'مهندسی و اطلاعات پایه (Master Data)', path: '/master-data', icon: 'Database', orderIndex: 2 },
    { title: 'برنامه‌ریزی و پیشخوان تولید (SAP PP)', path: '/production', icon: 'Cpu', orderIndex: 3 },
    { title: 'مدیریت انبار و زنجیره تامین ساپکو', path: '/inventory', icon: 'Boxes', orderIndex: 4 },
  ];

  const createdRootMenus: Record<string, string> = {};
  for (const rm of rootMenus) {
    const m = await prisma.menu.upsert({
      where: { id: `menu-${rm.path.replace('/', '')}` },
      update: { title: rm.title, path: rm.path, icon: rm.icon, orderIndex: rm.orderIndex },
      create: {
        id: `menu-${rm.path.replace('/', '')}`,
        title: rm.title,
        path: rm.path,
        icon: rm.icon,
        orderIndex: rm.orderIndex,
      },
    });
    createdRootMenus[rm.path] = m.id;
  }

  const childMenus = [
    { parentPath: '/master-data', title: 'کاتالوگ اقلام و قطعات (Items)', path: '/master-data/items', icon: 'Boxes', orderIndex: 1 },
    { parentPath: '/master-data', title: 'مراکز کاری و ماشین‌آلات (Work Centers)', path: '/master-data/work-centers', icon: 'Factory', orderIndex: 2 },
    { parentPath: '/master-data', title: 'دسته‌بندی‌های داینامیک پایه', path: '/master-data/categories', icon: 'Sliders', orderIndex: 3 },
    { parentPath: '/production', title: 'ماتریس مراحل تولید (OP Matrix)', path: '/production/matrix', icon: 'Layers', orderIndex: 1 },
    { parentPath: '/production', title: 'موجودی پای‌خط و بین‌ایستگاهی (WIP)', path: '/production/wip', icon: 'GitBranch', orderIndex: 2 },
    { parentPath: '/production', title: 'دستور کارهای تولید (Work Orders)', path: '/production/orders', icon: 'FileText', orderIndex: 3 },
    { parentPath: '/production', title: 'لاگ ثبت کارکرد و ضایعات شیفت', path: '/production/logs', icon: 'CheckCircle2', orderIndex: 4 },
    { parentPath: '/production', title: 'ثبت و تحلیل توقفات خطوط', path: '/production/downtime', icon: 'AlertTriangle', orderIndex: 5 },
  ];

  for (const cm of childMenus) {
    await prisma.menu.upsert({
      where: { id: `menu-sub-${cm.path.replace(/\//g, '-')}` },
      update: { title: cm.title, path: cm.path, icon: cm.icon, orderIndex: cm.orderIndex, parentId: createdRootMenus[cm.parentPath] },
      create: {
        id: `menu-sub-${cm.path.replace(/\//g, '-')}` ,
        parentId: createdRootMenus[cm.parentPath],
        title: cm.title,
        path: cm.path,
        icon: cm.icon,
        orderIndex: cm.orderIndex,
      },
    });
  }

  // -------------------------------------------------------------------------
  // 16. ENTERPRISE ENGINEERING: WorkCenters, Items & Multi-Level BOM
  // -------------------------------------------------------------------------
  console.log('  -> Seeding WorkCenters, Items & Multi-Level BOM...');

  const workCentersData = [
    { code: 'PRS-800T-01', name: 'پرس هیدرولیک ۸۰۰ تن کشش عمیق شولر', hallLocation: 'سالن پرس سنگین', capacityPerHour: 320 },
    { code: 'PRS-630T-01', name: 'پرس مکانیکی ۶۳۰ تن ارفورت', hallLocation: 'سالن پرس سنگین', capacityPerHour: 450 },
    { code: 'PRS-400T-01', name: 'پرس مکانیکی ۴۰۰ تن ضربه‌ای فورماکس', hallLocation: 'سالن پرس متوسط', capacityPerHour: 550 },
    { code: 'PRS-250T-01', name: 'پرس C فریم ۲۵۰ تن پانچ و دوربری', hallLocation: 'سالن پرس متوسط', capacityPerHour: 650 },
    { code: 'WLD-SPOT-01', name: 'سلول پرس‌جوش مقاومتی نقطه‌ای ۱۰۰ کاوا', hallLocation: 'سالن جوشکاری', capacityPerHour: 280 },
  ];

  const workCenterMap: Record<string, string> = {};
  for (const wc of workCentersData) {
    const created = await prisma.workCenter.upsert({
      where: { code: wc.code },
      update: { name: wc.name, hallLocation: wc.hallLocation, capacityPerHour: wc.capacityPerHour },
      create: wc,
    });
    workCenterMap[wc.code] = created.id;
  }

  const itemsData = [
    { code: 'PRT-ECU-BRK-01', name: 'مجموعه براکت ضدسرقت رایانه موتور (ECU) با پوشش رنگ کاتافورز ED', type: 'FINISHED_GOOD', carModel: 'پژو ۲۰۶ / ۲۰۷', weightNetKg: 1.72, weightGrossKg: 2.10, minSafetyStock: 500 },
    { code: 'WIP-ECU-BASE-10', name: 'صفحه براکت اصلی ضدسرقت (قطعه نیمه‌ساخته پرسی)', type: 'SEMI_FINISHED', carModel: 'پژو ۲۰۶', weightNetKg: 1.15, weightGrossKg: 1.40, minSafetyStock: 400 },
    { code: 'WIP-ECU-WING-20', name: 'مکمل تقویتی براکت / گوشواره (قطعه نیمه‌ساخته پانچ و خم)', type: 'SEMI_FINISHED', carModel: 'پژو ۲۰۶', weightNetKg: 0.55, weightGrossKg: 0.70, minSafetyStock: 400 },
    { code: 'RM-COIL-DC04-08', name: 'کلاف ورق روغنی کشش عمیق DC04 ضخامت ۰.۸ عرض ۱۲۵۰', type: 'RAW_MATERIAL', carModel: 'عمومی بدنه', weightNetKg: 1.0, weightGrossKg: 1.0, minSafetyStock: 5000 },
    { code: 'RM-COIL-DC01-15', name: 'کلاف نوار ورق روغنی DC01A ضخامت ۱.۵ عرض ۳۲۰', type: 'RAW_MATERIAL', carModel: 'عمومی شاسی', weightNetKg: 1.0, weightGrossKg: 1.0, minSafetyStock: 3000 },
  ];

  const itemMap: Record<string, string> = {};
  for (const it of itemsData) {
    const created = await prisma.item.upsert({
      where: { code: it.code },
      update: { name: it.name, type: it.type, carModel: it.carModel, minSafetyStock: it.minSafetyStock },
      create: it,
    });
    itemMap[it.code] = created.id;
  }

  // Multi-Level BOM Connections
  await prisma.bomComponent.upsert({
    where: { parentItemId_childItemId_version: { parentItemId: itemMap['PRT-ECU-BRK-01'], childItemId: itemMap['WIP-ECU-BASE-10'], version: '1.0' } },
    update: { quantity: 1 },
    create: {
      parentItemId: itemMap['PRT-ECU-BRK-01'],
      childItemId: itemMap['WIP-ECU-BASE-10'],
      quantity: 1,
      version: '1.0',
      notes: 'پایه اصلی ساختار مجموعه براکت ECU',
    },
  });

  await prisma.bomComponent.upsert({
    where: { parentItemId_childItemId_version: { parentItemId: itemMap['PRT-ECU-BRK-01'], childItemId: itemMap['WIP-ECU-WING-20'], version: '1.0' } },
    update: { quantity: 1 },
    create: {
      parentItemId: itemMap['PRT-ECU-BRK-01'],
      childItemId: itemMap['WIP-ECU-WING-20'],
      quantity: 1,
      version: '1.0',
      notes: 'گوشواره و مکمل تقویتی پرچ‌شونده',
    },
  });

  // -------------------------------------------------------------------------
  // 17. ENTERPRISE ROUTING WITH PRECEDENCE LOCKING & WORK ORDERS
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Routing with Precedence Locking & Work Orders...');

  const op10 = await prisma.routingOperation.upsert({
    where: { itemId_opNumber: { itemId: itemMap['PRT-ECU-BRK-01'], opNumber: 10 } },
    update: {},
    create: {
      itemId: itemMap['PRT-ECU-BRK-01'],
      opNumber: 10,
      opCode: 'OP10',
      opName: 'برش و تغذیه نوار ورق (گیوتین و رول‌بازکن)',
      workCenterId: workCenterMap['PRS-400T-01'],
      setupTimeMin: 30,
      cycleTimeSec: 15,
    },
  });

  const op20 = await prisma.routingOperation.upsert({
    where: { itemId_opNumber: { itemId: itemMap['PRT-ECU-BRK-01'], opNumber: 20 } },
    update: { requiresOpId: op10.id },
    create: {
      itemId: itemMap['PRT-ECU-BRK-01'],
      opNumber: 20,
      opCode: 'OP20',
      opName: 'بلنک‌زنی و کشش عمیق پوسته براکت',
      workCenterId: workCenterMap['PRS-800T-01'],
      requiresOpId: op10.id, // قفل تقدم به OP10
      setupTimeMin: 45,
      cycleTimeSec: 35,
    },
  });

  const op30 = await prisma.routingOperation.upsert({
    where: { itemId_opNumber: { itemId: itemMap['PRT-ECU-BRK-01'], opNumber: 30 } },
    update: { requiresOpId: op20.id },
    create: {
      itemId: itemMap['PRT-ECU-BRK-01'],
      opNumber: 30,
      opCode: 'OP30',
      opName: 'پانچ، سوراخ‌کاری و خم لبه‌ها',
      workCenterId: workCenterMap['PRS-250T-01'],
      requiresOpId: op20.id, // قفل تقدم به OP20
      setupTimeMin: 30,
      cycleTimeSec: 25,
    },
  });

  const op40 = await prisma.routingOperation.upsert({
    where: { itemId_opNumber: { itemId: itemMap['PRT-ECU-BRK-01'], opNumber: 40 } },
    update: { requiresOpId: op30.id },
    create: {
      itemId: itemMap['PRT-ECU-BRK-01'],
      opNumber: 40,
      opCode: 'OP40',
      opName: 'پرس‌جوش مقاومتی، مونتاژ نهایی و تحویل به انبار',
      workCenterId: workCenterMap['WLD-SPOT-01'],
      requiresOpId: op30.id, // قفل تقدم به OP30
      setupTimeMin: 20,
      cycleTimeSec: 20,
    },
  });

  // Work Order
  const workOrder = await prisma.workOrder.upsert({
    where: { orderNumber: 'WO-1404-1001' },
    update: { plannedQuantity: 2500, completedQuantity: 1600, scrapQuantity: 24, status: 'IN_PROGRESS' },
    create: {
      orderNumber: 'WO-1404-1001',
      itemId: itemMap['PRT-ECU-BRK-01'],
      plannedQuantity: 2500,
      completedQuantity: 1600,
      scrapQuantity: 24,
      status: 'IN_PROGRESS',
      startDate: new Date('2024-11-01T07:00:00.000Z'),
      endDate: new Date('2024-11-06T19:00:00.000Z'),
      actualStartDate: new Date('2024-11-01T07:30:00.000Z'),
      notes: 'دستور کار اصلی تولید مجموعه براکت ضدسرقت ECU ساپکو',
    },
  });

  // Production Log
  await prisma.productionLog.create({
    data: {
      workOrderId: workOrder.id,
      operationId: op20.id,
      goodQuantity: 800,
      scrapQuantity: 12,
      operatorId: 'EMP-2045',
      isApproved: true,
      approvedBy: 'مهندس حسینی (مدیر تولید)',
      approvedAt: new Date('2024-11-02T15:00:00.000Z'),
      shiftName: 'شیفت صبح',
      notes: 'تولید سالم با رعایت کامل الزامات کنترل کیفیت و بدون موج سطحی',
    },
  });

  // Downtime Log
  await prisma.downtimeLog.create({
    data: {
      workCenterId: workCenterMap['PRS-800T-01'],
      downtimeReasonId: masterItemMap['DOWNTIME_REASON_COIL_REPLACE'],
      startTime: new Date('2024-11-02T10:15:00.000Z'),
      endTime: new Date('2024-11-02T10:50:00.000Z'),
      durationMinutes: 35,
      operatorNotes: 'اتمام رول قبلی و تعویض کلاف ورق روغنی DC04 بر روی فیدر پرس ۸۰۰ تن',
      isPlanned: false,
    },
  });

  // Action Log Audit Trail
  await prisma.actionLog.create({
    data: {
      entityName: 'WorkOrder',
      entityId: workOrder.id,
      actionType: 'RELEASE',
      oldValues: { status: 'DRAFT', plannedQuantity: 2500 },
      newValues: { status: 'IN_PROGRESS', releasedAt: new Date().toISOString() },
      reason: 'ابلاغ برنامه تولید هفتگی بر اساس اولویت تامین سالن مونتاژ ایران‌خودرو',
      userId: adminUser.id,
      ipAddress: '192.168.10.45',
    },
  });

  console.log('✅ KPIMS Seed completed successfully!');
  console.log(`   - Master Data: ${Object.keys(partsData).length} parts, ${machines.length} machines, ${dies.length} dies, ${warehouses.length} warehouses`);
  console.log(`   - Enterprise Zero-Hardcoding: ${masterCategoriesData.length} MasterCategories, Menus, WorkCenters, BOM & WorkOrders`);
  console.log(`   - Supply & Production: SAPCO Quota Contract, Coils, Work Orders WO-1404-1001 & MO-1403-1082`);
  console.log(`   - Audit Trail: Immutable ActionLog & ProductionLog created`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
