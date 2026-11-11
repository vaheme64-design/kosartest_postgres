import { getPrismaClient } from './db/prisma';
import { MrpService } from './services/MrpService';
import { WipService } from './services/WipService';
import { CapacityPlanningService } from './services/CapacityPlanningService';

export interface ErpTestAssertionResult {
  id: string;
  suite: 'MRP' | 'WIP_PRECEDENCE' | 'CAPACITY_OVERLAP';
  title: string;
  passed: boolean;
  expected: string;
  actual: string;
  durationMs: number;
}

export interface ErpIntegrationTestReport {
  success: boolean;
  executedAt: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDurationMs: number;
  results: ErpTestAssertionResult[];
  logs: string[];
}

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
};

/**
 * Executes End-to-End Integration Tests for SAP PP Core Services:
 * 1. MrpService.calculateMaterialRequirements
 * 2. WipService.calculateOpBuffer (WIP Buffer & Precedence Lock)
 * 3. CapacityPlanningService.detectMachineOverlaps (Machine Schedule Conflict Detection)
 *
 * Uses temporary database records and cleans them up in a `finally` block so
 * production data remains completely untouched.
 */
export async function runErpIntegrationTest(): Promise<ErpIntegrationTestReport> {
  const prisma = getPrismaClient();
  const startTime = Date.now();
  const results: ErpTestAssertionResult[] = [];
  const logs: string[] = [];

  const logLine = (msg: string, plainMsg?: string) => {
    console.log(msg);
    logs.push(plainMsg ?? msg.replace(/\x1b\[[0-9;]*m/g, ''));
  };

  const recordAssertion = (
    id: string,
    suite: ErpTestAssertionResult['suite'],
    title: string,
    passed: boolean,
    expected: string,
    actual: string,
    stepStart: number
  ) => {
    const durationMs = Date.now() - stepStart;
    results.push({ id, suite, title, passed, expected, actual, durationMs });

    if (passed) {
      logLine(
        `${ANSI.green}  ✅ [PASS] ${title}${ANSI.reset} ${ANSI.gray}(${durationMs}ms)${ANSI.reset}\n` +
          `     ${ANSI.gray}├─ مورد انتظار: ${expected}${ANSI.reset}\n` +
          `     ${ANSI.gray}└─ خروجی واقعی: ${actual}${ANSI.reset}`
      );
    } else {
      logLine(
        `${ANSI.red}  ❌ [FAIL] ${title}${ANSI.reset} ${ANSI.gray}(${durationMs}ms)${ANSI.reset}\n` +
          `     ${ANSI.red}├─ مورد انتظار: ${expected}${ANSI.reset}\n` +
          `     ${ANSI.red}└─ خروجی واقعی: ${actual}${ANSI.reset}`
      );
    }
  };

  const suffix = `QA-${Date.now()}`;
  const createdIds = {
    workOrders: [] as string[],
    productionLogs: [] as string[],
    routingOps: [] as string[],
    bomComponents: [] as string[],
    items: [] as string[],
    workCenters: [] as string[],
  };

  logLine(`\n${ANSI.cyan}${ANSI.bold}========================================================================${ANSI.reset}`);
  logLine(`${ANSI.cyan}${ANSI.bold}🚀 شروع تست یکپارچه هسته ERP (SAP PP End-to-End Integration Test Suite)${ANSI.reset}`);
  logLine(`${ANSI.cyan}${ANSI.bold}========================================================================${ANSI.reset}`);

  try {
    // =========================================================================
    // SETUP TEMPORARY MASTER DATA FOR TEST 1 (MRP) & TEST 2 (WIP / PRECEDENCE)
    // =========================================================================
    const testWorkCenter = await prisma.workCenter.create({
      data: {
        code: `WC-PRS-400T-${suffix}`,
        name: 'پرس ۴۰۰ تن',
        capacityPerHour: 180,
        hallLocation: 'سالن پرس تست QA',
        status: 'ACTIVE',
      },
    });
    createdIds.workCenters.push(testWorkCenter.id);

    const fgItem = await prisma.item.create({
      data: {
        code: `FG-TEST-${suffix}`,
        name: 'قطعه محصول نهایی تستی (مجموعه براکت تست)',
        type: 'FINISHED_GOOD',
        unit: 'PCS',
        weightNetKg: 0.5,
        weightGrossKg: 0.5,
      },
    });
    createdIds.items.push(fgItem.id);

    const sheetItem = await prisma.item.create({
      data: {
        code: `RM-SHEET-${suffix}`,
        name: 'ورق فولادی کشش عمیق (تست MRP)',
        type: 'RAW_MATERIAL',
        unit: 'KG',
      },
    });
    createdIds.items.push(sheetItem.id);

    const boltItem = await prisma.item.create({
      data: {
        code: `RM-BOLT-${suffix}`,
        name: 'پیچ صنعتی گرید 8.8 (تست MRP)',
        type: 'RAW_MATERIAL',
        unit: 'PCS',
      },
    });
    createdIds.items.push(boltItem.id);

    // BOM: 0.5 KG Sheet per FG, 2 PCS Bolt per FG (0% scrap factor for exact check)
    const bomSheet = await prisma.bomComponent.create({
      data: {
        parentItemId: fgItem.id,
        childItemId: sheetItem.id,
        quantity: 0.5,
        version: '1.0',
        scrapFactor: 0,
        notes: '0.5 کیلوگرم ورق برای هر قطعه',
      },
    });
    createdIds.bomComponents.push(bomSheet.id);

    const bomBolt = await prisma.bomComponent.create({
      data: {
        parentItemId: fgItem.id,
        childItemId: boltItem.id,
        quantity: 2,
        version: '1.0',
        scrapFactor: 0,
        notes: '2 عدد پیچ برای هر قطعه',
      },
    });
    createdIds.bomComponents.push(bomBolt.id);

    // Work Order with plannedQuantity = 1000
    const woMrpWip = await prisma.workOrder.create({
      data: {
        orderNumber: `WO-MRP-${suffix}`,
        itemId: fgItem.id,
        plannedQuantity: 1000,
        completedQuantity: 0,
        scrapQuantity: 0,
        status: 'IN_PROGRESS',
        startDate: new Date('2026-10-10T08:00:00.000Z'),
        endDate: new Date('2026-10-15T16:00:00.000Z'),
      },
    });
    createdIds.workOrders.push(woMrpWip.id);

    // =========================================================================
    // TEST 1: MRP (انفجار درخت محصول - BOM Explosion)
    // =========================================================================
    logLine(`\n${ANSI.yellow}${ANSI.bold}▶ تست اول (MrpService): بررسی الگوریتم انفجار BOM برای دستور کار ۱۰۰۰ عددی${ANSI.reset}`);
    const t1Start = Date.now();
    const mrpResult = await MrpService.calculateMaterialRequirements(woMrpWip.id);

    const sheetReq = mrpResult.summary.find((m) => m.itemCode === sheetItem.code);
    const boltReq = mrpResult.summary.find((m) => m.itemCode === boltItem.code);

    const actualSheetKg = sheetReq ? sheetReq.totalGrossRequirement : -1;
    const actualBoltPcs = boltReq ? boltReq.totalGrossRequirement : -1;

    recordAssertion(
      'TEST-1A-MRP-SHEET',
      'MRP',
      'محاسبه نیازمندی ناخالص ورق (۱۰۰۰ قطعه × ۰.۵ کیلوگرم = ۵۰۰ کیلوگرم)',
      actualSheetKg === 500,
      '500 KG ورق',
      `${actualSheetKg} ${sheetReq?.unit || 'KG'} ورق`,
      t1Start
    );

    recordAssertion(
      'TEST-1B-MRP-BOLT',
      'MRP',
      'محاسبه نیازمندی ناخالص پیچ (۱۰۰۰ قطعه × ۲ عدد = ۲۰۰۰ عدد)',
      actualBoltPcs === 2000,
      '2000 PCS پیچ',
      `${actualBoltPcs} ${boltReq?.unit || 'PCS'} پیچ`,
      t1Start
    );

    // =========================================================================
    // TEST 2: WIP & PRECEDENCE LOCK (قفل تقدم و موجودی حین ساخت بین مراحل)
    // =========================================================================
    logLine(`\n${ANSI.yellow}${ANSI.bold}▶ تست دوم (WipService): بررسی بافر موجودی بین مراحل (OP10 -> OP20 -> OP30) و قفل تقدم${ANSI.reset}`);

    const op10 = await prisma.routingOperation.create({
      data: {
        itemId: fgItem.id,
        opNumber: 10,
        opCode: 'OP10',
        opName: 'برش و بلنکینگ اولیه (OP10)',
        workCenterId: testWorkCenter.id,
        setupTimeMin: 30,
        cycleTimeSec: 15,
      },
    });
    createdIds.routingOps.push(op10.id);

    const op20 = await prisma.routingOperation.create({
      data: {
        itemId: fgItem.id,
        opNumber: 20,
        opCode: 'OP20',
        opName: 'فرم‌دهی و کشش (OP20)',
        workCenterId: testWorkCenter.id,
        requiresOpId: op10.id,
        setupTimeMin: 30,
        cycleTimeSec: 20,
      },
    });
    createdIds.routingOps.push(op20.id);

    const op30 = await prisma.routingOperation.create({
      data: {
        itemId: fgItem.id,
        opNumber: 30,
        opCode: 'OP30',
        opName: 'پانچ نهایی و دوربری (OP30)',
        workCenterId: testWorkCenter.id,
        requiresOpId: op20.id,
        setupTimeMin: 25,
        cycleTimeSec: 18,
      },
    });
    createdIds.routingOps.push(op30.id);

    // Record 200 approved good units for OP10
    const logOp10 = await prisma.productionLog.create({
      data: {
        workOrderId: woMrpWip.id,
        operationId: op10.id,
        goodQuantity: 200,
        scrapQuantity: 0,
        operatorId: 'QA-TEST-OP',
        isApproved: true,
        approvedBy: 'QA-SUPERVISOR',
        approvedAt: new Date(),
        shiftName: 'شیفت صبح',
        notes: 'ثبت ۲۰۰ عدد تولید سالم در مرحله OP10 برای تست یکپارچه',
      },
    });
    createdIds.productionLogs.push(logOp10.id);

    // Check OP20 buffer -> Expected: 200 units READY (isPrecedenceLocked = false)
    const t2aStart = Date.now();
    const op20Buffer = await WipService.calculateOpBuffer(woMrpWip.id, op20.id);
    recordAssertion(
      'TEST-2A-WIP-OP20',
      'WIP_PRECEDENCE',
      'بررسی بافر ورودی OP20 پس از ثبت ۲۰۰ عدد تولید سالم در OP10',
      op20Buffer.wipBufferAvailable === 200 && !op20Buffer.isPrecedenceLocked,
      'wipBufferAvailable = 200, isPrecedenceLocked = false',
      `wipBufferAvailable = ${op20Buffer.wipBufferAvailable}, isPrecedenceLocked = ${op20Buffer.isPrecedenceLocked}`,
      t2aStart
    );

    // Check OP30 buffer -> Expected: LOCKED with "قفل تقدم: بافر ورودی کافی نیست"
    const t2bStart = Date.now();
    const op30Buffer = await WipService.calculateOpBuffer(woMrpWip.id, op30.id);
    const expectedLockMessage = 'قفل تقدم: بافر ورودی کافی نیست';
    recordAssertion(
      'TEST-2B-WIP-OP30-LOCK',
      'WIP_PRECEDENCE',
      'بررسی خطای قفل تقدم در OP30 به دلیل عدم تولید در ایستگاه قبلی (OP20 = 0)',
      op30Buffer.isPrecedenceLocked === true && op30Buffer.errorMessage === expectedLockMessage,
      `isPrecedenceLocked = true, errorMessage = "${expectedLockMessage}"`,
      `isPrecedenceLocked = ${op30Buffer.isPrecedenceLocked}, errorMessage = "${op30Buffer.errorMessage}"`,
      t2bStart
    );

    // =========================================================================
    // TEST 3: CAPACITY OVERLAP (تشخیص تداخل ظرفیت ماشین‌آلات)
    // =========================================================================
    logLine(
      `\n${ANSI.yellow}${ANSI.bold}▶ تست سوم (CapacityPlanningService): تشخیص تداخل ۱ ساعته (۱۱:۰۰ تا ۱۲:۰۰) روی «پرس ۴۰۰ تن»${ANSI.reset}`
    );

    // Isolated test date: 2027-05-20
    const testDate = new Date(2027, 4, 20, 0, 0, 0, 0);

    // Item A (scheduled 08:00 to 12:00 -> 240 mins)
    const itemOvlA = await prisma.item.create({
      data: {
        code: `FG-OVL-A-${suffix}`,
        name: 'قطعه تستی الف (برنامه ۰۸:۰۰ تا ۱۲:۰۰)',
        type: 'FINISHED_GOOD',
        unit: 'PCS',
      },
    });
    createdIds.items.push(itemOvlA.id);

    const opOvlA = await prisma.routingOperation.create({
      data: {
        itemId: itemOvlA.id,
        opNumber: 10,
        opCode: 'OP10',
        opName: 'پرسکاری قطعه الف روی پرس ۴۰۰ تن',
        workCenterId: testWorkCenter.id,
        setupTimeMin: 40,
        cycleTimeSec: 20, // 40 + (600 * 20 / 60) = 240 min = 4 hours (08:00 -> 12:00)
      },
    });
    createdIds.routingOps.push(opOvlA.id);

    // Item B (scheduled 11:00 to 14:00 -> 180 mins)
    const itemOvlB = await prisma.item.create({
      data: {
        code: `FG-OVL-B-${suffix}`,
        name: 'قطعه تستی ب (برنامه ۱۱:۰۰ تا ۱۴:۰۰)',
        type: 'FINISHED_GOOD',
        unit: 'PCS',
      },
    });
    createdIds.items.push(itemOvlB.id);

    const opOvlB = await prisma.routingOperation.create({
      data: {
        itemId: itemOvlB.id,
        opNumber: 10,
        opCode: 'OP10',
        opName: 'پرسکاری قطعه ب روی پرس ۴۰۰ تن',
        workCenterId: testWorkCenter.id,
        setupTimeMin: 30,
        cycleTimeSec: 15, // 30 + (600 * 15 / 60) = 180 min = 3 hours (11:00 -> 14:00)
      },
    });
    createdIds.routingOps.push(opOvlB.id);

    // Work Order 1: 08:00 to 12:00 on testDate
    const wo1Start = new Date(2027, 4, 20, 8, 0, 0, 0);
    const wo1End = new Date(2027, 4, 20, 12, 0, 0, 0);
    const woOvl1 = await prisma.workOrder.create({
      data: {
        orderNumber: `WO-OVL-1-${suffix}`,
        itemId: itemOvlA.id,
        plannedQuantity: 600,
        status: 'RELEASED',
        startDate: wo1Start,
        endDate: wo1End,
      },
    });
    createdIds.workOrders.push(woOvl1.id);

    // Work Order 2: 11:00 to 14:00 on testDate
    const wo2Start = new Date(2027, 4, 20, 11, 0, 0, 0);
    const wo2End = new Date(2027, 4, 20, 14, 0, 0, 0);
    const woOvl2 = await prisma.workOrder.create({
      data: {
        orderNumber: `WO-OVL-2-${suffix}`,
        itemId: itemOvlB.id,
        plannedQuantity: 600,
        status: 'RELEASED',
        startDate: wo2Start,
        endDate: wo2End,
      },
    });
    createdIds.workOrders.push(woOvl2.id);

    const t3Start = Date.now();
    const overlapReport = await CapacityPlanningService.detectMachineOverlaps(testDate);

    // Find the overlap for our testWorkCenter ("پرس ۴۰۰ تن")
    const detectedOverlap = overlapReport.overlaps.find(
      (ovl) => ovl.workCenterId === testWorkCenter.id
    );

    const isOneHourOverlap =
      !!detectedOverlap &&
      detectedOverlap.overlapMinutes === 60 &&
      detectedOverlap.overlapHours === 1 &&
      detectedOverlap.orderA.startTime === '08:00' &&
      detectedOverlap.orderA.endTime === '12:00' &&
      detectedOverlap.orderB.startTime === '11:00' &&
      detectedOverlap.orderB.endTime === '14:00';

    recordAssertion(
      'TEST-3-CAPACITY-OVERLAP',
      'CAPACITY_OVERLAP',
      'تشخیص تداخل ۱ ساعته (۶۰ دقیقه از ۱۱:۰۰ تا ۱۲:۰۰) روی دستگاه «پرس ۴۰۰ تن»',
      isOneHourOverlap,
      'تداخل ۱ ساعت (۶۰ دقیقه) روی «پرس ۴۰۰ تن» بین بازه [08:00-12:00] و [11:00-14:00]',
      detectedOverlap
        ? `تداخل ${detectedOverlap.overlapHours} ساعت (${detectedOverlap.overlapMinutes} دقیقه) روی «${detectedOverlap.workCenterName}» بین [${detectedOverlap.orderA.startTime}-${detectedOverlap.orderA.endTime}] و [${detectedOverlap.orderB.startTime}-${detectedOverlap.orderB.endTime}]`
        : 'هیچ تداخلی یافت نشد',
      t3Start
    );
  } finally {
    // Clean up all temporary test records in reverse dependency order
    try {
      if (createdIds.productionLogs.length > 0) {
        await prisma.productionLog.deleteMany({ where: { id: { in: createdIds.productionLogs } } });
      }
      if (createdIds.workOrders.length > 0) {
        await prisma.workOrder.deleteMany({ where: { id: { in: createdIds.workOrders } } });
      }
      if (createdIds.routingOps.length > 0) {
        await prisma.routingOperation.updateMany({
          where: { id: { in: createdIds.routingOps } },
          data: { requiresOpId: null },
        });
        await prisma.routingOperation.deleteMany({ where: { id: { in: createdIds.routingOps } } });
      }
      if (createdIds.bomComponents.length > 0) {
        await prisma.bomComponent.deleteMany({ where: { id: { in: createdIds.bomComponents } } });
      }
      if (createdIds.items.length > 0) {
        await prisma.item.deleteMany({ where: { id: { in: createdIds.items } } });
      }
      if (createdIds.workCenters.length > 0) {
        await prisma.workCenter.deleteMany({ where: { id: { in: createdIds.workCenters } } });
      }
      logLine(`\n${ANSI.gray}🧹 پاک‌سازی خودکار داده‌های موقت تست (Cleanup) با موفقیت انجام شد.${ANSI.reset}`);
    } catch (cleanupErr) {
      console.error('Cleanup warning:', cleanupErr);
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.length - passedTests;
  const allPassed = failedTests === 0 && results.length > 0;

  logLine(`${ANSI.cyan}${ANSI.bold}------------------------------------------------------------------------${ANSI.reset}`);
  if (allPassed) {
    logLine(
      `${ANSI.green}${ANSI.bold}🎉 نتیجه نهایی: تمام ${passedTests} سناریوی تست یکپارچه ERP با موفقیت (100% PASS) اجرا شدند! (${totalDurationMs}ms)${ANSI.reset}`
    );
  } else {
    logLine(
      `${ANSI.red}${ANSI.bold}⚠️ نتیجه نهایی: ${failedTests} تست ناموفق از مجموع ${results.length} تست (${totalDurationMs}ms)${ANSI.reset}`
    );
  }
  logLine(`${ANSI.cyan}${ANSI.bold}========================================================================${ANSI.reset}\n`);

  return {
    success: allPassed,
    executedAt: new Date().toISOString(),
    totalTests: results.length,
    passedTests,
    failedTests,
    totalDurationMs,
    results,
    logs,
  };
}

// Allow direct CLI execution via: npx tsx src/server/runErpIntegrationTest.ts
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('runErpIntegrationTest.ts');

if (isMainModule) {
  runErpIntegrationTest()
    .then((report) => {
      process.exit(report.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('❌ خطای بحرانی در اجرای تست یکپارچه ERP:', err);
      process.exit(1);
    });
}
