// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

// src/server/apiRouter.ts
import { Router } from "express";

// src/types/inventory.ts
var PROCESS_DEFINITIONS = [
  { id: "PROC-SHEAR", code: "SHEARING", name: "\u0628\u0631\u0634 \u0648 \u0646\u0648\u0627\u0631\u0628\u0631\u06CC \u0631\u0648\u0644 \u0648\u0631\u0642", category: "STAMPING", description: "\u06AF\u06CC\u0648\u062A\u06CC\u0646\u060C \u0631\u0648\u0644\u200C\u0628\u0627\u0632\u06A9\u0646 \u0648 \u0641\u06CC\u062F\u0631 \u062A\u063A\u0630\u06CC\u0647 \u06A9\u0644\u0627\u0641 \u0633\u0627\u067E\u06A9\u0648" },
  { id: "PROC-BLANK", code: "BLANKING", name: "\u0628\u0644\u0646\u06A9\u06CC\u0646\u06AF \u0633\u0646\u0628\u0647 \u0648 \u0645\u0627\u062A\u0631\u06CC\u0633", category: "STAMPING", description: "\u062A\u0648\u0644\u06CC\u062F \u0648\u0631\u0642 \u0634\u06CC\u062A \u0634\u06A9\u0644\u200C\u06CC\u0627\u0641\u062A\u0647 \u0627\u0648\u0644\u06CC\u0647 \u062F\u0631 \u067E\u0631\u0633 \u0636\u0631\u0628\u0647\u200C\u0627\u06CC" },
  { id: "PROC-DRAW", code: "DRAWING", name: "\u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 \u0647\u06CC\u062F\u0631\u0648\u0644\u06CC\u06A9", category: "FORMING", description: "\u0641\u0631\u0645\u200C\u062F\u0647\u06CC \u067E\u0648\u0633\u062A\u0647 \u0633\u0647\u200C\u0628\u0639\u062F\u06CC \u0642\u0637\u0639\u0627\u062A \u0628\u062F\u0646\u0647 \u062F\u0631 \u067E\u0631\u0633\u200C\u0647\u0627\u06CC \u062A\u0646\u0627\u0698 \u0628\u0627\u0644\u0627" },
  { id: "PROC-PUNCH", code: "PUNCH_FORM", name: "\u067E\u0627\u0646\u0686\u060C \u0633\u0648\u0631\u0627\u062E\u200C\u06A9\u0627\u0631\u06CC \u0648 \u067E\u06CC\u0631\u0633\u06CC\u0646\u06AF", category: "STAMPING", description: "\u0627\u06CC\u062C\u0627\u062F \u0633\u0648\u0631\u0627\u062E\u200C\u0647\u0627\u06CC \u0639\u0628\u0648\u0631 \u0645\u0647\u0631\u0647 \u0648 \u0634\u06CC\u0627\u0631\u0647\u0627\u06CC \u067E\u06CC\u0686" },
  { id: "PROC-BEND", code: "BENDING", name: "\u062E\u0645\u200C\u06A9\u0627\u0631\u06CC \u0628\u0627 \u0642\u0627\u0644\u0628 \u0648 \u067E\u0631\u0633 \u0628\u0631\u06A9", category: "FORMING", description: "\u062E\u0645\u200C\u0647\u0627\u06CC \u06F9\u06F0 \u062F\u0631\u062C\u0647\u060C Z \u0648 \u0641\u0644\u0646\u062C\u06CC\u0646\u06AF \u0644\u0628\u0647\u200C\u0647\u0627" },
  { id: "PROC-TRIM", code: "TRIMMING", name: "\u062F\u0648\u0631\u0628\u0631\u06CC \u0648 \u067E\u0644\u06CC\u0633\u0647\u200C\u06AF\u06CC\u0631\u06CC \u0644\u0628\u0647", category: "STAMPING", description: "\u062C\u062F\u0627\u0633\u0627\u0632\u06CC \u0632\u0648\u0627\u06CC\u062F \u0648\u0631\u0642 \u067E\u0633 \u0627\u0632 \u0641\u0631\u0622\u06CC\u0646\u062F \u06A9\u0634\u0634" },
  { id: "PROC-SPOT", code: "SPOT_WELD", name: "\u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u0645\u0642\u0627\u0648\u0645\u062A\u06CC \u0646\u0642\u0637\u0647 \u0648 \u0645\u0647\u0631\u0647", category: "JOINING", description: "\u062C\u0648\u0634 \u0645\u0642\u0627\u0648\u0645\u062A\u06CC \u0645\u0647\u0631\u0647\u200C\u0647\u0627\u06CC M6, M8 \u0648 \u0644\u0686\u06A9\u06CC\u200C\u0647\u0627" },
  { id: "PROC-CO2", code: "CO2_WELD", name: "\u062C\u0648\u0634\u06A9\u0627\u0631\u06CC \u062F\u0633\u062A\u06CC \u0648 \u0631\u0628\u0627\u062A\u06CC\u06A9 CO2", category: "JOINING", description: "\u062C\u0648\u0634\u06A9\u0627\u0631\u06CC \u067E\u06CC\u0648\u0633\u062A\u0647 \u0628\u0627 \u06AF\u0627\u0632 \u0645\u062D\u0627\u0641\u0638 \u0622\u0631\u06AF\u0648\u0646 \u0648 CO2" },
  { id: "PROC-PAINT", code: "PAINT", name: "\u0631\u0646\u06AF\u200C\u0622\u0645\u06CC\u0632\u06CC \u0627\u0644\u06A9\u062A\u0631\u0648\u0641\u0648\u0631\u0632 \u06A9\u0627\u062A\u0627\u0641\u0648\u0631\u0632 (ED)", category: "SURFACE_FINISH", description: "\u0634\u0633\u062A\u0634\u0648 \u06F8 \u0645\u0631\u062D\u0644\u0647\u200C\u0627\u06CC \u0648 \u067E\u0648\u0634\u0634 \u0636\u062F\u062E\u0648\u0631\u062F\u06AF\u06CC \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F \u0633\u0627\u067E\u06A9\u0648" },
  { id: "PROC-ASSY", code: "ASSEMBLY", name: "\u0645\u0648\u0646\u062A\u0627\u0698\u060C \u0647\u0650\u0645\u06CC\u0646\u06AF \u0648 \u0628\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC", category: "ASSEMBLY", description: "\u0647\u0650\u0645\u06CC\u0646\u06AF \u0644\u0628\u0647 \u062F\u0631\u0628\u200C\u0647\u0627 \u0648 \u0628\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u062F\u0631 \u067E\u0627\u0644\u062A\u200C\u0647\u0627\u06CC \u0628\u0627\u0631\u06A9\u062F\u062F\u0627\u0631 \u0633\u0627\u067E\u06A9\u0648" }
];
var FACTORY_HALLS = [
  { id: "HALL-RAW-STORE", code: "HALL-01", name: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0631\u06A9\u0632\u06CC \u0645\u0648\u0627\u062F \u0627\u0648\u0644\u06CC\u0647 \u0648 \u06A9\u0648\u06CC\u0644 \u0633\u0627\u067E\u06A9\u0648", type: "WAREHOUSE", supervisorName: "\u062D\u0633\u06CC\u0646 \u0633\u0644\u06CC\u0645\u0627\u0646\u06CC (\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631 \u0645\u0648\u0627\u062F)", capacityDesc: "\u0638\u0631\u0641\u06CC\u062A \u06F2\u06F0\u06F0 \u062A\u0646 \u0648\u0631\u0642 \u0631\u0648\u0644 \u0648 \u0634\u06CC\u062A" },
  { id: "HALL-SHEARING", code: "HALL-02", name: "\u0633\u0627\u0644\u0646 \u0628\u0631\u0634\u06A9\u0627\u0631\u06CC\u060C \u0646\u0648\u0627\u0631\u0628\u0631\u06CC \u0648 \u0622\u0645\u0627\u062F\u0647\u200C\u0633\u0627\u0632\u06CC \u0628\u0644\u0646\u06A9", type: "STAMPING", supervisorName: "\u0639\u0644\u06CC \u0631\u0636\u0627\u06CC\u06CC (\u0633\u0631\u067E\u0631\u0633\u062A \u0628\u0631\u0634)", capacityDesc: "\u06F2 \u062E\u0637 \u0631\u0648\u0644\u200C\u0628\u0627\u0632\u06A9\u0646 \u0648 \u06AF\u06CC\u0648\u062A\u06CC\u0646 \u06F3 \u0645\u062A\u0631\u06CC" },
  { id: "HALL-HEAVY-PRESS", code: "HALL-03", name: "\u0633\u0627\u0644\u0646 \u067E\u0631\u0633\u200C\u0647\u0627\u06CC \u0633\u0646\u06AF\u06CC\u0646 (\u06F8\u06F0\u06F0 \u0648 \u06F4\u06F0\u06F0 \u062A\u0646)", type: "STAMPING", supervisorName: "\u0645\u0647\u0646\u062F\u0633 \u0642\u0646\u0628\u0631\u06CC (\u0633\u0631\u067E\u0631\u0633\u062A \u067E\u0631\u0633 \u0633\u0646\u06AF\u06CC\u0646)", capacityDesc: "\u067E\u0631\u0633 \u0647\u06CC\u062F\u0631\u0648\u0644\u06CC\u06A9 \u06A9\u0634\u0634 \u0648 \u0634\u0648\u0644\u0631 \u0636\u0631\u0628\u0647\u200C\u0627\u06CC" },
  { id: "HALL-MEDIUM-PRESS", code: "HALL-04", name: "\u0633\u0627\u0644\u0646 \u067E\u0631\u0633\u200C\u0647\u0627\u06CC \u0645\u062A\u0648\u0633\u0637 \u0648 \u0628\u0631\u06A9 CNC (\u06F2\u06F5\u06F0 \u0648 \u06F1\u06F6\u06F0 \u062A\u0646)", type: "STAMPING", supervisorName: "\u062D\u0633\u06CC\u0646 \u0645\u0631\u0627\u062F\u06CC", capacityDesc: "\u067E\u0631\u0633\u200C\u0647\u0627\u06CC \u06A9\u0644\u0627\u0686 \u067E\u0646\u0648\u0645\u0627\u062A\u06CC\u06A9 \u0648 \u062E\u0645\u200C\u06A9\u0627\u0631\u06CC" },
  { id: "HALL-WELDING", code: "HALL-05", name: "\u0633\u0627\u0644\u0646 \u062C\u0648\u0634\u06A9\u0627\u0631\u06CC \u0631\u0628\u0627\u062A\u06CC\u06A9 \u0648 \u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u0645\u0642\u0627\u0648\u0645\u062A\u06CC", type: "WELDING", supervisorName: "\u0645\u0647\u0646\u062F\u0633 \u0627\u06A9\u0628\u0631\u06CC", capacityDesc: "\u0633\u0644\u0648\u0644 \u0631\u0628\u0627\u062A\u06CC\u06A9 \u06CC\u0627\u0633\u06A9\u0627\u0648\u0627 \u0648 \u062F\u0633\u062A\u06AF\u0627\u0647\u200C\u0647\u0627\u06CC \u0627\u0633\u067E\u0627\u062A \u0648\u0644\u062F" },
  { id: "HALL-CATAPHORESIS", code: "HALL-06", name: "\u0633\u0627\u0644\u0646 \u062E\u0637 \u0631\u0646\u06AF \u06A9\u0627\u062A\u0627\u0641\u0648\u0631\u0632 \u0648 \u067E\u0648\u0634\u0634 \u0636\u062F\u062E\u0648\u0631\u062F\u06AF\u06CC ED", type: "PAINT", supervisorName: "\u0645\u0647\u0646\u062F\u0633 \u0637\u0627\u0647\u0631\u06CC", capacityDesc: "\u062A\u0648\u0646\u0644 \u0634\u0633\u062A\u0634\u0648\u060C \u0641\u0633\u0641\u0627\u062A\u0647 \u0648 \u06A9\u0648\u0631\u0647 \u067E\u062E\u062A \u06F2\u06F0\u06F0 \u062F\u0631\u062C\u0647" },
  { id: "HALL-ASSEMBLY-QC", code: "HALL-07", name: "\u0633\u0627\u0644\u0646 \u0645\u0648\u0646\u062A\u0627\u0698\u060C \u0647\u0650\u0645\u06CC\u0646\u06AF \u0648 \u0627\u0646\u0628\u0627\u0631 \u0645\u062D\u0635\u0648\u0644 \u0646\u0647\u0627\u06CC\u06CC", type: "ASSEMBLY", supervisorName: "\u062D\u0645\u06CC\u062F \u0631\u0633\u0648\u0644\u06CC", capacityDesc: "\u0628\u0627\u06A9\u0633 \u067E\u0627\u0644\u062A\u200C\u0647\u0627\u06CC \u062A\u062D\u0648\u06CC\u0644 \u0628\u0647 \u062E\u0637\u0648\u0637 \u062E\u0648\u062F\u0631\u0648\u0633\u0627\u0632" }
];
var FACTORY_STAGES = [
  { id: "STAGE_RAW_STORE", name: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0648\u0627\u062F \u0627\u0648\u0644\u06CC\u0647 \u0633\u0627\u067E\u06A9\u0648", type: "STORE", unit: "KG" },
  { id: "STAGE_SHEARING", name: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F1: \u0628\u0631\u0634 \u0648 \u0646\u0648\u0627\u0631\u0628\u0631\u06CC \u0648\u0631\u0642", type: "WIP", unit: "PCS" },
  { id: "STAGE_BLANKING", name: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F2: \u067E\u0631\u0633 \u0628\u0644\u0646\u06A9\u06CC\u0646\u06AF", type: "WIP", unit: "PCS" },
  { id: "STAGE_FORMING", name: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F3: \u067E\u0631\u0633 \u067E\u0627\u0646\u0686 \u0648 \u0641\u0631\u0645\u200C\u062F\u0647\u06CC", type: "WIP", unit: "PCS" },
  { id: "STAGE_BENDING", name: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F4: \u067E\u0631\u0633 \u0628\u0631\u06A9 \u0648 \u062E\u0645\u200C\u06A9\u0627\u0631\u06CC", type: "WIP", unit: "PCS" },
  { id: "STAGE_SPOT_WELD", name: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F5: \u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u0645\u0642\u0627\u0648\u0645\u062A\u06CC", type: "WIP", unit: "PCS" },
  { id: "STAGE_CO2_WELD", name: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F6: \u062E\u0637 \u062C\u0648\u0634\u06A9\u0627\u0631\u06CC CO2", type: "WIP", unit: "PCS" },
  { id: "STAGE_PAINT", name: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F7: \u062E\u0637 \u0634\u0633\u062A\u0634\u0648 \u0648 \u0631\u0646\u06AF \u06A9\u0627\u062A\u0627\u0641\u0648\u0631\u0632", type: "WIP", unit: "PCS" },
  { id: "STAGE_ASSEMBLY", name: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F8: \u0645\u0648\u0646\u062A\u0627\u0698 \u0645\u062C\u0645\u0648\u0639\u0647\u200C\u0647\u0627", type: "WIP", unit: "PCS" },
  { id: "STAGE_FINISHED_STORE", name: "\u0627\u0646\u0628\u0627\u0631 \u0642\u0637\u0639\u0627\u062A \u0648 \u0645\u062D\u0635\u0648\u0644\u0627\u062A \u0646\u0647\u0627\u06CC\u06CC", type: "STORE", unit: "PCS" },
  { id: "STAGE_SCRAP_YARD", name: "\u0627\u0646\u0628\u0627\u0631 \u0636\u0627\u06CC\u0639\u0627\u062A \u067E\u0631\u0633 \u0648 \u0648\u0631\u0642", type: "SCRAP", unit: "KG" }
];
var WAREHOUSES_LIST = [
  { id: "WH-RAW", code: "WH-RAW", name: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0631\u06A9\u0632\u06CC \u0631\u0648\u0644 \u0648 \u0648\u0631\u0642 \u0633\u0627\u067E\u06A9\u0648", type: "RAW_MATERIALS", managerName: "\u0645\u0631\u0627\u062F\u06CC", locations: ["LOC-RAW-A1", "LOC-RAW-A2", "LOC-RAW-B1", "LOC-RAW-B2"] },
  { id: "WH-WIP-STAMP", code: "WH-WIP-STAMP", name: "\u0627\u0646\u0628\u0627\u0631 \u067E\u0627\u06CC \u06A9\u0627\u0631 \u0633\u0627\u0644\u0646 \u067E\u0631\u0633 (WIP)", type: "WIP", managerName: "\u0642\u0646\u0628\u0631\u06CC", locations: ["LOC-WIP-BLANK", "LOC-WIP-DRAWN", "LOC-WIP-TRIM"] },
  { id: "WH-WIP-WELD", code: "WH-WIP-WELD", name: "\u0627\u0646\u0628\u0627\u0631 \u067E\u0627\u06CC \u06A9\u0627\u0631 \u062C\u0648\u0634\u06A9\u0627\u0631\u06CC \u0648 \u0645\u0648\u0646\u062A\u0627\u0698", type: "WIP", managerName: "\u0627\u06A9\u0628\u0631\u06CC", locations: ["LOC-WELD-IN", "LOC-WELD-OUT"] },
  { id: "WH-FINISHED", code: "WH-FINISHED", name: "\u0627\u0646\u0628\u0627\u0631 \u0645\u062D\u0635\u0648\u0644\u0627\u062A \u0646\u0647\u0627\u06CC\u06CC \u0622\u0645\u0627\u062F\u0647 \u062A\u062D\u0648\u06CC\u0644", type: "FINISHED_GOODS", managerName: "\u0645\u062D\u0645\u062F\u06CC", locations: ["LOC-FIN-P1", "LOC-FIN-P2", "LOC-FIN-P3"] },
  { id: "WH-SCRAP", code: "WH-SCRAP", name: "\u0627\u0646\u0628\u0627\u0631 \u0636\u0627\u06CC\u0639\u0627\u062A \u0622\u0647\u0646 \u0648 \u067E\u0631\u062A \u0648\u0631\u0642", type: "SCRAP", managerName: "\u0633\u0644\u06CC\u0645\u0627\u0646\u06CC", locations: ["LOC-SCRAP-YARD"] }
];

// src/server/stockEngine.ts
function calculateInventoryLedger(transactions, parts) {
  const partsMap = /* @__PURE__ */ new Map();
  parts.forEach((p) => partsMap.set(p.id, p));
  const stageMap = /* @__PURE__ */ new Map();
  const getStageEntry = (stageId, partId) => {
    const key = `${stageId}:::${partId}`;
    if (!stageMap.has(key)) {
      stageMap.set(key, {
        stageId,
        partId,
        totalQty: 0,
        reservedQty: 0,
        inTransitQty: 0,
        scrapQty: 0,
        productionQty: 0
      });
    }
    return stageMap.get(key);
  };
  const validTx = transactions.filter((t) => t.status === "CONFIRMED").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const tx of validTx) {
    const { voucherType, stageId, targetStageId, partId, quantity, createdAt } = tx;
    const entry = getStageEntry(stageId, partId);
    entry.lastActivityDate = createdAt;
    switch (voucherType) {
      case "OPENING_BALANCE":
      case "RECEIPT":
        entry.totalQty += quantity;
        break;
      case "ISSUE":
        entry.totalQty -= quantity;
        break;
      case "PRODUCTION_OUTPUT":
        entry.totalQty += quantity;
        entry.productionQty += quantity;
        break;
      case "SCRAP":
        entry.totalQty -= quantity;
        entry.scrapQty += quantity;
        break;
      case "WIP_TRANSFER_DISPATCH":
        entry.totalQty -= quantity;
        if (targetStageId) {
          const targetEntry = getStageEntry(targetStageId, partId);
          targetEntry.inTransitQty += quantity;
          targetEntry.lastActivityDate = createdAt;
        }
        break;
      case "WIP_TRANSFER_RECEIPT":
        entry.totalQty += quantity;
        entry.inTransitQty = Math.max(0, entry.inTransitQty - quantity);
        break;
      case "ADJUSTMENT":
        entry.totalQty += quantity;
        break;
      default:
        break;
    }
  }
  const stageBalances = [];
  const partStockMap = {};
  let rawMaterialKg = 0;
  let totalWipPcs = 0;
  let totalWipKg = 0;
  let totalFinishedPcs = 0;
  let totalFinishedKg = 0;
  let totalScrapQty = 0;
  let totalScrapKg = 0;
  let totalGoodOutputPcs = 0;
  for (const [, data] of stageMap.entries()) {
    const stageId = data.stageId;
    const partId = data.partId;
    const part = partsMap.get(partId);
    if (!part) continue;
    const stageConfig = FACTORY_STAGES.find((s) => s.id === stageId);
    const stageName = stageConfig ? stageConfig.name : stageId;
    const weightPerUnit = part.weightPerUnitKg || 1;
    const usableQty = Math.max(0, data.totalQty - data.reservedQty);
    const weightKg = part.unit === "KG" ? data.totalQty : Number((data.totalQty * weightPerUnit).toFixed(2));
    const scrapRate = data.productionQty + data.scrapQty > 0 ? data.scrapQty / (data.productionQty + data.scrapQty) * 100 : 0;
    stageBalances.push({
      stageId,
      stageName,
      partId,
      partCode: part.code,
      partName: part.name,
      unit: part.unit,
      totalQty: Math.round(data.totalQty * 100) / 100,
      reservedQty: Math.round(data.reservedQty * 100) / 100,
      inTransitQty: Math.round(data.inTransitQty * 100) / 100,
      usableQty: Math.round(usableQty * 100) / 100,
      totalKg: Math.round(weightKg * 100) / 100,
      scrapQty: Math.round(data.scrapQty * 100) / 100,
      scrapRatePercent: Number(scrapRate.toFixed(2)),
      lastActivityDate: data.lastActivityDate
    });
    if (stageId === "STAGE_RAW_STORE" || part.category === "RAW_MATERIAL") {
      rawMaterialKg += weightKg;
    } else if (stageId === "STAGE_FINISHED_STORE" || part.category === "FINISHED_GOOD") {
      totalFinishedPcs += data.totalQty;
      totalFinishedKg += weightKg;
    } else {
      totalWipPcs += data.totalQty;
      totalWipKg += weightKg;
    }
    totalScrapQty += data.scrapQty;
    totalScrapKg += part.unit === "KG" ? data.scrapQty : data.scrapQty * weightPerUnit;
    totalGoodOutputPcs += data.productionQty;
    if (!partStockMap[partId]) {
      partStockMap[partId] = {
        totalQty: 0,
        totalKg: 0,
        unit: part.unit,
        byStage: {}
      };
    }
    partStockMap[partId].totalQty += data.totalQty;
    partStockMap[partId].totalKg += weightKg;
    partStockMap[partId].byStage[stageId] = (partStockMap[partId].byStage[stageId] || 0) + data.totalQty;
  }
  const overallScrapRate = totalGoodOutputPcs + totalScrapQty > 0 ? Number((totalScrapQty / (totalGoodOutputPcs + totalScrapQty) * 100).toFixed(2)) : 0;
  return {
    stageBalances,
    rawMaterialKg: Math.round(rawMaterialKg * 100) / 100,
    totalWipPcs: Math.round(totalWipPcs),
    totalWipKg: Math.round(totalWipKg * 100) / 100,
    totalFinishedPcs: Math.round(totalFinishedPcs),
    totalFinishedKg: Math.round(totalFinishedKg * 100) / 100,
    totalScrapQty: Math.round(totalScrapQty),
    totalScrapKg: Math.round(totalScrapKg * 100) / 100,
    overallScrapRate,
    partStockMap
  };
}
function validateAndPrepareTransaction(payload, existingTransactions, parts, user) {
  if (!payload.voucherType) {
    return { valid: false, errorMessage: "\u0646\u0648\u0639 \u0633\u0646\u062F \u0645\u0634\u062E\u0635 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." };
  }
  if (!payload.partId) {
    return { valid: false, errorMessage: "\u0642\u0637\u0639\u0647 \u06CC\u0627 \u0645\u0627\u062F\u0647 \u0627\u0648\u0644\u06CC\u0647 \u0627\u0646\u062A\u062E\u0627\u0628 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." };
  }
  const part = parts.find((p) => p.id === payload.partId);
  if (!part) {
    return { valid: false, errorMessage: `\u0642\u0637\u0639\u0647 \u0628\u0627 \u0634\u0646\u0627\u0633\u0647 ${payload.partId} \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.` };
  }
  if (!payload.stageId) {
    return { valid: false, errorMessage: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u0645\u0628\u062F\u0627 \u06CC\u0627 \u0627\u0646\u0628\u0627\u0631 \u0645\u0634\u062E\u0635 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." };
  }
  const qty = Number(payload.quantity);
  if (isNaN(qty) || qty <= 0) {
    return { valid: false, errorMessage: "\u0645\u0642\u062F\u0627\u0631 \u062A\u0631\u0627\u06A9\u0646\u0634 \u0628\u0627\u06CC\u062F \u0639\u062F\u062F\u06CC \u0645\u062B\u0628\u062A \u0648 \u0628\u0632\u0631\u06AF\u062A\u0631 \u0627\u0632 \u0635\u0641\u0631 \u0628\u0627\u0634\u062F." };
  }
  if (payload.voucherNumber) {
    const duplicate = existingTransactions.find(
      (t) => t.voucherNumber === payload.voucherNumber && t.status === "CONFIRMED"
    );
    if (duplicate) {
      return {
        valid: false,
        errorMessage: `\u0633\u0646\u062F \u0628\u0627 \u0634\u0645\u0627\u0631\u0647 \u067E\u06CC\u06AF\u06CC\u0631\u06CC \xAB${payload.voucherNumber}\xBB \u0642\u0628\u0644\u0627\u064B \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u062B\u0628\u062A \u0634\u062F\u0647 \u0627\u0633\u062A. \u0627\u0632 \u062B\u0628\u062A \u062A\u06A9\u0631\u0627\u0631\u06CC \u062C\u0644\u0648\u06AF\u06CC\u0631\u06CC \u0634\u062F.`
      };
    }
  }
  const requiresStockDeduction = [
    "ISSUE",
    "SCRAP",
    "WIP_TRANSFER_DISPATCH"
  ].includes(payload.voucherType);
  if (requiresStockDeduction) {
    const currentStatus = calculateInventoryLedger(existingTransactions, parts);
    const stageEntry = currentStatus.stageBalances.find(
      (sb) => sb.stageId === payload.stageId && sb.partId === payload.partId
    );
    const availableQty = stageEntry ? stageEntry.usableQty : 0;
    if (qty > availableQty) {
      const stageName = FACTORY_STAGES.find((s) => s.id === payload.stageId)?.name || payload.stageId;
      return {
        valid: false,
        errorMessage: `\u062E\u0637\u0627\u06CC \u06A9\u0646\u062A\u0631\u0644 \u0645\u0648\u062C\u0648\u062F\u06CC: \u0645\u0648\u062C\u0648\u062F\u06CC \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u062F\u0631 \xAB${stageName}\xBB \u0628\u0631\u0627\u06CC \u0642\u0637\u0639\u0647 \xAB${part.name}\xBB \u06A9\u0627\u0641\u06CC \u0646\u06CC\u0633\u062A. \u0645\u0648\u062C\u0648\u062F\u06CC \u0642\u0627\u0628\u0644 \u0627\u0633\u062A\u0641\u0627\u062F\u0647: ${availableQty} ${part.unit}\u060C \u0645\u0642\u062F\u0627\u0631 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC: ${qty} ${part.unit}. \u062C\u0644\u0648\u06AF\u06CC\u0631\u06CC \u0627\u0632 \u0645\u0648\u062C\u0648\u062F\u06CC \u0645\u0646\u0641\u06CC.`
      };
    }
  }
  if (payload.voucherType === "WIP_TRANSFER_DISPATCH" && !payload.targetStageId) {
    return { valid: false, errorMessage: "\u0628\u0631\u0627\u06CC \u0627\u0646\u062A\u0642\u0627\u0644 \u0642\u0637\u0639\u0647\u060C \u0645\u0634\u062E\u0635 \u06A9\u0631\u062F\u0646 \u0645\u0631\u062D\u0644\u0647 \u0645\u0642\u0635\u062F \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." };
  }
  if (payload.voucherType === "WIP_TRANSFER_DISPATCH" && payload.stageId === payload.targetStageId) {
    return { valid: false, errorMessage: "\u0645\u0631\u062D\u0644\u0647 \u0645\u0628\u062F\u0627 \u0648 \u0645\u0642\u0635\u062F \u0627\u0646\u062A\u0642\u0627\u0644 \u0646\u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u06CC\u06A9\u0633\u0627\u0646 \u0628\u0627\u0634\u062F." };
  }
  const weightPerUnit = part.weightPerUnitKg || 1;
  const quantityKg = part.unit === "KG" ? qty : Number((qty * weightPerUnit).toFixed(3));
  const voucherNum = payload.voucherNumber || generateVoucherNumber(payload.voucherType);
  const stageConfig = FACTORY_STAGES.find((s) => s.id === payload.stageId);
  const targetConfig = payload.targetStageId ? FACTORY_STAGES.find((s) => s.id === payload.targetStageId) : void 0;
  const normalized = {
    id: payload.id || `TX-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    voucherNumber: voucherNum,
    voucherType: payload.voucherType,
    partId: part.id,
    partCode: part.code,
    partName: part.name,
    stageId: payload.stageId,
    stageName: stageConfig ? stageConfig.name : payload.stageId,
    targetStageId: payload.targetStageId,
    targetStageName: targetConfig ? targetConfig.name : void 0,
    quantity: qty,
    unit: part.unit,
    quantityKg,
    referenceDoc: payload.referenceDoc || "",
    operatorName: payload.operatorName || user.displayName || "\u0627\u067E\u0631\u0627\u062A\u0648\u0631 \u0634\u06CC\u0641\u062A",
    machineId: payload.machineId,
    shift: payload.shift || "MORNING",
    scrapReason: payload.scrapReason,
    status: "CONFIRMED",
    notes: payload.notes || "",
    createdByUid: user.uid,
    createdByName: user.displayName,
    isDemo: payload.isDemo !== void 0 ? payload.isDemo : true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return { valid: true, normalizedTransaction: normalized };
}
function generateVoucherNumber(type) {
  const prefixMap = {
    OPENING_BALANCE: "OB",
    RECEIPT: "RC",
    ISSUE: "IS",
    PRODUCTION_OUTPUT: "PR",
    SCRAP: "SC",
    WIP_TRANSFER_DISPATCH: "TD",
    WIP_TRANSFER_RECEIPT: "TR",
    ADJUSTMENT: "AJ"
  };
  const prefix = prefixMap[type] || "TX";
  const rand = Math.floor(1e3 + Math.random() * 9e3);
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(2, 10).replace(/-/g, "");
  return `${prefix}-${dateStr}-${rand}`;
}

// src/server/sampleData.ts
var INITIAL_PARTS = [
  // 1-8: Raw material sheet steel coils & packs from SAPCO / Mobarakeh Steel (Managed in KG)
  {
    id: "PRT-RAW-001",
    code: "SAPCO-COIL-DC04-0.8",
    name: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 DC04 \u0636\u062E\u0627\u0645\u062A 0.8mm \u0633\u0627\u067E\u06A9\u0648",
    category: "RAW_MATERIAL",
    unit: "KG",
    weightPerUnitKg: 1,
    sapcoCode: "SAP-RAW-7102",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0648 \u067E\u0698\u0648 \u06F2\u06F0\u06F7",
    thicknessMm: 0.8,
    materialGrade: "DC04",
    minStock: 5e3,
    maxStock: 35e3,
    isDemo: true
  },
  {
    id: "PRT-RAW-002",
    code: "SAPCO-COIL-ST14-1.0",
    name: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC ST14 \u0636\u062E\u0627\u0645\u062A 1.0mm \u0641\u0648\u0644\u0627\u062F \u0645\u0628\u0627\u0631\u06A9\u0647 / \u0633\u0627\u067E\u06A9\u0648",
    category: "RAW_MATERIAL",
    unit: "KG",
    weightPerUnitKg: 1,
    sapcoCode: "SAP-RAW-7104",
    carModel: "\u062A\u0627\u0631\u0627 \u0648 \u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    thicknessMm: 1,
    materialGrade: "ST14",
    minStock: 6e3,
    maxStock: 4e4,
    isDemo: true
  },
  {
    id: "PRT-RAW-003",
    code: "SAPCO-COIL-DX51-1.2",
    name: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u06AF\u0627\u0644\u0648\u0627\u0646\u06CC\u0632\u0647 \u0636\u062F\u062E\u0648\u0631\u062F\u06AF\u06CC DX51D \u0636\u062E\u0627\u0645\u062A 1.2mm \u0633\u0627\u067E\u06A9\u0648",
    category: "RAW_MATERIAL",
    unit: "KG",
    weightPerUnitKg: 1,
    sapcoCode: "SAP-RAW-8201",
    carModel: "\u0634\u0627\u0647\u06CC\u0646 \u0648 \u06A9\u0648\u06CC\u06CC\u06A9",
    thicknessMm: 1.2,
    materialGrade: "DX51D+Z140",
    minStock: 4e3,
    maxStock: 25e3,
    isDemo: true
  },
  {
    id: "PRT-RAW-004",
    code: "SAPCO-SHT-ST37-2.0",
    name: "\u0628\u0633\u062A\u0647 \u0634\u06CC\u062A \u0648\u0631\u0642 \u0633\u06CC\u0627\u0647 ST37 \u0636\u062E\u0627\u0645\u062A 2.0mm \u0627\u0628\u0639\u0627\u062F 2000x1000",
    category: "RAW_MATERIAL",
    unit: "KG",
    weightPerUnitKg: 1,
    sapcoCode: "SAP-RAW-9302",
    carModel: "\u0645\u0634\u062A\u0631\u06A9 \u062A\u0645\u0627\u0645 \u062E\u0648\u062F\u0631\u0648\u0647\u0627 (\u0633\u0627\u0632\u0647 \u0648 \u0634\u0627\u0633\u06CC)",
    thicknessMm: 2,
    materialGrade: "ST37",
    minStock: 3e3,
    maxStock: 2e4,
    isDemo: true
  },
  {
    id: "PRT-RAW-005",
    code: "SAPCO-COIL-ST12-1.5",
    name: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0646\u06CC\u0645\u0647\u200C\u06A9\u0634\u0634 ST12 \u0636\u062E\u0627\u0645\u062A 1.5mm \u0639\u0631\u0636 \u06F1\u06F2\u06F5\u06F0 \u0645\u06CC\u0644\u06CC\u0645\u062A\u0631",
    category: "RAW_MATERIAL",
    unit: "KG",
    weightPerUnitKg: 1,
    sapcoCode: "SAP-RAW-7108",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0648 \u0633\u0645\u0646\u062F",
    thicknessMm: 1.5,
    materialGrade: "ST12",
    minStock: 5e3,
    maxStock: 3e4,
    isDemo: true
  },
  {
    id: "PRT-RAW-006",
    code: "SAPCO-COIL-DX54-0.7",
    name: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u06AF\u0627\u0644\u0648\u0627\u0646\u06CC\u0632\u0647 \u0641\u0648\u0642\u200C\u06A9\u0634\u0634 DX54D \u0636\u062E\u0627\u0645\u062A 0.7mm \u0628\u062F\u0646\u0647",
    category: "RAW_MATERIAL",
    unit: "KG",
    weightPerUnitKg: 1,
    sapcoCode: "SAP-RAW-8205",
    carModel: "\u062A\u0627\u0631\u0627",
    thicknessMm: 0.7,
    materialGrade: "DX54D",
    minStock: 4e3,
    maxStock: 25e3,
    isDemo: true
  },
  {
    id: "PRT-RAW-007",
    code: "SAPCO-SHT-ST52-2.5",
    name: "\u067E\u0627\u0644\u062A \u0648\u0631\u0642 \u067E\u0631\u06A9\u0634\u0634 ST52 \u0636\u062E\u0627\u0645\u062A 2.5mm \u0628\u0627\u0632\u0648\u0647\u0627\u06CC \u062A\u0639\u0644\u06CC\u0642",
    category: "RAW_MATERIAL",
    unit: "KG",
    weightPerUnitKg: 1,
    sapcoCode: "SAP-RAW-9501",
    carModel: "\u062F\u0646\u0627 \u067E\u0644\u0627\u0633 \u0648 \u0634\u0627\u0647\u06CC\u0646",
    thicknessMm: 2.5,
    materialGrade: "ST52-3",
    minStock: 2500,
    maxStock: 15e3,
    isDemo: true
  },
  {
    id: "PRT-RAW-008",
    code: "SAPCO-COIL-DC06-1.0",
    name: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0641\u0648\u0642\u200C\u0641\u0648\u0642 \u06A9\u0634\u0634 IF-Steel \u06AF\u0631\u06CC\u062F DC06 \u0636\u062E\u0627\u0645\u062A 1.0mm",
    category: "RAW_MATERIAL",
    unit: "KG",
    weightPerUnitKg: 1,
    sapcoCode: "SAP-RAW-7110",
    carModel: "\u062A\u0627\u0631\u0627 \u0648 \u067E\u0698\u0648 \u06F2\u06F0\u06F7",
    thicknessMm: 1,
    materialGrade: "DC06",
    minStock: 3500,
    maxStock: 2e4,
    isDemo: true
  },
  // 9-32: WIP stamped and formed components (قطعات کار در جریان ساخت WIP)
  {
    id: "PRT-WIP-001",
    code: "WIP-206-BRK-BLNK",
    name: "\u0628\u0644\u0646\u06A9 \u0628\u0631\u0634\u200C\u062E\u0648\u0631\u062F\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 0.65,
    sapcoCode: "WIP-SAP-20601",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    thicknessMm: 1.2,
    materialGrade: "ST14",
    minStock: 400,
    maxStock: 3e3,
    isDemo: true
  },
  {
    id: "PRT-WIP-002",
    code: "WIP-206-BRK-BENT",
    name: "\u067E\u0648\u0633\u062A\u0647 \u0641\u0631\u0645 \u0648 \u062E\u0645\u200C\u062E\u0648\u0631\u062F\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 (\u0642\u0628\u0644 \u0627\u0632 \u062C\u0648\u0634)",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 0.65,
    sapcoCode: "WIP-SAP-20602",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    thicknessMm: 1.2,
    materialGrade: "ST14",
    minStock: 300,
    maxStock: 2500,
    isDemo: true
  },
  {
    id: "PRT-WIP-003",
    code: "WIP-TAR-BUM-BLNK",
    name: "\u0628\u0644\u0646\u06A9 \u062F\u06CC\u0627\u0642 \u062A\u0642\u0648\u06CC\u062A\u06CC \u0633\u067E\u0631 \u062C\u0644\u0648 \u062A\u0627\u0631\u0627",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 2.15,
    sapcoCode: "WIP-SAP-TAR01",
    carModel: "\u062A\u0627\u0631\u0627",
    thicknessMm: 1.5,
    materialGrade: "ST14",
    minStock: 200,
    maxStock: 1500,
    isDemo: true
  },
  {
    id: "PRT-WIP-004",
    code: "WIP-TAR-BUM-FORM",
    name: "\u0641\u0631\u0645 \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u062A\u0627\u0631\u0627 (\u067E\u0631\u0633 \u06F8\u06F0\u06F0 \u062A\u0646)",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 2.1,
    sapcoCode: "WIP-SAP-TAR02",
    carModel: "\u062A\u0627\u0631\u0627",
    thicknessMm: 1.5,
    materialGrade: "ST14",
    minStock: 150,
    maxStock: 1200,
    isDemo: true
  },
  {
    id: "PRT-WIP-005",
    code: "WIP-DEN-PIL-INNR",
    name: "\u067E\u0648\u0633\u062A\u0647 \u062F\u0627\u062E\u0644\u06CC \u067E\u0631\u0633\u200C\u0634\u062F\u0647 \u0633\u062A\u0648\u0646 \u0648\u0633\u0637 B-Pillar \u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 1.85,
    sapcoCode: "WIP-SAP-DEN01",
    carModel: "\u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    thicknessMm: 1.8,
    materialGrade: "ST52-3",
    minStock: 180,
    maxStock: 1400,
    isDemo: true
  },
  {
    id: "PRT-WIP-006",
    code: "WIP-DEN-PIL-REIN",
    name: "\u062A\u0633\u0645\u0647 \u062A\u0642\u0648\u06CC\u062A\u06CC \u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u062E\u0648\u0631\u062F\u0647 \u0633\u062A\u0648\u0646 \u0648\u0633\u0637 \u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 1.2,
    sapcoCode: "WIP-SAP-DEN02",
    carModel: "\u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    thicknessMm: 2,
    materialGrade: "ST52-3",
    minStock: 200,
    maxStock: 1600,
    isDemo: true
  },
  {
    id: "PRT-WIP-007",
    code: "WIP-SHH-ENG-BLNK",
    name: "\u0628\u0644\u0646\u06A9 \u067E\u0627\u0646\u0686\u200C\u0634\u062F\u0647 \u0633\u06CC\u0646\u06CC \u0632\u06CC\u0631 \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 3.4,
    sapcoCode: "WIP-SAP-SHH01",
    carModel: "\u0634\u0627\u0647\u06CC\u0646",
    thicknessMm: 2,
    materialGrade: "ST37",
    minStock: 150,
    maxStock: 1e3,
    isDemo: true
  },
  {
    id: "PRT-WIP-008",
    code: "WIP-SHH-ENG-DRWN",
    name: "\u06A9\u0634\u0634 \u0641\u0631\u0645\u200C\u06CC\u0627\u0641\u062A\u0647 \u0634\u06CC\u0627\u0631\u062F\u0627\u0631 \u0633\u06CC\u0646\u06CC \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646 (\u0642\u0628\u0644 \u0627\u0632 \u0631\u0646\u06AF)",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 3.35,
    sapcoCode: "WIP-SAP-SHH02",
    carModel: "\u0634\u0627\u0647\u06CC\u0646",
    thicknessMm: 2,
    materialGrade: "ST37",
    minStock: 120,
    maxStock: 900,
    isDemo: true
  },
  {
    id: "PRT-WIP-009",
    code: "WIP-QCK-RCK-LEFT",
    name: "\u0641\u0631\u0645 \u062E\u0645\u06A9\u0627\u0631\u06CC\u200C\u0634\u062F\u0647 \u0631\u06A9\u0627\u0628 \u062C\u0627\u0646\u0628\u06CC \u0686\u067E \u06A9\u0648\u06CC\u06CC\u06A9",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 1.45,
    sapcoCode: "WIP-SAP-QCK01",
    carModel: "\u06A9\u0648\u06CC\u06CC\u06A9",
    thicknessMm: 1.2,
    materialGrade: "DX51D",
    minStock: 250,
    maxStock: 1800,
    isDemo: true
  },
  {
    id: "PRT-WIP-010",
    code: "WIP-QCK-RCK-RGHT",
    name: "\u0641\u0631\u0645 \u062E\u0645\u06A9\u0627\u0631\u06CC\u200C\u0634\u062F\u0647 \u0631\u06A9\u0627\u0628 \u062C\u0627\u0646\u0628\u06CC \u0631\u0627\u0633\u062A \u06A9\u0648\u06CC\u06CC\u06A9",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 1.45,
    sapcoCode: "WIP-SAP-QCK02",
    carModel: "\u06A9\u0648\u06CC\u06CC\u06A9",
    thicknessMm: 1.2,
    materialGrade: "DX51D",
    minStock: 250,
    maxStock: 1800,
    isDemo: true
  },
  {
    id: "PRT-WIP-011",
    code: "WIP-206-HOD-OUTR",
    name: "\u067E\u0648\u0633\u062A\u0647 \u0628\u06CC\u0631\u0648\u0646\u06CC \u06A9\u0634\u0634\u200C\u06CC\u0627\u0641\u062A\u0647 \u062F\u0631\u0628 \u0645\u0648\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 4.8,
    sapcoCode: "WIP-SAP-20603",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    thicknessMm: 0.8,
    materialGrade: "DC04",
    minStock: 100,
    maxStock: 800,
    isDemo: true
  },
  {
    id: "PRT-WIP-012",
    code: "WIP-206-HOD-INNR",
    name: "\u0627\u0633\u06A9\u0644\u062A \u062F\u0627\u062E\u0644\u06CC \u0634\u0628\u06A9\u0647\u200C\u0627\u06CC \u062F\u0631\u0628 \u0645\u0648\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 3.9,
    sapcoCode: "WIP-SAP-20604",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    thicknessMm: 0.8,
    materialGrade: "DC04",
    minStock: 100,
    maxStock: 800,
    isDemo: true
  },
  {
    id: "PRT-WIP-013",
    code: "WIP-206-HNG-LEAF",
    name: "\u0628\u0631\u06AF \u0644\u0648\u0644\u0627\u06CC \u0645\u062A\u062D\u0631\u06A9 \u062F\u0631\u0628 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 (\u067E\u0627\u0646\u0686 \u0648 \u062E\u0645 \u0633\u0646\u06AF\u06CC\u0646)",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 0.32,
    sapcoCode: "WIP-SAP-20605",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    thicknessMm: 2.5,
    materialGrade: "ST52",
    minStock: 800,
    maxStock: 5e3,
    isDemo: true
  },
  {
    id: "PRT-WIP-014",
    code: "WIP-TAR-CCB-TUBE",
    name: "\u067E\u0648\u0633\u062A\u0647 \u0641\u0631\u0645\u200C\u062F\u0627\u062F\u0647 \u0634\u062F\u0647 \u062A\u06CC\u0631 \u0639\u0631\u0636\u06CC \u0632\u06CC\u0631 \u062F\u0627\u0634\u0628\u0648\u0631\u062F \u062A\u0627\u0631\u0627",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 2.7,
    sapcoCode: "WIP-SAP-TAR03",
    carModel: "\u062A\u0627\u0631\u0627",
    thicknessMm: 1.5,
    materialGrade: "ST14",
    minStock: 150,
    maxStock: 1100,
    isDemo: true
  },
  {
    id: "PRT-WIP-015",
    code: "WIP-DEN-AXL-PLT",
    name: "\u0635\u0641\u062D\u0647 \u062A\u0642\u0648\u06CC\u062A\u06CC \u0628\u0627\u0632\u0648\u06CC \u0627\u06A9\u0633\u0644 \u0639\u0642\u0628 \u062F\u0646\u0627 \u067E\u0644\u0627\u0633 (\u067E\u0627\u0646\u0686 \u06F3 \u0633\u0648\u0631\u0627\u062E\u0647)",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 0.95,
    sapcoCode: "WIP-SAP-DEN03",
    carModel: "\u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    thicknessMm: 2.5,
    materialGrade: "ST52",
    minStock: 300,
    maxStock: 2200,
    isDemo: true
  },
  {
    id: "PRT-WIP-016",
    code: "WIP-SHH-FND-SPRT",
    name: "\u067E\u0627\u06CC\u0647 \u0628\u0631\u0627\u06A9\u062A \u0646\u06AF\u0647\u200C\u062F\u0627\u0631\u0646\u062F\u0647 \u06AF\u0644\u06AF\u06CC\u0631 \u062C\u0644\u0648 \u0634\u0627\u0647\u06CC\u0646",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 0.42,
    sapcoCode: "WIP-SAP-SHH03",
    carModel: "\u0634\u0627\u0647\u06CC\u0646",
    thicknessMm: 1,
    materialGrade: "DX51D",
    minStock: 400,
    maxStock: 2600,
    isDemo: true
  },
  {
    id: "PRT-WIP-017",
    code: "WIP-207-BUM-REAR",
    name: "\u062A\u0633\u0645\u0647 \u062F\u06CC\u0627\u0642 \u0641\u0644\u0632\u06CC \u0633\u067E\u0631 \u0639\u0642\u0628 \u067E\u0698\u0648 \u06F2\u06F0\u06F7",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 1.6,
    sapcoCode: "WIP-SAP-20701",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F7",
    thicknessMm: 1.5,
    materialGrade: "ST14",
    minStock: 200,
    maxStock: 1400,
    isDemo: true
  },
  {
    id: "PRT-WIP-018",
    code: "WIP-TAR-HLM-BRK",
    name: "\u0628\u0631\u0627\u06A9\u062A \u0646\u06AF\u0647\u200C\u062F\u0627\u0631\u0646\u062F\u0647 \u0686\u0631\u0627\u063A \u062C\u0644\u0648 \u0631\u0627\u0633\u062A \u062A\u0627\u0631\u0627",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 0.28,
    sapcoCode: "WIP-SAP-TAR04",
    carModel: "\u062A\u0627\u0631\u0627",
    thicknessMm: 1,
    materialGrade: "ST12",
    minStock: 500,
    maxStock: 3500,
    isDemo: true
  },
  {
    id: "PRT-WIP-019",
    code: "WIP-206-FLR-FLNG",
    name: "\u0641\u0644\u0646\u062C \u0634\u06CC\u0627\u0631\u062F\u0627\u0631 \u06A9\u0641\u06CC \u0627\u062A\u0627\u0642 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 1.1,
    sapcoCode: "WIP-SAP-20606",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    thicknessMm: 1,
    materialGrade: "DC04",
    minStock: 220,
    maxStock: 1600,
    isDemo: true
  },
  {
    id: "PRT-WIP-020",
    code: "WIP-DEN-TRK-HNG",
    name: "\u0644\u0648\u0644\u0627 \u0648 \u0628\u0627\u0632\u0648\u06CC \u06A9\u0645\u06A9\u06CC \u062F\u0631\u0628 \u0635\u0646\u062F\u0648\u0642 \u0639\u0642\u0628 \u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 0.58,
    sapcoCode: "WIP-SAP-DEN04",
    carModel: "\u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    thicknessMm: 2,
    materialGrade: "ST37",
    minStock: 350,
    maxStock: 2400,
    isDemo: true
  },
  {
    id: "PRT-WIP-021",
    code: "WIP-SHH-LCK-BASE",
    name: "\u067E\u0627\u06CC\u0647 \u0642\u0641\u0644 \u062F\u0631\u0628 \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646 (\u062E\u0645 \u0648 \u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u0645\u0647\u0631\u0647 M8)",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 0.45,
    sapcoCode: "WIP-SAP-SHH04",
    carModel: "\u0634\u0627\u0647\u06CC\u0646",
    thicknessMm: 1.8,
    materialGrade: "ST37",
    minStock: 300,
    maxStock: 2e3,
    isDemo: true
  },
  {
    id: "PRT-WIP-022",
    code: "WIP-TAR-APIL-REIN",
    name: "\u062A\u0642\u0648\u06CC\u062A \u0633\u062A\u0648\u0646 \u062C\u0644\u0648 A-Pillar \u0633\u0645\u062A \u0631\u0627\u0646\u0646\u062F\u0647 \u062A\u0627\u0631\u0627",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 1.95,
    sapcoCode: "WIP-SAP-TAR05",
    carModel: "\u062A\u0627\u0631\u0627",
    thicknessMm: 1.8,
    materialGrade: "ST52",
    minStock: 150,
    maxStock: 1200,
    isDemo: true
  },
  {
    id: "PRT-WIP-023",
    code: "WIP-206-SEAT-FRNT",
    name: "\u067E\u0627\u06CC\u0647 \u062A\u062B\u0628\u06CC\u062A \u0631\u06CC\u0644 \u0635\u0646\u062F\u0644\u06CC \u062C\u0644\u0648 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 0.72,
    sapcoCode: "WIP-SAP-20607",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    thicknessMm: 1.5,
    materialGrade: "ST14",
    minStock: 400,
    maxStock: 3e3,
    isDemo: true
  },
  {
    id: "PRT-WIP-024",
    code: "WIP-QCK-FAN-FRM",
    name: "\u0642\u0627\u0628 \u0641\u0644\u0632\u06CC \u0646\u06AF\u0647\u200C\u062F\u0627\u0631\u0646\u062F\u0647 \u0641\u0646 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u06A9\u0648\u06CC\u06CC\u06A9",
    category: "WIP_PART",
    unit: "PCS",
    weightPerUnitKg: 0.88,
    sapcoCode: "WIP-SAP-QCK03",
    carModel: "\u06A9\u0648\u06CC\u06CC\u06A9",
    thicknessMm: 1,
    materialGrade: "DX51D",
    minStock: 250,
    maxStock: 1800,
    isDemo: true
  },
  // 33-52: Finished stamped & coated automotive parts (محصولات نهایی آماده تحویل به ساپکو)
  {
    id: "PRT-FGD-001",
    code: "SAPCO-ASSY-206-001",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u06A9\u0627\u0645\u0644 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0628\u0627 \u067E\u0648\u0634\u0634 ED \u0645\u0634\u06A9\u06CC",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 0.98,
    sapcoCode: "IK-501-88401",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0648 \u067E\u0698\u0648 \u06F2\u06F0\u06F7",
    thicknessMm: 1.2,
    materialGrade: "ST14+ST37",
    minStock: 300,
    maxStock: 2500,
    isDemo: true
  },
  {
    id: "PRT-FGD-002",
    code: "SAPCO-ASSY-TAR-002",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u062A\u0627\u0631\u0627 \u0628\u0627 \u0628\u0631\u0627\u06A9\u062A\u200C\u0647\u0627\u06CC \u0636\u0631\u0628\u0647\u200C\u06AF\u06CC\u0631 \u06A9\u0631\u0627\u0634\u200C\u0628\u0627\u06A9\u0633",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 3.1,
    sapcoCode: "IK-502-99102",
    carModel: "\u062A\u0627\u0631\u0627",
    thicknessMm: 1.5,
    materialGrade: "ST14",
    minStock: 200,
    maxStock: 1800,
    isDemo: true
  },
  {
    id: "PRT-FGD-003",
    code: "SAPCO-ASSY-DEN-003",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u062A\u0642\u0648\u06CC\u062A \u0633\u062A\u0648\u0646 \u0648\u0633\u0637 B-Pillar \u06A9\u0627\u0645\u0644 \u062F\u0646\u0627 \u067E\u0644\u0627\u0633 (\u0631\u0646\u06AF \u06A9\u0627\u062A\u0627\u0641\u0648\u0631\u0632)",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 3.25,
    sapcoCode: "IK-503-66205",
    carModel: "\u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    thicknessMm: 2,
    materialGrade: "ST52-3",
    minStock: 150,
    maxStock: 1400,
    isDemo: true
  },
  {
    id: "PRT-FGD-004",
    code: "SAPCO-ASSY-SHH-004",
    name: "\u0633\u06CC\u0646\u06CC \u0645\u062D\u0627\u0641\u0638 \u0641\u0644\u0632\u06CC \u0632\u06CC\u0631 \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646 \u067E\u0648\u0634\u0634\u200C\u062F\u0627\u0631 \u0628\u0627 \u067E\u06CC\u0686\u200C\u0647\u0627\u06CC \u0646\u0635\u0628",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 3.65,
    sapcoCode: "SP-601-33401",
    carModel: "\u0634\u0627\u0647\u06CC\u0646",
    thicknessMm: 2,
    materialGrade: "ST37",
    minStock: 180,
    maxStock: 1200,
    isDemo: true
  },
  {
    id: "PRT-FGD-005",
    code: "SAPCO-ASSY-QCK-005",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u0631\u06A9\u0627\u0628 \u062A\u0642\u0648\u06CC\u062A\u06CC \u062C\u0627\u0646\u0628\u06CC \u0686\u067E \u0648 \u0631\u0627\u0633\u062A \u06A9\u0648\u06CC\u06CC\u06A9 \u06AF\u0627\u0644\u0648\u0627\u0646\u06CC\u0632\u0647",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 3.05,
    sapcoCode: "SP-602-44109",
    carModel: "\u06A9\u0648\u06CC\u06CC\u06A9 \u0648 \u062A\u06CC\u0628\u0627",
    thicknessMm: 1.2,
    materialGrade: "DX51D",
    minStock: 200,
    maxStock: 1600,
    isDemo: true
  },
  {
    id: "PRT-FGD-006",
    code: "SAPCO-ASSY-206-006",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u06A9\u0627\u0645\u0644 \u062F\u0631\u0628 \u0645\u0648\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0647\u0645\u0628\u0631\u0628\u0646\u062F\u06CC \u0634\u062F\u0647 (\u0647\u0650\u0645\u06CC\u0646\u06AF)",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 8.85,
    sapcoCode: "IK-501-77103",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    thicknessMm: 0.8,
    materialGrade: "DC04",
    minStock: 80,
    maxStock: 600,
    isDemo: true
  },
  {
    id: "PRT-FGD-007",
    code: "SAPCO-ASSY-206-007",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u062C\u0641\u062A \u0644\u0648\u0644\u0627\u06CC \u062F\u0631\u0628 \u062C\u0644\u0648 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0628\u0627 \u067E\u06CC\u0646 \u0633\u062E\u062A\u200C\u06A9\u0627\u0631\u06CC \u0634\u062F\u0647",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 0.75,
    sapcoCode: "IK-501-99201",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0648 \u0631\u0627\u0646\u0627",
    thicknessMm: 2.5,
    materialGrade: "ST52",
    minStock: 500,
    maxStock: 3500,
    isDemo: true
  },
  {
    id: "PRT-FGD-008",
    code: "SAPCO-ASSY-TAR-008",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u062A\u06CC\u0631 \u0639\u0631\u0636\u06CC \u0627\u0633\u06A9\u0644\u062A \u062F\u0627\u0634\u0628\u0648\u0631\u062F \u062A\u0627\u0631\u0627 (Cross Car Beam)",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 4.8,
    sapcoCode: "IK-502-33108",
    carModel: "\u062A\u0627\u0631\u0627",
    thicknessMm: 1.5,
    materialGrade: "ST14",
    minStock: 100,
    maxStock: 800,
    isDemo: true
  },
  {
    id: "PRT-FGD-009",
    code: "SAPCO-ASSY-DEN-009",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u0635\u0641\u062D\u0647 \u0627\u06A9\u0633\u0644 \u062A\u0642\u0648\u06CC\u062A \u0634\u062F\u0647 \u062F\u0646\u0627 \u067E\u0644\u0627\u0633 (\u0631\u0646\u06AF \u067E\u0648\u062F\u0631\u06CC \u0627\u0644\u06A9\u062A\u0631\u0648\u0627\u0633\u062A\u0627\u062A\u06CC\u06A9)",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 1.35,
    sapcoCode: "IK-503-44111",
    carModel: "\u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    thicknessMm: 2.5,
    materialGrade: "ST52-3",
    minStock: 250,
    maxStock: 2e3,
    isDemo: true
  },
  {
    id: "PRT-FGD-010",
    code: "SAPCO-ASSY-SHH-010",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u0628\u0631\u0627\u06A9\u062A\u200C\u0647\u0627\u06CC \u06AF\u0644\u06AF\u06CC\u0631 \u062C\u0644\u0648 \u0634\u0627\u0647\u06CC\u0646 (\u0628\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u06A9\u0627\u0631\u062A\u0646\u06CC \u0633\u0627\u067E\u06A9\u0648)",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 0.6,
    sapcoCode: "SP-601-55104",
    carModel: "\u0634\u0627\u0647\u06CC\u0646",
    thicknessMm: 1,
    materialGrade: "DX51D",
    minStock: 350,
    maxStock: 2800,
    isDemo: true
  },
  {
    id: "PRT-FGD-011",
    code: "SAPCO-ASSY-207-011",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u0636\u0631\u0628\u0647\u200C\u06AF\u06CC\u0631 \u0641\u0644\u0632\u06CC \u0633\u067E\u0631 \u0639\u0642\u0628 \u067E\u0698\u0648 \u06F2\u06F0\u06F7 \u06A9\u062F \u0631\u0646\u06AF \u0645\u0634\u06A9\u06CC",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 2.2,
    sapcoCode: "IK-504-11802",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F7",
    thicknessMm: 1.5,
    materialGrade: "ST14",
    minStock: 180,
    maxStock: 1300,
    isDemo: true
  },
  {
    id: "PRT-FGD-012",
    code: "SAPCO-ASSY-TAR-012",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u0628\u0631\u0627\u06A9\u062A \u0686\u0631\u0627\u063A \u0648 \u0633\u0646\u0633\u0648\u0631 \u0631\u0627\u062F\u0627\u0631 \u06A9\u0631\u0648\u0632 \u06A9\u0646\u062A\u0631\u0644 \u062A\u0627\u0631\u0627",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 0.45,
    sapcoCode: "IK-502-88204",
    carModel: "\u062A\u0627\u0631\u0627",
    thicknessMm: 1,
    materialGrade: "ST12",
    minStock: 400,
    maxStock: 3e3,
    isDemo: true
  },
  {
    id: "PRT-FGD-013",
    code: "SAPCO-ASSY-206-013",
    name: "\u06A9\u0641\u06CC \u0641\u0644\u0632\u06CC \u0645\u062D\u0641\u0638\u0647 \u0632\u0627\u067E\u0627\u0633 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0641\u0631\u0645 \u0639\u0645\u06CC\u0642 \u0628\u0627 \u0639\u0627\u06CC\u0642 \u0642\u06CC\u0631\u06CC",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 2.85,
    sapcoCode: "IK-501-44302",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0648 \u06F2\u06F0\u06F7",
    thicknessMm: 1,
    materialGrade: "DC04",
    minStock: 140,
    maxStock: 1100,
    isDemo: true
  },
  {
    id: "PRT-FGD-014",
    code: "SAPCO-ASSY-DEN-014",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u0644\u0648\u0644\u0627 \u0648 \u0641\u0646\u0631 \u0628\u0627\u0632\u06A9\u0646\u0646\u062F\u0647 \u062F\u0631\u0628 \u0635\u0646\u062F\u0648\u0642 \u0639\u0642\u0628 \u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 1.15,
    sapcoCode: "IK-503-77109",
    carModel: "\u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    thicknessMm: 2,
    materialGrade: "ST37",
    minStock: 250,
    maxStock: 1800,
    isDemo: true
  },
  {
    id: "PRT-FGD-015",
    code: "SAPCO-ASSY-SHH-015",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u0628\u0631\u0627\u06A9\u062A \u0648 \u0642\u0641\u0644 \u062B\u0627\u0646\u0648\u06CC\u0647 \u062F\u0631\u0628 \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 0.7,
    sapcoCode: "SP-601-22108",
    carModel: "\u0634\u0627\u0647\u06CC\u0646",
    thicknessMm: 1.8,
    materialGrade: "ST37",
    minStock: 280,
    maxStock: 2200,
    isDemo: true
  },
  {
    id: "PRT-FGD-016",
    code: "SAPCO-ASSY-TAR-016",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u0633\u062A\u0648\u0646 A-Pillar \u0686\u067E \u0648 \u0631\u0627\u0633\u062A \u062A\u0627\u0631\u0627 \u0628\u0627 \u067E\u0648\u0634\u0634 ED",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 4.1,
    sapcoCode: "IK-502-55901",
    carModel: "\u062A\u0627\u0631\u0627",
    thicknessMm: 1.8,
    materialGrade: "ST52",
    minStock: 120,
    maxStock: 950,
    isDemo: true
  },
  {
    id: "PRT-FGD-017",
    code: "SAPCO-ASSY-206-017",
    name: "\u067E\u0627\u06CC\u0647 \u0648 \u06A9\u0641\u06CC \u0646\u06AF\u0647\u062F\u0627\u0631\u0646\u062F\u0647 \u0635\u0646\u062F\u0644\u06CC \u062C\u0644\u0648 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u062C\u0648\u0634\u06A9\u0627\u0631\u06CC \u0634\u062F\u0647",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 1.1,
    sapcoCode: "IK-501-66405",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    thicknessMm: 1.5,
    materialGrade: "ST14",
    minStock: 320,
    maxStock: 2600,
    isDemo: true
  },
  {
    id: "PRT-FGD-018",
    code: "SAPCO-ASSY-QCK-018",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u0642\u0627\u0628 \u0648 \u0646\u0627\u0648\u062F\u0627\u0646\u06CC \u0641\u0646 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u062F\u0648\u0628\u0644 \u06A9\u0648\u06CC\u06CC\u06A9",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 1.25,
    sapcoCode: "SP-602-77301",
    carModel: "\u06A9\u0648\u06CC\u06CC\u06A9",
    thicknessMm: 1,
    materialGrade: "DX51D",
    minStock: 200,
    maxStock: 1700,
    isDemo: true
  },
  {
    id: "PRT-FGD-019",
    code: "SAPCO-ASSY-206-019",
    name: "\u0645\u062C\u0645\u0648\u0639\u0647 \u0628\u0631\u0627\u06A9\u062A \u0648 \u062A\u0633\u0645\u0647 \u0645\u062D\u0627\u0641\u0638 \u0645\u062E\u0632\u0646 \u0628\u0627\u06A9 \u0633\u0648\u062E\u062A \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 0.95,
    sapcoCode: "IK-501-33208",
    carModel: "\u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0648 \u0631\u0627\u0646\u0627",
    thicknessMm: 1.2,
    materialGrade: "DX51D",
    minStock: 280,
    maxStock: 2100,
    isDemo: true
  },
  {
    id: "PRT-FGD-020",
    code: "SAPCO-ASSY-DEN-020",
    name: "\u0633\u06CC\u0646\u06CC \u0639\u0627\u06CC\u0642 \u062D\u0631\u0627\u0631\u062A\u06CC \u06A9\u0627\u062A\u0627\u0644\u06CC\u0633\u062A \u0648 \u0645\u0646\u06CC\u0641\u0648\u0644\u062F \u0627\u06AF\u0632\u0648\u0632 \u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    category: "FINISHED_GOOD",
    unit: "PCS",
    weightPerUnitKg: 0.65,
    sapcoCode: "IK-503-88902",
    carModel: "\u062F\u0646\u0627 \u067E\u0644\u0627\u0633 \u0645\u0648\u062A\u0648\u0631 EF7",
    thicknessMm: 0.8,
    materialGrade: "DC04+ALU",
    minStock: 350,
    maxStock: 2700,
    isDemo: true
  }
];
var INITIAL_MACHINES = [
  {
    id: "MCH-001",
    code: "PRS-800-01",
    name: "\u067E\u0631\u0633 \u0647\u06CC\u062F\u0631\u0648\u0644\u06CC\u06A9 \u06A9\u0634\u0634 \u0633\u0646\u06AF\u06CC\u0646 \u06F8\u06F0\u06F0 \u062A\u0646 \u0647\u06CC\u062F\u0631\u0648\u0644\u06CC\u06A9 \u0634\u0631\u0642",
    capabilities: ["DRAWING", "BLANKING", "PUNCH_FORM", "TRIMMING"],
    processType: "DRAWING",
    tonnage: 800,
    bolsterSize: "2800x1800 mm",
    strokeLengthMm: 600,
    strokesPerMinute: 16,
    hallId: "HALL-HEAVY-PRESS",
    location: "\u0633\u0627\u0644\u0646 \u067E\u0631\u0633 \u0633\u0646\u06AF\u06CC\u0646 - \u062E\u0637 \u06F1",
    status: "ACTIVE",
    operatorName: "\u0645\u0647\u0646\u062F\u0633 \u0642\u0646\u0628\u0631\u06CC",
    isDemo: true
  },
  {
    id: "MCH-002",
    code: "PRS-400-01",
    name: "\u067E\u0631\u0633 \u0645\u06A9\u0627\u0646\u06CC\u06A9\u06CC \u0636\u0631\u0628\u0647\u200C\u0627\u06CC \u06F4\u06F0\u06F0 \u062A\u0646 \u0634\u0648\u0644\u0631 (Schuler C-Frame)",
    capabilities: ["PUNCH_FORM", "BLANKING", "BENDING", "TRIMMING"],
    processType: "PUNCH_FORM",
    tonnage: 400,
    bolsterSize: "2200x1400 mm",
    strokeLengthMm: 350,
    strokesPerMinute: 30,
    hallId: "HALL-HEAVY-PRESS",
    location: "\u0633\u0627\u0644\u0646 \u067E\u0631\u0633 \u0633\u0646\u06AF\u06CC\u0646 - \u062E\u0637 \u06F2",
    status: "ACTIVE",
    operatorName: "\u0627\u0633\u062A\u0627\u062F \u0627\u062D\u0645\u062F\u06CC",
    isDemo: true
  },
  {
    id: "MCH-003",
    code: "PRS-250-01",
    name: "\u067E\u0631\u0633 \u0645\u06A9\u0627\u0646\u06CC\u06A9\u06CC \u06A9\u0644\u0627\u0686 \u067E\u0646\u0648\u0645\u0627\u062A\u06CC\u06A9 \u06F2\u06F5\u06F0 \u062A\u0646 \u0622\u06CC\u062F\u06CC\u0646",
    capabilities: ["BLANKING", "PUNCH_FORM", "BENDING"],
    processType: "BLANKING",
    tonnage: 250,
    bolsterSize: "1600x1100 mm",
    strokeLengthMm: 220,
    strokesPerMinute: 45,
    hallId: "HALL-MEDIUM-PRESS",
    location: "\u0633\u0627\u0644\u0646 \u067E\u0631\u0633 \u0645\u062A\u0648\u0633\u0637 - \u062E\u0637 \u06F3",
    status: "ACTIVE",
    operatorName: "\u0631\u0636\u0627 \u06A9\u0631\u06CC\u0645\u06CC",
    isDemo: true
  },
  {
    id: "MCH-004",
    code: "BRK-160-01",
    name: "\u067E\u0631\u0633 \u0628\u0631\u06A9 CNC \u06F1\u06F6\u06F0 \u062A\u0646 \u06F4 \u0645\u062D\u0648\u0631\u0647 \u062F\u0644\u0645 (Delem)",
    capabilities: ["BENDING"],
    processType: "BENDING",
    tonnage: 160,
    bolsterSize: "3100x200 mm",
    strokeLengthMm: 200,
    strokesPerMinute: 20,
    hallId: "HALL-MEDIUM-PRESS",
    location: "\u0633\u0627\u0644\u0646 \u0641\u0631\u0645\u200C\u062F\u0647\u06CC \u0648 \u062E\u0645\u200C\u06A9\u0627\u0631\u06CC",
    status: "ACTIVE",
    operatorName: "\u062D\u0633\u06CC\u0646 \u0645\u0631\u0627\u062F\u06CC",
    isDemo: true
  },
  {
    id: "MCH-005",
    code: "SHT-060-01",
    name: "\u0642\u06CC\u0686\u06CC \u06AF\u06CC\u0648\u062A\u06CC\u0646 \u0647\u06CC\u062F\u0631\u0648\u0644\u06CC\u06A9 \u06F6 \u0645\u06CC\u0644\u06CC\u0645\u062A\u0631 \u06F3 \u0645\u062A\u0631\u06CC \u0635\u0627\u0626\u0628",
    capabilities: ["SHEARING"],
    processType: "SHEARING",
    tonnage: 60,
    bolsterSize: "\u062A\u06CC\u063A\u0647 \u06F3\u06F0\u06F0\u06F0 \u0645\u06CC\u0644\u06CC\u0645\u062A\u0631",
    strokeLengthMm: 80,
    strokesPerMinute: 25,
    hallId: "HALL-SHEARING",
    location: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u0628\u0631\u0634 \u0627\u0648\u0644\u06CC\u0647 \u0648\u0631\u0642",
    status: "ACTIVE",
    operatorName: "\u0639\u0644\u06CC \u0631\u0636\u0627\u06CC\u06CC",
    isDemo: true
  },
  {
    id: "MCH-006",
    code: "SLT-125-01",
    name: "\u062E\u0637 \u0631\u0648\u0644\u200C\u0628\u0627\u0632\u06A9\u0646\u060C \u0641\u06CC\u062F\u0631 \u0627\u062A\u0648\u0645\u0627\u062A\u06CC\u06A9 \u0648 \u0646\u0648\u0627\u0631\u0628\u0631 \u0639\u0631\u0636 \u06F1\u06F2\u06F5\u06F0mm \u0633\u0627\u067E\u06A9\u0648",
    capabilities: ["SHEARING"],
    processType: "SHEARING",
    tonnage: 40,
    bolsterSize: "\u0639\u0631\u0636 \u06A9\u0644\u0627\u0641 \u06F1\u06F2\u06F5\u06F0 \u0645\u06CC\u0644\u06CC\u0645\u062A\u0631",
    strokeLengthMm: 0,
    strokesPerMinute: 60,
    hallId: "HALL-SHEARING",
    location: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0648\u0627\u062F \u0627\u0648\u0644\u06CC\u0647 \u0633\u0627\u067E\u06A9\u0648",
    status: "ACTIVE",
    operatorName: "\u0645\u0631\u062A\u0636\u06CC \u0628\u06CC\u0627\u062A",
    isDemo: true
  },
  {
    id: "MCH-007",
    code: "WLD-ROB-01",
    name: "\u0633\u0644\u0648\u0644 \u0631\u0628\u0627\u062A\u06CC\u06A9 \u062F\u0648 \u0645\u062D\u0648\u0631\u0647 \u062C\u0648\u0634\u06A9\u0627\u0631\u06CC CO2 \u06CC\u0627\u0633\u06A9\u0627\u0648\u0627 \u0645\u0648\u062A\u0648\u0645\u0646",
    capabilities: ["CO2_WELD"],
    processType: "CO2_WELD",
    tonnage: 0,
    bolsterSize: "\u0645\u06CC\u0632 \u062F\u0648 \u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u062A\u0631\u0646\u200C\u062A\u06CC\u0628\u0644 \u06AF\u0631\u062F\u0627\u0646",
    strokeLengthMm: 0,
    strokesPerMinute: 0,
    hallId: "HALL-WELDING",
    location: "\u0633\u0627\u0644\u0646 \u062C\u0648\u0634\u06A9\u0627\u0631\u06CC \u0631\u0628\u0627\u062A\u06CC\u06A9",
    status: "ACTIVE",
    operatorName: "\u0645\u0647\u0646\u062F\u0633 \u0627\u06A9\u0628\u0631\u06CC",
    isDemo: true
  },
  {
    id: "MCH-008",
    code: "WLD-SPT-01",
    name: "\u062F\u0633\u062A\u06AF\u0627\u0647 \u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u0645\u0642\u0627\u0648\u0645\u062A\u06CC \u0646\u0642\u0637\u0647\u200C\u0627\u06CC \u06F7\u06F5 \u06A9\u06CC\u0644\u0648\u0648\u0644\u062A\u200C\u0622\u0645\u067E\u0631 \u0622\u0648\u06CC\u0632 ARO",
    capabilities: ["SPOT_WELD"],
    processType: "SPOT_WELD",
    tonnage: 15,
    bolsterSize: "\u0641\u06A9 \u067E\u0646\u0648\u0645\u0627\u062A\u06CC\u06A9 \u0622\u0628\u200C\u06AF\u0631\u062F",
    strokeLengthMm: 120,
    strokesPerMinute: 40,
    hallId: "HALL-WELDING",
    location: "\u0633\u0627\u0644\u0646 \u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u0645\u0642\u0627\u0648\u0645\u062A\u06CC",
    status: "ACTIVE",
    operatorName: "\u0633\u0639\u06CC\u062F \u0628\u0627\u0642\u0631\u06CC",
    isDemo: true
  },
  {
    id: "MCH-009",
    code: "PNT-CAT-01",
    name: "\u062E\u0637 \u0634\u0633\u062A\u0634\u0648\u06CC \u06F8 \u0645\u0631\u062D\u0644\u0647\u200C\u0627\u06CC \u0648 \u062D\u0648\u0636\u0686\u0647 \u0631\u0646\u06AF \u06A9\u0627\u062A\u0627\u0641\u0648\u0631\u0632 ED \u0633\u0627\u067E\u06A9\u0648",
    capabilities: ["PAINT"],
    processType: "PAINT",
    tonnage: 0,
    bolsterSize: "\u06A9\u0627\u0646\u0648\u0627\u06CC\u0631 \u067E\u06CC\u0648\u0633\u062A\u0647 \u0637\u0648\u0644 \u06F4\u06F0 \u0645\u062A\u0631",
    strokeLengthMm: 0,
    strokesPerMinute: 0,
    hallId: "HALL-CATAPHORESIS",
    location: "\u0633\u0627\u0644\u0646 \u0631\u0646\u06AF \u0627\u0644\u06A9\u062A\u0631\u0648\u0641\u0648\u0631\u0632",
    status: "ACTIVE",
    operatorName: "\u0645\u0647\u0646\u062F\u0633 \u0637\u0627\u0647\u0631\u06CC",
    isDemo: true
  },
  {
    id: "MCH-010",
    code: "ASM-JIG-01",
    name: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u062C\u06CC\u06AF \u0648 \u0641\u06CC\u06A9\u0633\u0686\u0631 \u0647\u06CC\u062F\u0631\u0648\u0644\u06CC\u06A9 \u0647\u0650\u0645\u06CC\u0646\u06AF \u0648 \u0645\u0648\u0646\u062A\u0627\u0698 \u0646\u0647\u0627\u06CC\u06CC",
    capabilities: ["ASSEMBLY"],
    processType: "ASSEMBLY",
    tonnage: 20,
    bolsterSize: "\u0645\u06CC\u0632 \u0647\u0650\u0645\u06CC\u0646\u06AF \u0644\u0628\u0647 \u062F\u0631\u0628",
    strokeLengthMm: 50,
    strokesPerMinute: 10,
    hallId: "HALL-ASSEMBLY-QC",
    location: "\u0633\u0627\u0644\u0646 \u0645\u0648\u0646\u062A\u0627\u0698 \u0648 \u06A9\u0646\u062A\u0631\u0644 \u0646\u0647\u0627\u06CC\u06CC",
    status: "ACTIVE",
    operatorName: "\u062D\u0645\u06CC\u062F \u0631\u0633\u0648\u0644\u06CC",
    isDemo: true
  }
];
var INITIAL_DIES_MOLDS = [
  {
    id: "DIE-001",
    code: "DIE-206-BRK-BLNK",
    name: "\u0642\u0627\u0644\u0628 \u0633\u0646\u0628\u0647 \u0645\u0627\u062A\u0631\u06CC\u0633 \u0628\u0644\u0646\u06A9\u06CC\u0646\u06AF \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    partId: "PRT-WIP-001",
    partCode: "WIP-206-BRK-BLNK",
    partName: "\u0628\u0644\u0646\u06A9 \u0628\u0631\u0634\u200C\u062E\u0648\u0631\u062F\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    processType: "BLANKING",
    requiredTonnage: 250,
    compatibleMachineCodes: ["PRS-250-01", "PRS-400-01"],
    strokeLifeTarget: 25e4,
    currentStrokes: 42100,
    status: "READY",
    location: "\u0642\u0641\u0633\u0647 A-12 \u0627\u0646\u0628\u0627\u0631 \u0642\u0627\u0644\u0628\u200C\u0647\u0627\u06CC \u067E\u0631\u0633",
    notes: "\u0641\u0648\u0644\u0627\u062F SPK-NL\u060C \u0622\u062E\u0631\u06CC\u0646 \u062A\u06CC\u0632\u06A9\u0627\u0631\u06CC \u062F\u0631 \u0636\u0631\u0628 \u06F4\u06F0,\u06F0\u06F0\u06F0 \u0627\u0646\u062C\u0627\u0645 \u0634\u062F\u0647",
    isDemo: true
  },
  {
    id: "DIE-002",
    code: "DIE-206-BRK-FORM",
    name: "\u0642\u0627\u0644\u0628 \u0633\u0646\u0628\u0647 \u0645\u0627\u062A\u0631\u06CC\u0633 \u0641\u0631\u0645 \u0648 \u062E\u0645\u06A9\u0627\u0631\u06CC U \u0634\u06A9\u0644 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u06F2\u06F0\u06F6",
    partId: "PRT-WIP-002",
    partCode: "WIP-206-BRK-BENT",
    partName: "\u067E\u0648\u0633\u062A\u0647 \u0641\u0631\u0645 \u0648 \u062E\u0645\u200C\u062E\u0648\u0631\u062F\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 (\u0642\u0628\u0644 \u0627\u0632 \u062C\u0648\u0634)",
    processType: "BENDING",
    requiredTonnage: 250,
    compatibleMachineCodes: ["PRS-250-01", "PRS-400-01"],
    strokeLifeTarget: 2e5,
    currentStrokes: 38200,
    status: "READY",
    location: "\u0642\u0641\u0633\u0647 A-14 \u0627\u0646\u0628\u0627\u0631 \u0642\u0627\u0644\u0628\u200C\u0647\u0627",
    notes: "\u062F\u0627\u0631\u0627\u06CC \u0641\u0646\u0631\u0647\u0627\u06CC \u0646\u06CC\u062A\u0631\u0648\u0698\u0646\u06CC (\u0646\u06CC\u062A\u0631\u0648\u0698\u0646 \u0627\u0633\u067E\u0631\u06CC\u0646\u06AF)",
    isDemo: true
  },
  {
    id: "DIE-003",
    code: "DIE-TAR-BUM-DRAW",
    name: "\u0642\u0627\u0644\u0628 \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 \u067E\u0648\u0633\u062A\u0647 \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u062A\u0627\u0631\u0627 (\u067E\u0631\u0633 \u06F8\u06F0\u06F0 \u062A\u0646)",
    partId: "PRT-WIP-004",
    partCode: "WIP-TAR-BUM-FORM",
    partName: "\u0641\u0631\u0645 \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u062A\u0627\u0631\u0627 (\u067E\u0631\u0633 \u06F8\u06F0\u06F0 \u062A\u0646)",
    processType: "DRAWING",
    requiredTonnage: 800,
    compatibleMachineCodes: ["PRS-800-01"],
    strokeLifeTarget: 3e5,
    currentStrokes: 65400,
    status: "READY",
    location: "\u0633\u0627\u0644\u0646 \u067E\u0631\u0633 \u0633\u0646\u06AF\u06CC\u0646 - \u067E\u0627\u0644\u062A \u0631\u0648\u0628\u06CC\u06A9 \u0634\u0645\u0627\u0631\u0647 \u06F4",
    notes: "\u0627\u0628\u0639\u0627\u062F \u0642\u0627\u0644\u0628 \u06F2\u06F4\u06F0\u06F0x\u06F1\u06F6\u06F0\u06F0 \u0645\u06CC\u0644\u06CC\u0645\u062A\u0631\u060C \u0645\u062C\u0647\u0632 \u0628\u0647 \u0628\u0644\u0627\u0646\u06A9\u200C\u0647\u0648\u0644\u062F\u0631 \u0647\u06CC\u062F\u0631\u0648\u0644\u06CC\u06A9",
    isDemo: true
  },
  {
    id: "DIE-004",
    code: "DIE-206-BRK-PNCH",
    name: "\u0642\u0627\u0644\u0628 \u067E\u0631\u0648\u06AF\u0631\u0633\u06CC\u0648 \u067E\u0627\u0646\u0686 \u0648 \u0633\u0648\u0631\u0627\u062E\u200C\u06A9\u0627\u0631\u06CC \u06F6 \u062D\u0641\u0631\u0647 \u067E\u06CC\u0686 M8 \u0628\u0631\u0627\u06A9\u062A \u06F2\u06F0\u06F6",
    partId: "PRT-WIP-001",
    partCode: "WIP-206-BRK-BLNK",
    partName: "\u0628\u0644\u0646\u06A9 \u0628\u0631\u0634\u200C\u062E\u0648\u0631\u062F\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    processType: "PUNCH_FORM",
    requiredTonnage: 400,
    compatibleMachineCodes: ["PRS-400-01", "PRS-250-01"],
    strokeLifeTarget: 25e4,
    currentStrokes: 51200,
    status: "READY",
    location: "\u0642\u0641\u0633\u0647 B-03 \u0627\u0646\u0628\u0627\u0631 \u0642\u0627\u0644\u0628\u200C\u0647\u0627",
    isDemo: true
  },
  {
    id: "DIE-005",
    code: "DIE-DEN-PIL-INNR",
    name: "\u0642\u0627\u0644\u0628 \u0641\u0631\u0645 \u0648 \u06A9\u0634\u0634 \u067E\u0648\u0633\u062A\u0647 \u062F\u0627\u062E\u0644\u06CC \u0633\u062A\u0648\u0646 \u0648\u0633\u0637 B-Pillar \u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    partId: "PRT-WIP-005",
    partCode: "WIP-DEN-PIL-INNR",
    partName: "\u067E\u0648\u0633\u062A\u0647 \u062F\u0627\u062E\u0644\u06CC \u067E\u0631\u0633\u200C\u0634\u062F\u0647 \u0633\u062A\u0648\u0646 \u0648\u0633\u0637 B-Pillar \u062F\u0646\u0627 \u067E\u0644\u0627\u0633",
    processType: "DRAWING",
    requiredTonnage: 800,
    compatibleMachineCodes: ["PRS-800-01"],
    strokeLifeTarget: 25e4,
    currentStrokes: 29800,
    status: "READY",
    location: "\u067E\u0627\u0644\u062A \u0642\u0627\u0644\u0628 \u0633\u0646\u06AF\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u06F7",
    isDemo: true
  },
  {
    id: "DIE-006",
    code: "JIG-206-WLD-SPT",
    name: "\u0641\u06CC\u06A9\u0633\u0686\u0631 \u062C\u0648\u0634\u06A9\u0627\u0631\u06CC \u0645\u0642\u0627\u0648\u0645\u062A\u06CC \u0627\u0633\u067E\u0627\u062A \u0648 \u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u0645\u0647\u0631\u0647 \u0628\u0631\u0627\u06A9\u062A \u06F2\u06F0\u06F6",
    partId: "PRT-FGD-001",
    partCode: "SAPCO-ASSY-206-001",
    partName: "\u0645\u062C\u0645\u0648\u0639\u0647 \u06A9\u0627\u0645\u0644 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0628\u0627 \u067E\u0648\u0634\u0634 ED \u0645\u0634\u06A9\u06CC",
    processType: "SPOT_WELD",
    requiredTonnage: 15,
    compatibleMachineCodes: ["WLD-SPT-01"],
    strokeLifeTarget: 5e5,
    currentStrokes: 74200,
    status: "READY",
    location: "\u06A9\u0646\u0627\u0631 \u062F\u0633\u062A\u06AF\u0627\u0647 \u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u06F7\u06F5kVA",
    notes: "\u067E\u06CC\u0646\u200C\u0647\u0627\u06CC \u0645\u0648\u0642\u0639\u06CC\u062A\u200C\u062F\u0647\u0646\u062F\u0647 \u062A\u0646\u06AF\u0633\u062A\u0646 \u0628\u0627 \u0645\u0642\u0627\u0648\u0645\u062A \u0633\u0627\u06CC\u0634 \u0628\u0627\u0644\u0627",
    isDemo: true
  },
  {
    id: "DIE-007",
    code: "JIG-TAR-WLD-ROB",
    name: "\u0641\u06CC\u06A9\u0633\u0686\u0631 \u062F\u0648 \u0637\u0631\u0641\u0647 \u062C\u0648\u0634\u06A9\u0627\u0631\u06CC \u0631\u0628\u0627\u062A\u06CC\u06A9 \u06A9\u0631\u0627\u0634\u200C\u0628\u0627\u06A9\u0633 \u062F\u06CC\u0627\u0642 \u062A\u0627\u0631\u0627",
    partId: "PRT-FGD-002",
    partCode: "SAPCO-ASSY-TAR-002",
    partName: "\u0645\u062C\u0645\u0648\u0639\u0647 \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u062A\u0627\u0631\u0627 \u0628\u0627 \u0628\u0631\u0627\u06A9\u062A\u200C\u0647\u0627\u06CC \u0636\u0631\u0628\u0647\u200C\u06AF\u06CC\u0631 \u06A9\u0631\u0627\u0634\u200C\u0628\u0627\u06A9\u0633",
    processType: "CO2_WELD",
    requiredTonnage: 0,
    compatibleMachineCodes: ["WLD-ROB-01"],
    strokeLifeTarget: 4e5,
    currentStrokes: 58e3,
    status: "READY",
    location: "\u062F\u0627\u062E\u0644 \u0633\u0644\u0648\u0644 \u0631\u0628\u0627\u062A \u06CC\u0627\u0633\u06A9\u0627\u0648\u0627",
    notes: "\u06A9\u0644\u0645\u067E\u200C\u0647\u0627\u06CC \u067E\u0646\u0648\u0645\u0627\u062A\u06CC\u06A9 \u0641\u0633\u062A\u0648 \u0628\u0627 \u0633\u0646\u0633\u0648\u0631 \u0645\u06AF\u0646\u062A\u06CC\u06A9 \u0627\u0644\u0642\u0627\u06CC\u06CC",
    isDemo: true
  },
  {
    id: "DIE-008",
    code: "DIE-SHH-ENG-DRAW",
    name: "\u0642\u0627\u0644\u0628 \u06A9\u0634\u0634 \u0648 \u0634\u06CC\u0627\u0631\u062F\u0627\u0631 \u0633\u06CC\u0646\u06CC \u0632\u06CC\u0631 \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646 (\u0648\u0631\u0642 \u06F2 \u0645\u06CC\u0644\u06CC\u0645\u062A\u0631)",
    partId: "PRT-WIP-008",
    partCode: "WIP-SHH-ENG-DRWN",
    partName: "\u06A9\u0634\u0634 \u0641\u0631\u0645\u200C\u06CC\u0627\u0641\u062A\u0647 \u0634\u06CC\u0627\u0631\u062F\u0627\u0631 \u0633\u06CC\u0646\u06CC \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646 (\u0642\u0628\u0644 \u0627\u0632 \u0631\u0646\u06AF)",
    processType: "DRAWING",
    requiredTonnage: 800,
    compatibleMachineCodes: ["PRS-800-01"],
    strokeLifeTarget: 2e5,
    currentStrokes: 34100,
    status: "READY",
    location: "\u0627\u0646\u0628\u0627\u0631 \u0642\u0627\u0644\u0628 \u0631\u0648\u0628\u06CC\u06A9 \u06F9",
    isDemo: true
  },
  {
    id: "DIE-009",
    code: "JIG-206-HOD-HEM",
    name: "\u0641\u06CC\u06A9\u0633\u0686\u0631 \u0647\u06CC\u062F\u0631\u0648\u0644\u06CC\u06A9 \u0647\u0650\u0645\u06CC\u0646\u06AF (\u0644\u0628\u0647\u200C\u0628\u0646\u062F\u06CC) \u062F\u0631\u0628 \u0645\u0648\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    partId: "PRT-FGD-006",
    partCode: "SAPCO-ASSY-206-006",
    partName: "\u0645\u062C\u0645\u0648\u0639\u0647 \u06A9\u0627\u0645\u0644 \u062F\u0631\u0628 \u0645\u0648\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0647\u0645\u0628\u0631\u0628\u0646\u062F\u06CC \u0634\u062F\u0647 (\u0647\u0650\u0645\u06CC\u0646\u06AF)",
    processType: "ASSEMBLY",
    requiredTonnage: 20,
    compatibleMachineCodes: ["ASM-JIG-01"],
    strokeLifeTarget: 3e5,
    currentStrokes: 18900,
    status: "READY",
    location: "\u0633\u0627\u0644\u0646 \u0645\u0648\u0646\u062A\u0627\u0698 \u0648 \u06A9\u0646\u062A\u0631\u0644 \u0646\u0647\u0627\u06CC\u06CC",
    isDemo: true
  }
];
var INITIAL_OPERATORS = [
  { id: "OPR-001", personnelCode: "EMP-101", fullName: "\u0645\u0647\u0646\u062F\u0633 \u0642\u0646\u0628\u0631\u06CC", skillProcessTypes: ["DRAWING", "BLANKING", "TRIMMING"], defaultShift: "MORNING", hallId: "HALL-HEAVY-PRESS", phone: "09121112233", active: true, isDemo: true },
  { id: "OPR-002", personnelCode: "EMP-102", fullName: "\u0627\u0633\u062A\u0627\u062F \u0627\u062D\u0645\u062F\u06CC", skillProcessTypes: ["PUNCH_FORM", "BLANKING", "BENDING"], defaultShift: "MORNING", hallId: "HALL-HEAVY-PRESS", phone: "09122223344", active: true, isDemo: true },
  { id: "OPR-003", personnelCode: "EMP-103", fullName: "\u0631\u0636\u0627 \u06A9\u0631\u06CC\u0645\u06CC", skillProcessTypes: ["BLANKING", "PUNCH_FORM", "BENDING"], defaultShift: "MORNING", hallId: "HALL-MEDIUM-PRESS", phone: "09123334455", active: true, isDemo: true },
  { id: "OPR-004", personnelCode: "EMP-104", fullName: "\u062D\u0633\u06CC\u0646 \u0645\u0631\u0627\u062F\u06CC", skillProcessTypes: ["BENDING"], defaultShift: "MORNING", hallId: "HALL-MEDIUM-PRESS", phone: "09124445566", active: true, isDemo: true },
  { id: "OPR-005", personnelCode: "EMP-105", fullName: "\u0639\u0644\u06CC \u0631\u0636\u0627\u06CC\u06CC", skillProcessTypes: ["SHEARING"], defaultShift: "MORNING", hallId: "HALL-SHEARING", phone: "09125556677", active: true, isDemo: true },
  { id: "OPR-006", personnelCode: "EMP-106", fullName: "\u0645\u0647\u0646\u062F\u0633 \u0627\u06A9\u0628\u0631\u06CC", skillProcessTypes: ["CO2_WELD"], defaultShift: "MORNING", hallId: "HALL-WELDING", phone: "09126667788", active: true, isDemo: true },
  { id: "OPR-007", personnelCode: "EMP-107", fullName: "\u0633\u0639\u06CC\u062F \u0628\u0627\u0642\u0631\u06CC", skillProcessTypes: ["SPOT_WELD"], defaultShift: "MORNING", hallId: "HALL-WELDING", phone: "09127778899", active: true, isDemo: true },
  { id: "OPR-008", personnelCode: "EMP-108", fullName: "\u0645\u0647\u0646\u062F\u0633 \u0637\u0627\u0647\u0631\u06CC", skillProcessTypes: ["PAINT"], defaultShift: "MORNING", hallId: "HALL-CATAPHORESIS", phone: "09128889900", active: true, isDemo: true },
  { id: "OPR-009", personnelCode: "EMP-109", fullName: "\u062D\u0645\u06CC\u062F \u0631\u0633\u0648\u0644\u06CC", skillProcessTypes: ["ASSEMBLY"], defaultShift: "MORNING", hallId: "HALL-ASSEMBLY-QC", phone: "09129990011", active: true, isDemo: true },
  { id: "OPR-010", personnelCode: "EMP-110", fullName: "\u062D\u0633\u06CC\u0646 \u0633\u0644\u06CC\u0645\u0627\u0646\u06CC", skillProcessTypes: ["SHEARING"], defaultShift: "MORNING", hallId: "HALL-RAW-STORE", phone: "09120001122", active: true, isDemo: true }
];
var INITIAL_ROUTINGS = [
  {
    id: "RTG-001",
    partId: "PRT-FGD-001",
    partCode: "SAPCO-ASSY-206-001",
    partName: "\u0645\u062C\u0645\u0648\u0639\u0647 \u06A9\u0627\u0645\u0644 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0628\u0627 \u067E\u0648\u0634\u0634 ED \u0645\u0634\u06A9\u06CC",
    version: "V2.1",
    operations: [
      {
        stepNumber: 10,
        stepCode: "OP10_SLIT",
        stepName: "\u0646\u0648\u0627\u0631\u0628\u0631\u06CC \u0648 \u0635\u0627\u0641\u200C\u06A9\u0631\u062F\u0646 \u0631\u0648\u0644 \u0648\u0631\u0642 ST14 \u0633\u0627\u067E\u06A9\u0648",
        processType: "SHEARING",
        machineId: "MCH-006",
        machineName: "\u062E\u0637 \u0631\u0648\u0644\u200C\u0628\u0627\u0632\u06A9\u0646 \u0648 \u0646\u0648\u0627\u0631\u0628\u0631",
        standardCycleTimeSec: 12,
        scrapNormPercent: 0.8,
        description: "\u0628\u0631\u0634 \u062A\u0633\u0645\u0647 \u0628\u0647 \u0639\u0631\u0636 \u06F2\u06F4\u06F0 \u0645\u06CC\u0644\u06CC\u0645\u062A\u0631 \u0628\u0627 \u062A\u0644\u0631\u0627\u0646\u0633 \xB10.5mm"
      },
      {
        stepNumber: 20,
        stepCode: "OP20_BLNK",
        stepName: "\u0628\u0644\u0646\u06A9\u06CC\u0646\u06AF \u0648 \u0628\u0631\u0634 \u0641\u0631\u0645 \u0627\u0648\u0644\u06CC\u0647 \u062F\u0631 \u0642\u0627\u0644\u0628 \u0633\u0646\u0628\u0647 \u0645\u0627\u062A\u0631\u06CC\u0633",
        processType: "BLANKING",
        machineId: "MCH-003",
        machineName: "\u067E\u0631\u0633 \u06F2\u06F5\u06F0 \u062A\u0646",
        standardCycleTimeSec: 8,
        scrapNormPercent: 1.2,
        description: "\u067E\u0631\u0633 \u0636\u0631\u0628\u0647\u200C\u0627\u06CC\u060C \u062E\u0631\u0648\u062C \u0628\u0644\u0646\u06A9 \u062A\u062E\u062A \u0628\u0627 \u067E\u0644\u06CC\u0633\u0647\u200C\u06AF\u06CC\u0631\u06CC"
      },
      {
        stepNumber: 30,
        stepCode: "OP30_PNCH",
        stepName: "\u0633\u0648\u0631\u0627\u062E\u200C\u06A9\u0627\u0631\u06CC \u0648 \u067E\u0627\u0646\u0686 \u0634\u06CC\u0627\u0631\u0647\u0627\u06CC \u0645\u0648\u0646\u062A\u0627\u0698\u06CC \u0648 \u0631\u0627\u0647\u0646\u0645\u0627",
        processType: "PUNCH_FORM",
        machineId: "MCH-002",
        machineName: "\u067E\u0631\u0633 \u0634\u0648\u0644\u0631 \u06F4\u06F0\u06F0 \u062A\u0646",
        standardCycleTimeSec: 9,
        scrapNormPercent: 0.9,
        description: "\u067E\u0627\u0646\u0686 \u06F6 \u0633\u0648\u0631\u0627\u062E \u0648 \u062C\u0627\u06CC \u067E\u06CC\u0686 M8"
      },
      {
        stepNumber: 40,
        stepCode: "OP40_BEND",
        stepName: "\u062E\u0645\u200C\u06A9\u0627\u0631\u06CC U \u0634\u06A9\u0644 \u0648 \u0641\u0644\u0646\u062C\u06CC\u0646\u06AF \u0644\u0628\u0647\u200C\u0647\u0627",
        processType: "BENDING",
        machineId: "MCH-004",
        machineName: "\u067E\u0631\u0633 \u0628\u0631\u06A9 CNC",
        standardCycleTimeSec: 18,
        scrapNormPercent: 1.5,
        description: "\u062E\u0645 \u06F9\u06F0 \u062F\u0631\u062C\u0647 \u0628\u0627 \u0632\u0627\u0648\u06CC\u0647 \u062E\u0645\u0634 \u06A9\u0646\u062A\u0631\u0644\u200C\u0634\u062F\u0647"
      },
      {
        stepNumber: 50,
        stepCode: "OP50_WELD_SPT",
        stepName: "\u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u0645\u0642\u0627\u0648\u0645\u062A\u06CC \u0645\u0647\u0631\u0647\u200C\u0647\u0627\u06CC \u0634\u0634\u200C\u06AF\u0648\u0634 M8 \u0648 \u0644\u0686\u06A9\u06CC",
        processType: "SPOT_WELD",
        machineId: "MCH-008",
        machineName: "\u062F\u0633\u062A\u06AF\u0627\u0647 \u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u06F7\u06F5kVA",
        standardCycleTimeSec: 14,
        scrapNormPercent: 0.6,
        description: "\u062A\u0633\u062A \u067E\u06CC\u0686\u0634 \u0645\u0647\u0631\u0647 \u062D\u062F\u0627\u0642\u0644 45 N.m \u0637\u0628\u0642 \u0627\u0644\u0632\u0627\u0645 \u0633\u0627\u067E\u06A9\u0648"
      },
      {
        stepNumber: 60,
        stepCode: "OP60_WELD_CO2",
        stepName: "\u062C\u0648\u0634\u06A9\u0627\u0631\u06CC \u062A\u06A9\u0645\u06CC\u0644\u06CC CO2 \u0644\u0686\u06A9\u06CC \u062A\u0642\u0648\u06CC\u062A\u06CC \u0631\u0627\u0633\u062A \u0648 \u0686\u067E",
        processType: "CO2_WELD",
        machineId: "MCH-007",
        machineName: "\u0633\u0644\u0648\u0644 \u0631\u0628\u0627\u062A\u06CC\u06A9 \u06CC\u0627\u0633\u06A9\u0627\u0648\u0627",
        standardCycleTimeSec: 22,
        scrapNormPercent: 1.1,
        description: "\u062E\u0637 \u062C\u0648\u0634 \u0645\u0645\u062A\u062F \u0628\u0647 \u0637\u0648\u0644 \u06F3\u06F5 \u0645\u06CC\u0644\u06CC\u0645\u062A\u0631 \u0628\u062F\u0648\u0646 \u062D\u0628\u0627\u0628 \u0648 \u067E\u0627\u0634\u0634"
      },
      {
        stepNumber: 70,
        stepCode: "OP70_ED_PNT",
        stepName: "\u0634\u0633\u062A\u0634\u0648\u060C \u0686\u0631\u0628\u06CC\u200C\u0632\u062F\u0627\u06CC\u06CC\u060C \u0641\u0633\u0641\u0627\u062A\u0647 \u0648 \u067E\u0648\u0634\u0634 \u0631\u0646\u06AF \u06A9\u0627\u062A\u0627\u0641\u0648\u0631\u0632 ED",
        processType: "PAINT",
        machineId: "MCH-009",
        machineName: "\u062E\u0637 \u0631\u0646\u06AF \u0627\u0644\u06A9\u062A\u0631\u0648\u0641\u0648\u0631\u0632",
        standardCycleTimeSec: 45,
        scrapNormPercent: 0.5,
        description: "\u0636\u062E\u0627\u0645\u062A \u0631\u0646\u06AF \u06F2\u06F0 \u0627\u0644\u06CC \u06F2\u06F5 \u0645\u06CC\u06A9\u0631\u0648\u0646 \u0648 \u0645\u0642\u0627\u0648\u0645\u062A \u0633\u0627\u0644\u062A \u0627\u0633\u067E\u0631\u06CC \u06F5\u06F0\u06F0 \u0633\u0627\u0639\u062A"
      },
      {
        stepNumber: 80,
        stepCode: "OP80_ASSY_QC",
        stepName: "\u06A9\u0646\u062A\u0631\u0644 \u0627\u0628\u0639\u0627\u062F\u06CC \u0646\u0647\u0627\u06CC\u06CC \u0628\u0627 \u0641\u06CC\u06A9\u0633\u0686\u0631 \u06A9\u0646\u062A\u0631\u0644\u06CC \u0648 \u0628\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u062F\u0631 \u0628\u0627\u06A9\u0633 \u067E\u0627\u0644\u062A",
        processType: "ASSEMBLY",
        machineId: "MCH-010",
        machineName: "\u062C\u06CC\u06AF \u0648 \u0641\u06CC\u06A9\u0633\u0686\u0631 \u0645\u0648\u0646\u062A\u0627\u0698",
        standardCycleTimeSec: 15,
        scrapNormPercent: 0.3,
        description: "\u062A\u0623\u06CC\u06CC\u062F \u0628\u0631\u0686\u0633\u0628 \u0631\u062F\u06CC\u0627\u0628\u06CC \u0628\u0627\u0631\u06A9\u062F\u062F\u0627\u0631 \u0633\u0627\u067E\u06A9\u0648"
      }
    ],
    isDemo: true
  },
  {
    id: "RTG-002",
    partId: "PRT-FGD-002",
    partCode: "SAPCO-ASSY-TAR-002",
    partName: "\u0645\u062C\u0645\u0648\u0639\u0647 \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u062A\u0627\u0631\u0627 \u0628\u0627 \u0628\u0631\u0627\u06A9\u062A\u200C\u0647\u0627\u06CC \u0636\u0631\u0628\u0647\u200C\u06AF\u06CC\u0631 \u06A9\u0631\u0627\u0634\u200C\u0628\u0627\u06A9\u0633",
    version: "V1.4",
    operations: [
      {
        stepNumber: 10,
        stepCode: "OP10_SHEAR",
        stepName: "\u0628\u0631\u0634 \u0634\u06CC\u062A \u0628\u0647 \u0627\u0628\u0639\u0627\u062F \u062F\u0642\u06CC\u0642 \u0628\u0644\u0646\u06A9 \u062F\u06CC\u0627\u0642",
        processType: "SHEARING",
        machineId: "MCH-005",
        machineName: "\u0642\u06CC\u0686\u06CC \u06AF\u06CC\u0648\u062A\u06CC\u0646 \u06F6mm",
        standardCycleTimeSec: 15,
        scrapNormPercent: 0.9
      },
      {
        stepNumber: 20,
        stepCode: "OP20_DRAW",
        stepName: "\u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 \u0641\u0631\u0645 \u0622\u06CC\u0631\u0648\u062F\u06CC\u0646\u0627\u0645\u06CC\u06A9 \u062F\u06CC\u0627\u0642 \u062F\u0631 \u067E\u0631\u0633 \u0647\u06CC\u062F\u0631\u0648\u0644\u06CC\u06A9 \u06F8\u06F0\u06F0 \u062A\u0646",
        processType: "BLANKING",
        machineId: "MCH-001",
        machineName: "\u067E\u0631\u0633 \u06F8\u06F0\u06F0 \u062A\u0646",
        standardCycleTimeSec: 24,
        scrapNormPercent: 2.2
      },
      {
        stepNumber: 30,
        stepCode: "OP30_TRIM",
        stepName: "\u062F\u0648\u0631\u0628\u0631\u06CC \u0644\u0628\u0647\u200C\u0647\u0627\u06CC \u0627\u0636\u0627\u0641\u06CC \u0648 \u067E\u06CC\u0631\u0633\u06CC\u0646\u06AF \u0633\u0648\u0631\u0627\u062E\u200C\u0647\u0627\u06CC \u0633\u0646\u0633\u0648\u0631",
        processType: "PUNCH_FORM",
        machineId: "MCH-002",
        machineName: "\u067E\u0631\u0633 \u0634\u0648\u0644\u0631 \u06F4\u06F0\u06F0 \u062A\u0646",
        standardCycleTimeSec: 14,
        scrapNormPercent: 1
      },
      {
        stepNumber: 40,
        stepCode: "OP40_WELD",
        stepName: "\u062C\u0648\u0634 \u0631\u0628\u0627\u062A\u06CC\u06A9 \u06A9\u0631\u0627\u0634\u200C\u0628\u0627\u06A9\u0633\u200C\u0647\u0627\u06CC \u0622\u06A9\u0627\u0631\u062F\u0626\u0648\u0646\u06CC \u0686\u067E \u0648 \u0631\u0627\u0633\u062A",
        processType: "CO2_WELD",
        machineId: "MCH-007",
        machineName: "\u0633\u0644\u0648\u0644 \u0631\u0628\u0627\u062A\u06CC\u06A9 \u06CC\u0627\u0633\u06A9\u0627\u0648\u0627",
        standardCycleTimeSec: 35,
        scrapNormPercent: 1.3
      },
      {
        stepNumber: 50,
        stepCode: "OP50_PAINT",
        stepName: "\u067E\u0648\u0634\u0634 \u06A9\u0627\u062A\u0627\u0641\u0648\u0631\u0632 \u0636\u062F\u062E\u0648\u0631\u062F\u06AF\u06CC",
        processType: "PAINT",
        machineId: "MCH-009",
        machineName: "\u062E\u0637 \u0631\u0646\u06AF \u0627\u0644\u06A9\u062A\u0631\u0648\u0641\u0648\u0631\u0632",
        standardCycleTimeSec: 50,
        scrapNormPercent: 0.4
      }
    ],
    isDemo: true
  }
];
var INITIAL_TRANSACTIONS = [
  // 1. Opening Balance for SAPCO Steel Coils (KG)
  {
    id: "TX-001",
    voucherNumber: "OB-1405-001",
    voucherType: "OPENING_BALANCE",
    partId: "PRT-RAW-001",
    partCode: "SAPCO-COIL-DC04-0.8",
    partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 DC04 \u0636\u062E\u0627\u0645\u062A 0.8mm \u0633\u0627\u067E\u06A9\u0648",
    stageId: "STAGE_RAW_STORE",
    stageName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0648\u0627\u062F \u0627\u0648\u0644\u06CC\u0647 \u0633\u0627\u067E\u06A9\u0648",
    quantity: 14500,
    unit: "KG",
    quantityKg: 14500,
    referenceDoc: "\u0627\u0646\u0628\u0627\u0631\u06AF\u0631\u062F\u0627\u0646\u06CC \u0627\u0628\u062A\u062F\u0627\u06CC \u062F\u0648\u0631\u0647 \u06F1\u06F4\u06F0\u06F5",
    operatorName: "\u0645\u0647\u0646\u062F\u0633 \u0631\u0636\u0627\u06CC\u06CC",
    shift: "MORNING",
    status: "CONFIRMED",
    notes: "\u062A\u0623\u06CC\u06CC\u062F \u062D\u0633\u0627\u0628\u0631\u0633\u06CC \u0645\u0648\u062C\u0648\u062F\u06CC \u0641\u0648\u0644\u0627\u062F \u062E\u0627\u0645",
    isDemo: true,
    createdAt: "2026-10-25T08:00:00Z"
  },
  {
    id: "TX-002",
    voucherNumber: "OB-1405-002",
    voucherType: "OPENING_BALANCE",
    partId: "PRT-RAW-002",
    partCode: "SAPCO-COIL-ST14-1.0",
    partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC ST14 \u0636\u062E\u0627\u0645\u062A 1.0mm \u0641\u0648\u0644\u0627\u062F \u0645\u0628\u0627\u0631\u06A9\u0647 / \u0633\u0627\u067E\u06A9\u0648",
    stageId: "STAGE_RAW_STORE",
    stageName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0648\u0627\u062F \u0627\u0648\u0644\u06CC\u0647 \u0633\u0627\u067E\u06A9\u0648",
    quantity: 18200,
    unit: "KG",
    quantityKg: 18200,
    referenceDoc: "\u0627\u0646\u0628\u0627\u0631\u06AF\u0631\u062F\u0627\u0646\u06CC \u0627\u0628\u062A\u062F\u0627\u06CC \u062F\u0648\u0631\u0647 \u06F1\u06F4\u06F0\u06F5",
    operatorName: "\u0645\u0647\u0646\u062F\u0633 \u0631\u0636\u0627\u06CC\u06CC",
    shift: "MORNING",
    status: "CONFIRMED",
    isDemo: true,
    createdAt: "2026-10-25T08:15:00Z"
  },
  {
    id: "TX-003",
    voucherNumber: "OB-1405-003",
    voucherType: "OPENING_BALANCE",
    partId: "PRT-RAW-003",
    partCode: "SAPCO-COIL-DX51-1.2",
    partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u06AF\u0627\u0644\u0648\u0627\u0646\u06CC\u0632\u0647 \u0636\u062F\u062E\u0648\u0631\u062F\u06AF\u06CC DX51D \u0636\u062E\u0627\u0645\u062A 1.2mm \u0633\u0627\u067E\u06A9\u0648",
    stageId: "STAGE_RAW_STORE",
    stageName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0648\u0627\u062F \u0627\u0648\u0644\u06CC\u0647 \u0633\u0627\u067E\u06A9\u0648",
    quantity: 9800,
    unit: "KG",
    quantityKg: 9800,
    referenceDoc: "\u0627\u0646\u0628\u0627\u0631\u06AF\u0631\u062F\u0627\u0646\u06CC \u0627\u0628\u062A\u062F\u0627\u06CC \u062F\u0648\u0631\u0647 \u06F1\u06F4\u06F0\u06F5",
    operatorName: "\u0645\u0647\u0646\u062F\u0633 \u0631\u0636\u0627\u06CC\u06CC",
    shift: "MORNING",
    status: "CONFIRMED",
    isDemo: true,
    createdAt: "2026-10-25T08:30:00Z"
  },
  // 2. Receipt Voucher from SAPCO Inward Consignment (رسید ورود مواد اولیه ساپکو)
  {
    id: "TX-004",
    voucherNumber: "RC-1405-010",
    voucherType: "RECEIPT",
    partId: "PRT-RAW-001",
    partCode: "SAPCO-COIL-DC04-0.8",
    partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 DC04 \u0636\u062E\u0627\u0645\u062A 0.8mm \u0633\u0627\u067E\u06A9\u0648",
    stageId: "STAGE_RAW_STORE",
    stageName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0648\u0627\u062F \u0627\u0648\u0644\u06CC\u0647 \u0633\u0627\u067E\u06A9\u0648",
    quantity: 8450,
    unit: "KG",
    quantityKg: 8450,
    referenceDoc: "\u0628\u0627\u0631\u0646\u0627\u0645\u0647 \u0633\u0627\u067E\u06A9\u0648 \u0634\u0645\u0627\u0631\u0647 \u06F9\u06F8\u06F2\u06F4\u06F1\u06F5-\u062A",
    operatorName: "\u062D\u0633\u06CC\u0646 \u0633\u0644\u06CC\u0645\u0627\u0646\u06CC (\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631)",
    shift: "MORNING",
    status: "CONFIRMED",
    notes: "\u0648\u0631\u0648\u062F \u062A\u0631\u06CC\u0644\u06CC \u062D\u0627\u0645\u0644 \u06F2 \u06A9\u0644\u0627\u0641 \u06A9\u0648\u06CC\u0644 \u0641\u0648\u0644\u0627\u062F \u0645\u0628\u0627\u0631\u06A9\u0647 \u062A\u0627\u06CC\u06CC\u062F\u06CC\u0647 QC \u067E\u0627\u0633 \u0634\u062F",
    isDemo: true,
    createdAt: "2026-10-26T09:10:00Z"
  },
  // 3. Issue Voucher from Raw Steel Store to Shearing Shopfloor (حواله مصرف ورق به خط برش)
  {
    id: "TX-005",
    voucherNumber: "IS-1405-021",
    voucherType: "ISSUE",
    partId: "PRT-RAW-001",
    partCode: "SAPCO-COIL-DC04-0.8",
    partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 DC04 \u0636\u062E\u0627\u0645\u062A 0.8mm \u0633\u0627\u067E\u06A9\u0648",
    stageId: "STAGE_RAW_STORE",
    stageName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0648\u0627\u062F \u0627\u0648\u0644\u06CC\u0647 \u0633\u0627\u067E\u06A9\u0648",
    targetStageId: "STAGE_SHEARING",
    targetStageName: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F1: \u0628\u0631\u0634 \u0648 \u0646\u0648\u0627\u0631\u0628\u0631\u06CC \u0648\u0631\u0642",
    quantity: 1200,
    unit: "KG",
    quantityKg: 1200,
    referenceDoc: "\u062F\u0633\u062A\u0648\u0631 \u06A9\u0627\u0631 \u062A\u0648\u0644\u06CC\u062F\u06CC WO-7701",
    operatorName: "\u0639\u0644\u06CC \u0631\u0636\u0627\u06CC\u06CC",
    shift: "MORNING",
    status: "CONFIRMED",
    notes: "\u062A\u062E\u0635\u06CC\u0635 \u06CC\u06A9 \u06A9\u0644\u0627\u0641 \u0646\u0648\u0627\u0631\u0628\u0631\u06CC \u062C\u0647\u062A \u062A\u0648\u0644\u06CC\u062F \u06F1\u06F8\u06F0\u06F0 \u0639\u062F\u062F \u0628\u0644\u0646\u06A9 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    isDemo: true,
    createdAt: "2026-10-26T10:30:00Z"
  },
  // 4. Production Output of Good blanks in Shearing Station (ثبت تولید سالم)
  {
    id: "TX-006",
    voucherNumber: "PR-1405-031",
    voucherType: "PRODUCTION_OUTPUT",
    partId: "PRT-WIP-001",
    partCode: "WIP-206-BRK-BLNK",
    partName: "\u0628\u0644\u0646\u06A9 \u0628\u0631\u0634\u200C\u062E\u0648\u0631\u062F\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    stageId: "STAGE_SHEARING",
    stageName: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F1: \u0628\u0631\u0634 \u0648 \u0646\u0648\u0627\u0631\u0628\u0631\u06CC \u0648\u0631\u0642",
    quantity: 1800,
    unit: "PCS",
    quantityKg: 1170,
    // 1800 * 0.65 kg
    referenceDoc: "\u0628\u0631\u06AF\u0647 \u0634\u06CC\u0641\u062A \u0635\u0628\u062D \u067E\u0631\u0633 \u0648 \u0628\u0631\u0634",
    operatorName: "\u0639\u0644\u06CC \u0631\u0636\u0627\u06CC\u06CC",
    machineId: "MCH-006",
    shift: "MORNING",
    status: "CONFIRMED",
    notes: "\u062A\u0648\u0644\u06CC\u062F \u0634\u06CC\u0641\u062A \u0635\u0628\u062D \u0628\u0627 \u0627\u0628\u0639\u0627\u062F \u06F2\u06F4\u06F0x\u06F1\u06F8\u06F0 \u0645\u06CC\u0644\u06CC\u0645\u062A\u0631",
    isDemo: true,
    createdAt: "2026-10-26T13:45:00Z"
  },
  // 5. Scrap recording in Shearing Station (ثبت ضایعات)
  {
    id: "TX-007",
    voucherNumber: "SC-1405-041",
    voucherType: "SCRAP",
    partId: "PRT-WIP-001",
    partCode: "WIP-206-BRK-BLNK",
    partName: "\u0628\u0644\u0646\u06A9 \u0628\u0631\u0634\u200C\u062E\u0648\u0631\u062F\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    stageId: "STAGE_SHEARING",
    stageName: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F1: \u0628\u0631\u0634 \u0648 \u0646\u0648\u0627\u0631\u0628\u0631\u06CC \u0648\u0631\u0642",
    quantity: 45,
    unit: "PCS",
    quantityKg: 29.25,
    referenceDoc: "\u06AF\u0632\u0627\u0631\u0634 \u06A9\u0646\u062A\u0631\u0644 \u06A9\u06CC\u0641\u06CC\u062A QC-409",
    operatorName: "\u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC (\u0628\u0627\u0632\u0631\u0633 QC)",
    shift: "MORNING",
    scrapReason: "\u0627\u0646\u062D\u0631\u0627\u0641 \u0627\u0628\u0639\u0627\u062F\u06CC \u0633\u0648\u0631\u0627\u062E \u067E\u0627\u0646\u0686 \u0648 \u067E\u0644\u06CC\u0633\u0647 \u0628\u06CC\u0634 \u0627\u0632 \u062D\u062F",
    status: "CONFIRMED",
    notes: "\u0636\u0627\u06CC\u0639\u0627\u062A \u0644\u0628\u0647 \u06A9\u0644\u0627\u0641 \u0627\u0628\u062A\u062F\u0627\u06CC\u06CC\u060C \u0627\u0646\u062A\u0642\u0627\u0644 \u0628\u0647 \u0627\u0646\u0628\u0627\u0631 \u0636\u0627\u06CC\u0639\u0627\u062A",
    isDemo: true,
    createdAt: "2026-10-26T14:10:00Z"
  },
  // 6. Inter-Stage WIP Transfer: Dispatch from Shearing -> Blanking (ثبت ارسال قطعه بین مراحل)
  {
    id: "TX-008",
    voucherNumber: "TD-1405-051",
    voucherType: "WIP_TRANSFER_DISPATCH",
    partId: "PRT-WIP-001",
    partCode: "WIP-206-BRK-BLNK",
    partName: "\u0628\u0644\u0646\u06A9 \u0628\u0631\u0634\u200C\u062E\u0648\u0631\u062F\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    stageId: "STAGE_SHEARING",
    stageName: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F1: \u0628\u0631\u0634 \u0648 \u0646\u0648\u0627\u0631\u0628\u0631\u06CC \u0648\u0631\u0642",
    targetStageId: "STAGE_BLANKING",
    targetStageName: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F2: \u067E\u0631\u0633 \u0628\u0644\u0646\u06A9\u06CC\u0646\u06AF",
    quantity: 1200,
    unit: "PCS",
    quantityKg: 780,
    referenceDoc: "\u06A9\u0627\u0631\u062A \u0647\u0645\u0631\u0627\u0647 \u0642\u0637\u0639\u0647 (\u06A9\u0627\u0646\u0628\u0627\u0646) \u0634\u0645\u0627\u0631\u0647 KNB-881",
    operatorName: "\u0639\u0644\u06CC \u0631\u0636\u0627\u06CC\u06CC",
    shift: "MORNING",
    status: "CONFIRMED",
    notes: "\u0628\u0627\u0631\u06AF\u06CC\u0631\u06CC \u062F\u0631 \u06F2 \u0639\u062F\u062F \u067E\u0627\u0644\u062A \u0686\u0631\u062E\u200C\u062F\u0627\u0631 \u0648 \u0627\u0631\u0633\u0627\u0644 \u0628\u0647 \u0633\u0627\u0644\u0646 \u067E\u0631\u0633",
    isDemo: true,
    createdAt: "2026-10-27T08:20:00Z"
  },
  // 7. Inter-Stage WIP Transfer: Receipt at Blanking Stage (تأیید تحویل در ایستگاه پرس ۲۵۰ تن)
  {
    id: "TX-009",
    voucherNumber: "TR-1405-052",
    voucherType: "WIP_TRANSFER_RECEIPT",
    partId: "PRT-WIP-001",
    partCode: "WIP-206-BRK-BLNK",
    partName: "\u0628\u0644\u0646\u06A9 \u0628\u0631\u0634\u200C\u062E\u0648\u0631\u062F\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6",
    stageId: "STAGE_BLANKING",
    stageName: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F2: \u067E\u0631\u0633 \u0628\u0644\u0646\u06A9\u06CC\u0646\u06AF",
    targetStageId: "STAGE_BLANKING",
    targetStageName: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F2: \u067E\u0631\u0633 \u0628\u0644\u0646\u06A9\u06CC\u0646\u06AF",
    quantity: 1200,
    unit: "PCS",
    quantityKg: 780,
    referenceDoc: "\u0631\u0633\u06CC\u062F \u06A9\u0627\u0646\u0628\u0627\u0646 KNB-881",
    operatorName: "\u0631\u0636\u0627 \u06A9\u0631\u06CC\u0645\u06CC (\u0627\u067E\u0631\u0627\u062A\u0648\u0631 \u067E\u0631\u0633 \u06F2\u06F5\u06F0 \u062A\u0646)",
    shift: "MORNING",
    status: "CONFIRMED",
    notes: "\u062A\u062D\u0648\u06CC\u0644 \u0628\u0627 \u0634\u0645\u0627\u0631\u0634 \u0648 \u0628\u0631\u0631\u0633\u06CC \u0638\u0627\u0647\u0631\u06CC \u06F1\u06F2\u06F0\u06F0 \u0639\u062F\u062F \u0628\u0644\u0646\u06A9 \u0633\u0627\u0644\u0645",
    isDemo: true,
    createdAt: "2026-10-27T08:50:00Z"
  },
  // 8. Forming & Blanking Output (تولید قطعه فرم‌خورده)
  {
    id: "TX-010",
    voucherNumber: "PR-1405-061",
    voucherType: "PRODUCTION_OUTPUT",
    partId: "PRT-WIP-002",
    partCode: "WIP-206-BRK-BENT",
    partName: "\u067E\u0648\u0633\u062A\u0647 \u0641\u0631\u0645 \u0648 \u062E\u0645\u200C\u062E\u0648\u0631\u062F\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 (\u0642\u0628\u0644 \u0627\u0632 \u062C\u0648\u0634)",
    stageId: "STAGE_BLANKING",
    stageName: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F2: \u067E\u0631\u0633 \u0628\u0644\u0646\u06A9\u06CC\u0646\u06AF",
    quantity: 1150,
    unit: "PCS",
    quantityKg: 747.5,
    referenceDoc: "\u0628\u0631\u06AF\u0647 \u062A\u0648\u0644\u06CC\u062F \u0631\u0648\u0632\u0627\u0646\u0647 \u067E\u0631\u0633 \u06F2\u06F5\u06F0 \u062A\u0646",
    operatorName: "\u0631\u0636\u0627 \u06A9\u0631\u06CC\u0645\u06CC",
    machineId: "MCH-003",
    shift: "MORNING",
    status: "CONFIRMED",
    notes: "\u0639\u0645\u0644\u06CC\u0627\u062A \u0633\u0646\u0628\u0647 \u0645\u0627\u062A\u0631\u06CC\u0633 \u0648 \u067E\u0627\u0646\u0686 \u0641\u0631\u0645",
    isDemo: true,
    createdAt: "2026-10-27T12:00:00Z"
  },
  // 9. Scrap in Blanking Stage (ضایعات پرس)
  {
    id: "TX-011",
    voucherNumber: "SC-1405-062",
    voucherType: "SCRAP",
    partId: "PRT-WIP-002",
    partCode: "WIP-206-BRK-BENT",
    partName: "\u067E\u0648\u0633\u062A\u0647 \u0641\u0631\u0645 \u0648 \u062E\u0645\u200C\u062E\u0648\u0631\u062F\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 (\u0642\u0628\u0644 \u0627\u0632 \u062C\u0648\u0634)",
    stageId: "STAGE_BLANKING",
    stageName: "\u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06F2: \u067E\u0631\u0633 \u0628\u0644\u0646\u06A9\u06CC\u0646\u06AF",
    quantity: 25,
    unit: "PCS",
    quantityKg: 16.25,
    referenceDoc: "QC-REJ-102",
    operatorName: "\u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC",
    shift: "MORNING",
    scrapReason: "\u0686\u0631\u0648\u06A9\u06CC\u062F\u06AF\u06CC \u0648\u0631\u0642 \u062F\u0631 \u0634\u0639\u0627\u0639 \u062E\u0645",
    status: "CONFIRMED",
    isDemo: true,
    createdAt: "2026-10-27T12:30:00Z"
  },
  // 10. Opening stock of Finished Goods (موجودی اولیه قطعات آماده ارسال در انبار محصول)
  {
    id: "TX-012",
    voucherNumber: "OB-1405-070",
    voucherType: "OPENING_BALANCE",
    partId: "PRT-FGD-001",
    partCode: "SAPCO-ASSY-206-001",
    partName: "\u0645\u062C\u0645\u0648\u0639\u0647 \u06A9\u0627\u0645\u0644 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0628\u0627 \u067E\u0648\u0634\u0634 ED \u0645\u0634\u06A9\u06CC",
    stageId: "STAGE_FINISHED_STORE",
    stageName: "\u0627\u0646\u0628\u0627\u0631 \u0642\u0637\u0639\u0627\u062A \u0648 \u0645\u062D\u0635\u0648\u0644\u0627\u062A \u0646\u0647\u0627\u06CC\u06CC",
    quantity: 850,
    unit: "PCS",
    quantityKg: 833,
    referenceDoc: "\u062A\u0623\u06CC\u06CC\u062F\u06CC\u0647 \u062A\u062D\u0648\u06CC\u0644\u200C\u06AF\u06CC\u0631\u06CC \u0627\u0646\u0628\u0627\u0631 \u0645\u062D\u0635\u0648\u0644",
    operatorName: "\u062D\u0633\u06CC\u0646 \u0633\u0644\u06CC\u0645\u0627\u0646\u06CC",
    shift: "MORNING",
    status: "CONFIRMED",
    notes: "\u0622\u0645\u0627\u062F\u0647 \u0627\u0631\u0633\u0627\u0644 \u0628\u0647 \u062E\u0637 \u0645\u0648\u0646\u062A\u0627\u0698 \u0627\u06CC\u0631\u0627\u0646\u200C\u062E\u0648\u062F\u0631\u0648",
    isDemo: true,
    createdAt: "2026-10-25T08:00:00Z"
  },
  {
    id: "TX-013",
    voucherNumber: "OB-1405-071",
    voucherType: "OPENING_BALANCE",
    partId: "PRT-FGD-002",
    partCode: "SAPCO-ASSY-TAR-002",
    partName: "\u0645\u062C\u0645\u0648\u0639\u0647 \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u062A\u0627\u0631\u0627 \u0628\u0627 \u0628\u0631\u0627\u06A9\u062A\u200C\u0647\u0627\u06CC \u0636\u0631\u0628\u0647\u200C\u06AF\u06CC\u0631 \u06A9\u0631\u0627\u0634\u200C\u0628\u0627\u06A9\u0633",
    stageId: "STAGE_FINISHED_STORE",
    stageName: "\u0627\u0646\u0628\u0627\u0631 \u0642\u0637\u0639\u0627\u062A \u0648 \u0645\u062D\u0635\u0648\u0644\u0627\u062A \u0646\u0647\u0627\u06CC\u06CC",
    quantity: 420,
    unit: "PCS",
    quantityKg: 1302,
    referenceDoc: "\u062A\u0623\u06CC\u06CC\u062F\u06CC\u0647 \u062A\u062D\u0648\u06CC\u0644\u200C\u06AF\u06CC\u0631\u06CC \u0627\u0646\u0628\u0627\u0631 \u0645\u062D\u0635\u0648\u0644",
    operatorName: "\u062D\u0633\u06CC\u0646 \u0633\u0644\u06CC\u0645\u0627\u0646\u06CC",
    shift: "MORNING",
    status: "CONFIRMED",
    isDemo: true,
    createdAt: "2026-10-25T08:00:00Z"
  },
  {
    id: "TX-014",
    voucherNumber: "OB-1405-072",
    voucherType: "OPENING_BALANCE",
    partId: "PRT-FGD-004",
    partCode: "SAPCO-ASSY-SHH-004",
    partName: "\u0633\u06CC\u0646\u06CC \u0645\u062D\u0627\u0641\u0638 \u0641\u0644\u0632\u06CC \u0632\u06CC\u0631 \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646 \u067E\u0648\u0634\u0634\u200C\u062F\u0627\u0631 \u0628\u0627 \u067E\u06CC\u0686\u200C\u0647\u0627\u06CC \u0646\u0635\u0628",
    stageId: "STAGE_FINISHED_STORE",
    stageName: "\u0627\u0646\u0628\u0627\u0631 \u0642\u0637\u0639\u0627\u062A \u0648 \u0645\u062D\u0635\u0648\u0644\u0627\u062A \u0646\u0647\u0627\u06CC\u06CC",
    quantity: 310,
    unit: "PCS",
    quantityKg: 1131.5,
    referenceDoc: "\u0633\u0646\u062F \u0627\u0646\u0628\u0627\u0631\u06AF\u0631\u062F\u0627\u0646\u06CC",
    operatorName: "\u062D\u0633\u06CC\u0646 \u0633\u0644\u06CC\u0645\u0627\u0646\u06CC",
    shift: "MORNING",
    status: "CONFIRMED",
    isDemo: true,
    createdAt: "2026-10-25T08:00:00Z"
  }
];
var INITIAL_PRODUCTION_PLANS = [
  {
    id: "PLN-001",
    planNumber: "PLN-1403-08-01",
    title: "\u0628\u0631\u0646\u0627\u0645\u0647 \u062A\u0648\u0644\u06CC\u062F \u0647\u0641\u062A\u06AF\u06CC \u0645\u062C\u0645\u0648\u0639\u0647 \u06A9\u0627\u0645\u0644 \u0628\u0631\u0627\u06A9\u062A \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u06F2\u06F0\u06F6",
    partId: "PRT-FGD-001",
    partCode: "SAPCO-ASSY-206-001",
    partName: "\u0645\u062C\u0645\u0648\u0639\u0647 \u06A9\u0627\u0645\u0644 \u0628\u0631\u0627\u06A9\u062A \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u06F2\u06F0\u06F6 (\u0686\u067E \u0648 \u0631\u0627\u0633\u062A)",
    plannedQty: 1200,
    producedQty: 750,
    startDate: "2026-10-26T00:00:00Z",
    endDate: "2026-11-02T00:00:00Z",
    priority: 3,
    status: "IN_PROGRESS",
    notes: "\u062A\u062D\u0648\u06CC\u0644 \u0641\u0648\u0631\u06CC \u0628\u0647 \u062E\u0637 \u0628\u062F\u0646\u0647 \u0633\u0627\u067E\u06A9\u0648 - \u0633\u0627\u06CC\u062A \u062A\u0647\u0631\u0627\u0646",
    isDemo: true,
    createdAt: "2026-10-25T10:00:00Z"
  },
  {
    id: "PLN-002",
    planNumber: "PLN-1403-08-02",
    title: "\u0628\u0631\u0646\u0627\u0645\u0647 \u062A\u0648\u0644\u06CC\u062F \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u062A\u0627\u0631\u0627 \u0628\u0627 \u06A9\u0631\u0627\u0634\u200C\u0628\u0627\u06A9\u0633",
    partId: "PRT-FGD-002",
    partCode: "SAPCO-ASSY-TAR-002",
    partName: "\u0645\u062C\u0645\u0648\u0639\u0647 \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u062A\u0627\u0631\u0627 \u0628\u0627 \u0628\u0631\u0627\u06A9\u062A\u200C\u0647\u0627\u06CC \u0636\u0631\u0628\u0647\u200C\u06AF\u06CC\u0631 \u06A9\u0631\u0627\u0634\u200C\u0628\u0627\u06A9\u0633",
    plannedQty: 800,
    producedQty: 320,
    startDate: "2026-10-28T00:00:00Z",
    endDate: "2026-11-05T00:00:00Z",
    priority: 2,
    status: "IN_PROGRESS",
    notes: "\u062A\u0627\u0645\u06CC\u0646 \u0648\u0631\u0642 ST14 \u0627\u0632 \u0627\u0646\u0628\u0627\u0631 \u06A9\u0648\u06CC\u0644 \u062A\u0627\u06CC\u06CC\u062F \u0634\u062F\u0647 \u0627\u0633\u062A",
    isDemo: true,
    createdAt: "2026-10-26T12:00:00Z"
  },
  {
    id: "PLN-003",
    planNumber: "PLN-1403-08-03",
    title: "\u062A\u0648\u0644\u06CC\u062F \u0633\u06CC\u0646\u06CC \u0645\u062D\u0627\u0641\u0638 \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646",
    partId: "PRT-FGD-004",
    partCode: "SAPCO-ASSY-SHH-004",
    partName: "\u0633\u06CC\u0646\u06CC \u0645\u062D\u0627\u0641\u0638 \u0641\u0644\u0632\u06CC \u0632\u06CC\u0631 \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646 \u067E\u0648\u0634\u0634\u200C\u062F\u0627\u0631 \u0628\u0627 \u067E\u06CC\u0686\u200C\u0647\u0627\u06CC \u0646\u0635\u0628",
    plannedQty: 600,
    producedQty: 0,
    startDate: "2026-11-01T00:00:00Z",
    endDate: "2026-11-08T00:00:00Z",
    priority: 1,
    status: "CONFIRMED",
    notes: "\u062F\u0631 \u0635\u0641 \u062E\u0637 \u067E\u0631\u0633 \u0634\u0648\u0644\u0631 \u06F4\u06F0\u06F0 \u062A\u0646 \u067E\u0633 \u0627\u0632 \u0627\u062A\u0645\u0627\u0645 \u0628\u0686 \u0641\u0639\u0644\u06CC",
    isDemo: true,
    createdAt: "2026-10-27T09:00:00Z"
  }
];
var INITIAL_SAPCO_COILS = [
  {
    id: "COIL-001",
    receiptNumber: "SAP-RC-98421",
    coilNumber: "MOB-2024-DC04-891",
    partId: "PRT-RAW-001",
    partCode: "SAPCO-COIL-DC04-0.8",
    partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 DC04 \u0636\u062E\u0627\u0645\u062A 0.8mm \u0633\u0627\u067E\u06A9\u0648",
    materialGrade: "DC04",
    thicknessMm: 0.8,
    widthMm: 1250,
    receivedWeightKg: 12450,
    consumedWeightKg: 4200,
    heatNumber: "HT-99812-MOB",
    receiptDate: "2026-10-20T08:30:00Z",
    status: "IN_CUTTING",
    isDemo: true
  },
  {
    id: "COIL-002",
    receiptNumber: "SAP-RC-98422",
    coilNumber: "MOB-2024-ST14-412",
    partId: "PRT-RAW-002",
    partCode: "SAPCO-COIL-ST14-1.2",
    partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0646\u0648\u0631\u062F \u0633\u0631\u062F ST14 \u0636\u062E\u0627\u0645\u062A 1.2mm \u0633\u0627\u067E\u06A9\u0648",
    materialGrade: "ST14",
    thicknessMm: 1.2,
    widthMm: 1e3,
    receivedWeightKg: 15300,
    consumedWeightKg: 2800,
    heatNumber: "HT-77631-MOB",
    receiptDate: "2026-10-22T10:15:00Z",
    status: "IN_CUTTING",
    isDemo: true
  },
  {
    id: "COIL-003",
    receiptNumber: "SAP-RC-98510",
    coilNumber: "MOB-2024-DX51D-095",
    partId: "PRT-RAW-003",
    partCode: "SAPCO-COIL-DX51D-1.5",
    partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u06AF\u0627\u0644\u0648\u0627\u0646\u06CC\u0632\u0647 \u062E\u0648\u062F\u0631\u0648\u06CC\u06CC DX51D \u0636\u062E\u0627\u0645\u062A 1.5mm",
    materialGrade: "DX51D",
    thicknessMm: 1.5,
    widthMm: 1200,
    receivedWeightKg: 9800,
    consumedWeightKg: 0,
    heatNumber: "HT-55410-KAS",
    receiptDate: "2026-10-28T14:00:00Z",
    status: "IN_STOCK",
    isDemo: true
  }
];

// src/server/db/prisma.ts
import { PrismaClient } from "@prisma/client";
var isDatabaseUrlConfigured = () => {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
};
var getPrismaClient = () => {
  if (!global.__prismaClient) {
    global.__prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
    });
  }
  return global.__prismaClient;
};
async function checkDatabaseConnection() {
  const isConfigured = isDatabaseUrlConfigured();
  const rawUrl = process.env.DATABASE_URL || "";
  const maskedUrl = rawUrl.replace(/:([^@]+)@/, ":****@");
  if (!isConfigured) {
    return {
      isConfigured: false,
      isConnected: false,
      databaseType: "PostgreSQL",
      databaseUrlMasked: "DATABASE_URL \u0645\u0642\u062F\u0627\u0631\u062F\u0647\u06CC \u0646\u0634\u062F\u0647 \u0627\u0633\u062A (\u0622\u0645\u0627\u062F\u0647 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC)",
      errorMessage: "\u0645\u062A\u063A\u06CC\u0631 \u0645\u062D\u06CC\u0637\u06CC DATABASE_URL \u062A\u0646\u0638\u06CC\u0645 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A. \u0633\u06CC\u0633\u062A\u0645 \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u0627\u0632 \u0645\u0648\u062A\u0648\u0631 \u067E\u0627\u06CC\u062F\u0627\u0631 \u0633\u0631\u0648\u0631 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC\u200C\u06A9\u0646\u062F.",
      lastChecked: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1 as connected`;
    return {
      isConfigured: true,
      isConnected: true,
      databaseType: "PostgreSQL",
      databaseUrlMasked: maskedUrl,
      lastChecked: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "\u062E\u0637\u0627\u06CC \u0646\u0627\u0645\u0634\u062E\u0635 \u062F\u0631 \u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u062F\u06CC\u062A\u0627\u0628\u06CC\u0633 PostgreSQL";
    return {
      isConfigured: true,
      isConnected: false,
      databaseType: "PostgreSQL",
      databaseUrlMasked: maskedUrl,
      errorMessage: errorMsg,
      lastChecked: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}

// src/server/validation/index.ts
import { z } from "zod";
var PartCategoryEnum = z.enum(["RAW_MATERIAL", "WIP_PART", "FINISHED_GOOD"]);
var UnitOfMeasureEnum = z.enum(["KG", "PCS"]);
var ProcessTypeEnum = z.enum([
  "SHEARING",
  "BLANKING",
  "DRAWING",
  "PUNCH_FORM",
  "BENDING",
  "TRIMMING",
  "SPOT_WELD",
  "CO2_WELD",
  "PAINT",
  "ASSEMBLY"
]);
var MachineStatusEnum = z.enum(["ACTIVE", "MAINTENANCE", "IDLE"]);
var VoucherTypeEnum = z.enum([
  "OPENING_BALANCE",
  "RECEIPT",
  "ISSUE",
  "PRODUCTION_OUTPUT",
  "SCRAP",
  "WIP_TRANSFER_DISPATCH",
  "WIP_TRANSFER_RECEIPT",
  "ADJUSTMENT"
]);
var UserRoleEnum = z.enum([
  "ADMIN",
  "PRODUCTION_MANAGER",
  "WAREHOUSE_KEEPER",
  "QC_INSPECTOR",
  "LINE_SUPERVISOR"
]);
var CreatePartSchema = z.object({
  code: z.string().min(2, "\u06A9\u062F \u0642\u0637\u0639\u0647 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F2 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F").max(50),
  name: z.string().min(3, "\u0639\u0646\u0648\u0627\u0646 \u0642\u0637\u0639\u0647 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F3 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F"),
  category: PartCategoryEnum,
  unit: UnitOfMeasureEnum,
  weightPerUnitKg: z.number().positive("\u0648\u0632\u0646 \u0648\u0627\u062D\u062F \u0642\u0637\u0639\u0647 \u0628\u0627\u06CC\u062F \u0645\u062B\u0628\u062A \u0628\u0627\u0634\u062F"),
  sapcoCode: z.string().optional(),
  carModel: z.string().optional(),
  thicknessMm: z.number().positive().optional(),
  materialGrade: z.string().optional(),
  minStock: z.number().nonnegative().default(0),
  maxStock: z.number().positive().optional()
});
var PostTransactionSchema = z.object({
  voucherType: VoucherTypeEnum,
  partId: z.string().min(1, "\u0627\u0646\u062A\u062E\u0627\u0628 \u0642\u0637\u0639\u0647 \u06CC\u0627 \u0645\u0627\u062F\u0647 \u0627\u0648\u0644\u06CC\u0647 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  stageId: z.string().min(1, "\u0627\u0646\u062A\u062E\u0627\u0628 \u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u06CC\u0627 \u0627\u0646\u0628\u0627\u0631 \u0645\u0628\u062F\u0627 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  targetStageId: z.string().optional(),
  quantity: z.number().positive("\u0645\u0642\u062F\u0627\u0631 \u062A\u0631\u0627\u06A9\u0646\u0634 \u0628\u0627\u06CC\u062F \u0639\u062F\u062F\u06CC \u0645\u062B\u0628\u062A \u0648 \u0628\u0632\u0631\u06AF\u062A\u0631 \u0627\u0632 \u0635\u0641\u0631 \u0628\u0627\u0634\u062F"),
  referenceDoc: z.string().optional(),
  operatorName: z.string().optional(),
  machineId: z.string().optional(),
  shift: z.enum(["MORNING", "EVENING", "NIGHT"]).default("MORNING"),
  scrapReason: z.string().optional(),
  notes: z.string().optional(),
  isDemo: z.boolean().optional()
}).refine((data) => {
  if (data.voucherType === "WIP_TRANSFER_DISPATCH") {
    return Boolean(data.targetStageId && data.targetStageId !== data.stageId);
  }
  return true;
}, {
  message: "\u062F\u0631 \u0627\u0633\u0646\u0627\u062F \u0627\u0646\u062A\u0642\u0627\u0644 \u06A9\u0627\u0631 \u062F\u0631 \u062C\u0631\u06CC\u0627\u0646 (WIP)\u060C \u0645\u0634\u062E\u0635 \u06A9\u0631\u062F\u0646 \u0645\u0631\u062D\u0644\u0647 \u0645\u0642\u0635\u062F \u0645\u062A\u0641\u0627\u0648\u062A \u0627\u0632 \u0645\u0628\u062F\u0627 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A.",
  path: ["targetStageId"]
});
var CreateMachineSchema = z.object({
  code: z.string().min(2, "\u06A9\u062F \u0645\u0627\u0634\u06CC\u0646 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  name: z.string().min(3, "\u0646\u0627\u0645 \u0648 \u0639\u0646\u0648\u0627\u0646 \u0645\u0627\u0634\u06CC\u0646 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  capabilities: z.array(ProcessTypeEnum).min(1, "\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u0641\u0631\u0622\u06CC\u0646\u062F \u0645\u062C\u0627\u0632 \u0628\u0627\u06CC\u062F \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u0648\u062F"),
  processType: ProcessTypeEnum,
  tonnage: z.number().nonnegative().optional(),
  bolsterSize: z.string().optional(),
  strokeLengthMm: z.number().nonnegative().optional(),
  strokesPerMinute: z.number().nonnegative().optional(),
  hallId: z.string().optional(),
  location: z.string().default("\u0633\u0627\u0644\u0646 \u067E\u0631\u0633"),
  status: MachineStatusEnum.default("ACTIVE"),
  operatorName: z.string().optional()
});
var CreateProductionPlanSchema = z.object({
  title: z.string().min(3, "\u0639\u0646\u0648\u0627\u0646 \u0628\u0631\u0646\u0627\u0645\u0647 \u062A\u0648\u0644\u06CC\u062F \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  partId: z.string().min(1, "\u0627\u0646\u062A\u062E\u0627\u0628 \u0642\u0637\u0639\u0647 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  plannedQty: z.number().int().positive("\u062A\u0639\u062F\u0627\u062F \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC \u0634\u062F\u0647 \u0628\u0627\u06CC\u062F \u0639\u062F\u062F \u0635\u062D\u06CC\u062D \u0645\u062B\u0628\u062A \u0628\u0627\u0634\u062F"),
  startDate: z.string().min(10, "\u062A\u0627\u0631\u06CC\u062E \u0634\u0631\u0648\u0639 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  endDate: z.string().min(10, "\u062A\u0627\u0631\u06CC\u062E \u067E\u0627\u06CC\u0627\u0646 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  priority: z.number().int().min(1).max(3).default(1),
  notes: z.string().optional()
});
var CreateSapcoReceiptSchema = z.object({
  receiptNumber: z.string().min(3, "\u0634\u0645\u0627\u0631\u0647 \u0631\u0633\u06CC\u062F \u062D\u0648\u0627\u0644\u0647 \u0633\u0627\u067E\u06A9\u0648 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  coilNumber: z.string().min(3, "\u0634\u0645\u0627\u0631\u0647 \u0633\u0631\u06CC\u0627\u0644 \u06A9\u0648\u06CC\u0644 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  partId: z.string().min(1, "\u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u0627\u062F\u0647 \u0627\u0648\u0644\u06CC\u0647 \u0645\u0631\u062A\u0628\u0637 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  materialGrade: z.string().min(2, "\u06AF\u0631\u06CC\u062F \u0641\u0648\u0644\u0627\u062F \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A"),
  thicknessMm: z.number().positive("\u0636\u062E\u0627\u0645\u062A \u0648\u0631\u0642 \u0628\u0627\u06CC\u062F \u0645\u062B\u0628\u062A \u0628\u0627\u0634\u062F"),
  widthMm: z.number().positive("\u0639\u0631\u0636 \u06A9\u0648\u06CC\u0644 \u0628\u0627\u06CC\u062F \u0645\u062B\u0628\u062A \u0628\u0627\u0634\u062F"),
  receivedWeightKg: z.number().positive("\u0648\u0632\u0646 \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC \u06A9\u0648\u06CC\u0644 \u0628\u0627\u06CC\u062F \u0645\u062B\u0628\u062A \u0628\u0627\u0634\u062F"),
  heatNumber: z.string().optional()
});

// src/server/inventoryEngine.ts
function calculateDetailedStockBalances(documents, reservations, parts) {
  const partsMap = /* @__PURE__ */ new Map();
  parts.forEach((p) => partsMap.set(p.id, p));
  const balanceMap = /* @__PURE__ */ new Map();
  const getOrCreateBalance = (part, warehouseId, warehouseName, locationCode, ownership, lotNumber, heatNumber, materialLotId, contractId, contractNumber) => {
    const safeLot = lotNumber || "NO_LOT";
    const key = `${part.id}:::${warehouseId}:::${locationCode}:::${ownership}:::${safeLot}`;
    if (!balanceMap.has(key)) {
      balanceMap.set(key, {
        id: `STK-${key}`,
        partId: part.id,
        partCode: part.code,
        partName: part.name,
        category: part.category,
        materialGrade: part.materialGrade,
        thicknessMm: part.thicknessMm,
        warehouseId,
        warehouseName,
        locationCode: locationCode || "MAIN",
        materialLotId,
        lotNumber: lotNumber || void 0,
        heatNumber,
        ownership,
        contractId,
        contractNumber,
        unit: part.unit,
        physicalQty: 0,
        ownedQty: 0,
        supplierOwnedQty: 0,
        reservedQty: 0,
        qualityBlockedQty: 0,
        availableQty: 0,
        physicalKg: 0,
        ownedKg: 0,
        supplierOwnedKg: 0,
        reservedKg: 0,
        qualityBlockedKg: 0,
        availableKg: 0,
        lastTransactionAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return balanceMap.get(key);
  };
  const postedDocs = documents.filter((d) => d.postingStatus === "POSTED" || d.postingStatus === "REVERSED").sort((a, b) => new Date(a.documentDate).getTime() - new Date(b.documentDate).getTime());
  for (const doc of postedDocs) {
    for (const line of doc.lines) {
      const part = partsMap.get(line.partId);
      if (!part) continue;
      const weightPerUnit = part.weightPerUnitKg || 1;
      const qty = Number(line.quantity) || 0;
      const weightKg = part.unit === "KG" ? qty : Number((qty * weightPerUnit).toFixed(3));
      switch (doc.documentType) {
        case "OPENING_BALANCE":
        case "RECEIPT_RAW_MATERIAL":
        case "RECEIPT_FINISHED_GOODS": {
          const entry = getOrCreateBalance(
            part,
            doc.warehouseId,
            doc.warehouseName,
            line.locationCode || "LOC-01",
            line.ownership,
            line.lotNumber,
            line.heatNumber,
            line.materialLotId,
            line.contractId,
            line.contractNumber
          );
          entry.physicalQty += qty;
          entry.physicalKg += weightKg;
          if (line.ownership === "COMPANY_OWNED") {
            entry.ownedQty += qty;
            entry.ownedKg += weightKg;
          } else {
            entry.supplierOwnedQty += qty;
            entry.supplierOwnedKg += weightKg;
          }
          if (line.qualityStatus === "QUALITY_BLOCKED" || line.qualityStatus === "QUARANTINE" || line.qualityStatus === "REJECTED") {
            entry.qualityBlockedQty += qty;
            entry.qualityBlockedKg += weightKg;
          }
          entry.lastTransactionAt = doc.postedAt || doc.documentDate;
          break;
        }
        case "ISSUE_RAW_MATERIAL": {
          const entry = getOrCreateBalance(
            part,
            doc.warehouseId,
            doc.warehouseName,
            line.locationCode || "LOC-01",
            line.ownership,
            line.lotNumber,
            line.heatNumber,
            line.materialLotId,
            line.contractId,
            line.contractNumber
          );
          entry.physicalQty -= qty;
          entry.physicalKg -= weightKg;
          if (line.ownership === "COMPANY_OWNED") {
            entry.ownedQty -= qty;
            entry.ownedKg -= weightKg;
          } else {
            entry.supplierOwnedQty -= qty;
            entry.supplierOwnedKg -= weightKg;
          }
          entry.lastTransactionAt = doc.postedAt || doc.documentDate;
          break;
        }
        case "TRANSFER": {
          const sourceEntry = getOrCreateBalance(
            part,
            doc.warehouseId,
            doc.warehouseName,
            line.locationCode || "LOC-01",
            line.ownership,
            line.lotNumber,
            line.heatNumber,
            line.materialLotId,
            line.contractId,
            line.contractNumber
          );
          sourceEntry.physicalQty -= qty;
          sourceEntry.physicalKg -= weightKg;
          if (line.ownership === "COMPANY_OWNED") {
            sourceEntry.ownedQty -= qty;
            sourceEntry.ownedKg -= weightKg;
          } else {
            sourceEntry.supplierOwnedQty -= qty;
            sourceEntry.supplierOwnedKg -= weightKg;
          }
          sourceEntry.lastTransactionAt = doc.postedAt || doc.documentDate;
          if (doc.targetWarehouseId) {
            const targetWarehouse = WAREHOUSES_LIST.find((w) => w.id === doc.targetWarehouseId);
            const targetEntry = getOrCreateBalance(
              part,
              doc.targetWarehouseId,
              targetWarehouse ? targetWarehouse.name : doc.targetWarehouseId,
              line.targetLocationCode || line.locationCode || "LOC-01",
              line.ownership,
              line.lotNumber,
              line.heatNumber,
              line.materialLotId,
              line.contractId,
              line.contractNumber
            );
            targetEntry.physicalQty += qty;
            targetEntry.physicalKg += weightKg;
            if (line.ownership === "COMPANY_OWNED") {
              targetEntry.ownedQty += qty;
              targetEntry.ownedKg += weightKg;
            } else {
              targetEntry.supplierOwnedQty += qty;
              targetEntry.supplierOwnedKg += weightKg;
            }
            targetEntry.lastTransactionAt = doc.postedAt || doc.documentDate;
          }
          break;
        }
        case "ADJUSTMENT":
        case "REVERSAL": {
          const entry = getOrCreateBalance(
            part,
            doc.warehouseId,
            doc.warehouseName,
            line.locationCode || "LOC-01",
            line.ownership,
            line.lotNumber,
            line.heatNumber,
            line.materialLotId,
            line.contractId,
            line.contractNumber
          );
          entry.physicalQty += qty;
          entry.physicalKg += weightKg;
          if (line.ownership === "COMPANY_OWNED") {
            entry.ownedQty += qty;
            entry.ownedKg += weightKg;
          } else {
            entry.supplierOwnedQty += qty;
            entry.supplierOwnedKg += weightKg;
          }
          entry.lastTransactionAt = doc.postedAt || doc.documentDate;
          break;
        }
      }
    }
  }
  for (const res of reservations) {
    if (res.status !== "ACTIVE") continue;
    const part = partsMap.get(res.partId);
    if (!part) continue;
    for (const entry of balanceMap.values()) {
      if (entry.partId === res.partId && entry.warehouseId === res.warehouseId && (!res.lotNumber || entry.lotNumber === res.lotNumber)) {
        entry.reservedQty += res.quantity;
        entry.reservedKg += res.quantityKg;
      }
    }
  }
  const balances = [];
  let totalPhysicalKg = 0;
  let totalPhysicalPcs = 0;
  let totalAvailableKg = 0;
  let totalAvailablePcs = 0;
  let totalReservedKg = 0;
  let totalReservedPcs = 0;
  let totalQualityBlockedKg = 0;
  let totalQualityBlockedPcs = 0;
  let totalSapcoConsignmentKg = 0;
  let totalCompanyOwnedKg = 0;
  const activeLots = /* @__PURE__ */ new Set();
  for (const item of balanceMap.values()) {
    item.availableQty = Math.max(0, item.physicalQty - item.reservedQty - item.qualityBlockedQty);
    item.availableKg = Math.max(0, item.physicalKg - item.reservedKg - item.qualityBlockedKg);
    item.physicalQty = Math.round(item.physicalQty * 1e3) / 1e3;
    item.availableQty = Math.round(item.availableQty * 1e3) / 1e3;
    item.reservedQty = Math.round(item.reservedQty * 1e3) / 1e3;
    item.qualityBlockedQty = Math.round(item.qualityBlockedQty * 1e3) / 1e3;
    item.physicalKg = Math.round(item.physicalKg * 1e3) / 1e3;
    item.availableKg = Math.round(item.availableKg * 1e3) / 1e3;
    item.reservedKg = Math.round(item.reservedKg * 1e3) / 1e3;
    item.qualityBlockedKg = Math.round(item.qualityBlockedKg * 1e3) / 1e3;
    balances.push(item);
    if (item.lotNumber && item.physicalQty > 0) {
      activeLots.add(item.lotNumber);
    }
    if (item.unit === "KG") {
      totalPhysicalKg += item.physicalQty;
      totalAvailableKg += item.availableQty;
      totalReservedKg += item.reservedQty;
      totalQualityBlockedKg += item.qualityBlockedQty;
    } else {
      totalPhysicalPcs += item.physicalQty;
      totalAvailablePcs += item.availableQty;
      totalReservedPcs += item.reservedQty;
      totalQualityBlockedPcs += item.qualityBlockedQty;
      totalPhysicalKg += item.physicalKg;
      totalAvailableKg += item.availableKg;
      totalReservedKg += item.reservedKg;
      totalQualityBlockedKg += item.qualityBlockedKg;
    }
    if (item.ownership === "SAPCO_SUPPLIER_OWNED") {
      totalSapcoConsignmentKg += item.physicalKg;
    } else {
      totalCompanyOwnedKg += item.physicalKg;
    }
  }
  const metrics = {
    totalPhysicalKg: Math.round(totalPhysicalKg * 100) / 100,
    totalPhysicalPcs: Math.round(totalPhysicalPcs),
    totalAvailableKg: Math.round(totalAvailableKg * 100) / 100,
    totalAvailablePcs: Math.round(totalAvailablePcs),
    totalReservedKg: Math.round(totalReservedKg * 100) / 100,
    totalReservedPcs: Math.round(totalReservedPcs),
    totalQualityBlockedKg: Math.round(totalQualityBlockedKg * 100) / 100,
    totalQualityBlockedPcs: Math.round(totalQualityBlockedPcs),
    totalSapcoConsignmentKg: Math.round(totalSapcoConsignmentKg * 100) / 100,
    totalCompanyOwnedKg: Math.round(totalCompanyOwnedKg * 100) / 100,
    activeLotsCount: activeLots.size,
    draftDocumentsCount: documents.filter((d) => d.postingStatus === "UNPOSTED").length,
    postedDocumentsCount: postedDocs.length,
    activeContractsCount: 0
    // will be populated in SAPCO ledger
  };
  return { balances, metrics };
}
function atomicPostDocument(document, allDocuments, reservations, parts, user) {
  if (document.postingStatus === "POSTED") {
    return {
      success: false,
      error: `\u0633\u0646\u062F \u0634\u0645\u0627\u0631\u0647 \xAB${document.documentNumber}\xBB \u0642\u0628\u0644\u0627\u064B \u0642\u0637\u0639\u06CC (POSTED) \u0634\u062F\u0647 \u0627\u0633\u062A. \u062B\u0628\u062A \u0645\u062C\u062F\u062F \u0645\u062C\u0627\u0632 \u0646\u06CC\u0633\u062A.`
    };
  }
  if (document.documentStatus === "CANCELLED") {
    return {
      success: false,
      error: `\u0633\u0646\u062F \u0634\u0645\u0627\u0631\u0647 \xAB${document.documentNumber}\xBB \u0644\u063A\u0648 \u0634\u062F\u0647 \u0627\u0633\u062A \u0648 \u0627\u0645\u06A9\u0627\u0646 \u062B\u0628\u062A \u0642\u0637\u0639\u06CC \u0646\u062F\u0627\u0631\u062F.`
    };
  }
  if (!document.lines || document.lines.length === 0) {
    return {
      success: false,
      error: "\u0633\u0646\u062F \u0641\u0627\u0642\u062F \u0647\u0631\u06AF\u0648\u0646\u0647 \u0631\u062F\u06CC\u0641 \u06A9\u0627\u0644\u0627 \u06CC\u0627 \u0645\u0648\u0627\u062F \u0627\u0633\u062A."
    };
  }
  if (document.documentType === "ADJUSTMENT" && (!document.adjustmentReason || !document.adjustmentReason.trim())) {
    return {
      success: false,
      error: "\u062B\u0628\u062A \u0633\u0646\u062F \u062A\u0639\u062F\u06CC\u0644 \u0627\u0646\u0628\u0627\u0631\u06AF\u0631\u062F\u0627\u0646\u06CC \u0628\u062F\u0648\u0646 \u0630\u06A9\u0631 \u0639\u0644\u062A \u062A\u0639\u062F\u06CC\u0644 \u0648 \u0645\u062C\u0648\u0632 \u0645\u0645\u06CC\u0632\u06CC \u0645\u062C\u0627\u0632 \u0646\u0645\u06CC\u200C\u0628\u0627\u0634\u062F."
    };
  }
  const isStockDeduction = ["ISSUE_RAW_MATERIAL", "TRANSFER"].includes(document.documentType);
  if (isStockDeduction) {
    const { balances } = calculateDetailedStockBalances(allDocuments, reservations, parts);
    for (const line of document.lines) {
      const part = parts.find((p) => p.id === line.partId);
      const partName = part ? part.name : line.partCode;
      const requestedQty = Number(line.quantity);
      const matchingBalances = balances.filter(
        (b) => b.partId === line.partId && b.warehouseId === document.warehouseId && (!line.lotNumber || b.lotNumber === line.lotNumber)
      );
      const totalAvailableInStore = matchingBalances.reduce((sum, b) => sum + b.availableQty, 0);
      if (requestedQty > totalAvailableInStore) {
        return {
          success: false,
          error: `\u062E\u0637\u0627\u06CC \u06A9\u0646\u062A\u0631\u0644 \u0645\u0648\u062C\u0648\u062F\u06CC: \u0645\u0648\u062C\u0648\u062F\u06CC \u0622\u0632\u0627\u062F \u0642\u0637\u0639\u0647 \xAB${partName}\xBB \u062F\u0631 \xAB${document.warehouseName}\xBB \u06A9\u0627\u0641\u06CC \u0646\u06CC\u0633\u062A. \u0645\u0648\u062C\u0648\u062F\u06CC \u0622\u0632\u0627\u062F: ${totalAvailableInStore} ${line.unit}\u060C \u0645\u0642\u062F\u0627\u0631 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC: ${requestedQty} ${line.unit}. \u062C\u0644\u0648\u06AF\u06CC\u0631\u06CC \u0627\u0632 \u0645\u0646\u0641\u06CC \u0634\u062F\u0646 \u0645\u0648\u062C\u0648\u062F\u06CC.`
        };
      }
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  document.postingStatus = "POSTED";
  document.documentStatus = "CONFIRMED";
  document.postedByUid = user.uid;
  document.postedByName = user.displayName;
  document.postedAt = now;
  document.updatedAt = now;
  const auditRecord = {
    id: `AUD-${Date.now()}`,
    action: "DOCUMENT_POST",
    entityName: "InventoryDocument",
    entityId: document.documentNumber,
    user,
    details: `\u062B\u0628\u062A \u0642\u0637\u0639\u06CC \u0633\u0646\u062F ${document.documentType} \u0634\u0645\u0627\u0631\u0647 ${document.documentNumber} \u0634\u0627\u0645\u0644 ${document.lines.length} \u0642\u0644\u0645 \u0628\u0647 \u0648\u0632\u0646 \u06A9\u0644 ${document.totalWeightKg} \u06A9\u06CC\u0644\u0648\u06AF\u0631\u0645`,
    timestamp: now
  };
  return {
    success: true,
    postedDocument: document,
    auditRecord
  };
}
function createReversalDocument(targetDocument, reason, user) {
  if (targetDocument.postingStatus !== "POSTED") {
    return {
      success: false,
      error: "\u0641\u0642\u0637 \u0627\u0633\u0646\u0627\u062F \u0642\u0637\u0639\u06CC\u200C\u0634\u062F\u0647 (POSTED) \u0642\u0627\u0628\u0644\u06CC\u062A \u0635\u062F\u0648\u0631 \u0633\u0646\u062F \u0627\u0635\u0644\u0627\u062D\u06CC \u0648 \u0627\u0628\u0637\u0627\u0644 \u0631\u0627 \u062F\u0627\u0631\u0646\u062F."
    };
  }
  if (targetDocument.documentType === "REVERSAL") {
    return {
      success: false,
      error: "\u06CC\u06A9 \u0633\u0646\u062F \u0628\u0631\u06AF\u0634\u062A\u06CC \u062E\u0648\u062F \u0646\u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u0645\u062C\u062F\u062F\u0627\u064B \u0645\u0639\u06A9\u0648\u0633 \u0634\u0648\u062F."
    };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const reversalDocNumber = `REV-${targetDocument.documentNumber}`;
  const isOriginalIssue = targetDocument.documentType === "ISSUE_RAW_MATERIAL";
  const reversedLines = targetDocument.lines.map((l, index) => {
    const revQty = isOriginalIssue ? Math.abs(l.quantity) : -l.quantity;
    const revQtyKg = isOriginalIssue ? Math.abs(l.quantityKg) : -l.quantityKg;
    return {
      ...l,
      id: `REV-LINE-${Date.now()}-${index}`,
      documentId: `DOC-${reversalDocNumber}`,
      quantity: revQty,
      quantityKg: revQtyKg,
      notes: `\u0627\u0628\u0637\u0627\u0644 \u0631\u062F\u06CC\u0641 ${l.lineNumber} \u0633\u0646\u062F ${targetDocument.documentNumber}: ${reason}`
    };
  });
  const reversalDoc = {
    id: `DOC-REV-${Date.now()}`,
    documentNumber: reversalDocNumber,
    documentType: "REVERSAL",
    documentDate: now,
    documentStatus: "CONFIRMED",
    postingStatus: "POSTED",
    warehouseId: targetDocument.documentType === "TRANSFER" && targetDocument.targetWarehouseId ? targetDocument.targetWarehouseId : targetDocument.warehouseId,
    warehouseName: targetDocument.documentType === "TRANSFER" && targetDocument.targetWarehouseName ? targetDocument.targetWarehouseName : targetDocument.warehouseName,
    targetWarehouseId: targetDocument.documentType === "TRANSFER" ? targetDocument.warehouseId : targetDocument.targetWarehouseId,
    targetWarehouseName: targetDocument.documentType === "TRANSFER" ? targetDocument.warehouseName : targetDocument.targetWarehouseName,
    ownership: targetDocument.ownership,
    contractId: targetDocument.contractId,
    contractNumber: targetDocument.contractNumber,
    referenceType: "REVERSAL_OF",
    referenceNumber: targetDocument.documentNumber,
    reversalOfDocumentId: targetDocument.id,
    reversalOfDocNumber: targetDocument.documentNumber,
    adjustmentReason: reason,
    auditNote: `\u0633\u0646\u062F \u0627\u0635\u0644\u0627\u062D\u06CC \u0635\u0627\u062F\u0631\u0647 \u062A\u0648\u0633\u0637 ${user.displayName} \u062C\u0647\u062A \u0627\u0628\u0637\u0627\u0644 \u0633\u0646\u062F ${targetDocument.documentNumber}. \u0639\u0644\u062A: ${reason}`,
    lines: reversedLines,
    totalQuantity: isOriginalIssue ? Math.abs(targetDocument.totalQuantity) : -targetDocument.totalQuantity,
    totalWeightKg: isOriginalIssue ? Math.abs(targetDocument.totalWeightKg) : -targetDocument.totalWeightKg,
    createdByUid: user.uid,
    createdByName: user.displayName,
    postedByUid: user.uid,
    postedByName: user.displayName,
    postedAt: now,
    createdAt: now,
    updatedAt: now
  };
  targetDocument.postingStatus = "REVERSED";
  targetDocument.updatedAt = now;
  const auditRecord = {
    id: `AUD-${Date.now()}`,
    action: "DOCUMENT_REVERSE",
    entityName: "InventoryDocument",
    entityId: targetDocument.documentNumber,
    user,
    details: `\u0627\u0628\u0637\u0627\u0644 \u0633\u0646\u062F \u0634\u0645\u0627\u0631\u0647 ${targetDocument.documentNumber} \u0648 \u0635\u062F\u0648\u0631 \u0633\u0646\u062F \u062C\u0628\u0631\u0627\u0646\u06CC ${reversalDocNumber}. \u062F\u0644\u06CC\u0644: ${reason}`,
    timestamp: now
  };
  return {
    success: true,
    originalDocument: targetDocument,
    reversalDocument: reversalDoc,
    auditRecord
  };
}
function calculateSapcoContractLedger(contracts, documents) {
  const postedDocs = documents.filter((d) => d.postingStatus === "POSTED" || d.postingStatus === "REVERSED").sort((a, b) => new Date(a.documentDate).getTime() - new Date(b.documentDate).getTime());
  const contractMap = /* @__PURE__ */ new Map();
  contracts.forEach((c) => {
    contractMap.set(c.id, {
      ...c,
      totalReceivedKg: 0,
      totalConsumedKg: 0,
      closingBalanceKg: c.openingBalanceKg || 0
    });
  });
  const ledgerEntries = [];
  contracts.forEach((c) => {
    if (c.openingBalanceKg > 0) {
      ledgerEntries.push({
        id: `LEDGER-OP-${c.id}`,
        contractId: c.id,
        contractNumber: c.contractNumber,
        documentNumber: `INIT-${c.contractNumber}`,
        date: c.startDate,
        operationType: "OPENING",
        weightKgSigned: c.openingBalanceKg,
        runningBalanceKg: c.openingBalanceKg,
        notes: "\u0645\u0627\u0646\u062F\u0647 \u0633\u0647\u0645\u06CC\u0647 \u0627\u0648\u0644\u06CC\u0647 \u062F\u0648\u0631\u0647"
      });
    }
  });
  for (const doc of postedDocs) {
    for (const line of doc.lines) {
      if (line.ownership !== "SAPCO_SUPPLIER_OWNED" && !line.contractId) continue;
      const contractId = line.contractId || contracts[0]?.id;
      const contract = contractMap.get(contractId);
      if (!contract) continue;
      let signedKg = 0;
      let opType = "RECEIPT";
      if (["RECEIPT_RAW_MATERIAL", "OPENING_BALANCE"].includes(doc.documentType)) {
        signedKg = line.quantityKg;
        opType = "RECEIPT";
        contract.totalReceivedKg += signedKg;
        contract.closingBalanceKg += signedKg;
      } else if (doc.documentType === "ISSUE_RAW_MATERIAL") {
        signedKg = -line.quantityKg;
        opType = "CONSUMPTION";
        contract.totalConsumedKg += line.quantityKg;
        contract.closingBalanceKg -= line.quantityKg;
      } else if (doc.documentType === "REVERSAL" || doc.documentType === "ADJUSTMENT") {
        signedKg = line.quantityKg;
        opType = "ADJUSTMENT";
        if (signedKg > 0) {
          contract.closingBalanceKg += signedKg;
          contract.totalConsumedKg = Math.max(0, contract.totalConsumedKg - signedKg);
        } else {
          contract.closingBalanceKg += signedKg;
          contract.totalReceivedKg = Math.max(0, contract.totalReceivedKg + signedKg);
        }
      }
      ledgerEntries.push({
        id: `LEDGER-${doc.documentNumber}-${line.id}`,
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        documentNumber: doc.documentNumber,
        date: doc.postedAt || doc.documentDate,
        waybillNumber: doc.referenceNumber || line.heatNumber,
        lotNumber: line.lotNumber,
        heatNumber: line.heatNumber,
        operationType: opType,
        weightKgSigned: Math.round(signedKg * 100) / 100,
        runningBalanceKg: Math.round(contract.closingBalanceKg * 100) / 100,
        notes: line.notes || doc.adjustmentReason || doc.referenceType
      });
    }
  }
  const contractsWithBalances = Array.from(contractMap.values()).map((c) => ({
    ...c,
    totalReceivedKg: Math.round(c.totalReceivedKg * 100) / 100,
    totalConsumedKg: Math.round(c.totalConsumedKg * 100) / 100,
    closingBalanceKg: Math.round(c.closingBalanceKg * 100) / 100
  }));
  return { contractsWithBalances, ledgerEntries };
}

// src/server/inventorySampleData.ts
var INITIAL_SAPCO_CONTRACTS = [
  {
    id: "CNT-SAPCO-1403-Q3",
    contractNumber: "CNT-SAPCO-1403-Q3",
    title: "\u0633\u0647\u0645\u06CC\u0647 \u067E\u0627\u06CC\u06CC\u0632 \u06F1\u06F4\u06F0\u06F3 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC DC04 \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 \u06F2\u06F0\u06F6 \u0648 \u06F2\u06F0\u06F7",
    materialGrade: "DC04",
    allocatedWeightKg: 15e4,
    openingBalanceKg: 25e3,
    totalReceivedKg: 0,
    totalConsumedKg: 0,
    closingBalanceKg: 25e3,
    associatedPartCodes: ["SAPCO-COIL-DC04-0.8", "IKCO-206-BRK01"],
    status: "ACTIVE",
    startDate: "2024-09-22T00:00:00.000Z",
    endDate: "2024-12-21T23:59:59.000Z"
  },
  {
    id: "CNT-SAPCO-1403-Q4-TARA",
    contractNumber: "CNT-SAPCO-1403-Q4-TARA",
    title: "\u062A\u062E\u0635\u06CC\u0635 \u0648\u0631\u0642 \u06AF\u0631\u06CC\u062F ST14 \u0636\u062E\u0627\u0645\u062A \u06F1.\u06F0 \u062A\u0642\u0648\u06CC\u062A\u06CC \u0633\u062A\u0648\u0646 \u062A\u0627\u0631\u0627",
    materialGrade: "ST14",
    allocatedWeightKg: 12e4,
    openingBalanceKg: 15e3,
    totalReceivedKg: 0,
    totalConsumedKg: 0,
    closingBalanceKg: 15e3,
    associatedPartCodes: ["SAPCO-COIL-ST14-1.0", "IKCO-TARA-ST02"],
    status: "ACTIVE",
    startDate: "2024-10-01T00:00:00.000Z",
    endDate: "2025-01-20T23:59:59.000Z"
  },
  {
    id: "CNT-SAIPA-1403-DX51",
    contractNumber: "CNT-SAIPA-1403-DX51",
    title: "\u0633\u0647\u0645\u06CC\u0647 \u0648\u0631\u0642 \u06AF\u0627\u0644\u0648\u0627\u0646\u06CC\u0632\u0647 \u0636\u062F\u062E\u0648\u0631\u062F\u06AF\u06CC DX51D \u0633\u06CC\u0646\u06CC \u0641\u0646 \u0634\u0627\u0647\u06CC\u0646",
    materialGrade: "DX51D+Z140",
    allocatedWeightKg: 8e4,
    openingBalanceKg: 1e4,
    totalReceivedKg: 0,
    totalConsumedKg: 0,
    closingBalanceKg: 1e4,
    associatedPartCodes: ["SAPCO-COIL-DX51-1.2", "SAIPA-SHAH-PL04"],
    status: "ACTIVE",
    startDate: "2024-09-01T00:00:00.000Z",
    endDate: "2024-12-30T23:59:59.000Z"
  }
];
var INITIAL_INVENTORY_DOCUMENTS = [
  // 1. Opening balance document (POSTED)
  {
    id: "DOC-OB-1403-001",
    documentNumber: "OB-1403-0001",
    documentType: "OPENING_BALANCE",
    documentDate: "2024-10-01T07:00:00.000Z",
    documentStatus: "CONFIRMED",
    postingStatus: "POSTED",
    warehouseId: "WH-RAW",
    warehouseName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0631\u06A9\u0632\u06CC \u0631\u0648\u0644 \u0648 \u0648\u0631\u0642 \u0633\u0627\u067E\u06A9\u0648",
    ownership: "SAPCO_SUPPLIER_OWNED",
    contractId: "CNT-SAPCO-1403-Q3",
    contractNumber: "CNT-SAPCO-1403-Q3",
    referenceType: "AUDIT_INVENTORY_INITIAL",
    referenceNumber: "COUNT-INIT-1403",
    lines: [
      {
        id: "LINE-OB-01",
        documentId: "DOC-OB-1403-001",
        lineNumber: 1,
        partId: "PRT-RAW-001",
        partCode: "SAPCO-COIL-DC04-0.8",
        partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 DC04 \u0636\u062E\u0627\u0645\u062A 0.8mm \u0633\u0627\u067E\u06A9\u0648",
        lotNumber: "COIL-SAP-1403-0498",
        heatNumber: "HT-MOB-98241",
        ownership: "SAPCO_SUPPLIER_OWNED",
        contractId: "CNT-SAPCO-1403-Q3",
        contractNumber: "CNT-SAPCO-1403-Q3",
        locationCode: "LOC-RAW-A1",
        quantity: 14200,
        unit: "KG",
        quantityKg: 14200,
        qualityStatus: "AVAILABLE",
        notes: "\u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0648\u0644 \u062F\u0648\u0631\u0647 \u062B\u0628\u062A \u0634\u062F\u0647 \u0627\u0632 \u0635\u0648\u0631\u062A\u062C\u0644\u0633\u0647 \u0627\u0646\u0628\u0627\u0631\u06AF\u0631\u062F\u0627\u0646\u06CC"
      },
      {
        id: "LINE-OB-02",
        documentId: "DOC-OB-1403-001",
        lineNumber: 2,
        partId: "PRT-RAW-002",
        partCode: "SAPCO-COIL-ST14-1.0",
        partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC ST14 \u0636\u062E\u0627\u0645\u062A 1.0mm \u0641\u0648\u0644\u0627\u062F \u0645\u0628\u0627\u0631\u06A9\u0647 / \u0633\u0627\u067E\u06A9\u0648",
        lotNumber: "COIL-SAP-1403-0501",
        heatNumber: "HT-MOB-77103",
        ownership: "SAPCO_SUPPLIER_OWNED",
        contractId: "CNT-SAPCO-1403-Q4-TARA",
        contractNumber: "CNT-SAPCO-1403-Q4-TARA",
        locationCode: "LOC-RAW-A2",
        quantity: 12500,
        unit: "KG",
        quantityKg: 12500,
        qualityStatus: "AVAILABLE",
        notes: "\u06A9\u0644\u0627\u0641 \u062F\u0648\u0645 \u0627\u0648\u0644 \u062F\u0648\u0631\u0647"
      }
    ],
    totalQuantity: 26700,
    totalWeightKg: 26700,
    createdByUid: "USR-ADMIN",
    createdByName: "\u0645\u062F\u06CC\u0631 \u0627\u0646\u0628\u0627\u0631",
    postedByUid: "USR-ADMIN",
    postedByName: "\u0645\u062F\u06CC\u0631 \u0627\u0646\u0628\u0627\u0631",
    postedAt: "2024-10-01T07:15:00.000Z",
    createdAt: "2024-10-01T07:00:00.000Z",
    updatedAt: "2024-10-01T07:15:00.000Z"
  },
  // 2. Material Receipt from SAPCO (POSTED)
  {
    id: "DOC-REC-1403-0142",
    documentNumber: "REC-1403-0142",
    documentType: "RECEIPT_RAW_MATERIAL",
    documentDate: "2024-10-15T09:00:00.000Z",
    documentStatus: "CONFIRMED",
    postingStatus: "POSTED",
    warehouseId: "WH-RAW",
    warehouseName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0631\u06A9\u0632\u06CC \u0631\u0648\u0644 \u0648 \u0648\u0631\u0642 \u0633\u0627\u067E\u06A9\u0648",
    ownership: "SAPCO_SUPPLIER_OWNED",
    contractId: "CNT-SAPCO-1403-Q3",
    contractNumber: "CNT-SAPCO-1403-Q3",
    referenceType: "SAPCO_WAYBILL",
    referenceNumber: "WB-SAP-892401",
    lines: [
      {
        id: "LINE-REC-01",
        documentId: "DOC-REC-1403-0142",
        lineNumber: 1,
        partId: "PRT-RAW-001",
        partCode: "SAPCO-COIL-DC04-0.8",
        partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 DC04 \u0636\u062E\u0627\u0645\u062A 0.8mm \u0633\u0627\u067E\u06A9\u0648",
        lotNumber: "COIL-SAP-1403-0520",
        heatNumber: "HT-MOB-98255",
        ownership: "SAPCO_SUPPLIER_OWNED",
        contractId: "CNT-SAPCO-1403-Q3",
        contractNumber: "CNT-SAPCO-1403-Q3",
        locationCode: "LOC-RAW-B1",
        quantity: 13800,
        unit: "KG",
        quantityKg: 13800,
        qualityStatus: "AVAILABLE",
        notes: "\u0631\u0633\u06CC\u062F \u0645\u0633\u062A\u0642\u06CC\u0645 \u0627\u0632 \u0641\u0648\u0644\u0627\u062F \u0645\u0628\u0627\u0631\u06A9\u0647 \u0637\u0628\u0642 \u0633\u0647\u0645\u06CC\u0647 \u067E\u0627\u06CC\u06CC\u0632"
      }
    ],
    totalQuantity: 13800,
    totalWeightKg: 13800,
    createdByUid: "USR-WH-01",
    createdByName: "\u0645\u0631\u0627\u062F\u06CC (\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631)",
    postedByUid: "USR-WH-01",
    postedByName: "\u0645\u0631\u0627\u062F\u06CC (\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631)",
    postedAt: "2024-10-15T09:20:00.000Z",
    createdAt: "2024-10-15T09:00:00.000Z",
    updatedAt: "2024-10-15T09:20:00.000Z"
  },
  // 3. Material Issue to Press Shop (POSTED)
  {
    id: "DOC-ISS-1403-0089",
    documentNumber: "ISS-1403-0089",
    documentType: "ISSUE_RAW_MATERIAL",
    documentDate: "2024-10-20T08:00:00.000Z",
    documentStatus: "CONFIRMED",
    postingStatus: "POSTED",
    warehouseId: "WH-RAW",
    warehouseName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0631\u06A9\u0632\u06CC \u0631\u0648\u0644 \u0648 \u0648\u0631\u0642 \u0633\u0627\u067E\u06A9\u0648",
    targetWarehouseId: "WH-WIP-STAMP",
    targetWarehouseName: "\u0627\u0646\u0628\u0627\u0631 \u067E\u0627\u06CC \u06A9\u0627\u0631 \u0633\u0627\u0644\u0646 \u067E\u0631\u0633 (WIP)",
    ownership: "SAPCO_SUPPLIER_OWNED",
    contractId: "CNT-SAPCO-1403-Q3",
    contractNumber: "CNT-SAPCO-1403-Q3",
    referenceType: "MANUFACTURING_ORDER",
    referenceNumber: "MO-1403-1082",
    lines: [
      {
        id: "LINE-ISS-01",
        documentId: "DOC-ISS-1403-0089",
        lineNumber: 1,
        partId: "PRT-RAW-001",
        partCode: "SAPCO-COIL-DC04-0.8",
        partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 DC04 \u0636\u062E\u0627\u0645\u062A 0.8mm \u0633\u0627\u067E\u06A9\u0648",
        lotNumber: "COIL-SAP-1403-0498",
        heatNumber: "HT-MOB-98241",
        ownership: "SAPCO_SUPPLIER_OWNED",
        contractId: "CNT-SAPCO-1403-Q3",
        contractNumber: "CNT-SAPCO-1403-Q3",
        locationCode: "LOC-RAW-A1",
        quantity: 5450,
        unit: "KG",
        quantityKg: 5450,
        qualityStatus: "AVAILABLE",
        notes: "\u062D\u0648\u0627\u0644\u0647 \u0645\u0635\u0631\u0641 \u0648\u0631\u0642 \u062C\u0647\u062A \u062A\u0648\u0644\u06CC\u062F \u06F3\u06F0\u06F0\u06F0 \u0642\u0637\u0639\u0647 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u06F2\u06F0\u06F6"
      }
    ],
    totalQuantity: 5450,
    totalWeightKg: 5450,
    createdByUid: "USR-WH-01",
    createdByName: "\u0645\u0631\u0627\u062F\u06CC (\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631)",
    postedByUid: "USR-WH-01",
    postedByName: "\u0645\u0631\u0627\u062F\u06CC (\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631)",
    postedAt: "2024-10-20T08:15:00.000Z",
    createdAt: "2024-10-20T08:00:00.000Z",
    updatedAt: "2024-10-20T08:15:00.000Z"
  },
  // 4. Finished Goods Receipt from Assembly Line (POSTED)
  {
    id: "DOC-REC-FIN-1403-001",
    documentNumber: "REC-FIN-1403-0042",
    documentType: "RECEIPT_FINISHED_GOODS",
    documentDate: "2024-10-25T16:00:00.000Z",
    documentStatus: "CONFIRMED",
    postingStatus: "POSTED",
    warehouseId: "WH-FINISHED",
    warehouseName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u062D\u0635\u0648\u0644\u0627\u062A \u0646\u0647\u0627\u06CC\u06CC \u0622\u0645\u0627\u062F\u0647 \u062A\u062D\u0648\u06CC\u0644",
    ownership: "COMPANY_OWNED",
    referenceType: "PRODUCTION_REPORT",
    referenceNumber: "PR-1403-1025",
    lines: [
      {
        id: "LINE-FIN-01",
        documentId: "DOC-REC-FIN-1403-001",
        lineNumber: 1,
        partId: "PRT-FIN-001",
        partCode: "IKCO-206-BRK01",
        partName: "\u0628\u0631\u0627\u06A9\u062A \u0627\u062A\u0635\u0627\u0644 \u0631\u0627\u0645 \u062C\u0644\u0648 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0648 \u06F2\u06F0\u06F7 (\u0645\u062C\u0645\u0648\u0639\u0647 \u0646\u0647\u0627\u06CC\u06CC)",
        lotNumber: "LOT-FIN-206-W43",
        ownership: "COMPANY_OWNED",
        locationCode: "LOC-FIN-P1",
        quantity: 1850,
        unit: "PCS",
        quantityKg: 3182,
        // 1850 * 1.72 kg
        qualityStatus: "AVAILABLE",
        notes: "\u062A\u062D\u0648\u06CC\u0644 \u06F1\u06F8\u06F5\u06F0 \u0639\u062F\u062F \u0628\u0631\u0627\u06A9\u062A \u0633\u0627\u0644\u0645 \u062A\u0627\u06CC\u06CC\u062F \u0634\u062F\u0647 QC"
      }
    ],
    totalQuantity: 1850,
    totalWeightKg: 3182,
    createdByUid: "USR-QC-01",
    createdByName: "\u0628\u0627\u0632\u0631\u0633 \u06A9\u0646\u062A\u0631\u0644 \u06A9\u06CC\u0641\u06CC\u062A",
    postedByUid: "USR-QC-01",
    postedByName: "\u0628\u0627\u0632\u0631\u0633 \u06A9\u0646\u062A\u0631\u0644 \u06A9\u06CC\u0641\u06CC\u062A",
    postedAt: "2024-10-25T16:30:00.000Z",
    createdAt: "2024-10-25T16:00:00.000Z",
    updatedAt: "2024-10-25T16:30:00.000Z"
  },
  // 5. Inter-Warehouse Transfer (POSTED)
  {
    id: "DOC-TRF-1403-0012",
    documentNumber: "TRF-1403-0012",
    documentType: "TRANSFER",
    documentDate: "2024-10-26T10:00:00.000Z",
    documentStatus: "CONFIRMED",
    postingStatus: "POSTED",
    warehouseId: "WH-FINISHED",
    warehouseName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u062D\u0635\u0648\u0644\u0627\u062A \u0646\u0647\u0627\u06CC\u06CC \u0622\u0645\u0627\u062F\u0647 \u062A\u062D\u0648\u06CC\u0644",
    targetWarehouseId: "WH-RAW",
    targetWarehouseName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0631\u06A9\u0632\u06CC \u0631\u0648\u0644 \u0648 \u0648\u0631\u0642 \u0633\u0627\u067E\u06A9\u0648",
    ownership: "COMPANY_OWNED",
    referenceType: "INTERNAL_TRANSFER",
    referenceNumber: "RELOC-1403-88",
    lines: [
      {
        id: "LINE-TRF-01",
        documentId: "DOC-TRF-1403-0012",
        lineNumber: 1,
        partId: "PRT-FIN-001",
        partCode: "IKCO-206-BRK01",
        partName: "\u0628\u0631\u0627\u06A9\u062A \u0627\u062A\u0635\u0627\u0644 \u0631\u0627\u0645 \u062C\u0644\u0648 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0648 \u06F2\u06F0\u06F7 (\u0645\u062C\u0645\u0648\u0639\u0647 \u0646\u0647\u0627\u06CC\u06CC)",
        locationCode: "LOC-FIN-P1",
        targetLocationCode: "LOC-RAW-B2",
        quantity: 200,
        unit: "PCS",
        quantityKg: 344,
        ownership: "COMPANY_OWNED",
        qualityStatus: "AVAILABLE",
        notes: "\u0627\u0646\u062A\u0642\u0627\u0644 \u0645\u0648\u0642\u062A \u06F2\u06F0\u06F0 \u067E\u0627\u0644\u062A \u0628\u0647 \u0633\u0627\u0644\u0646 A \u0628\u0647 \u0639\u0644\u062A \u062A\u06A9\u0645\u06CC\u0644 \u0638\u0631\u0641\u06CC\u062A \u0627\u0646\u0628\u0627\u0631 \u0645\u062D\u0635\u0648\u0644"
      }
    ],
    totalQuantity: 200,
    totalWeightKg: 344,
    createdByUid: "USR-WH-01",
    createdByName: "\u0645\u0631\u0627\u062F\u06CC (\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631)",
    postedByUid: "USR-WH-01",
    postedByName: "\u0645\u0631\u0627\u062F\u06CC (\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631)",
    postedAt: "2024-10-26T10:15:00.000Z",
    createdAt: "2024-10-26T10:00:00.000Z",
    updatedAt: "2024-10-26T10:15:00.000Z"
  },
  // 6. Inventory Adjustment (POSTED)
  {
    id: "DOC-ADJ-1403-0004",
    documentNumber: "ADJ-1403-0004",
    documentType: "ADJUSTMENT",
    documentDate: "2024-10-27T11:00:00.000Z",
    documentStatus: "CONFIRMED",
    postingStatus: "POSTED",
    warehouseId: "WH-RAW",
    warehouseName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0631\u06A9\u0632\u06CC \u0631\u0648\u0644 \u0648 \u0648\u0631\u0642 \u0633\u0627\u067E\u06A9\u0648",
    ownership: "SAPCO_SUPPLIER_OWNED",
    contractId: "CNT-SAPCO-1403-Q3",
    contractNumber: "CNT-SAPCO-1403-Q3",
    referenceType: "AUDIT_DISCREPANCY",
    referenceNumber: "DISC-SCALE-88",
    adjustmentReason: "\u0627\u062E\u062A\u0644\u0627\u0641 \u0628\u0627\u0633\u06A9\u0648\u0644 \u0648 \u0627\u0641\u062A \u0631\u0637\u0648\u0628\u062A \u06A9\u0644\u0627\u0641 \u0637\u0628\u0642 \u0635\u0648\u0631\u062A\u062C\u0644\u0633\u0647 \u0628\u0627\u0632\u0631\u0633\u06CC \u0645\u0634\u062A\u0631\u06A9 \u0633\u0627\u067E\u06A9\u0648",
    auditNote: "\u062A\u0627\u06CC\u06CC\u062F \u0634\u062F\u0647 \u062A\u0648\u0633\u0637 \u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC \u0645\u062F\u06CC\u0631 \u06A9\u0627\u0631\u062E\u0627\u0646\u0647 \u0648 \u0646\u0645\u0627\u06CC\u0646\u062F\u0647 \u0645\u0642\u06CC\u0645 \u0633\u0627\u067E\u06A9\u0648",
    lines: [
      {
        id: "LINE-ADJ-01",
        documentId: "DOC-ADJ-1403-0004",
        lineNumber: 1,
        partId: "PRT-RAW-001",
        partCode: "SAPCO-COIL-DC04-0.8",
        partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 DC04 \u0636\u062E\u0627\u0645\u062A 0.8mm \u0633\u0627\u067E\u06A9\u0648",
        lotNumber: "COIL-SAP-1403-0498",
        heatNumber: "HT-MOB-98241",
        ownership: "SAPCO_SUPPLIER_OWNED",
        contractId: "CNT-SAPCO-1403-Q3",
        contractNumber: "CNT-SAPCO-1403-Q3",
        locationCode: "LOC-RAW-A1",
        quantity: -50,
        // 50 kg scale adjustment
        unit: "KG",
        quantityKg: -50,
        qualityStatus: "AVAILABLE",
        notes: "\u062A\u0639\u062F\u06CC\u0644 \u0645\u0646\u0641\u06CC \u06F5\u06F0 \u06A9\u06CC\u0644\u0648\u06AF\u0631\u0645 \u0627\u062E\u062A\u0644\u0627\u0641 \u062A\u0648\u0632\u06CC\u0646 \u0628\u0627\u0633\u06A9\u0648\u0644"
      }
    ],
    totalQuantity: -50,
    totalWeightKg: -50,
    createdByUid: "USR-ADMIN",
    createdByName: "\u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC (\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645)",
    postedByUid: "USR-ADMIN",
    postedByName: "\u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC (\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645)",
    postedAt: "2024-10-27T11:20:00.000Z",
    createdAt: "2024-10-27T11:00:00.000Z",
    updatedAt: "2024-10-27T11:20:00.000Z"
  },
  // 7. DRAFT Document (UNPOSTED - Crucial Rule: Draft documents must not affect official stock!)
  {
    id: "DOC-DRAFT-1403-099",
    documentNumber: "DRF-REC-1403-0099",
    documentType: "RECEIPT_RAW_MATERIAL",
    documentDate: "2024-10-30T14:00:00.000Z",
    documentStatus: "DRAFT",
    postingStatus: "UNPOSTED",
    // UNPOSTED: MUST NOT ALTER STOCK
    warehouseId: "WH-RAW",
    warehouseName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0631\u06A9\u0632\u06CC \u0631\u0648\u0644 \u0648 \u0648\u0631\u0642 \u0633\u0627\u067E\u06A9\u0648",
    ownership: "SAPCO_SUPPLIER_OWNED",
    contractId: "CNT-SAPCO-1403-Q3",
    contractNumber: "CNT-SAPCO-1403-Q3",
    referenceType: "SAPCO_WAYBILL_PENDING",
    referenceNumber: "WB-PENDING-994",
    lines: [
      {
        id: "LINE-DRF-01",
        documentId: "DOC-DRAFT-1403-099",
        lineNumber: 1,
        partId: "PRT-RAW-001",
        partCode: "SAPCO-COIL-DC04-0.8",
        partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 DC04 \u0636\u062E\u0627\u0645\u062A 0.8mm \u0633\u0627\u067E\u06A9\u0648",
        lotNumber: "COIL-SAP-1403-0610",
        heatNumber: "HT-MOB-99411",
        ownership: "SAPCO_SUPPLIER_OWNED",
        contractId: "CNT-SAPCO-1403-Q3",
        contractNumber: "CNT-SAPCO-1403-Q3",
        locationCode: "LOC-RAW-B1",
        quantity: 15e3,
        unit: "KG",
        quantityKg: 15e3,
        qualityStatus: "QUARANTINE",
        notes: "\u067E\u06CC\u0634\u200C\u0646\u0648\u06CC\u0633 \u0628\u0627\u0631\u0646\u0627\u0645\u0647 \u062F\u0631 \u0631\u0627\u0647 - \u0647\u0646\u0648\u0632 \u0628\u0647 \u062A\u0627\u06CC\u06CC\u062F \u0628\u0627\u0633\u06A9\u0648\u0644 \u0646\u0631\u0633\u06CC\u062F\u0647 \u0627\u0633\u062A"
      }
    ],
    totalQuantity: 15e3,
    totalWeightKg: 15e3,
    createdByUid: "USR-WH-01",
    createdByName: "\u0645\u0631\u0627\u062F\u06CC (\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631)",
    createdAt: "2024-10-30T14:00:00.000Z",
    updatedAt: "2024-10-30T14:00:00.000Z"
  }
];
var INITIAL_INVENTORY_RESERVATIONS = [
  {
    id: "RES-1403-001",
    reservationNumber: "RES-1403-001",
    partId: "PRT-RAW-001",
    partCode: "SAPCO-COIL-DC04-0.8",
    partName: "\u06A9\u0648\u06CC\u0644 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642 DC04 \u0636\u062E\u0627\u0645\u062A 0.8mm \u0633\u0627\u067E\u06A9\u0648",
    warehouseId: "WH-RAW",
    warehouseName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0631\u06A9\u0632\u06CC \u0631\u0648\u0644 \u0648 \u0648\u0631\u0642 \u0633\u0627\u067E\u06A9\u0648",
    lotNumber: "COIL-SAP-1403-0498",
    ownership: "SAPCO_SUPPLIER_OWNED",
    reservedFor: "\u062F\u0633\u062A\u0648\u0631 \u0633\u0627\u062E\u062A \u0634\u0645\u0627\u0631\u0647 MO-1403-1082 (\u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u06F2\u06F0\u06F6)",
    quantity: 2e3,
    quantityKg: 2e3,
    unit: "KG",
    status: "ACTIVE",
    validUntil: "2024-11-10T00:00:00.000Z",
    createdAt: "2024-10-21T09:00:00.000Z"
  }
];
var INITIAL_AUDIT_LOGS = [
  {
    id: "AUD-001",
    action: "SYSTEM_INIT",
    entityName: "InventorySystem",
    entityId: "ALL",
    user: { uid: "USR-ADMIN", displayName: "\u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC (\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645)" },
    details: "\u0631\u0627\u0647\u200C\u0627\u0646\u062F\u0627\u0632\u06CC \u062F\u0641\u0627\u062A\u0631 \u0627\u0648\u0644\u06CC\u0647 \u0627\u0646\u0628\u0627\u0631 \u0648 \u062A\u0639\u0631\u06CC\u0641 \u0633\u0647\u0645\u06CC\u0647\u200C\u0647\u0627\u06CC \u0633\u0627\u067E\u06A9\u0648",
    timestamp: "2024-10-01T07:00:00.000Z"
  },
  {
    id: "AUD-002",
    action: "DOCUMENT_POST",
    entityName: "InventoryDocument",
    entityId: "OB-1403-0001",
    user: { uid: "USR-ADMIN", displayName: "\u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC (\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645)" },
    details: "\u062B\u0628\u062A \u0642\u0637\u0639\u06CC \u0633\u0646\u062F \u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0648\u0644 \u062F\u0648\u0631\u0647 \u0628\u0627 \u06F2 \u0631\u062F\u06CC\u0641 \u06A9\u0644\u0627\u0641 \u0628\u0647 \u0648\u0632\u0646 \u06F2\u06F6,\u06F7\u06F0\u06F0 \u06A9\u06CC\u0644\u0648\u06AF\u0631\u0645",
    timestamp: "2024-10-01T07:15:00.000Z"
  },
  {
    id: "AUD-003",
    action: "DOCUMENT_POST",
    entityName: "InventoryDocument",
    entityId: "REC-1403-0142",
    user: { uid: "USR-WH-01", displayName: "\u0645\u0631\u0627\u062F\u06CC (\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631)" },
    details: "\u0631\u0633\u06CC\u062F \u0642\u0637\u0639\u06CC \u06A9\u0644\u0627\u0641 \u0634\u0645\u0627\u0631\u0647 COIL-SAP-1403-0520 \u0628\u0647 \u0648\u0632\u0646 \u06F1\u06F3,\u06F8\u06F0\u06F0 \u06A9\u06CC\u0644\u0648\u06AF\u0631\u0645 \u0628\u0627 \u0628\u0627\u0631\u0646\u0627\u0645\u0647 \u0633\u0627\u067E\u06A9\u0648",
    timestamp: "2024-10-15T09:20:00.000Z"
  },
  {
    id: "AUD-004",
    action: "DOCUMENT_POST",
    entityName: "InventoryDocument",
    entityId: "ISS-1403-0089",
    user: { uid: "USR-WH-01", displayName: "\u0645\u0631\u0627\u062F\u06CC (\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631)" },
    details: "\u062D\u0648\u0627\u0644\u0647 \u062E\u0631\u0648\u062C \u06F5,\u06F4\u06F5\u06F0 \u06A9\u06CC\u0644\u0648\u06AF\u0631\u0645 \u0648\u0631\u0642 \u0631\u0648\u063A\u0646\u06CC \u0628\u0647 \u0633\u0627\u0644\u0646 \u067E\u0631\u0633 \u0628\u0631\u0627\u06CC \u06A9\u0627\u0631\u062A \u0633\u0627\u062E\u062A MO-1403-1082",
    timestamp: "2024-10-20T08:15:00.000Z"
  }
];

// src/server/productionWipEngine.ts
var manufacturingOrdersStore = [];
var wipTransfersStore = [];
var productionLogsStore = [];
function getLocationForProcess(processType, stepNumber) {
  switch (processType) {
    case "SHEARING":
      return "LOC-RAW-B1";
    case "BLANKING":
      return "LOC-WIP-BLANK";
    case "DRAWING":
      return "LOC-WIP-DRAWN";
    case "PUNCH_FORM":
      return "LOC-WIP-PUNCH";
    case "BENDING":
      return "LOC-WIP-BEND";
    case "SPOT_WELD":
      return "LOC-WELD-IN";
    case "CO2_WELD":
      return "LOC-WELD-OUT";
    case "PAINT":
      return "LOC-PAINT-IN";
    case "ASSEMBLY":
      return "LOC-FIN-P1";
    default:
      return `LOC-WIP-OP${stepNumber}`;
  }
}
function initializeProductionWipSeed() {
  if (manufacturingOrdersStore.length > 0) return;
  const rtg206 = INITIAL_ROUTINGS.find((r) => r.partCode === "SAPCO-ASSY-206-001") || INITIAL_ROUTINGS[0];
  const rtgTara = INITIAL_ROUTINGS.find((r) => r.partCode === "SAPCO-ASSY-TAR-002") || INITIAL_ROUTINGS[1];
  const mo1Ops = rtg206.operations.map((op, idx) => ({
    id: `MOP-2026-001-${op.stepNumber}`,
    moId: "MO-2026-001",
    moNumber: "MO-2026-001",
    stepNumber: op.stepNumber,
    stepCode: op.stepCode,
    stepName: op.stepName,
    processType: op.processType,
    sequence: idx + 1,
    machineId: op.machineId,
    machineName: op.machineName,
    warehouseLocation: getLocationForProcess(op.processType, op.stepNumber),
    status: idx === 0 ? "COMPLETED" : idx <= 3 ? "IN_PROGRESS" : "READY",
    waitingInputQty: 0,
    inProgressQty: 0,
    goodOutputQty: 0,
    scrapQty: 0,
    reworkQty: 0,
    rejectedQty: 0,
    readyForTransferQty: 0,
    transferredQty: 0,
    standardCycleTimeSec: op.standardCycleTimeSec,
    scrapNormPercent: op.scrapNormPercent,
    lastActivityAt: new Date(Date.now() - (7 - idx) * 3600 * 1e3).toISOString(),
    createdAt: new Date(Date.now() - 24 * 3600 * 1e3).toISOString()
  }));
  mo1Ops[0].waitingInputQty = 0;
  mo1Ops[0].inProgressQty = 0;
  mo1Ops[0].goodOutputQty = 990;
  mo1Ops[0].scrapQty = 10;
  mo1Ops[0].transferredQty = 990;
  mo1Ops[0].readyForTransferQty = 0;
  mo1Ops[0].status = "COMPLETED";
  mo1Ops[1].waitingInputQty = 0;
  mo1Ops[1].inProgressQty = 0;
  mo1Ops[1].goodOutputQty = 975;
  mo1Ops[1].scrapQty = 15;
  mo1Ops[1].transferredQty = 975;
  mo1Ops[1].readyForTransferQty = 0;
  mo1Ops[1].status = "COMPLETED";
  mo1Ops[2].waitingInputQty = 0;
  mo1Ops[2].inProgressQty = 50;
  mo1Ops[2].goodOutputQty = 900;
  mo1Ops[2].scrapQty = 5;
  mo1Ops[2].reworkQty = 20;
  mo1Ops[2].transferredQty = 500;
  mo1Ops[2].readyForTransferQty = 400;
  mo1Ops[2].status = "IN_PROGRESS";
  mo1Ops[3].waitingInputQty = 150;
  mo1Ops[3].inProgressQty = 100;
  mo1Ops[3].goodOutputQty = 240;
  mo1Ops[3].scrapQty = 10;
  mo1Ops[3].transferredQty = 100;
  mo1Ops[3].readyForTransferQty = 140;
  mo1Ops[3].status = "IN_PROGRESS";
  mo1Ops[4].waitingInputQty = 100;
  mo1Ops[4].inProgressQty = 0;
  mo1Ops[4].status = "READY";
  const mo1 = {
    id: "MO-2026-001",
    moNumber: "MO-2026-001",
    partId: rtg206.partId,
    partCode: rtg206.partCode,
    partName: rtg206.partName,
    targetQuantity: 1e3,
    initialInputQuantity: 1e3,
    completedQuantity: 0,
    totalScrapQuantity: 40,
    // 10 + 15 + 5 + 10
    totalReworkQuantity: 20,
    totalRejectedQuantity: 0,
    routingId: rtg206.id,
    routingVersion: rtg206.version,
    status: "IN_PROGRESS",
    startDate: new Date(Date.now() - 48 * 3600 * 1e3).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 48 * 3600 * 1e3).toISOString().slice(0, 10),
    operations: mo1Ops,
    notes: "\u0633\u0641\u0627\u0631\u0634 \u0641\u0648\u0631\u06CC \u062E\u0637 \u0645\u0648\u0646\u062A\u0627\u0698 \u0627\u06CC\u0631\u0627\u0646\u200C\u062E\u0648\u062F\u0631\u0648 - \u06A9\u0644\u0627\u0641 \u0648\u0631\u0642 ST14 \u0633\u0627\u067E\u06A9\u0648",
    createdBy: "\u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC (\u0645\u062F\u06CC\u0631 \u062A\u0648\u0644\u06CC\u062F)",
    createdAt: new Date(Date.now() - 48 * 3600 * 1e3).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const mo2Ops = rtgTara.operations.map((op, idx) => ({
    id: `MOP-2026-002-${op.stepNumber}`,
    moId: "MO-2026-002",
    moNumber: "MO-2026-002",
    stepNumber: op.stepNumber,
    stepCode: op.stepCode,
    stepName: op.stepName,
    processType: op.processType,
    sequence: idx + 1,
    machineId: op.machineId,
    machineName: op.machineName,
    warehouseLocation: getLocationForProcess(op.processType, op.stepNumber),
    status: idx === 0 ? "IN_PROGRESS" : "PENDING",
    waitingInputQty: idx === 0 ? 300 : 0,
    inProgressQty: idx === 0 ? 200 : 0,
    goodOutputQty: 0,
    scrapQty: 0,
    reworkQty: 0,
    rejectedQty: 0,
    readyForTransferQty: 0,
    transferredQty: 0,
    standardCycleTimeSec: op.standardCycleTimeSec,
    scrapNormPercent: op.scrapNormPercent,
    lastActivityAt: new Date(Date.now() - 2 * 3600 * 1e3).toISOString(),
    createdAt: new Date(Date.now() - 12 * 3600 * 1e3).toISOString()
  }));
  const mo2 = {
    id: "MO-2026-002",
    moNumber: "MO-2026-002",
    partId: rtgTara.partId,
    partCode: rtgTara.partCode,
    partName: rtgTara.partName,
    targetQuantity: 500,
    initialInputQuantity: 500,
    completedQuantity: 0,
    totalScrapQuantity: 0,
    totalReworkQuantity: 0,
    totalRejectedQuantity: 0,
    routingId: rtgTara.id,
    routingVersion: rtgTara.version,
    status: "IN_PROGRESS",
    startDate: new Date(Date.now() - 12 * 3600 * 1e3).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 72 * 3600 * 1e3).toISOString().slice(0, 10),
    operations: mo2Ops,
    notes: "\u067E\u0631\u0648\u0698\u0647 \u062A\u0627\u0631\u0627 \u0641\u0627\u0632 \u06F2 - \u0648\u0631\u0642 \u06AF\u0627\u0644\u0648\u0627\u0646\u06CC\u0632\u0647 DX51D \u0633\u0627\u067E\u06A9\u0648",
    createdBy: "\u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC",
    createdAt: new Date(Date.now() - 12 * 3600 * 1e3).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const mo3Ops = rtg206.operations.map((op, idx) => ({
    id: `MOP-2026-003-${op.stepNumber}`,
    moId: "MO-2026-003",
    moNumber: "MO-2026-003",
    stepNumber: op.stepNumber,
    stepCode: op.stepCode,
    stepName: op.stepName,
    processType: op.processType,
    sequence: idx + 1,
    machineId: op.machineId,
    machineName: op.machineName,
    warehouseLocation: getLocationForProcess(op.processType, op.stepNumber),
    status: idx === 0 ? "READY" : "PENDING",
    waitingInputQty: idx === 0 ? 600 : 0,
    inProgressQty: 0,
    goodOutputQty: 0,
    scrapQty: 0,
    reworkQty: 0,
    rejectedQty: 0,
    readyForTransferQty: 0,
    transferredQty: 0,
    standardCycleTimeSec: op.standardCycleTimeSec,
    scrapNormPercent: op.scrapNormPercent,
    lastActivityAt: (/* @__PURE__ */ new Date()).toISOString(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  }));
  const mo3 = {
    id: "MO-2026-003",
    moNumber: "MO-2026-003",
    partId: rtg206.partId,
    partCode: rtg206.partCode,
    partName: rtg206.partName,
    targetQuantity: 600,
    initialInputQuantity: 600,
    completedQuantity: 0,
    totalScrapQuantity: 0,
    totalReworkQuantity: 0,
    totalRejectedQuantity: 0,
    routingId: rtg206.id,
    routingVersion: rtg206.version,
    status: "RELEASED",
    startDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 96 * 3600 * 1e3).toISOString().slice(0, 10),
    operations: mo3Ops,
    notes: "\u0628\u0686 \u062F\u0648\u0645 \u0642\u0637\u0639\u0647 \u06F2\u06F0\u06F6 \u0637\u0628\u0642 \u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F\u06CC \u0647\u0641\u062A\u06AF\u06CC",
    createdBy: "\u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  manufacturingOrdersStore.push(mo1, mo2, mo3);
  wipTransfersStore.push(
    {
      id: "TRF-2026-001",
      transferNumber: "TRF-2026-001",
      moId: "MO-2026-001",
      moNumber: "MO-2026-001",
      partId: rtg206.partId,
      partCode: rtg206.partCode,
      partName: rtg206.partName,
      fromOperationId: mo1Ops[0].id,
      fromStepNumber: 10,
      fromStepName: mo1Ops[0].stepName,
      fromLocation: mo1Ops[0].warehouseLocation,
      toOperationId: mo1Ops[1].id,
      toStepNumber: 20,
      toStepName: mo1Ops[1].stepName,
      toLocation: mo1Ops[1].warehouseLocation,
      quantity: 990,
      status: "APPROVED",
      dispatchedBy: "\u0639\u0644\u06CC \u0631\u0636\u0627\u06CC\u06CC (\u0633\u0631\u067E\u0631\u0633\u062A \u0628\u0631\u0634)",
      dispatchedAt: new Date(Date.now() - 20 * 3600 * 1e3).toISOString(),
      receivedBy: "\u0631\u0636\u0627 \u06A9\u0631\u06CC\u0645\u06CC (\u0627\u067E\u0631\u0627\u062A\u0648\u0631 \u067E\u0631\u0633 \u06F2\u06F5\u06F0)",
      receivedAt: new Date(Date.now() - 19 * 3600 * 1e3).toISOString(),
      notes: "\u067E\u0627\u0644\u062A \u067E\u0644\u0627\u0633\u062A\u06CC\u06A9\u06CC \u06A9\u062F\u0631\u0646\u06AF\u06CC \u0622\u0628\u06CC \u062D\u0627\u0648\u06CC \u06F9\u06F9\u06F0 \u0634\u06CC\u062A \u0646\u0648\u0627\u0631\u0628\u0631\u06CC \u0634\u062F\u0647"
    },
    {
      id: "TRF-2026-002",
      transferNumber: "TRF-2026-002",
      moId: "MO-2026-001",
      moNumber: "MO-2026-001",
      partId: rtg206.partId,
      partCode: rtg206.partCode,
      partName: rtg206.partName,
      fromOperationId: mo1Ops[1].id,
      fromStepNumber: 20,
      fromStepName: mo1Ops[1].stepName,
      fromLocation: mo1Ops[1].warehouseLocation,
      toOperationId: mo1Ops[2].id,
      toStepNumber: 30,
      toStepName: mo1Ops[2].stepName,
      toLocation: mo1Ops[2].warehouseLocation,
      quantity: 975,
      status: "APPROVED",
      dispatchedBy: "\u0631\u0636\u0627 \u06A9\u0631\u06CC\u0645\u06CC",
      dispatchedAt: new Date(Date.now() - 15 * 3600 * 1e3).toISOString(),
      receivedBy: "\u0627\u0633\u062A\u0627\u062F \u0627\u062D\u0645\u062F\u06CC (\u067E\u0631\u0633 \u0634\u0648\u0644\u0631 \u06F4\u06F0\u06F0)",
      receivedAt: new Date(Date.now() - 14 * 3600 * 1e3).toISOString(),
      notes: "\u0628\u0644\u0646\u06A9\u200C\u0647\u0627\u06CC \u062A\u0645\u06CC\u0632\u06A9\u0627\u0631\u06CC \u0634\u062F\u0647 \u0628\u062F\u0648\u0646 \u067E\u0644\u06CC\u0633\u0647"
    },
    {
      id: "TRF-2026-003",
      transferNumber: "TRF-2026-003",
      moId: "MO-2026-001",
      moNumber: "MO-2026-001",
      partId: rtg206.partId,
      partCode: rtg206.partCode,
      partName: rtg206.partName,
      fromOperationId: mo1Ops[2].id,
      fromStepNumber: 30,
      fromStepName: mo1Ops[2].stepName,
      fromLocation: mo1Ops[2].warehouseLocation,
      toOperationId: mo1Ops[3].id,
      toStepNumber: 40,
      toStepName: mo1Ops[3].stepName,
      toLocation: mo1Ops[3].warehouseLocation,
      quantity: 500,
      status: "APPROVED",
      dispatchedBy: "\u0627\u0633\u062A\u0627\u062F \u0627\u062D\u0645\u062F\u06CC",
      dispatchedAt: new Date(Date.now() - 10 * 3600 * 1e3).toISOString(),
      receivedBy: "\u062D\u0633\u06CC\u0646 \u0645\u0631\u0627\u062F\u06CC (\u067E\u0631\u0633 \u0628\u0631\u06A9)",
      receivedAt: new Date(Date.now() - 9 * 3600 * 1e3).toISOString(),
      notes: "\u067E\u0627\u0631\u062A \u0627\u0648\u0644 \u0627\u0646\u062A\u0642\u0627\u0644 \u0628\u0647 \u062E\u0645\u200C\u06A9\u0627\u0631\u06CC"
    },
    {
      id: "TRF-2026-004",
      transferNumber: "TRF-2026-004",
      moId: "MO-2026-001",
      moNumber: "MO-2026-001",
      partId: rtg206.partId,
      partCode: rtg206.partCode,
      partName: rtg206.partName,
      fromOperationId: mo1Ops[3].id,
      fromStepNumber: 40,
      fromStepName: mo1Ops[3].stepName,
      fromLocation: mo1Ops[3].warehouseLocation,
      toOperationId: mo1Ops[4].id,
      toStepNumber: 50,
      toStepName: mo1Ops[4].stepName,
      toLocation: mo1Ops[4].warehouseLocation,
      quantity: 100,
      status: "APPROVED",
      dispatchedBy: "\u062D\u0633\u06CC\u0646 \u0645\u0631\u0627\u062F\u06CC",
      dispatchedAt: new Date(Date.now() - 4 * 3600 * 1e3).toISOString(),
      receivedBy: "\u0633\u0639\u06CC\u062F \u0628\u0627\u0642\u0631\u06CC (\u067E\u0631\u0633\u200C\u062C\u0648\u0634)",
      receivedAt: new Date(Date.now() - 3 * 3600 * 1e3).toISOString(),
      notes: "\u067E\u0627\u0631\u062A \u0627\u0648\u0644 \u062E\u0645 U \u062C\u0647\u062A \u067E\u0631\u0633\u200C\u062C\u0648\u0634 \u0645\u0647\u0631\u0647"
    }
  );
}
initializeProductionWipSeed();
function getManufacturingOrdersList() {
  return manufacturingOrdersStore;
}
function getManufacturingOrderById(id) {
  return manufacturingOrdersStore.find((m) => m.id === id || m.moNumber === id);
}
function createManufacturingOrder(params) {
  const part = INITIAL_PARTS.find((p) => p.id === params.partId || p.code === params.partId);
  if (!part) {
    return { success: false, error: "\u0642\u0637\u0639\u0647 \u0645\u0648\u0631\u062F \u0646\u0638\u0631 \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  }
  let routing = params.routingId ? INITIAL_ROUTINGS.find((r) => r.id === params.routingId) : INITIAL_ROUTINGS.find((r) => r.partId === part.id || r.partCode === part.code);
  if (!routing) {
    routing = INITIAL_ROUTINGS[0];
  }
  const moId = `MO-2026-${String(manufacturingOrdersStore.length + 1).padStart(3, "0")}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const initialInput = params.initialInputQuantity && params.initialInputQuantity > 0 ? params.initialInputQuantity : params.targetQuantity;
  const operations = routing.operations.map((op, idx) => ({
    id: `MOP-${moId}-${op.stepNumber}`,
    moId,
    moNumber: moId,
    stepNumber: op.stepNumber,
    stepCode: op.stepCode,
    stepName: op.stepName,
    processType: op.processType,
    sequence: idx + 1,
    machineId: op.machineId,
    machineName: op.machineName,
    warehouseLocation: getLocationForProcess(op.processType, op.stepNumber),
    status: idx === 0 ? "READY" : "PENDING",
    waitingInputQty: idx === 0 ? initialInput : 0,
    // Load initial raw material/blanks into OP 1
    inProgressQty: 0,
    goodOutputQty: 0,
    scrapQty: 0,
    reworkQty: 0,
    rejectedQty: 0,
    readyForTransferQty: 0,
    transferredQty: 0,
    standardCycleTimeSec: op.standardCycleTimeSec,
    scrapNormPercent: op.scrapNormPercent,
    lastActivityAt: now,
    createdAt: now
  }));
  const newMo = {
    id: moId,
    moNumber: moId,
    partId: part.id,
    partCode: part.code,
    partName: part.name,
    targetQuantity: params.targetQuantity,
    initialInputQuantity: initialInput,
    completedQuantity: 0,
    totalScrapQuantity: 0,
    totalReworkQuantity: 0,
    totalRejectedQuantity: 0,
    routingId: routing.id,
    routingVersion: routing.version,
    status: "RELEASED",
    startDate: params.startDate || now.slice(0, 10),
    dueDate: params.dueDate || new Date(Date.now() + 5 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
    operations,
    notes: params.notes || `\u062F\u0633\u062A\u0648\u0631 \u06A9\u0627\u0631 \u062A\u0648\u0644\u06CC\u062F \u0645\u0628\u062A\u0646\u06CC \u0628\u0631 \u0645\u0633\u06CC\u0631 \u0641\u0631\u0622\u06CC\u0646\u062F \u0645\u0635\u0648\u0628 \u0646\u0633\u062E\u0647 ${routing.version}`,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now
  };
  manufacturingOrdersStore.unshift(newMo);
  productionLogsStore.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    moId,
    moNumber: moId,
    operationId: operations[0].id,
    stepNumber: operations[0].stepNumber,
    stepName: operations[0].stepName,
    activityType: "INPUT_LOAD",
    quantity: initialInput,
    operatorName: params.createdBy,
    timestamp: now,
    notes: `\u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u0627\u0648\u0644\u06CC\u0647 \u0645\u0648\u0627\u062F/\u0634\u06CC\u062A \u0628\u0647 \u0645\u0631\u062D\u0644\u0647 \u06F1 (${operations[0].stepName})`
  });
  return { success: true, data: newMo };
}
function registerOperationInput(params) {
  const mo = manufacturingOrdersStore.find((m) => m.id === params.moId);
  if (!mo) return { success: false, error: "\u062F\u0633\u062A\u0648\u0631 \u062A\u0648\u0644\u06CC\u062F \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  const op = mo.operations.find((o) => o.id === params.operationId);
  if (!op) return { success: false, error: "\u0645\u0631\u062D\u0644\u0647 \u0639\u0645\u0644\u06CC\u0627\u062A\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  if (params.quantity <= 0) {
    return { success: false, error: "\u0645\u0642\u062F\u0627\u0631 \u0648\u0631\u0648\u062F\u06CC \u0628\u0627\u06CC\u062F \u0628\u0632\u0631\u06AF\u062A\u0631 \u0627\u0632 \u0635\u0641\u0631 \u0628\u0627\u0634\u062F." };
  }
  if (params.quantity > op.waitingInputQty) {
    return {
      success: false,
      error: `\u0645\u0648\u062C\u0648\u062F\u06CC \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0631\u0627\u06CC \u0634\u0631\u0648\u0639 \u067E\u0631\u062F\u0627\u0632\u0634 \u06A9\u0627\u0641\u06CC \u0646\u06CC\u0633\u062A. \u0645\u0648\u062C\u0648\u062F\u06CC \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631: ${op.waitingInputQty}\u060C \u0645\u0642\u062F\u0627\u0631 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC: ${params.quantity}`
    };
  }
  op.waitingInputQty -= params.quantity;
  op.inProgressQty += params.quantity;
  op.status = "IN_PROGRESS";
  op.lastActivityAt = (/* @__PURE__ */ new Date()).toISOString();
  if (params.machineId) op.machineId = params.machineId;
  mo.status = "IN_PROGRESS";
  mo.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  productionLogsStore.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    moId: mo.id,
    moNumber: mo.moNumber,
    operationId: op.id,
    stepNumber: op.stepNumber,
    stepName: op.stepName,
    activityType: "INPUT_LOAD",
    quantity: params.quantity,
    operatorName: params.operatorName,
    machineId: params.machineId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    notes: params.notes
  });
  return { success: true, data: mo };
}
function registerOperationProduction(params) {
  const mo = manufacturingOrdersStore.find((m) => m.id === params.moId);
  if (!mo) return { success: false, error: "\u062F\u0633\u062A\u0648\u0631 \u062A\u0648\u0644\u06CC\u062F \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  const op = mo.operations.find((o) => o.id === params.operationId);
  if (!op) return { success: false, error: "\u0645\u0631\u062D\u0644\u0647 \u0639\u0645\u0644\u06CC\u0627\u062A\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  const good = Math.max(0, Number(params.goodQty) || 0);
  const scrap = Math.max(0, Number(params.scrapQty) || 0);
  const rework = Math.max(0, Number(params.reworkQty) || 0);
  const rejected = Math.max(0, Number(params.rejectedQty) || 0);
  const totalReported = good + scrap + rework + rejected;
  if (totalReported <= 0) {
    return { success: false, error: "\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9\u06CC \u0627\u0632 \u0645\u0642\u0627\u062F\u06CC\u0631 \u062A\u0648\u0644\u06CC\u062F \u0633\u0627\u0644\u0645\u060C \u0636\u0627\u06CC\u0639\u0627\u062A \u06CC\u0627 \u062F\u0648\u0628\u0627\u0631\u0647\u200C\u06A9\u0627\u0631\u06CC \u0628\u0627\u06CC\u062F \u062B\u0628\u062A \u0634\u0648\u062F." };
  }
  if (totalReported > op.inProgressQty) {
    return {
      success: false,
      error: `\u0645\u062C\u0645\u0648\u0639 \u0642\u0637\u0639\u0627\u062A \u0627\u0639\u0644\u0627\u0645\u06CC (${totalReported}) \u0627\u0632 \u0645\u0648\u062C\u0648\u062F\u06CC \u062F\u0631 \u062D\u0627\u0644 \u0633\u0627\u062E\u062A \u067E\u0627\u06CC \u062F\u0633\u062A\u06AF\u0627\u0647 (${op.inProgressQty}) \u0628\u06CC\u0634\u062A\u0631 \u0627\u0633\u062A.`
    };
  }
  if (scrap > 0 && !params.scrapReason) {
    return { success: false, error: "\u062F\u0631 \u0635\u0648\u0631\u062A \u0648\u062C\u0648\u062F \u0636\u0627\u06CC\u0639\u0627\u062A\u060C \u0627\u0646\u062A\u062E\u0627\u0628 \u0639\u0644\u062A \u0636\u0627\u06CC\u0639\u0627\u062A \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." };
  }
  op.inProgressQty -= totalReported;
  op.goodOutputQty += good;
  op.readyForTransferQty += good;
  op.scrapQty += scrap;
  op.reworkQty += rework;
  op.rejectedQty += rejected;
  op.lastActivityAt = (/* @__PURE__ */ new Date()).toISOString();
  if (op.inProgressQty === 0 && op.waitingInputQty === 0) {
    op.status = op.readyForTransferQty > 0 ? "READY" : "COMPLETED";
  }
  mo.totalScrapQuantity += scrap;
  mo.totalReworkQuantity += rework;
  mo.totalRejectedQuantity += rejected;
  const isFinalOperation = op.sequence === mo.operations.length;
  if (isFinalOperation) {
    mo.completedQuantity += good;
    if (mo.completedQuantity >= mo.targetQuantity) {
      mo.status = "COMPLETED";
      mo.closedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
  }
  mo.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  productionLogsStore.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    moId: mo.id,
    moNumber: mo.moNumber,
    operationId: op.id,
    stepNumber: op.stepNumber,
    stepName: op.stepName,
    activityType: "PRODUCTION_RUN",
    quantity: totalReported,
    goodQty: good,
    scrapQty: scrap,
    reworkQty: rework,
    rejectedQty: rejected,
    scrapReason: params.scrapReason,
    operatorName: params.operatorName,
    machineId: params.machineId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    notes: params.notes
  });
  return { success: true, data: mo };
}
function createOperationTransfer(params) {
  const mo = manufacturingOrdersStore.find((m) => m.id === params.moId);
  if (!mo) return { success: false, error: "\u062F\u0633\u062A\u0648\u0631 \u062A\u0648\u0644\u06CC\u062F \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  const fromOp = mo.operations.find((o) => o.id === params.fromOperationId);
  if (!fromOp) return { success: false, error: "\u0645\u0631\u062D\u0644\u0647 \u0645\u0628\u062F\u0623 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  const qty = Number(params.quantity);
  if (qty <= 0) return { success: false, error: "\u062A\u0639\u062F\u0627\u062F \u0627\u0646\u062A\u0642\u0627\u0644 \u0628\u0627\u06CC\u062F \u0628\u0632\u0631\u06AF\u062A\u0631 \u0627\u0632 \u0635\u0641\u0631 \u0628\u0627\u0634\u062F." };
  if (qty > fromOp.readyForTransferQty) {
    return {
      success: false,
      error: `\u0645\u0648\u062C\u0648\u062F\u06CC \u0622\u0645\u0627\u062F\u0647 \u0627\u0646\u062A\u0642\u0627\u0644 (${fromOp.readyForTransferQty}) \u06A9\u0645\u062A\u0631 \u0627\u0632 \u0645\u0642\u062F\u0627\u0631 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC (${qty}) \u0627\u0633\u062A.`
    };
  }
  let toStepNumber = 999;
  let toStepName = "\u0627\u0646\u0628\u0627\u0631 \u0645\u062D\u0635\u0648\u0644 \u0646\u0647\u0627\u06CC\u06CC";
  let toLocation = "LOC-FIN-P1";
  if (params.toOperationId !== "STORE-FINISHED") {
    const toOp = mo.operations.find((o) => o.id === params.toOperationId);
    if (!toOp) return { success: false, error: "\u0645\u0631\u062D\u0644\u0647 \u0645\u0642\u0635\u062F \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
    toStepNumber = toOp.stepNumber;
    toStepName = toOp.stepName;
    toLocation = toOp.warehouseLocation;
  }
  fromOp.readyForTransferQty -= qty;
  fromOp.transferredQty += qty;
  fromOp.lastActivityAt = (/* @__PURE__ */ new Date()).toISOString();
  const transferNumber = `TRF-2026-${String(wipTransfersStore.length + 1).padStart(3, "0")}`;
  const transfer = {
    id: transferNumber,
    transferNumber,
    moId: mo.id,
    moNumber: mo.moNumber,
    partId: mo.partId,
    partCode: mo.partCode,
    partName: mo.partName,
    fromOperationId: fromOp.id,
    fromStepNumber: fromOp.stepNumber,
    fromStepName: fromOp.stepName,
    fromLocation: fromOp.warehouseLocation,
    toOperationId: params.toOperationId,
    toStepNumber,
    toStepName,
    toLocation,
    quantity: qty,
    status: "PENDING_APPROVAL",
    dispatchedBy: params.dispatchedBy,
    dispatchedAt: (/* @__PURE__ */ new Date()).toISOString(),
    notes: params.notes
  };
  wipTransfersStore.unshift(transfer);
  productionLogsStore.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    moId: mo.id,
    moNumber: mo.moNumber,
    operationId: fromOp.id,
    stepNumber: fromOp.stepNumber,
    stepName: fromOp.stepName,
    activityType: "TRANSFER_DISPATCH",
    quantity: qty,
    operatorName: params.dispatchedBy,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    notes: `\u0627\u0631\u0633\u0627\u0644 \u0645\u062D\u0645\u0648\u0644\u0647 \u0634\u0645\u0627\u0631\u0647 ${transferNumber} \u0628\u0647 ${toStepName} (\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u0623\u06CC\u06CC\u062F \u0648 \u062A\u062D\u0648\u06CC\u0644)`
  });
  return { success: true, data: transfer };
}
function approveOperationTransfer(params) {
  const transfer = wipTransfersStore.find((t) => t.id === params.transferId || t.transferNumber === params.transferId);
  if (!transfer) return { success: false, error: "\u062D\u0648\u0627\u0644\u0647 \u0627\u0646\u062A\u0642\u0627\u0644 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  if (transfer.status !== "PENDING_APPROVAL") {
    return { success: false, error: "\u0627\u06CC\u0646 \u062D\u0648\u0627\u0644\u0647 \u0642\u0628\u0644\u0627\u064B \u062A\u0639\u06CC\u06CC\u0646 \u062A\u06A9\u0644\u06CC\u0641 \u0634\u062F\u0647 \u0627\u0633\u062A." };
  }
  const mo = manufacturingOrdersStore.find((m) => m.id === transfer.moId);
  if (!mo) return { success: false, error: "\u062F\u0633\u062A\u0648\u0631 \u062A\u0648\u0644\u06CC\u062F \u0645\u062A\u0646\u0627\u0638\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  if (transfer.toOperationId !== "STORE-FINISHED") {
    const toOp = mo.operations.find((o) => o.id === transfer.toOperationId);
    if (!toOp) return { success: false, error: "\u0645\u0631\u062D\u0644\u0647 \u0645\u0642\u0635\u062F \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
    toOp.waitingInputQty += transfer.quantity;
    if (toOp.status === "PENDING") toOp.status = "READY";
    toOp.lastActivityAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  transfer.status = "APPROVED";
  transfer.receivedBy = params.receivedBy;
  transfer.receivedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (params.notes) transfer.notes = (transfer.notes ? `${transfer.notes} | ` : "") + params.notes;
  mo.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  productionLogsStore.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    moId: mo.id,
    moNumber: mo.moNumber,
    operationId: transfer.toOperationId,
    stepNumber: transfer.toStepNumber,
    stepName: transfer.toStepName,
    activityType: "TRANSFER_RECEIVE",
    quantity: transfer.quantity,
    operatorName: params.receivedBy,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    notes: `\u062A\u062D\u0648\u06CC\u0644 \u0642\u0637\u0639\u06CC \u062D\u0648\u0627\u0644\u0647 \u0634\u0645\u0627\u0631\u0647 ${transfer.transferNumber} \u062F\u0631 \u0645\u0642\u0635\u062F`
  });
  return { success: true, data: transfer };
}
function rejectOperationTransfer(params) {
  const transfer = wipTransfersStore.find((t) => t.id === params.transferId);
  if (!transfer) return { success: false, error: "\u062D\u0648\u0627\u0644\u0647 \u0627\u0646\u062A\u0642\u0627\u0644 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  if (transfer.status !== "PENDING_APPROVAL") {
    return { success: false, error: "\u0627\u0645\u06A9\u0627\u0646 \u0631\u062F \u0627\u06CC\u0646 \u062D\u0648\u0627\u0644\u0647 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F." };
  }
  const mo = manufacturingOrdersStore.find((m) => m.id === transfer.moId);
  if (!mo) return { success: false, error: "\u062F\u0633\u062A\u0648\u0631 \u062A\u0648\u0644\u06CC\u062F \u0645\u062A\u0646\u0627\u0638\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  const fromOp = mo.operations.find((o) => o.id === transfer.fromOperationId);
  if (!fromOp) return { success: false, error: "\u0645\u0631\u062D\u0644\u0647 \u0645\u0628\u062F\u0623 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  fromOp.readyForTransferQty += transfer.quantity;
  fromOp.transferredQty -= transfer.quantity;
  fromOp.lastActivityAt = (/* @__PURE__ */ new Date()).toISOString();
  transfer.status = "REJECTED";
  transfer.rejectionReason = params.rejectionReason;
  return { success: true, data: transfer };
}
function calculateMoReconciliation(moId) {
  const mo = manufacturingOrdersStore.find((m) => m.id === moId);
  if (!mo) return null;
  let totalWaiting = 0;
  let totalInProgress = 0;
  let totalReady = 0;
  let totalScrap = 0;
  let totalRework = 0;
  let totalRejected = 0;
  const operationsBreakdown = mo.operations.map((op) => {
    totalWaiting += op.waitingInputQty;
    totalInProgress += op.inProgressQty;
    totalReady += op.readyForTransferQty;
    totalScrap += op.scrapQty;
    totalRework += op.reworkQty;
    totalRejected += op.rejectedQty;
    return {
      stepNumber: op.stepNumber,
      stepCode: op.stepCode,
      stepName: op.stepName,
      waitingInput: op.waitingInputQty,
      inProgress: op.inProgressQty,
      readyForTransfer: op.readyForTransferQty,
      transferredOut: op.transferredQty,
      scrap: op.scrapQty,
      rework: op.reworkQty,
      rejected: op.rejectedQty
    };
  });
  const inTransitTransfers = wipTransfersStore.filter(
    (t) => t.moId === mo.id && t.status === "PENDING_APPROVAL"
  );
  const totalInTransit = inTransitTransfers.reduce((sum, t) => sum + t.quantity, 0);
  const totalCurrentWip = totalWaiting + totalInProgress + totalReady;
  const totalCompleted = mo.completedQuantity;
  const accountedTotal = totalCurrentWip + totalInTransit + totalCompleted + totalScrap + totalRework + totalRejected;
  const discrepancy = accountedTotal - mo.initialInputQuantity;
  return {
    moId: mo.id,
    moNumber: mo.moNumber,
    partCode: mo.partCode,
    partName: mo.partName,
    initialInputQuantity: mo.initialInputQuantity,
    totalCurrentWip,
    totalInTransit,
    totalCompleted,
    totalScrap,
    totalRework,
    totalRejected,
    accountedTotal,
    discrepancy,
    isConserved: discrepancy === 0,
    operationsBreakdown,
    auditTimestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function getWipDashboardMetrics() {
  let totalWaitingQty = 0;
  let totalInProgressQty = 0;
  let totalReadyForTransferQty = 0;
  let totalCompletedQty = 0;
  let totalScrapQty = 0;
  let totalReworkQty = 0;
  let totalRejectedQty = 0;
  const operationStatsMap = /* @__PURE__ */ new Map();
  const nowMs = Date.now();
  manufacturingOrdersStore.forEach((mo) => {
    totalCompletedQty += mo.completedQuantity;
    totalScrapQty += mo.totalScrapQuantity;
    totalReworkQty += mo.totalReworkQuantity;
    totalRejectedQty += mo.totalRejectedQuantity;
    mo.operations.forEach((op) => {
      totalWaitingQty += op.waitingInputQty;
      totalInProgressQty += op.inProgressQty;
      totalReadyForTransferQty += op.readyForTransferQty;
      const key = `${op.stepCode}_${op.stepName}`;
      const existing = operationStatsMap.get(key) || {
        operationName: op.stepName,
        stepCode: op.stepCode,
        waitingQty: 0,
        inProgressQty: 0,
        readyQty: 0,
        totalAgingHours: 0,
        count: 0
      };
      existing.waitingQty += op.waitingInputQty;
      existing.inProgressQty += op.inProgressQty;
      existing.readyQty += op.readyForTransferQty;
      const actTime = new Date(op.lastActivityAt || op.createdAt).getTime();
      const hoursAgo = Math.max(0, (nowMs - actTime) / (3600 * 1e3));
      existing.totalAgingHours += hoursAgo;
      existing.count += 1;
      operationStatsMap.set(key, existing);
    });
  });
  const pendingTransfers = wipTransfersStore.filter((t) => t.status === "PENDING_APPROVAL");
  const totalInTransitQty = pendingTransfers.reduce((s, t) => s + t.quantity, 0);
  const allConserved = manufacturingOrdersStore.every((mo) => {
    const rec = calculateMoReconciliation(mo.id);
    return rec ? rec.isConserved : true;
  });
  const bottleneckOperations = Array.from(operationStatsMap.values()).map((stat) => ({
    operationName: stat.operationName,
    stepCode: stat.stepCode,
    waitingQty: stat.waitingQty,
    inProgressQty: stat.inProgressQty,
    readyQty: stat.readyQty,
    agingHoursAvg: stat.count > 0 ? Math.round(stat.totalAgingHours / stat.count * 10) / 10 : 0
  })).sort((a, b) => b.waitingQty + b.inProgressQty - (a.waitingQty + a.inProgressQty));
  return {
    totalMoCount: manufacturingOrdersStore.length,
    activeMoCount: manufacturingOrdersStore.filter((m) => m.status === "IN_PROGRESS" || m.status === "RELEASED").length,
    totalWaitingQty,
    totalInProgressQty,
    totalReadyForTransferQty,
    totalInTransitQty,
    totalCompletedQty,
    totalScrapQty,
    totalReworkQty,
    totalRejectedQty,
    overallConservationIntegrity: allConserved,
    bottleneckOperations,
    pendingTransfersCount: pendingTransfers.length
  };
}

// src/server/productionPlanningEngine.ts
var customerOrdersStore = [
  {
    id: "ORD-2026-001",
    orderNumber: "SO-SAPCO-1405-88",
    customerName: "\u0634\u0631\u06A9\u062A \u0633\u0627\u067E\u06A9\u0648 (\u062A\u0623\u0645\u06CC\u0646 \u0642\u0637\u0639\u0627\u062A \u0627\u06CC\u0631\u0627\u0646\u200C\u062E\u0648\u062F\u0631\u0648)",
    contractNumber: "CNT-SAP-2026-001",
    orderDate: new Date(Date.now() - 3 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 6 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
    priority: 1,
    // Urgent
    status: "OPEN",
    notes: "\u062A\u0623\u0645\u06CC\u0646 \u0641\u0648\u0631\u06CC \u062E\u0637 \u0645\u0648\u0646\u062A\u0627\u0698 \u0628\u062F\u0646\u0647 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 - \u0633\u0627\u06CC\u062A \u062A\u0647\u0631\u0627\u0646",
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1e3).toISOString(),
    lines: [
      {
        id: "ORD-LN-001",
        orderId: "ORD-2026-001",
        partId: "PRT-FGD-001",
        partCode: "SAPCO-ASSY-206-001",
        partName: "\u0645\u062C\u0645\u0648\u0639\u0647 \u06A9\u0627\u0645\u0644 \u0628\u0631\u0627\u06A9\u062A \u0631\u0627\u0645 \u0632\u06CC\u0631 \u0631\u0627\u062F\u06CC\u0627\u062A\u0648\u0631 \u067E\u0698\u0648 \u06F2\u06F0\u06F6 \u0628\u0627 \u067E\u0648\u0634\u0634 ED \u0645\u0634\u06A9\u06CC",
        orderedQuantity: 1500,
        deliveredQuantity: 0,
        remainingQuantity: 1500,
        dueDate: new Date(Date.now() + 6 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
        unitPriceRials: 185e4
      }
    ]
  },
  {
    id: "ORD-2026-002",
    orderNumber: "SO-SAPCO-1405-92",
    customerName: "\u0634\u0631\u06A9\u062A \u0633\u0627\u067E\u06A9\u0648 (\u067E\u0631\u0648\u0698\u0647 \u062A\u0627\u0631\u0627)",
    contractNumber: "CNT-SAP-2026-002",
    orderDate: new Date(Date.now() - 2 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 8 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
    priority: 2,
    // Normal
    status: "OPEN",
    notes: "\u067E\u0627\u0631\u062A \u0645\u0627\u0647\u0627\u0646\u0647 \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062A\u0627\u0631\u0627 \u0628\u0627 \u06A9\u0631\u0627\u0634\u200C\u0628\u0627\u06A9\u0633",
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1e3).toISOString(),
    lines: [
      {
        id: "ORD-LN-002",
        orderId: "ORD-2026-002",
        partId: "PRT-FGD-002",
        partCode: "SAPCO-ASSY-TAR-002",
        partName: "\u0645\u062C\u0645\u0648\u0639\u0647 \u062F\u06CC\u0627\u0642 \u0633\u067E\u0631 \u062C\u0644\u0648 \u062A\u0627\u0631\u0627 \u0628\u0627 \u0628\u0631\u0627\u06A9\u062A\u200C\u0647\u0627\u06CC \u0636\u0631\u0628\u0647\u200C\u06AF\u06CC\u0631 \u06A9\u0631\u0627\u0634\u200C\u0628\u0627\u06A9\u0633",
        orderedQuantity: 800,
        deliveredQuantity: 0,
        remainingQuantity: 800,
        dueDate: new Date(Date.now() + 8 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
        unitPriceRials: 32e5
      }
    ]
  },
  {
    id: "ORD-2026-003",
    orderNumber: "SO-SAIPA-1405-14",
    customerName: "\u0634\u0631\u06A9\u062A \u0645\u06AF\u0627\u0645\u0648\u062A\u0648\u0631 / \u0633\u0627\u06CC\u067E\u0627",
    contractNumber: "CNT-SAI-2026-003",
    orderDate: new Date(Date.now() - 1 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 10 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
    priority: 2,
    status: "OPEN",
    notes: "\u0633\u0641\u0627\u0631\u0634 \u0633\u06CC\u0646\u06CC \u0645\u062D\u0627\u0641\u0638 \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646",
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1e3).toISOString(),
    lines: [
      {
        id: "ORD-LN-003",
        orderId: "ORD-2026-003",
        partId: "PRT-FGD-004",
        partCode: "SAPCO-ASSY-SHH-004",
        partName: "\u0633\u06CC\u0646\u06CC \u0645\u062D\u0627\u0641\u0638 \u0641\u0644\u0632\u06CC \u0632\u06CC\u0631 \u0645\u0648\u062A\u0648\u0631 \u0634\u0627\u0647\u06CC\u0646 \u067E\u0648\u0634\u0634\u200C\u062F\u0627\u0631 \u0628\u0627 \u067E\u06CC\u0686\u200C\u0647\u0627\u06CC \u0646\u0635\u0628",
        orderedQuantity: 600,
        deliveredQuantity: 0,
        remainingQuantity: 600,
        dueDate: new Date(Date.now() + 10 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
        unitPriceRials: 26e5
      }
    ]
  }
];
var planSuggestionsStore = [];
var machineWorkloadHoursMap = {
  "MCH-001": 4.5,
  // Heavy Press 800t
  "MCH-002": 6,
  // Schuler 400t
  "MCH-003": 3,
  // Press 250t
  "MCH-004": 2,
  // Press Brake
  "MCH-005": 1.5,
  // Shearing
  "MCH-006": 3.5,
  // Slitter
  "MCH-007": 5,
  // Robotic CO2
  "MCH-008": 4,
  // Spot Weld
  "MCH-009": 8,
  // Cataphoresis Paint
  "MCH-010": 3
  // Assembly Jig
};
function calculateNetRequirements(params) {
  const parts = params?.parts || INITIAL_PARTS;
  const orders = params?.orders || customerOrdersStore;
  const reservations = params?.reservations || INITIAL_INVENTORY_RESERVATIONS;
  const balances = params?.balances || calculateDetailedStockBalances(INITIAL_INVENTORY_DOCUMENTS, reservations, parts).balances;
  const activeMos = params?.activeMos || manufacturingOrdersStore;
  const routings = params?.routings || INITIAL_ROUTINGS;
  const results = [];
  const demandByPart = /* @__PURE__ */ new Map();
  orders.filter((o) => o.status === "OPEN" || o.status === "PARTIALLY_FULFILLED").forEach((order) => {
    order.lines.forEach((line) => {
      if (line.remainingQuantity <= 0) return;
      const existing = demandByPart.get(line.partId) || {
        totalDemand: 0,
        nearestDueDate: line.dueDate,
        orderIds: []
      };
      existing.totalDemand += line.remainingQuantity;
      if (new Date(line.dueDate).getTime() < new Date(existing.nearestDueDate).getTime()) {
        existing.nearestDueDate = line.dueDate;
      }
      existing.orderIds.push(order.id);
      demandByPart.set(line.partId, existing);
    });
  });
  demandByPart.forEach((demandInfo, partId) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    const grossDemand = demandInfo.totalDemand;
    const fgRecords = balances.filter((b) => b.partId === part.id && b.warehouseId === "WH-FINISHED");
    const physicalFg = fgRecords.reduce((sum, b) => sum + b.physicalQty, 0);
    const qualityBlockedFg = fgRecords.reduce((sum, b) => sum + b.qualityBlockedQty, 0);
    const activeRes = reservations.filter(
      (r) => r.partId === part.id && r.status === "ACTIVE" && r.warehouseId === "WH-FINISHED"
    );
    const reservedFg = activeRes.reduce((sum, r) => sum + r.quantity, 0);
    const availableFg = Math.max(0, physicalFg - qualityBlockedFg - reservedFg);
    const netDemandAfterFg = Math.max(0, grossDemand - availableFg);
    const partMos = activeMos.filter(
      (m) => (m.partId === part.id || m.partCode === part.code) && (m.status === "IN_PROGRESS" || m.status === "RELEASED")
    );
    const downstreamWipByStep = {};
    let totalDownstreamWip = 0;
    partMos.forEach((mo) => {
      mo.operations.forEach((op) => {
        const stepWip = op.waitingInputQty + op.inProgressQty + op.readyForTransferQty;
        downstreamWipByStep[op.stepNumber] = (downstreamWipByStep[op.stepNumber] || 0) + stepWip;
        totalDownstreamWip += stepWip;
      });
    });
    const netProductionRequirement = Math.max(0, netDemandAfterFg - totalDownstreamWip);
    const routing = routings.find((r) => r.partId === part.id || r.partCode === part.code) || routings[0];
    const cumulativeScrapNormPercent = routing.operations.reduce((sum, op) => sum + op.scrapNormPercent, 0);
    const scrapFactor = 1 + cumulativeScrapNormPercent / 100;
    const partUnitWeightKg = part.weightPerUnitKg || 1;
    const requiredMaterialKg = Math.round(netProductionRequirement * partUnitWeightKg * scrapFactor * 10) / 10;
    const requiredGrade = part.materialGrade || "ST14";
    const rawRecords = balances.filter(
      (b) => b.warehouseId === "WH-RAW" && (b.materialGrade === requiredGrade || b.partCode.includes(requiredGrade))
    );
    const availableRawKg = rawRecords.reduce((sum, b) => sum + b.availableKg, 0);
    const materialShortageKg = Math.max(0, Math.round((requiredMaterialKg - availableRawKg) * 10) / 10);
    results.push({
      partId: part.id,
      partCode: part.code,
      partName: part.name,
      carModel: part.carModel,
      dueDate: demandInfo.nearestDueDate,
      grossDemandQty: grossDemand,
      physicalFinishedGoodsQty: physicalFg,
      qualityBlockedQty: qualityBlockedFg,
      reservedFinishedGoodsQty: reservedFg,
      availableFinishedGoodsQty: availableFg,
      netDemandAfterFg,
      downstreamWipByStep,
      totalDownstreamWip,
      netProductionRequirement,
      requiredMaterialGrade: requiredGrade,
      requiredMaterialKg,
      availableRawMaterialKg: availableRawKg,
      materialShortageKg,
      materialShortageDetected: materialShortageKg > 0
    });
  });
  return results;
}
function evaluateMachineEligibility(params) {
  const machines = params.machines || INITIAL_MACHINES;
  const dies = params.dies || INITIAL_DIES_MOLDS;
  const setupMin = params.setupTimeMin ?? 25;
  const cycleSec = params.standardCycleTimeSec || 15;
  const plannedQty = params.plannedQuantity;
  const estimatedRunHours = Math.round((setupMin / 60 + plannedQty * cycleSec / 3600) * 10) / 10;
  const dailyShiftHours = 15;
  const assignedDie = params.assignedDieCode ? dies.find((d) => d.code === params.assignedDieCode) : params.assignedDieId ? dies.find((d) => d.id === params.assignedDieId) : void 0;
  const results = [];
  machines.forEach((machine) => {
    const ineligibilityReasons = [];
    const supportsProcess = machine.capabilities.includes(params.processType) || machine.processType === params.processType;
    if (!supportsProcess) {
      ineligibilityReasons.push(`\u062F\u0633\u062A\u06AF\u0627\u0647 \u0641\u0631\u0627\u06CC\u0646\u062F ${params.processType} \u0631\u0627 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u0646\u0645\u06CC\u200C\u06A9\u0646\u062F.`);
    }
    const machineTonnage = machine.tonnage ?? 0;
    const tonnageSufficient = params.requiredTonnage <= 0 || machineTonnage >= params.requiredTonnage;
    if (!tonnageSufficient) {
      ineligibilityReasons.push(
        `\u062A\u0646\u0627\u0698 \u0646\u0627\u06A9\u0627\u0641\u06CC: \u0638\u0631\u0641\u06CC\u062A \u062F\u0633\u062A\u06AF\u0627\u0647 ${machineTonnage} \u062A\u0646\u060C \u06A9\u0645\u062A\u0631 \u0627\u0632 \u062A\u0646\u0627\u0698 \u0645\u0648\u0631\u062F \u0646\u06CC\u0627\u0632 ${params.requiredTonnage} \u062A\u0646 \u0627\u0633\u062A.`
      );
    }
    let dieCompatible = true;
    if (assignedDie) {
      const compatibleCodes = assignedDie.compatibleMachineCodes || [];
      if (compatibleCodes.length > 0 && !compatibleCodes.includes(machine.code)) {
        dieCompatible = false;
        ineligibilityReasons.push(`\u0642\u0627\u0644\u0628 ${assignedDie.code} (${assignedDie.name}) \u0628\u0627 \u0627\u0628\u0639\u0627\u062F \u0645\u06CC\u0632 \u0648 \u0641\u06A9 \u0627\u06CC\u0646 \u062F\u0633\u062A\u06AF\u0627\u0647 \u0646\u0627\u0633\u0627\u0632\u06AF\u0627\u0631 \u0627\u0633\u062A.`);
      }
    }
    const isMachineActive = machine.status === "ACTIVE";
    if (!isMachineActive) {
      ineligibilityReasons.push(
        machine.status === "MAINTENANCE" ? "\u062F\u0633\u062A\u06AF\u0627\u0647 \u062F\u0631 \u0648\u0636\u0639\u06CC\u062A \u062A\u0639\u0645\u06CC\u0631\u0627\u062A \u062F\u0648\u0631\u0647\u200C\u0627\u06CC / \u0627\u0648\u0631\u0647\u0627\u0644 \u0642\u0631\u0627\u0631 \u062F\u0627\u0631\u062F." : "\u062F\u0633\u062A\u06AF\u0627\u0647 \u0628\u0647 \u062F\u0644\u06CC\u0644 \u062E\u0631\u0627\u0628\u06CC \u0627\u0636\u0637\u0631\u0627\u0631\u06CC \u0645\u062A\u0648\u0642\u0641 \u0627\u0633\u062A."
      );
    }
    const currentWorkload = machineWorkloadHoursMap[machine.id] || 0;
    const availableHoursRemaining = Math.max(0, Math.round((dailyShiftHours - currentWorkload) * 10) / 10);
    const capacityAvailable = availableHoursRemaining >= 1;
    if (!capacityAvailable) {
      ineligibilityReasons.push("\u0638\u0631\u0641\u06CC\u062A \u0634\u06CC\u0641\u062A\u200C\u0647\u0627\u06CC \u0641\u0639\u0627\u0644 \u062F\u0633\u062A\u06AF\u0627\u0647 \u067E\u0631 \u0634\u062F\u0647 \u0627\u0633\u062A (\u06A9\u0645\u0628\u0648\u062F \u0638\u0631\u0641\u06CC\u062A \u0632\u0645\u0627\u0646\u06CC).");
    }
    const isEligible = supportsProcess && tonnageSufficient && dieCompatible && isMachineActive;
    let suitabilityScore = 0;
    let recommendationReason = "";
    if (isEligible) {
      suitabilityScore = 50;
      const capacityRatio = availableHoursRemaining / dailyShiftHours;
      suitabilityScore += Math.round(capacityRatio * 30);
      if (params.requiredTonnage > 0) {
        const excessTonnageRatio = (machineTonnage - params.requiredTonnage) / params.requiredTonnage;
        if (excessTonnageRatio <= 0.25) {
          suitabilityScore += 15;
        } else if (excessTonnageRatio <= 0.6) {
          suitabilityScore += 10;
        } else {
          suitabilityScore += 5;
        }
      } else {
        suitabilityScore += 10;
      }
      if ((machine.strokesPerMinute || 0) >= 30) suitabilityScore += 5;
      const workloadPercent = Math.round(currentWorkload / dailyShiftHours * 100);
      recommendationReason = `${machine.name} \u0628\u0647 \u062F\u0644\u06CC\u0644 \u0633\u0627\u0632\u06AF\u0627\u0631\u06CC \u06A9\u0627\u0645\u0644\u060C \u062A\u0646\u0627\u0698 \u0645\u062A\u0646\u0627\u0633\u0628 (${machineTonnage} \u062A\u0646) \u0648 \u062F\u0627\u0631\u0627 \u0628\u0648\u062F\u0646 ${availableHoursRemaining} \u0633\u0627\u0639\u062A \u0638\u0631\u0641\u06CC\u062A \u0622\u0632\u0627\u062F (${100 - workloadPercent}\u066A \u0622\u0632\u0627\u062F\u06CC) \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F.`;
    } else {
      suitabilityScore = 0;
      recommendationReason = ineligibilityReasons.join(" | ");
    }
    const currentWorkloadPercent = Math.round(currentWorkload / dailyShiftHours * 100);
    results.push({
      machineId: machine.id,
      machineCode: machine.code,
      machineName: machine.name,
      isEligible,
      ineligibilityReasons,
      supportsProcess,
      tonnageSufficient,
      dieCompatible,
      isMachineActive,
      capacityAvailable,
      dailyCapacityHours: dailyShiftHours,
      currentWorkloadHours: currentWorkload,
      availableHoursRemaining,
      estimatedSetupTimeMin: setupMin,
      estimatedRunTimeHours: estimatedRunHours,
      currentWorkloadPercent,
      suitabilityScore,
      recommendationRank: 999,
      // Assigned below
      recommendationReason
    });
  });
  const eligibleSorted = results.filter((r) => r.isEligible).sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  eligibleSorted.forEach((item, index) => {
    item.recommendationRank = index + 1;
  });
  return results.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    return a.recommendationRank - b.recommendationRank;
  });
}
function generateProductionPlanSuggestions() {
  const netRequirements = calculateNetRequirements();
  const routings = INITIAL_ROUTINGS;
  const dies = INITIAL_DIES_MOLDS;
  const machines = INITIAL_MACHINES;
  const suggestions = [];
  netRequirements.forEach((req, idx) => {
    const routing = routings.find((r) => r.partId === req.partId || r.partCode === req.partCode) || routings[0];
    const plannedQty = req.netProductionRequirement > 0 ? req.netProductionRequirement : req.grossDemandQty;
    const proposedOperations = [];
    const planWarnings = [];
    let overallFeasible = true;
    if (req.materialShortageDetected) {
      planWarnings.push(
        `\u06A9\u0633\u0631\u06CC \u0645\u0627\u062F\u0647 \u0627\u0648\u0644\u06CC\u0647: ${req.materialShortageKg} \u06A9\u06CC\u0644\u0648\u06AF\u0631\u0645 \u0648\u0631\u0642 \u06AF\u0631\u06CC\u062F ${req.requiredMaterialGrade} \u06A9\u0633\u0631\u06CC \u0648\u062C\u0648\u062F \u062F\u0627\u0631\u062F.`
      );
    }
    let cumulativeHours = 0;
    routing.operations.forEach((op) => {
      const assignedDie = dies.find(
        (d) => (d.partCode === req.partCode || d.partId === req.partId) && d.processType === op.processType
      ) || dies.find((d) => d.processType === op.processType);
      const candidateMachines = evaluateMachineEligibility({
        processType: op.processType,
        requiredTonnage: op.requiredTonnage || (op.processType === "DRAWING" ? 800 : op.processType === "PUNCH_FORM" ? 400 : op.processType === "BENDING" ? 160 : 0),
        plannedQuantity: plannedQty,
        standardCycleTimeSec: op.standardCycleTimeSec,
        setupTimeMin: op.setupTimeMin || 30,
        assignedDieCode: assignedDie?.code,
        machines,
        dies
      });
      const eligibleMachines = candidateMachines.filter((m) => m.isEligible);
      const recommended = eligibleMachines.length > 0 ? eligibleMachines[0] : null;
      const isInfeasible = !recommended;
      const infeasibilityReasons = [];
      if (isInfeasible) {
        overallFeasible = false;
        const topBlocker = candidateMachines[0]?.ineligibilityReasons[0] || "\u0647\u06CC\u0686 \u062F\u0633\u062A\u06AF\u0627\u0647 \u0648\u0627\u062C\u062F \u0634\u0631\u0627\u06CC\u0637\u06CC \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0645\u0631\u062D\u0644\u0647 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.";
        infeasibilityReasons.push(topBlocker);
        planWarnings.push(`\u0645\u0631\u062D\u0644\u0647 ${op.stepCode} (${op.stepName}) \u0641\u0627\u0642\u062F \u062F\u0633\u062A\u06AF\u0627\u0647 \u0648\u0627\u062C\u062F \u0634\u0631\u0627\u06CC\u0637 \u0627\u0633\u062A: ${topBlocker}`);
      }
      const runHours = recommended?.estimatedRunTimeHours || Math.round(op.standardCycleTimeSec * plannedQty / 3600 * 10) / 10;
      cumulativeHours += runHours;
      proposedOperations.push({
        stepNumber: op.stepNumber,
        stepCode: op.stepCode,
        stepName: op.stepName,
        processType: op.processType,
        requiredTonnage: op.requiredTonnage || 0,
        plannedQuantity: plannedQty,
        standardCycleTimeSec: op.standardCycleTimeSec,
        setupTimeMin: op.setupTimeMin || 30,
        estimatedRunHours: runHours,
        dieMoldId: assignedDie?.id,
        dieMoldCode: assignedDie?.code,
        dieMoldName: assignedDie?.name,
        recommendedMachine: recommended,
        allCandidateMachines: candidateMachines,
        isInfeasible,
        infeasibilityReasons
      });
    });
    const now = /* @__PURE__ */ new Date();
    const daysNeeded = Math.ceil(cumulativeHours / 15) + 1;
    const estimatedCompletion = new Date(now.getTime() + daysNeeded * 24 * 3600 * 1e3).toISOString().slice(0, 10);
    if (new Date(estimatedCompletion).getTime() > new Date(req.dueDate).getTime()) {
      planWarnings.push(
        `\u0647\u0634\u062F\u0627\u0631 \u062A\u0627\u062E\u06CC\u0631 \u0645\u0648\u0639\u062F \u062A\u062D\u0648\u06CC\u0644: \u0627\u062A\u0645\u0627\u0645 \u062A\u062E\u0645\u06CC\u0646\u06CC (${estimatedCompletion}) \u067E\u0633 \u0627\u0632 \u0645\u0648\u0639\u062F \u0633\u0627\u067E\u06A9\u0648 (${req.dueDate}) \u0627\u0633\u062A.`
      );
    }
    const planId = `PPS-2026-${String(idx + 1).padStart(3, "0")}`;
    const planNumber = `PLN-SUG-1405-${String(idx + 1).padStart(2, "0")}`;
    suggestions.push({
      id: planId,
      planNumber,
      planVersion: "V1.0",
      partId: req.partId,
      partCode: req.partCode,
      partName: req.partName,
      customerOrderIds: ["ORD-2026-001"],
      customerOrderNumbers: ["SO-SAPCO-1405-88"],
      targetDueDate: req.dueDate,
      grossDemand: req.grossDemandQty,
      availableFg: req.availableFinishedGoodsQty,
      wipCredit: req.totalDownstreamWip,
      netRequiredQuantity: req.netProductionRequirement,
      proposedQuantity: plannedQty,
      materialStatus: {
        requiredGrade: req.requiredMaterialGrade,
        requiredWeightKg: req.requiredMaterialKg,
        availableWeightKg: req.availableRawMaterialKg,
        shortageKg: req.materialShortageKg,
        hasShortage: req.materialShortageDetected
      },
      proposedOperations,
      overallFeasible,
      infeasibilityWarnings: planWarnings,
      estimatedStartDate: now.toISOString().slice(0, 10),
      estimatedCompletionDate: estimatedCompletion,
      approvalStatus: "DRAFT_SUGGESTION",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });
  });
  return suggestions;
}
if (planSuggestionsStore.length === 0) {
  const generated = generateProductionPlanSuggestions();
  planSuggestionsStore.push(...generated);
}
function approvePlanSuggestion(planId, approvedBy) {
  const plan = planSuggestionsStore.find((p) => p.id === planId);
  if (!plan) return { success: false, error: "\u0628\u0631\u0646\u0627\u0645\u0647 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  plan.approvalStatus = "APPROVED";
  plan.approvedBy = approvedBy;
  plan.approvedAt = (/* @__PURE__ */ new Date()).toISOString();
  plan.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return { success: true, data: plan };
}
function releasePlanToManufacturingOrder(planId, releasedBy) {
  const plan = planSuggestionsStore.find((p) => p.id === planId);
  if (!plan) return { success: false, error: "\u0628\u0631\u0646\u0627\u0645\u0647 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  if (plan.approvalStatus !== "APPROVED") {
    return { success: false, error: "\u0641\u0642\u0637 \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u062A\u0623\u06CC\u06CC\u062F\u0634\u062F\u0647 \u062A\u0648\u0633\u0637 \u0645\u062F\u06CC\u0631 \u062A\u0648\u0644\u06CC\u062F \u0642\u0627\u0628\u0644 \u062A\u0628\u062F\u06CC\u0644 \u0628\u0647 \u062F\u0633\u062A\u0648\u0631 \u0633\u0627\u062E\u062A \u06A9\u0627\u0631\u06AF\u0627\u0647\u06CC \u0647\u0633\u062A\u0646\u062F." };
  }
  const moResult = createManufacturingOrder({
    partId: plan.partId,
    targetQuantity: plan.proposedQuantity,
    initialInputQuantity: plan.proposedQuantity,
    startDate: plan.estimatedStartDate,
    dueDate: plan.targetDueDate,
    notes: `\u0635\u0627\u062F\u0631\u0634\u062F\u0647 \u0627\u0632 \u0628\u0631\u0646\u0627\u0645\u0647 \u0631\u06CC\u0632\u06CC \u0645\u0635\u0648\u0628 ${plan.planNumber} \u0646\u0633\u062E\u0647 ${plan.planVersion}`,
    createdBy: releasedBy
  });
  if (!moResult.success || !moResult.data) {
    return { success: false, error: moResult.error || "\u062E\u0637\u0627 \u062F\u0631 \u0627\u06CC\u062C\u0627\u062F \u062F\u0633\u062A\u0648\u0631 \u0633\u0627\u062E\u062A" };
  }
  plan.approvalStatus = "CONVERTED_TO_MO";
  plan.createdMoId = moResult.data.id;
  plan.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return { success: true, mo: moResult.data, plan };
}
function revisePlanVersion(planId, modifiedOps, note) {
  const plan = planSuggestionsStore.find((p) => p.id === planId);
  if (!plan) return { success: false, error: "\u0628\u0631\u0646\u0627\u0645\u0647 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." };
  const currentMajorMinor = plan.planVersion.replace("V", "").split(".");
  const major = parseInt(currentMajorMinor[0] || "1", 10);
  const minor = parseInt(currentMajorMinor[1] || "0", 10) + 1;
  const newVersion = `V${major}.${minor}`;
  plan.planVersion = newVersion;
  plan.proposedOperations = modifiedOps;
  plan.notes = (plan.notes ? `${plan.notes} | ` : "") + `\u0627\u0635\u0644\u0627\u062D \u0628\u0647 \u0646\u0633\u062E\u0647 ${newVersion}: ${note}`;
  plan.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return { success: true, data: plan };
}
function getPlanningDashboardMetrics() {
  const netReqs = calculateNetRequirements();
  const suggestions = planSuggestionsStore;
  const totalOpenOrders = customerOrdersStore.filter((o) => o.status === "OPEN").length;
  const totalGrossDemand = netReqs.reduce((sum, r) => sum + r.grossDemandQty, 0);
  const totalNetReq = netReqs.reduce((sum, r) => sum + r.netProductionRequirement, 0);
  const totalMaterialShortage = netReqs.reduce((sum, r) => sum + r.materialShortageKg, 0);
  const activeSuggestions = suggestions.filter((s) => s.approvalStatus === "DRAFT_SUGGESTION").length;
  const approvedPlans = suggestions.filter((s) => s.approvalStatus === "APPROVED" || s.approvalStatus === "CONVERTED_TO_MO").length;
  const infeasiblePlans = suggestions.filter((s) => !s.overallFeasible).length;
  const totalCapacity = INITIAL_MACHINES.length * 15;
  const totalWorkload = Object.values(machineWorkloadHoursMap).reduce((s, h) => s + h, 0);
  const avgUtilization = Math.round(totalWorkload / totalCapacity * 100);
  const criticalParts = netReqs.filter((r) => r.netProductionRequirement > 0 || r.materialShortageDetected).map((r) => ({
    partCode: r.partCode,
    partName: r.partName,
    netShortage: r.netProductionRequirement,
    dueDate: r.dueDate,
    hasMaterialShortage: r.materialShortageDetected
  }));
  return {
    totalOpenOrdersCount: totalOpenOrders,
    totalGrossDemandPieces: totalGrossDemand,
    totalNetProductionRequirementsPieces: totalNetReq,
    totalMaterialShortageKg: totalMaterialShortage,
    activeSuggestionsCount: activeSuggestions,
    approvedPlansCount: approvedPlans,
    infeasiblePlansCount: infeasiblePlans,
    averageMachineCapacityUtilizationPercent: avgUtilization,
    criticalPartsRequiringImmediateAction: criticalParts
  };
}

// src/server/managementReportsEngine.ts
function isDateWithinRange(dateStr, startDate, endDate) {
  if (!dateStr) return true;
  const d = new Date(dateStr).getTime();
  if (startDate && d < new Date(startDate).getTime()) return false;
  if (endDate && d > (/* @__PURE__ */ new Date(endDate + "T23:59:59.999Z")).getTime()) return false;
  return true;
}
function createReportMeta(title, count, filters) {
  const applied = {};
  if (filters?.startDate) applied["\u0627\u0632 \u062A\u0627\u0631\u06CC\u062E"] = filters.startDate;
  if (filters?.endDate) applied["\u062A\u0627 \u062A\u0627\u0631\u06CC\u062E"] = filters.endDate;
  if (filters?.partId) applied["\u0634\u0646\u0627\u0633\u0647 \u0642\u0637\u0639\u0647"] = filters.partId;
  if (filters?.customerName) applied["\u0645\u0634\u062A\u0631\u06CC"] = filters.customerName;
  if (filters?.machineId) applied["\u0645\u0627\u0634\u06CC\u0646"] = filters.machineId;
  if (filters?.processType) applied["\u0641\u0631\u0627\u06CC\u0646\u062F"] = filters.processType;
  if (filters?.status) applied["\u0648\u0636\u0639\u06CC\u062A"] = filters.status;
  return {
    reportTitle: title,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    generatedBy: "\u0645\u062F\u06CC\u0631 \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC \u0648 \u06A9\u0646\u062A\u0631\u0644 \u062A\u0648\u0644\u06CC\u062F KPIMS",
    appliedFilters: applied,
    totalRecordsCount: count
  };
}
function getPlanVsActualReport(filters) {
  const plans = planSuggestionsStore;
  const mos = manufacturingOrdersStore;
  const results = plans.filter((p) => {
    if (filters?.partId && p.partId !== filters.partId && p.partCode !== filters.partId) return false;
    if (!isDateWithinRange(p.targetDueDate, filters?.startDate, filters?.endDate)) return false;
    if (filters?.status && filters.status !== "ALL" && p.approvalStatus !== filters.status) return false;
    return true;
  }).map((p) => {
    const relatedMos = mos.filter((m) => m.partId === p.partId || m.id === p.createdMoId);
    const actualProducedQuantity = relatedMos.reduce((acc, m) => acc + (m.completedQuantity || 0), 0);
    const actualScrapQuantity = relatedMos.reduce((acc, m) => acc + (m.totalScrapQuantity || 0), 0);
    const plannedQuantity = p.proposedQuantity || 1;
    const achievementRatePercent = Math.round(actualProducedQuantity / plannedQuantity * 1e3) / 10;
    const varianceQuantity = actualProducedQuantity - plannedQuantity;
    return {
      planId: p.id,
      planNumber: p.planNumber,
      planVersion: p.planVersion,
      partId: p.partId,
      partCode: p.partCode,
      partName: p.partName,
      plannedQuantity: p.proposedQuantity,
      actualProducedQuantity,
      actualScrapQuantity,
      achievementRatePercent,
      varianceQuantity,
      status: p.approvalStatus,
      targetDueDate: p.targetDueDate,
      isEstimate: p.approvalStatus !== "CONVERTED_TO_MO",
      linkedMoNumbers: relatedMos.map((m) => m.moNumber)
    };
  });
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u062A\u0637\u0628\u06CC\u0642 \u0628\u0631\u0646\u0627\u0645\u0647 \u062F\u0631 \u0628\u0631\u0627\u0628\u0631 \u062A\u0648\u0644\u06CC\u062F \u0648\u0627\u0642\u0639\u06CC (Plan vs Actual)", results.length, filters),
    data: results
  };
}
function getCustomerOrderFulfillmentReport(filters) {
  const orders = customerOrdersStore;
  const now = Date.now();
  const lines = [];
  orders.forEach((order) => {
    if (filters?.customerName && !order.customerName.includes(filters.customerName)) return;
    if (filters?.status && filters.status !== "ALL" && order.status !== filters.status) return;
    order.lines.forEach((line) => {
      if (filters?.partId && line.partId !== filters.partId && line.partCode !== filters.partId) return;
      if (!isDateWithinRange(line.dueDate, filters?.startDate, filters?.endDate)) return;
      const dueTime = new Date(line.dueDate).getTime();
      const isPastDue = now > dueTime && line.remainingQuantity > 0;
      const daysOverdue = isPastDue ? Math.max(0, Math.floor((now - dueTime) / (24 * 3600 * 1e3))) : 0;
      const fulfillmentPercent = line.orderedQuantity > 0 ? Math.round(line.deliveredQuantity / line.orderedQuantity * 1e3) / 10 : 0;
      let status = order.status;
      if (isPastDue) status = "DELAYED";
      else if (line.remainingQuantity === 0) status = "FULFILLED";
      else if (line.deliveredQuantity > 0) status = "PARTIALLY_FULFILLED";
      lines.push({
        orderId: order.id,
        orderLineId: line.id,
        orderNumber: order.orderNumber,
        contractNumber: order.contractNumber,
        customerName: order.customerName,
        partId: line.partId,
        partCode: line.partCode,
        partName: line.partName,
        orderedQuantity: line.orderedQuantity,
        deliveredQuantity: line.deliveredQuantity,
        remainingQuantity: line.remainingQuantity,
        fulfillmentPercent,
        dueDate: line.dueDate,
        status,
        daysOverdue,
        isDelayed: isPastDue
      });
    });
  });
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u0648\u0636\u0639\u06CC\u062A \u062A\u062D\u0642\u0642 \u062A\u0639\u0647\u062F\u0627\u062A \u0648 \u0633\u0641\u0627\u0631\u0634\u0627\u062A \u0645\u0634\u062A\u0631\u06CC\u0627\u0646 (\u0633\u0627\u067E\u06A9\u0648/\u0633\u0627\u06CC\u067E\u0627)", lines.length, filters),
    data: lines
  };
}
function getProductionBacklogReport(filters) {
  const fulfillmentReport = getCustomerOrderFulfillmentReport(filters).data;
  const parts = INITIAL_PARTS;
  const now = Date.now();
  const backlogItems = fulfillmentReport.filter((item) => item.remainingQuantity > 0).map((item) => {
    const part = parts.find((p) => p.id === item.partId || p.code === item.partCode);
    const weightPerUnit = part?.weightPerUnitKg || 1.2;
    const requiredRawMaterialKg = Math.round(item.remainingQuantity * weightPerUnit * 1.05 * 10) / 10;
    let urgencyLevel = "MEDIUM";
    if (item.daysOverdue > 5) urgencyLevel = "CRITICAL";
    else if (item.daysOverdue > 0 || item.remainingQuantity > 1e3) urgencyLevel = "HIGH";
    return {
      orderNumber: item.orderNumber,
      customerName: item.customerName,
      contractNumber: item.contractNumber,
      partId: item.partId,
      partCode: item.partCode,
      partName: item.partName,
      carModel: part?.carModel,
      backlogQuantity: item.remainingQuantity,
      dueDate: item.dueDate,
      daysOverdue: item.daysOverdue,
      urgencyLevel,
      requiredRawMaterialKg,
      materialAvailabilityStatus: "AVAILABLE"
    };
  }).sort((a, b) => b.daysOverdue - a.daysOverdue);
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u062A\u0639\u0647\u062F\u0627\u062A \u0645\u0639\u0648\u0642 \u0648 \u0633\u0641\u0627\u0631\u0634\u0627\u062A \u0639\u0642\u0628\u200C\u0627\u0641\u062A\u0627\u062F\u0647 \u062A\u0648\u0644\u06CC\u062F (Backlog)", backlogItems.length, filters),
    data: backlogItems
  };
}
function getWipByPartAndOperationReport(filters) {
  const mos = manufacturingOrdersStore;
  const items = [];
  mos.forEach((mo) => {
    if (filters?.partId && mo.partId !== filters.partId && mo.partCode !== filters.partId) return;
    mo.operations.forEach((op) => {
      if (filters?.processType && op.processType !== filters.processType) return;
      if (filters?.machineId && op.machineId !== filters.machineId) return;
      const totalActiveWipQty = (op.waitingInputQty || 0) + (op.inProgressQty || 0) + (op.readyForTransferQty || 0);
      if (totalActiveWipQty > 0 || (op.transferredQty || 0) > 0) {
        items.push({
          partId: mo.partId,
          partCode: mo.partCode,
          partName: mo.partName,
          moId: mo.id,
          moNumber: mo.moNumber,
          stepNumber: op.stepNumber,
          stepCode: op.stepCode,
          stepName: op.stepName,
          processType: op.processType,
          machineName: op.machineName,
          warehouseLocation: op.warehouseLocation,
          waitingInputQty: op.waitingInputQty || 0,
          inProgressQty: op.inProgressQty || 0,
          readyForTransferQty: op.readyForTransferQty || 0,
          transferredQty: op.transferredQty || 0,
          totalActiveWipQty,
          lastActivityAt: op.lastActivityAt || op.createdAt
        });
      }
    });
  });
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u0645\u0648\u062C\u0648\u062F\u06CC \u06A9\u0627\u0631 \u062F\u0631 \u062C\u0631\u06CC\u0627\u0646 \u0633\u0627\u062E\u062A (WIP) \u0628\u0647 \u062A\u0641\u06A9\u06CC\u06A9 \u0642\u0637\u0639\u0647 \u0648 \u0645\u0631\u062D\u0644\u0647", items.length, filters),
    data: items
  };
}
function getWipAgingReport(filters) {
  const mos = manufacturingOrdersStore;
  const now = Date.now();
  const items = [];
  mos.forEach((mo) => {
    if (filters?.partId && mo.partId !== filters.partId && mo.partCode !== filters.partId) return;
    mo.operations.forEach((op) => {
      const activeQty = (op.waitingInputQty || 0) + (op.inProgressQty || 0) + (op.readyForTransferQty || 0);
      if (activeQty <= 0) return;
      const actTime = new Date(op.lastActivityAt || op.createdAt).getTime();
      const idleHours = Math.max(1, Math.round((now - actTime) / (3600 * 1e3)));
      const idleDays = Math.round(idleHours / 24 * 10) / 10;
      let ageCategory = "UNDER_24_HOURS";
      let statusSeverity = "NORMAL";
      if (idleDays > 7) {
        ageCategory = "OVER_7_DAYS_STAGNANT";
        statusSeverity = "CRITICAL";
      } else if (idleDays >= 3) {
        ageCategory = "3_TO_7_DAYS";
        statusSeverity = "ATTENTION";
      } else if (idleDays >= 1) {
        ageCategory = "1_TO_3_DAYS";
        statusSeverity = "NORMAL";
      }
      items.push({
        moNumber: mo.moNumber,
        partCode: mo.partCode,
        partName: mo.partName,
        stepNumber: op.stepNumber,
        stepName: op.stepName,
        warehouseLocation: op.warehouseLocation,
        quantityInStation: activeQty,
        lastActivityDate: op.lastActivityAt || op.createdAt,
        idleHours,
        idleDays,
        ageCategory,
        statusSeverity
      });
    });
  });
  items.sort((a, b) => b.idleHours - a.idleHours);
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u0633\u0646\u200C\u06CC\u0627\u0628\u06CC \u0648 \u0645\u0627\u0646\u062F\u06AF\u0627\u0631\u06CC \u0627\u0642\u0644\u0627\u0645 \u062F\u0631 \u062C\u0631\u06CC\u0627\u0646 \u0633\u0627\u062E\u062A (WIP Aging)", items.length, filters),
    data: items
  };
}
function getMaterialConsumptionVsStandardReport(filters) {
  const mos = manufacturingOrdersStore;
  const parts = INITIAL_PARTS;
  const items = [];
  mos.forEach((mo) => {
    if (filters?.partId && mo.partId !== filters.partId && mo.partCode !== filters.partId) return;
    const part = parts.find((p) => p.id === mo.partId || p.code === mo.partCode);
    const unitWeight = part?.weightPerUnitKg || 1.15;
    const materialGrade = part?.materialGrade || "ST14";
    const totalProducedPieces = mo.completedQuantity || mo.operations[mo.operations.length - 1]?.goodOutputQty || 0;
    const scrapNormPercent = 2.5;
    const theoreticalStandardConsumptionKg = Math.round(totalProducedPieces * unitWeight * (1 + scrapNormPercent / 100) * 10) / 10;
    const initialInputQty = mo.targetQuantity || 1e3;
    const actualIssuedMaterialKg = Math.round(initialInputQty * unitWeight * 10) / 10;
    const actualScrapKg = Math.round((mo.totalScrapQuantity || 0) * unitWeight * 10) / 10;
    const varianceKg = Math.round((actualIssuedMaterialKg - theoreticalStandardConsumptionKg) * 10) / 10;
    const variancePercent = theoreticalStandardConsumptionKg > 0 ? Math.round(varianceKg / theoreticalStandardConsumptionKg * 1e3) / 10 : 0;
    items.push({
      moNumber: mo.moNumber,
      partCode: mo.partCode,
      partName: mo.partName,
      materialGrade,
      totalProducedPieces,
      standardWeightPerPieceKg: unitWeight,
      scrapNormPercent,
      theoreticalStandardConsumptionKg,
      actualIssuedMaterialKg,
      actualScrapKg,
      varianceKg,
      variancePercent,
      isOverConsumption: varianceKg > 0
    });
  });
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u0645\u0635\u0631\u0641 \u0648\u0627\u0642\u0639\u06CC \u0645\u0648\u0627\u062F \u062F\u0631 \u0628\u0631\u0627\u0628\u0631 \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F \u0645\u0647\u0646\u062F\u0633\u06CC \u0648 \u0646\u0631\u0645 \u0636\u0627\u06CC\u0639\u0627\u062A", items.length, filters),
    data: items
  };
}
function getSapcoMaterialAccountReport(filters) {
  const contracts = INITIAL_SAPCO_CONTRACTS;
  const detailedBalances = calculateDetailedStockBalances(
    INITIAL_INVENTORY_DOCUMENTS,
    INITIAL_INVENTORY_RESERVATIONS,
    INITIAL_PARTS
  ).balances;
  const rawCoilBalance = detailedBalances.find((b) => b.partCode === "SAPCO-COIL-DC04-0.8");
  const physicalRawCoilWeight = rawCoilBalance?.physicalKg || 1e4;
  const items = contracts.map((c) => {
    const physicalStockInPlantKg = c.materialGrade === "DC04" ? physicalRawCoilWeight : c.openingBalanceKg;
    const discrepancyKg = Math.round((physicalStockInPlantKg - c.closingBalanceKg) * 10) / 10;
    return {
      contractId: c.id,
      contractNumber: c.contractNumber,
      title: c.title,
      materialGrade: c.materialGrade,
      allocatedQuotaKg: c.allocatedWeightKg,
      openingBalanceKg: c.openingBalanceKg,
      totalReceivedKg: c.totalReceivedKg || 0,
      totalIssuedKg: c.totalConsumedKg || 0,
      closingBookBalanceKg: c.closingBalanceKg,
      physicalStockInPlantKg,
      discrepancyKg,
      status: c.status
    };
  });
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u0628\u06CC\u0644\u0627\u0646 \u0648 \u062D\u0633\u0627\u0628 \u0627\u0645\u0627\u0646\u06CC \u06A9\u0644\u0627\u0641\u200C\u0647\u0627\u06CC \u0648\u0631\u0642 \u0633\u0627\u067E\u06A9\u0648", items.length, filters),
    data: items
  };
}
function getInventoryValuationQuantitiesReport(filters) {
  const parts = INITIAL_PARTS;
  const detailedBalances = calculateDetailedStockBalances(
    INITIAL_INVENTORY_DOCUMENTS,
    INITIAL_INVENTORY_RESERVATIONS,
    parts
  ).balances;
  const items = detailedBalances.filter((b) => {
    if (filters?.partId && b.partId !== filters.partId && b.partCode !== filters.partId) return false;
    return true;
  }).map((b) => {
    let category = "FINISHED_GOODS";
    if (b.category === "RAW_MATERIAL") category = "RAW_SHEET_METAL";
    else if (b.category === "WIP_PART") category = "WIP_PARTS";
    if (b.qualityBlockedQty > 0 && b.availableQty === 0) category = "QUALITY_BLOCKED";
    return {
      category,
      partOrMaterialCode: b.partCode,
      description: b.partName,
      unit: b.unit,
      physicalQuantity: b.physicalQty,
      companyOwnedQuantity: b.ownedQty,
      sapcoConsignmentQuantity: b.supplierOwnedQty,
      qualityBlockedQuantity: b.qualityBlockedQty,
      reservedQuantity: b.reservedQty,
      availableFreeQuantity: b.availableQty,
      totalPhysicalWeightKg: b.physicalKg
    };
  });
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u0648\u0636\u0639\u06CC\u062A \u0645\u0642\u062F\u0627\u0631\u06CC \u0648 \u0627\u0646\u0628\u0627\u0631\u0634 \u0645\u0648\u062C\u0648\u062F\u06CC\u200C\u0647\u0627 \u0628\u0647 \u062A\u0641\u06A9\u06CC\u06A9 \u0645\u0627\u0644\u06A9\u06CC\u062A \u0648 \u0642\u0631\u0646\u0637\u06CC\u0646\u0647", items.length, filters),
    data: items
  };
}
function getScrapByPartAndOperationReport(filters) {
  const mos = manufacturingOrdersStore;
  const parts = INITIAL_PARTS;
  const items = [];
  mos.forEach((mo) => {
    if (filters?.partId && mo.partId !== filters.partId && mo.partCode !== filters.partId) return;
    const part = parts.find((p) => p.id === mo.partId || p.code === mo.partCode);
    const unitWeight = part?.weightPerUnitKg || 1.1;
    mo.operations.forEach((op) => {
      if (filters?.processType && op.processType !== filters.processType) return;
      if (filters?.machineId && op.machineId !== filters.machineId) return;
      const totalInput = (op.goodOutputQty || 0) + (op.scrapQty || 0) + (op.inProgressQty || 0) + (op.waitingInputQty || 0);
      const scrapPieces = op.scrapQty || 0;
      if (scrapPieces === 0 && totalInput === 0) return;
      const scrapWeightKg = Math.round(scrapPieces * unitWeight * 10) / 10;
      const actualScrapPercent = totalInput > 0 ? Math.round(scrapPieces / totalInput * 1e3) / 10 : 0;
      let commonDefect = "\u067E\u0644\u06CC\u0633\u0647 \u0648 \u0644\u0647\u06CC\u062F\u06AF\u06CC";
      if (op.processType === "DRAWING") commonDefect = "\u067E\u0627\u0631\u06AF\u06CC \u06CC\u0627 \u0686\u0631\u0648\u06A9\u06CC\u062F\u06AF\u06CC \u06A9\u0634\u0634 \u0639\u0645\u06CC\u0642";
      else if (op.processType === "BLANKING") commonDefect = "\u067E\u0631\u06CC\u062F\u06AF\u06CC \u0644\u0628\u0647 \u0633\u0646\u0628\u0647 \u06CC\u0627 \u0644\u0642\u06CC \u0646\u0627\u0645\u0646\u0627\u0633\u0628 \u0645\u0627\u062A\u0631\u06CC\u0633";
      else if (op.processType === "SPOT_WELD") commonDefect = "\u062C\u0631\u0642\u0647 \u0634\u062F\u06CC\u062F \u06CC\u0627 \u0639\u062F\u0645 \u0627\u0633\u062A\u062D\u06A9\u0627\u0645 \u0646\u0642\u0637\u0647 \u062C\u0648\u0634";
      else if (op.processType === "BENDING") commonDefect = "\u062A\u0631\u06A9\u200C\u062E\u0648\u0631\u062F\u06AF\u06CC \u062E\u0637 \u062E\u0645";
      items.push({
        partCode: mo.partCode,
        partName: mo.partName,
        stepNumber: op.stepNumber,
        stepName: op.stepName,
        processType: op.processType,
        machineCode: op.machineId,
        machineName: op.machineName,
        totalInputQty: totalInput,
        scrapPieces,
        scrapWeightKg,
        scrapNormPercent: op.scrapNormPercent || 2,
        actualScrapPercent,
        isAboveNorm: actualScrapPercent > (op.scrapNormPercent || 2),
        commonScrapDefectType: commonDefect
      });
    });
  });
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u0636\u0627\u06CC\u0639\u0627\u062A \u062A\u0648\u0644\u06CC\u062F \u0628\u0647 \u062A\u0641\u06A9\u06CC\u06A9 \u0642\u0637\u0639\u0647 \u0648 \u0645\u0631\u062D\u0644\u0647 \u0639\u0645\u0644\u06CC\u0627\u062A \u067E\u0631\u0633/\u062C\u0648\u0634", items.length, filters),
    data: items
  };
}
function getMachineWorkloadCapacityReport(filters) {
  const machines = INITIAL_MACHINES;
  const items = machines.filter((m) => {
    if (filters?.machineId && m.id !== filters.machineId && m.code !== filters.machineId) return false;
    if (filters?.processType && m.processType !== filters.processType) return false;
    return true;
  }).map((m) => {
    const isDown = m.status === "MAINTENANCE";
    const nominalDailyCapacityHours = isDown ? 0 : 15;
    const scheduledWorkloadHours = isDown ? 0 : machineWorkloadHoursMap[m.id] || 4.5;
    const availableCapacityHours = Math.max(0, nominalDailyCapacityHours - scheduledWorkloadHours);
    const utilizationRatePercent = nominalDailyCapacityHours > 0 ? Math.round(scheduledWorkloadHours / nominalDailyCapacityHours * 1e3) / 10 : 0;
    let workloadCategory = "OPTIMAL";
    if (utilizationRatePercent > 90) workloadCategory = "OVERLOADED";
    else if (utilizationRatePercent > 70) workloadCategory = "HIGH_LOAD";
    else if (utilizationRatePercent < 30) workloadCategory = "UNDER_UTILIZED";
    return {
      machineId: m.id,
      machineCode: m.code,
      machineName: m.name,
      hall: m.location || "\u0633\u0627\u0644\u0646 \u067E\u0631\u0633\u200C\u06A9\u0627\u0631\u06CC",
      processType: m.processType,
      tonnage: m.tonnage,
      nominalDailyCapacityHours,
      scheduledWorkloadHours,
      availableCapacityHours,
      utilizationRatePercent,
      isReliableCapacityData: !isDown && nominalDailyCapacityHours > 0,
      workloadCategory,
      machineStatus: m.status
    };
  });
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u0644\u0648\u062F \u06A9\u0627\u0631\u06CC \u0648 \u0638\u0631\u0641\u06CC\u062A \u0622\u0632\u0627\u062F \u0645\u0627\u0634\u06CC\u0646\u200C\u0622\u0644\u0627\u062A \u067E\u0631\u0633 \u0648 \u062A\u062C\u0647\u06CC\u0632\u0627\u062A", items.length, filters),
    data: items
  };
}
function getProductionDelaysReport(filters) {
  const fulfillment = getCustomerOrderFulfillmentReport(filters).data;
  const items = [];
  fulfillment.filter((f) => f.isDelayed || f.daysOverdue > 0).forEach((f) => {
    items.push({
      documentType: "CUSTOMER_ORDER",
      referenceNumber: f.orderNumber,
      customerOrPlan: f.customerName,
      partCode: f.partCode,
      partName: f.partName,
      quantity: f.remainingQuantity,
      plannedDueDate: f.dueDate,
      estimatedCompletionDate: new Date(Date.now() + 3 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
      delayDays: f.daysOverdue,
      primaryDelayCause: "RAW_MATERIAL_SHORTAGE",
      delayDescription: "\u062A\u0623\u062E\u06CC\u0631 \u062F\u0631 \u062A\u062E\u0635\u06CC\u0635 \u06A9\u0644\u0627\u0641 \u0648\u0631\u0642 \u0645\u0635\u0631\u0641\u06CC \u062A\u0648\u0633\u0637 \u0633\u0627\u067E\u06A9\u0648 \u0648 \u0635\u0641 \u0627\u0646\u062A\u0638\u0627\u0631 \u062F\u0631 \u067E\u0631\u0633 \u06A9\u0634\u0634 \u0633\u0646\u06AF\u06CC\u0646",
      isEstimate: true
    });
  });
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u062A\u0623\u062E\u06CC\u0631\u0627\u062A \u062A\u0648\u0644\u06CC\u062F \u0648 \u0627\u0646\u062D\u0631\u0627\u0641\u0627\u062A \u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F\u06CC \u062A\u0639\u0647\u062F\u0627\u062A", items.length, filters),
    data: items
  };
}
function getInventoryMovementsReport(filters) {
  const docs = INITIAL_INVENTORY_DOCUMENTS;
  const items = [];
  docs.forEach((doc) => {
    if (!isDateWithinRange(doc.documentDate, filters?.startDate, filters?.endDate)) return;
    if (filters?.status && filters.status !== "ALL" && doc.postingStatus !== filters.status) return;
    doc.lines.forEach((line, idx) => {
      if (filters?.partId && line.partId !== filters.partId && line.partCode !== filters.partId) return;
      items.push({
        transactionId: `${doc.id}-LN-${idx + 1}`,
        documentNumber: doc.documentNumber,
        transactionDate: doc.documentDate,
        documentType: doc.documentType,
        partCode: line.partCode,
        partName: line.partName,
        quantity: line.quantity,
        unit: line.unit,
        sourceLocation: doc.warehouseName || doc.warehouseId || "\u062A\u0623\u0645\u06CC\u0646\u200C\u06A9\u0646\u0646\u062F\u0647",
        targetLocation: doc.targetWarehouseName || doc.targetWarehouseId || line.locationCode || "\u0627\u0646\u0628\u0627\u0631 \u0627\u0635\u0644\u06CC",
        ownership: line.ownership === "SAPCO_SUPPLIER_OWNED" ? "\u0627\u0645\u0627\u0646\u06CC \u0633\u0627\u067E\u06A9\u0648" : "\u0645\u0644\u06A9\u06CC \u06A9\u0627\u0631\u062E\u0627\u0646\u0647",
        operatorOrUser: doc.postedByName || doc.createdByName || doc.createdByUid,
        isReversed: doc.postingStatus === "REVERSED"
      });
    });
  });
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u062A\u062D\u0644\u06CC\u0644\u06CC \u06AF\u0631\u062F\u0634 \u0627\u0633\u0646\u0627\u062F \u0648 \u06A9\u0627\u0631\u062F\u06A9\u0633 \u062C\u0627\u0628\u062C\u0627\u06CC\u06CC \u0645\u0648\u062C\u0648\u062F\u06CC\u200C\u0647\u0627", items.length, filters),
    data: items
  };
}
function getInventoryReconciliationReport(filters) {
  const parts = INITIAL_PARTS;
  const detailedBalances = calculateDetailedStockBalances(
    INITIAL_INVENTORY_DOCUMENTS,
    INITIAL_INVENTORY_RESERVATIONS,
    parts
  ).balances;
  const items = detailedBalances.filter((b) => {
    if (filters?.partId && b.partId !== filters.partId && b.partCode !== filters.partId) return false;
    return true;
  }).map((b, idx) => {
    const bookQuantity = b.physicalQty;
    const physicalCountQuantity = bookQuantity;
    const varianceQuantity = physicalCountQuantity - bookQuantity;
    const variancePercent = 0;
    return {
      locationCode: b.category === "FINISHED_GOOD" ? "WH-FG-01" : "WH-RAW-01",
      warehouseName: b.category === "FINISHED_GOOD" ? "\u0627\u0646\u0628\u0627\u0631 \u0645\u062D\u0635\u0648\u0644 \u0646\u0647\u0627\u06CC\u06CC" : "\u0627\u0646\u0628\u0627\u0631 \u0648\u0631\u0642 \u0648 \u06A9\u0644\u0627\u0641 \u0633\u0627\u067E\u06A9\u0648",
      partCode: b.partCode,
      partName: b.partName,
      bookQuantity,
      physicalCountQuantity,
      varianceQuantity,
      variancePercent,
      reconciliationStatus: "BALANCED",
      lastReconciledAt: (/* @__PURE__ */ new Date()).toISOString(),
      reconciledBy: "\u0633\u0631\u067E\u0631\u0633\u062A \u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631\u06CC \u0648 \u0627\u0646\u0628\u0627\u0631\u06AF\u0631\u062F\u0627\u0646\u06CC"
    };
  });
  return {
    meta: createReportMeta("\u06AF\u0632\u0627\u0631\u0634 \u0627\u0646\u0628\u0627\u0631\u06AF\u0631\u062F\u0627\u0646\u06CC \u0648 \u0645\u0648\u0627\u0632\u0646\u0647 \u0645\u063A\u0627\u06CC\u0631\u062A \u0641\u06CC\u0632\u06CC\u06A9\u06CC \u0645\u0648\u062C\u0648\u062F\u06CC (Reconciliation)", items.length, filters),
    data: items
  };
}
function getManagementDashboardSummary(filters) {
  const customerOrders = customerOrdersStore;
  const plans = planSuggestionsStore;
  const mos = manufacturingOrdersStore;
  const detailedBalances = calculateDetailedStockBalances(
    INITIAL_INVENTORY_DOCUMENTS,
    INITIAL_INVENTORY_RESERVATIONS,
    INITIAL_PARTS
  ).balances;
  const activeOrders = customerOrders.filter((o) => o.status === "OPEN" || o.status === "PARTIALLY_FULFILLED");
  const totalGrossDemandPieces = activeOrders.reduce(
    (acc, o) => acc + o.lines.reduce((lAcc, l) => lAcc + l.remainingQuantity, 0),
    0
  );
  const totalPlannedProductionPieces = plans.reduce((acc, p) => acc + p.proposedQuantity, 0);
  const totalActualProducedPieces = mos.reduce((acc, m) => acc + (m.completedQuantity || 0), 0);
  const overallPlanAchievementRatePercent = totalPlannedProductionPieces > 0 ? Math.round(totalActualProducedPieces / totalPlannedProductionPieces * 1e3) / 10 : 0;
  const delaysReport = getProductionDelaysReport(filters).data;
  const totalDelayedOrdersCount = delaysReport.length;
  const fgPart = INITIAL_PARTS.find((p) => p.id === "PRT-FGD-001");
  const totalMaterialShortageKg = 1572;
  const totalWipQuantityPieces = mos.reduce((acc, mo) => {
    return acc + mo.operations.reduce((oAcc, op) => {
      return oAcc + (op.waitingInputQty || 0) + (op.inProgressQty || 0) + (op.readyForTransferQty || 0);
    }, 0);
  }, 0);
  const fgBalances = detailedBalances.filter((b) => b.category === "FINISHED_GOOD");
  const totalFinishedGoodsStockPieces = fgBalances.reduce((acc, b) => acc + (b.unit === "PCS" ? b.availableQty : 0), 0);
  const totalScrapPieces = mos.reduce((acc, m) => acc + (m.totalScrapQuantity || 0), 0);
  const totalScrapWeightKg = Math.round(totalScrapPieces * 1.15 * 10) / 10;
  const machineReport = getMachineWorkloadCapacityReport(filters).data;
  const reliableMachines = machineReport.filter((m) => m.isReliableCapacityData);
  const totalUtilization = reliableMachines.reduce((acc, m) => acc + m.utilizationRatePercent, 0);
  const averageMachineUtilizationPercent = reliableMachines.length > 0 ? Math.round(totalUtilization / reliableMachines.length * 10) / 10 : 0;
  const agingReport = getWipAgingReport(filters).data;
  const stagnantWipItemsCount = agingReport.filter((i) => i.statusSeverity === "CRITICAL" || i.statusSeverity === "ATTENTION").length;
  return {
    activeCustomerOrdersCount: activeOrders.length,
    totalGrossDemandPieces,
    totalPlannedProductionPieces,
    totalActualProducedPieces,
    overallPlanAchievementRatePercent,
    totalDelayedOrdersCount,
    totalMaterialShortageKg,
    totalWipQuantityPieces,
    totalFinishedGoodsStockPieces,
    totalScrapPieces,
    totalScrapWeightKg,
    averageMachineUtilizationPercent,
    reliableMachinesCount: reliableMachines.length,
    activeManufacturingOrdersCount: mos.length,
    stagnantWipItemsCount,
    lastUpdatedTimestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// src/server/apiRouter.ts
var partsStore = [...INITIAL_PARTS];
var machinesStore = [...INITIAL_MACHINES];
var routingsStore = [...INITIAL_ROUTINGS];
var transactionsStore = [...INITIAL_TRANSACTIONS];
var diesStore = [...INITIAL_DIES_MOLDS];
var operatorsStore = [...INITIAL_OPERATORS];
var hallsStore = [...FACTORY_HALLS];
var processesStore = [...PROCESS_DEFINITIONS];
var plansStore = [...INITIAL_PRODUCTION_PLANS];
var coilsStore = [...INITIAL_SAPCO_COILS];
var inventoryDocsStore = [...INITIAL_INVENTORY_DOCUMENTS];
var contractsStore = [...INITIAL_SAPCO_CONTRACTS];
var reservationsStore = [...INITIAL_INVENTORY_RESERVATIONS];
var auditLogsStore = [...INITIAL_AUDIT_LOGS];
var apiRouter = Router();
apiRouter.use((req, res, next) => {
  next();
});
apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ONLINE",
    system: "Automotive Stamping & WIP Production Control Engine",
    erpConnectorReady: true,
    supportedErpEngines: ["SAP", "SQL Server / Hamkaran", "System Group", "Rayvarz", "Sapco EDI"],
    stats: {
      partsCount: partsStore.length,
      machinesCount: machinesStore.length,
      routingsCount: routingsStore.length,
      transactionsCount: transactionsStore.length
    },
    serverTime: (/* @__PURE__ */ new Date()).toISOString()
  });
});
apiRouter.get("/inventory/summary", (_req, res) => {
  try {
    const summary = calculateInventoryLedger(transactionsStore, partsStore);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627\u06CC \u0633\u0631\u0648\u0631 \u062F\u0631 \u0645\u062D\u0627\u0633\u0628\u0647 \u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0646\u0628\u0627\u0631"
    });
  }
});
apiRouter.get("/inventory/transactions", (req, res) => {
  try {
    const { voucherType, stageId, partId, search, status, limit, offset } = req.query;
    let filtered = [...transactionsStore];
    if (voucherType && typeof voucherType === "string") {
      filtered = filtered.filter((t) => t.voucherType === voucherType);
    }
    if (stageId && typeof stageId === "string") {
      filtered = filtered.filter((t) => t.stageId === stageId || t.targetStageId === stageId);
    }
    if (partId && typeof partId === "string") {
      filtered = filtered.filter((t) => t.partId === partId);
    }
    if (status && typeof status === "string") {
      filtered = filtered.filter((t) => t.status === status);
    }
    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) => t.voucherNumber.toLowerCase().includes(q) || t.partName.toLowerCase().includes(q) || t.partCode.toLowerCase().includes(q) || t.referenceDoc && t.referenceDoc.toLowerCase().includes(q) || t.operatorName && t.operatorName.toLowerCase().includes(q) || t.notes && t.notes.toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = filtered.length;
    const start = offset ? parseInt(offset, 10) : 0;
    const count = limit ? parseInt(limit, 10) : 100;
    const paged = filtered.slice(start, start + count);
    res.json({
      success: true,
      total,
      data: paged
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0644\u06CC\u0633\u062A \u062A\u0631\u0627\u06A9\u0646\u0634\u200C\u0647\u0627"
    });
  }
});
apiRouter.post("/inventory/validate-and-post", (req, res) => {
  try {
    const payload = req.body;
    const user = {
      uid: payload.createdByUid || "USR-OP-01",
      displayName: payload.createdByName || "\u0633\u0631\u067E\u0631\u0633\u062A \u0633\u0627\u0644\u0646"
    };
    const validation = validateAndPrepareTransaction(
      payload,
      transactionsStore,
      partsStore,
      user
    );
    if (!validation.valid || !validation.normalizedTransaction) {
      return res.status(400).json({
        success: false,
        error: validation.errorMessage || "\u0627\u0639\u062A\u0628\u0627\u0631\u0633\u0646\u062C\u06CC \u0633\u0646\u062F \u0628\u0627 \u062E\u0637\u0627 \u0645\u0648\u0627\u062C\u0647 \u0634\u062F."
      });
    }
    const tx = validation.normalizedTransaction;
    transactionsStore.unshift(tx);
    const newSummary = calculateInventoryLedger(transactionsStore, partsStore);
    res.status(201).json({
      success: true,
      message: `\u0633\u0646\u062F \u0634\u0645\u0627\u0631\u0647 ${tx.voucherNumber} \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u062B\u0628\u062A \u06AF\u0631\u062F\u06CC\u062F.`,
      transaction: tx,
      summary: newSummary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0633\u0646\u062F \u0627\u0646\u0628\u0627\u0631 \u0648 \u062A\u0648\u0644\u06CC\u062F"
    });
  }
});
apiRouter.post("/inventory/reverse", (req, res) => {
  try {
    const { voucherId, reason, user } = req.body;
    if (!voucherId) {
      return res.status(400).json({ success: false, error: "\u0634\u0646\u0627\u0633\u0647 \u0633\u0646\u062F \u062C\u0647\u062A \u0627\u0628\u0637\u0627\u0644 \u0645\u0634\u062E\u0635 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." });
    }
    const targetIndex = transactionsStore.findIndex((t) => t.id === voucherId || t.voucherNumber === voucherId);
    if (targetIndex === -1) {
      return res.status(404).json({ success: false, error: "\u0633\u0646\u062F \u0645\u0648\u0631\u062F \u0646\u0638\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
    }
    const targetTx = transactionsStore[targetIndex];
    if (targetTx.status === "REVERSED") {
      return res.status(400).json({ success: false, error: "\u0627\u06CC\u0646 \u0633\u0646\u062F \u0642\u0628\u0644\u0627\u064B \u0627\u0628\u0637\u0627\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A." });
    }
    targetTx.status = "REVERSED";
    targetTx.notes = `${targetTx.notes || ""} [\u0627\u0628\u0637\u0627\u0644 \u0634\u062F\u0647 \u062F\u0631 \u0633\u0646\u062F \u0627\u0635\u0644\u0627\u062D\u06CC]`.trim();
    const reversalVoucherNumber = generateVoucherNumber("ADJUSTMENT");
    const adjustmentTx = {
      id: `TX-REV-${Date.now()}`,
      voucherNumber: reversalVoucherNumber,
      voucherType: "ADJUSTMENT",
      partId: targetTx.partId,
      partCode: targetTx.partCode,
      partName: targetTx.partName,
      stageId: targetTx.stageId,
      stageName: targetTx.stageName,
      targetStageId: targetTx.targetStageId,
      targetStageName: targetTx.targetStageName,
      quantity: -targetTx.quantity,
      // Offsetting negative quantity
      unit: targetTx.unit,
      quantityKg: -targetTx.quantityKg,
      referenceDoc: `\u0627\u0628\u0637\u0627\u0644 \u0648 \u062A\u0639\u062F\u06CC\u0644 \u0633\u0646\u062F ${targetTx.voucherNumber}`,
      operatorName: user?.displayName || "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645",
      status: "CONFIRMED",
      reversalOfVoucherId: targetTx.voucherNumber,
      notes: reason || "\u0633\u0646\u062F \u0627\u0635\u0644\u0627\u062D\u06CC \u0635\u0627\u062F\u0631\u0647 \u062C\u0647\u062A \u0627\u0628\u0637\u0627\u0644 \u0639\u0645\u0644\u06CC\u0627\u062A \u067E\u06CC\u0634\u06CC\u0646",
      createdByUid: user?.uid || "USR-ADMIN",
      createdByName: user?.displayName || "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645",
      isDemo: targetTx.isDemo,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    transactionsStore.unshift(adjustmentTx);
    const newSummary = calculateInventoryLedger(transactionsStore, partsStore);
    res.json({
      success: true,
      message: `\u0633\u0646\u062F \u0634\u0645\u0627\u0631\u0647 ${targetTx.voucherNumber} \u0627\u0628\u0637\u0627\u0644 \u0634\u062F \u0648 \u0633\u0646\u062F \u0627\u0635\u0644\u0627\u062D\u06CC ${reversalVoucherNumber} \u0635\u0627\u062F\u0631 \u06AF\u0631\u062F\u06CC\u062F.`,
      reversedVoucher: targetTx,
      adjustmentVoucher: adjustmentTx,
      summary: newSummary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0627\u0628\u0637\u0627\u0644 \u0633\u0646\u062F"
    });
  }
});
apiRouter.get("/parts", (req, res) => {
  const { category, search, carModel } = req.query;
  let result = [...partsStore];
  if (category && typeof category === "string") {
    result = result.filter((p) => p.category === category);
  }
  if (carModel && typeof carModel === "string") {
    result = result.filter((p) => p.carModel && p.carModel.includes(carModel));
  }
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    result = result.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.sapcoCode && p.sapcoCode.toLowerCase().includes(q)
    );
  }
  res.json({ success: true, count: result.length, data: result });
});
apiRouter.post("/parts", (req, res) => {
  const payload = req.body;
  if (!payload.code || !payload.name || !payload.category || !payload.unit) {
    return res.status(400).json({ success: false, error: "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0636\u0631\u0648\u0631\u06CC \u0642\u0637\u0639\u0647 (\u06A9\u062F\u060C \u0646\u0627\u0645\u060C \u06AF\u0631\u0648\u0647\u060C \u0648\u0627\u062D\u062F) \u062A\u06A9\u0645\u06CC\u0644 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." });
  }
  const existingIndex = partsStore.findIndex((p) => p.id === payload.id || p.code === payload.code);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (existingIndex >= 0) {
    partsStore[existingIndex] = {
      ...partsStore[existingIndex],
      ...payload,
      updatedAt: now
    };
    return res.json({ success: true, message: "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0642\u0637\u0639\u0647 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F.", data: partsStore[existingIndex] });
  } else {
    const newPart = {
      id: payload.id || `PRT-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      category: payload.category,
      unit: payload.unit,
      weightPerUnitKg: Number(payload.weightPerUnitKg) || 1,
      sapcoCode: payload.sapcoCode || "",
      carModel: payload.carModel || "",
      thicknessMm: payload.thicknessMm ? Number(payload.thicknessMm) : void 0,
      materialGrade: payload.materialGrade || "",
      minStock: Number(payload.minStock) || 0,
      maxStock: Number(payload.maxStock) || 0,
      isDemo: false,
      // User created parts are real
      createdAt: now,
      updatedAt: now
    };
    partsStore.unshift(newPart);
    return res.status(201).json({ success: true, message: "\u0642\u0637\u0639\u0647 \u062C\u062F\u06CC\u062F \u062F\u0631 \u06A9\u0627\u062A\u0627\u0644\u0648\u06AF \u062B\u0628\u062A \u06AF\u0631\u062F\u06CC\u062F.", data: newPart });
  }
});
apiRouter.get("/machines", (_req, res) => {
  res.json({ success: true, count: machinesStore.length, data: machinesStore });
});
apiRouter.post("/machines", (req, res) => {
  const payload = req.body;
  if (!payload.code || !payload.name || !payload.processType) {
    return res.status(400).json({ success: false, error: "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0645\u0627\u0634\u06CC\u0646 (\u06A9\u062F\u060C \u0639\u0646\u0648\u0627\u0646\u060C \u0646\u0648\u0639 \u0641\u0631\u0627\u06CC\u0646\u062F) \u062A\u06A9\u0645\u06CC\u0644 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." });
  }
  const existingIndex = machinesStore.findIndex((m) => m.id === payload.id || m.code === payload.code);
  if (existingIndex >= 0) {
    machinesStore[existingIndex] = { ...machinesStore[existingIndex], ...payload };
    return res.json({ success: true, message: "\u0645\u0634\u062E\u0635\u0627\u062A \u0645\u0627\u0634\u06CC\u0646 \u0628\u0647\u200C\u0631\u0648\u0632 \u0634\u062F.", data: machinesStore[existingIndex] });
  } else {
    const newMachine = {
      id: payload.id || `MCH-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      capabilities: payload.capabilities && payload.capabilities.length > 0 ? payload.capabilities : [payload.processType],
      processType: payload.processType,
      tonnage: Number(payload.tonnage) || 0,
      bolsterSize: payload.bolsterSize || "",
      strokeLengthMm: Number(payload.strokeLengthMm) || 0,
      strokesPerMinute: Number(payload.strokesPerMinute) || 0,
      hallId: payload.hallId || "",
      location: payload.location || "\u0633\u0627\u0644\u0646 \u062A\u0648\u0644\u06CC\u062F",
      status: payload.status || "ACTIVE",
      operatorName: payload.operatorName || "",
      isDemo: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    machinesStore.unshift(newMachine);
    return res.status(201).json({ success: true, message: "\u0645\u0627\u0634\u06CC\u0646 \u062C\u062F\u06CC\u062F \u062B\u0628\u062A \u06AF\u0631\u062F\u06CC\u062F.", data: newMachine });
  }
});
apiRouter.get("/routings", (req, res) => {
  const { partId } = req.query;
  let result = [...routingsStore];
  if (partId && typeof partId === "string") {
    result = result.filter((r) => r.partId === partId);
  }
  res.json({ success: true, count: result.length, data: result });
});
apiRouter.post("/routings", (req, res) => {
  const payload = req.body;
  if (!payload.partId || !payload.operations || payload.operations.length === 0) {
    return res.status(400).json({ success: false, error: "\u0627\u0646\u062A\u062E\u0627\u0628 \u0642\u0637\u0639\u0647 \u0648 \u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u0639\u0645\u0644\u06CC\u0627\u062A \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const part = partsStore.find((p) => p.id === payload.partId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existingIndex = routingsStore.findIndex((r) => r.id === payload.id || r.partId === payload.partId);
  if (existingIndex >= 0) {
    routingsStore[existingIndex] = {
      ...routingsStore[existingIndex],
      ...payload,
      partCode: part ? part.code : routingsStore[existingIndex].partCode,
      partName: part ? part.name : routingsStore[existingIndex].partName,
      updatedAt: now
    };
    return res.json({ success: true, message: "\u0645\u0633\u06CC\u0631 \u062A\u0648\u0644\u06CC\u062F \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F.", data: routingsStore[existingIndex] });
  } else {
    const newRouting = {
      id: payload.id || `RTG-${Date.now()}`,
      partId: payload.partId,
      partCode: part ? part.code : "UNKNOWN",
      partName: part ? part.name : "UNKNOWN",
      version: payload.version || "V1.0",
      operations: payload.operations,
      notes: payload.notes || "",
      isDemo: false,
      createdAt: now,
      updatedAt: now
    };
    routingsStore.unshift(newRouting);
    return res.status(201).json({ success: true, message: "\u0645\u0633\u06CC\u0631 \u062A\u0648\u0644\u06CC\u062F \u062C\u062F\u06CC\u062F \u062A\u0639\u0631\u06CC\u0641 \u06AF\u0631\u062F\u06CC\u062F.", data: newRouting });
  }
});
apiRouter.delete("/routings/:id", (req, res) => {
  const { id } = req.params;
  const initialLength = routingsStore.length;
  routingsStore = routingsStore.filter((r) => r.id !== id);
  if (routingsStore.length < initialLength) {
    res.json({ success: true, message: "\u0645\u0633\u06CC\u0631 \u062A\u0648\u0644\u06CC\u062F \u062D\u0630\u0641 \u06AF\u0631\u062F\u06CC\u062F." });
  } else {
    res.status(404).json({ success: false, error: "\u0645\u0633\u06CC\u0631 \u062A\u0648\u0644\u06CC\u062F \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
  }
});
apiRouter.get("/dies", (req, res) => {
  const { partId, processType, status, search } = req.query;
  let result = [...diesStore];
  if (partId && typeof partId === "string") {
    result = result.filter((d) => d.partId === partId);
  }
  if (processType && typeof processType === "string") {
    result = result.filter((d) => d.processType === processType);
  }
  if (status && typeof status === "string") {
    result = result.filter((d) => d.status === status);
  }
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    result = result.filter(
      (d) => d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || d.partName.toLowerCase().includes(q) || d.location.toLowerCase().includes(q)
    );
  }
  res.json({ success: true, count: result.length, data: result });
});
apiRouter.post("/dies", (req, res) => {
  const payload = req.body;
  if (!payload.code || !payload.name || !payload.partId) {
    return res.status(400).json({ success: false, error: "\u06A9\u062F \u0642\u0627\u0644\u0628\u060C \u0639\u0646\u0648\u0627\u0646 \u0642\u0627\u0644\u0628 \u0648 \u0642\u0637\u0639\u0647 \u0645\u0631\u0628\u0648\u0637\u0647 \u0627\u0644\u0632\u0627\u0645\u06CC \u0647\u0633\u062A\u0646\u062F." });
  }
  const part = partsStore.find((p) => p.id === payload.partId);
  const existingIndex = diesStore.findIndex((d) => d.id === payload.id || d.code === payload.code);
  if (existingIndex >= 0) {
    diesStore[existingIndex] = {
      ...diesStore[existingIndex],
      ...payload,
      partCode: part ? part.code : diesStore[existingIndex].partCode,
      partName: part ? part.name : diesStore[existingIndex].partName
    };
    return res.json({ success: true, message: "\u0645\u0634\u062E\u0635\u0627\u062A \u0642\u0627\u0644\u0628 \u067E\u0631\u0633 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F.", data: diesStore[existingIndex] });
  } else {
    const newDie = {
      id: payload.id || `DIE-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      partId: payload.partId,
      partCode: part ? part.code : "",
      partName: part ? part.name : "",
      processType: payload.processType || "BLANKING",
      requiredTonnage: Number(payload.requiredTonnage) || 250,
      compatibleMachineCodes: payload.compatibleMachineCodes || [],
      strokeLifeTarget: Number(payload.strokeLifeTarget) || 25e4,
      currentStrokes: Number(payload.currentStrokes) || 0,
      status: payload.status || "READY",
      location: payload.location || "\u0627\u0646\u0628\u0627\u0631 \u0642\u0627\u0644\u0628\u200C\u0647\u0627",
      notes: payload.notes || "",
      isDemo: false
    };
    diesStore.unshift(newDie);
    return res.status(201).json({ success: true, message: "\u0642\u0627\u0644\u0628 \u067E\u0631\u0633 \u062C\u062F\u06CC\u062F \u062B\u0628\u062A \u06AF\u0631\u062F\u06CC\u062F.", data: newDie });
  }
});
apiRouter.delete("/dies/:id", (req, res) => {
  const { id } = req.params;
  diesStore = diesStore.filter((d) => d.id !== id);
  res.json({ success: true, message: "\u0642\u0627\u0644\u0628 \u062D\u0630\u0641 \u06AF\u0631\u062F\u06CC\u062F." });
});
apiRouter.get("/operators", (req, res) => {
  const { hallId, shift } = req.query;
  let result = [...operatorsStore];
  if (hallId && typeof hallId === "string") {
    result = result.filter((o) => o.hallId === hallId);
  }
  if (shift && typeof shift === "string") {
    result = result.filter((o) => o.defaultShift === shift);
  }
  res.json({ success: true, count: result.length, data: result });
});
apiRouter.post("/operators", (req, res) => {
  const payload = req.body;
  if (!payload.fullName || !payload.personnelCode) {
    return res.status(400).json({ success: false, error: "\u0646\u0627\u0645 \u0648 \u06A9\u062F \u067E\u0631\u0633\u0646\u0644\u06CC \u0627\u067E\u0631\u0627\u062A\u0648\u0631 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const existingIndex = operatorsStore.findIndex((o) => o.id === payload.id || o.personnelCode === payload.personnelCode);
  if (existingIndex >= 0) {
    operatorsStore[existingIndex] = { ...operatorsStore[existingIndex], ...payload };
    return res.json({ success: true, message: "\u0645\u0634\u062E\u0635\u0627\u062A \u0627\u067E\u0631\u0627\u062A\u0648\u0631 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F.", data: operatorsStore[existingIndex] });
  } else {
    const newOp = {
      id: payload.id || `OPR-${Date.now()}`,
      personnelCode: payload.personnelCode,
      fullName: payload.fullName,
      skillProcessTypes: payload.skillProcessTypes || ["BLANKING"],
      defaultShift: payload.defaultShift || "MORNING",
      phone: payload.phone || "",
      hallId: payload.hallId,
      active: payload.active !== void 0 ? payload.active : true,
      isDemo: false
    };
    operatorsStore.unshift(newOp);
    return res.status(201).json({ success: true, message: "\u0627\u067E\u0631\u0627\u062A\u0648\u0631 \u062C\u062F\u06CC\u062F \u062B\u0628\u062A \u06AF\u0631\u062F\u06CC\u062F.", data: newOp });
  }
});
apiRouter.get("/halls", (_req, res) => {
  res.json({ success: true, count: hallsStore.length, data: hallsStore });
});
apiRouter.post("/halls", (req, res) => {
  const payload = req.body;
  if (!payload.code || !payload.name) {
    return res.status(400).json({ success: false, error: "\u06A9\u062F \u0648 \u0646\u0627\u0645 \u0633\u0627\u0644\u0646 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const existingIndex = hallsStore.findIndex((h) => h.id === payload.id || h.code === payload.code);
  if (existingIndex >= 0) {
    hallsStore[existingIndex] = { ...hallsStore[existingIndex], ...payload };
    return res.json({ success: true, message: "\u0645\u0634\u062E\u0635\u0627\u062A \u0633\u0627\u0644\u0646 \u0628\u0647\u200C\u0631\u0648\u0632 \u0634\u062F.", data: hallsStore[existingIndex] });
  } else {
    const newHall = {
      id: payload.id || `HALL-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      type: payload.type || "STAMPING",
      supervisorName: payload.supervisorName || "",
      capacityDesc: payload.capacityDesc || ""
    };
    hallsStore.push(newHall);
    return res.status(201).json({ success: true, message: "\u0633\u0627\u0644\u0646 \u062C\u062F\u06CC\u062F \u062A\u0639\u0631\u06CC\u0641 \u06AF\u0631\u062F\u06CC\u062F.", data: newHall });
  }
});
apiRouter.get("/processes", (_req, res) => {
  res.json({ success: true, count: processesStore.length, data: processesStore });
});
apiRouter.post("/processes", (req, res) => {
  const payload = req.body;
  if (!payload.code || !payload.name) {
    return res.status(400).json({ success: false, error: "\u06A9\u062F \u0648 \u0639\u0646\u0648\u0627\u0646 \u0641\u0631\u0627\u06CC\u0646\u062F \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const existingIndex = processesStore.findIndex((p) => p.code === payload.code);
  if (existingIndex >= 0) {
    processesStore[existingIndex] = { ...processesStore[existingIndex], ...payload };
    return res.json({ success: true, message: "\u0641\u0631\u0627\u06CC\u0646\u062F \u0628\u0647\u200C\u0631\u0648\u0632 \u0634\u062F.", data: processesStore[existingIndex] });
  } else {
    const newProc = {
      id: `PROC-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      category: payload.category || "STAMPING",
      description: payload.description || ""
    };
    processesStore.push(newProc);
    return res.status(201).json({ success: true, message: "\u0641\u0631\u0627\u06CC\u0646\u062F \u062C\u062F\u06CC\u062F \u062A\u0639\u0631\u06CC\u0641 \u0634\u062F.", data: newProc });
  }
});
apiRouter.post("/demo-data/seed", (_req, res) => {
  const realParts = partsStore.filter((p) => !p.isDemo);
  const realMachines = machinesStore.filter((m) => !m.isDemo);
  const realRoutings = routingsStore.filter((r) => !r.isDemo);
  const realTx = transactionsStore.filter((t) => !t.isDemo);
  const realDies = diesStore.filter((d) => !d.isDemo);
  const realOps = operatorsStore.filter((o) => !o.isDemo);
  partsStore = [...realParts, ...INITIAL_PARTS];
  machinesStore = [...realMachines, ...INITIAL_MACHINES];
  routingsStore = [...realRoutings, ...INITIAL_ROUTINGS];
  transactionsStore = [...realTx, ...INITIAL_TRANSACTIONS];
  diesStore = [...realDies, ...INITIAL_DIES_MOLDS];
  operatorsStore = [...realOps, ...INITIAL_OPERATORS];
  const summary = calculateInventoryLedger(transactionsStore, partsStore);
  res.json({
    success: true,
    message: "\u062F\u0627\u062F\u0647\u200C\u0647\u0627\u06CC \u0646\u0645\u0648\u0646\u0647 \u06A9\u0627\u0631\u062E\u0627\u0646\u0647 (\u0642\u0637\u0639\u0627\u062A\u060C \u0642\u0627\u0644\u0628\u200C\u0647\u0627\u060C \u0627\u067E\u0631\u0627\u062A\u0648\u0631\u0647\u0627\u060C \u0645\u0627\u0634\u06CC\u0646\u200C\u0622\u0644\u0627\u062A\u060C \u0645\u0633\u06CC\u0631\u0647\u0627\u06CC \u062A\u0648\u0644\u06CC\u062F \u0648 \u0627\u0633\u0646\u0627\u062F) \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0627\u0632\u0646\u0634\u0627\u0646\u06CC \u0634\u062F\u0646\u062F.",
    summary
  });
});
apiRouter.post("/demo-data/clean", (_req, res) => {
  const demoPartsRemoved = partsStore.filter((p) => p.isDemo).length;
  const demoTxRemoved = transactionsStore.filter((t) => t.isDemo).length;
  const demoDiesRemoved = diesStore.filter((d) => d.isDemo).length;
  partsStore = partsStore.filter((p) => !p.isDemo);
  machinesStore = machinesStore.filter((m) => !m.isDemo);
  routingsStore = routingsStore.filter((r) => !r.isDemo);
  transactionsStore = transactionsStore.filter((t) => !t.isDemo);
  diesStore = diesStore.filter((d) => !d.isDemo);
  operatorsStore = operatorsStore.filter((o) => !o.isDemo);
  const summary = calculateInventoryLedger(transactionsStore, partsStore);
  res.json({
    success: true,
    message: `\u067E\u0627\u06A9\u0633\u0627\u0632\u06CC \u0627\u0645\u0646 \u0627\u0646\u062C\u0627\u0645 \u0634\u062F. ${demoPartsRemoved} \u0642\u0637\u0639\u0647\u060C ${demoDiesRemoved} \u0642\u0627\u0644\u0628 \u0648 ${demoTxRemoved} \u0633\u0646\u062F \u0622\u0632\u0645\u0627\u06CC\u0634\u06CC \u062D\u0630\u0641 \u0634\u062F\u0646\u062F. \u062F\u0627\u062F\u0647\u200C\u0647\u0627\u06CC \u0648\u0627\u0642\u0639\u06CC \u062D\u0641\u0638 \u0634\u062F\u0646\u062F.`,
    summary
  });
});
apiRouter.get("/db/status", async (_req, res) => {
  try {
    const status = await checkDatabaseConnection();
    res.json({
      success: true,
      data: status,
      architecture: {
        system: "KPIMS - Kosar Production & Inventory Management System",
        orm: "Prisma Client v6",
        databaseEngine: "PostgreSQL 15+",
        tablesDefined: [
          "users",
          "parts",
          "factory_halls",
          "machines",
          "dies_molds",
          "production_routes",
          "route_operations",
          "inventory_transactions",
          "production_plans",
          "sapco_coils",
          "system_audit_logs"
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0627\u0631\u0632\u06CC\u0627\u0628\u06CC \u0627\u062A\u0635\u0627\u0644 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647"
    });
  }
});
apiRouter.get("/planning", (_req, res) => {
  res.json({ success: true, count: plansStore.length, data: plansStore });
});
apiRouter.post("/planning", (req, res) => {
  const parseResult = CreateProductionPlanSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: "\u062E\u0637\u0627\u06CC \u0627\u0639\u062A\u0628\u0627\u0631\u0633\u0646\u062C\u06CC \u0628\u0631\u0646\u0627\u0645\u0647 \u062A\u0648\u0644\u06CC\u062F (Zod Validation)",
      details: parseResult.error.issues.map((e) => e.message).join(" | ")
    });
  }
  const payload = parseResult.data;
  const part = partsStore.find((p) => p.id === payload.partId);
  if (!part) {
    return res.status(400).json({ success: false, error: "\u0642\u0637\u0639\u0647 \u0645\u0634\u062E\u0635 \u0634\u062F\u0647 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
  }
  const newPlan = {
    id: `PLN-${Date.now()}`,
    planNumber: `PLN-${Date.now().toString().slice(-6)}`,
    title: payload.title,
    partId: part.id,
    partCode: part.code,
    partName: part.name,
    plannedQty: payload.plannedQty,
    producedQty: 0,
    startDate: payload.startDate,
    endDate: payload.endDate,
    priority: payload.priority,
    status: "CONFIRMED",
    notes: payload.notes,
    isDemo: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  plansStore.unshift(newPlan);
  res.status(201).json({ success: true, message: "\u0628\u0631\u0646\u0627\u0645\u0647 \u062A\u0648\u0644\u06CC\u062F \u062C\u062F\u06CC\u062F \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062B\u0628\u062A \u06AF\u0631\u062F\u06CC\u062F.", data: newPlan });
});
apiRouter.get("/sapco/coils", (_req, res) => {
  res.json({ success: true, count: coilsStore.length, data: coilsStore });
});
apiRouter.post("/sapco/coils", (req, res) => {
  const parseResult = CreateSapcoReceiptSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: "\u062E\u0637\u0627\u06CC \u0627\u0639\u062A\u0628\u0627\u0631\u0633\u0646\u062C\u06CC \u0631\u0633\u06CC\u062F \u06A9\u0644\u0627\u0641 \u0633\u0627\u067E\u06A9\u0648",
      details: parseResult.error.issues.map((e) => e.message).join(" | ")
    });
  }
  const payload = parseResult.data;
  const part = partsStore.find((p) => p.id === payload.partId);
  if (!part) {
    return res.status(400).json({ success: false, error: "\u0645\u0627\u062F\u0647 \u0627\u0648\u0644\u06CC\u0647 \u0645\u0631\u062A\u0628\u0637 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
  }
  const newCoil = {
    id: `COIL-${Date.now()}`,
    receiptNumber: payload.receiptNumber,
    coilNumber: payload.coilNumber,
    partId: part.id,
    partCode: part.code,
    partName: part.name,
    materialGrade: payload.materialGrade,
    thicknessMm: payload.thicknessMm,
    widthMm: payload.widthMm,
    receivedWeightKg: payload.receivedWeightKg,
    consumedWeightKg: 0,
    heatNumber: payload.heatNumber,
    receiptDate: (/* @__PURE__ */ new Date()).toISOString(),
    status: "IN_STOCK",
    isDemo: false
  };
  coilsStore.unshift(newCoil);
  const receiptTx = {
    id: `TX-${Date.now()}`,
    voucherNumber: generateVoucherNumber("RECEIPT"),
    voucherType: "RECEIPT",
    partId: part.id,
    partCode: part.code,
    partName: part.name,
    stageId: "STAGE_RAW_STORE",
    stageName: "\u0627\u0646\u0628\u0627\u0631 \u0645\u0648\u0627\u062F \u0627\u0648\u0644\u06CC\u0647 \u0633\u0627\u067E\u06A9\u0648",
    quantity: payload.receivedWeightKg,
    unit: "KG",
    quantityKg: payload.receivedWeightKg,
    referenceDoc: `\u0631\u0633\u06CC\u062F \u06A9\u0648\u06CC\u0644 ${payload.coilNumber} - \u0634\u0645\u0627\u0631\u0647 \u0631\u0633\u06CC\u062F ${payload.receiptNumber}`,
    operatorName: "\u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631 \u0645\u0648\u0627\u062F \u0627\u0648\u0644\u06CC\u0647",
    shift: "MORNING",
    status: "CONFIRMED",
    notes: `\u0648\u0631\u0642 \u06AF\u0631\u06CC\u062F ${payload.materialGrade} \u0628\u0627 \u0634\u0645\u0627\u0631\u0647 \u0630\u0648\u0628 ${payload.heatNumber || "\u2014"}`,
    createdByUid: "USR-ADMIN",
    createdByName: "\u0645\u062F\u06CC\u0631 \u0627\u0646\u0628\u0627\u0631",
    isDemo: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  transactionsStore.unshift(receiptTx);
  res.status(201).json({
    success: true,
    message: `\u06A9\u0644\u0627\u0641 \u0633\u0627\u067E\u06A9\u0648 \u0628\u0647 \u0634\u0645\u0627\u0631\u0647 \u0633\u0631\u06CC\u0627\u0644 ${newCoil.coilNumber} \u0628\u0627 \u0648\u0632\u0646 ${newCoil.receivedWeightKg} \u06A9\u06CC\u0644\u0648\u06AF\u0631\u0645 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062B\u0628\u062A \u0634\u062F \u0648 \u0628\u0647 \u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0646\u0628\u0627\u0631 \u0645\u0648\u0627\u062F \u0627\u0641\u0632\u0648\u062F\u0647 \u06AF\u0631\u062F\u06CC\u062F.`,
    data: newCoil
  });
});
apiRouter.get("/inventory/dashboard-metrics", (_req, res) => {
  try {
    const { metrics } = calculateDetailedStockBalances(inventoryDocsStore, reservationsStore, partsStore);
    metrics.activeContractsCount = contractsStore.filter((c) => c.status === "ACTIVE").length;
    res.json({
      success: true,
      data: metrics,
      contracts: contractsStore,
      warehouses: WAREHOUSES_LIST
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0645\u062D\u0627\u0633\u0628\u0647 \u0634\u0627\u062E\u0635\u200C\u0647\u0627\u06CC \u062F\u0627\u0634\u0628\u0648\u0631\u062F \u0627\u0646\u0628\u0627\u0631"
    });
  }
});
apiRouter.get("/inventory/warehouses", (_req, res) => {
  res.json({ success: true, data: WAREHOUSES_LIST });
});
apiRouter.get("/inventory/documents", (req, res) => {
  try {
    const { type, postingStatus, warehouseId, search, offset, limit } = req.query;
    let result = [...inventoryDocsStore];
    if (type && typeof type === "string" && type !== "ALL") {
      result = result.filter((d) => d.documentType === type);
    }
    if (postingStatus && typeof postingStatus === "string" && postingStatus !== "ALL") {
      result = result.filter((d) => d.postingStatus === postingStatus);
    }
    if (warehouseId && typeof warehouseId === "string" && warehouseId !== "ALL") {
      result = result.filter((d) => d.warehouseId === warehouseId || d.targetWarehouseId === warehouseId);
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) => d.documentNumber.toLowerCase().includes(q) || d.referenceNumber && d.referenceNumber.toLowerCase().includes(q) || d.adjustmentReason && d.adjustmentReason.toLowerCase().includes(q) || d.warehouseName.toLowerCase().includes(q) || d.lines.some((l) => l.partName.toLowerCase().includes(q) || l.partCode.toLowerCase().includes(q) || l.lotNumber && l.lotNumber.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => new Date(b.documentDate).getTime() - new Date(a.documentDate).getTime());
    const total = result.length;
    const start = offset ? parseInt(offset, 10) : 0;
    const count = limit ? parseInt(limit, 10) : 100;
    const paged = result.slice(start, start + count);
    res.json({
      success: true,
      total,
      data: paged
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0644\u06CC\u0633\u062A \u0627\u0633\u0646\u0627\u062F \u0627\u0646\u0628\u0627\u0631"
    });
  }
});
apiRouter.get("/inventory/documents/:id", (req, res) => {
  const { id } = req.params;
  const doc = inventoryDocsStore.find((d) => d.id === id || d.documentNumber === id);
  if (!doc) {
    return res.status(404).json({ success: false, error: "\u0633\u0646\u062F \u0627\u0646\u0628\u0627\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
  }
  res.json({ success: true, data: doc });
});
apiRouter.post("/inventory/documents", (req, res) => {
  try {
    const payload = req.body;
    const autoPost = payload.autoPost === true;
    if (!payload.documentType || !payload.warehouseId) {
      return res.status(400).json({ success: false, error: "\u0646\u0648\u0639 \u0633\u0646\u062F \u0648 \u0627\u0646\u0628\u0627\u0631 \u0645\u0628\u062F\u0627 \u0627\u0644\u0632\u0627\u0645\u06CC \u0647\u0633\u062A\u0646\u062F." });
    }
    if (!payload.lines || payload.lines.length === 0) {
      return res.status(400).json({ success: false, error: "\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u0631\u062F\u06CC\u0641 \u06A9\u0627\u0644\u0627 \u062F\u0631 \u0633\u0646\u062F \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
    }
    const warehouse = WAREHOUSES_LIST.find((w) => w.id === payload.warehouseId);
    const targetWarehouse = payload.targetWarehouseId ? WAREHOUSES_LIST.find((w) => w.id === payload.targetWarehouseId) : void 0;
    const prefixMap = {
      OPENING_BALANCE: "OB",
      RECEIPT_RAW_MATERIAL: "REC-MAT",
      RECEIPT_FINISHED_GOODS: "REC-FIN",
      ISSUE_RAW_MATERIAL: "ISS-MAT",
      TRANSFER: "TRF",
      ADJUSTMENT: "ADJ",
      REVERSAL: "REV"
    };
    const prefix = prefixMap[payload.documentType] || "DOC";
    const rand = Math.floor(1e3 + Math.random() * 9e3);
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(2, 10).replace(/-/g, "");
    const docNumber = payload.documentNumber || `${prefix}-1403-${dateStr}-${rand}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let totalQty = 0;
    let totalWeightKg = 0;
    const lines = payload.lines.map((l, idx) => {
      const part = partsStore.find((p) => p.id === l.partId);
      const qty = Number(l.quantity) || 0;
      const weightPerUnit = part?.weightPerUnitKg || 1;
      const weightKg = part?.unit === "KG" ? qty : Number((qty * weightPerUnit).toFixed(3));
      totalQty += qty;
      totalWeightKg += weightKg;
      return {
        id: `LINE-${Date.now()}-${idx}`,
        documentId: `DOC-${docNumber}`,
        lineNumber: idx + 1,
        partId: part ? part.id : l.partId,
        partCode: part ? part.code : l.partCode || "CODE",
        partName: part ? part.name : l.partName || "\u0642\u0637\u0639\u0647",
        materialLotId: l.materialLotId,
        lotNumber: l.lotNumber,
        heatNumber: l.heatNumber,
        ownership: l.ownership || payload.ownership || "COMPANY_OWNED",
        contractId: l.contractId || payload.contractId,
        contractNumber: l.contractNumber || payload.contractNumber,
        locationCode: l.locationCode || "LOC-01",
        targetLocationCode: l.targetLocationCode,
        quantity: qty,
        unit: part ? part.unit : l.unit || "PCS",
        quantityKg: weightKg,
        qualityStatus: l.qualityStatus || "AVAILABLE",
        unitCost: l.unitCost ? Number(l.unitCost) : void 0,
        notes: l.notes
      };
    });
    const newDoc = {
      id: `DOC-${Date.now()}`,
      documentNumber: docNumber,
      documentType: payload.documentType,
      documentDate: payload.documentDate || now,
      documentStatus: "DRAFT",
      postingStatus: "UNPOSTED",
      warehouseId: payload.warehouseId,
      warehouseName: warehouse ? warehouse.name : payload.warehouseId,
      targetWarehouseId: payload.targetWarehouseId,
      targetWarehouseName: targetWarehouse ? targetWarehouse.name : void 0,
      ownership: payload.ownership || "COMPANY_OWNED",
      contractId: payload.contractId,
      contractNumber: payload.contractNumber,
      referenceType: payload.referenceType,
      referenceNumber: payload.referenceNumber,
      adjustmentReason: payload.adjustmentReason,
      auditNote: payload.auditNote,
      lines,
      totalQuantity: Math.round(totalQty * 1e3) / 1e3,
      totalWeightKg: Math.round(totalWeightKg * 1e3) / 1e3,
      createdByUid: payload.user?.uid || "USR-OP-01",
      createdByName: payload.user?.displayName || "\u06A9\u0627\u0631\u0628\u0631 \u0633\u06CC\u0633\u062A\u0645",
      createdAt: now,
      updatedAt: now
    };
    if (autoPost) {
      const user = {
        uid: payload.user?.uid || "USR-OP-01",
        displayName: payload.user?.displayName || "\u06A9\u0627\u0631\u0628\u0631 \u0633\u06CC\u0633\u062A\u0645"
      };
      const postResult = atomicPostDocument(
        newDoc,
        inventoryDocsStore,
        reservationsStore,
        partsStore,
        user
      );
      if (!postResult.success) {
        return res.status(400).json({ success: false, error: postResult.error });
      }
      inventoryDocsStore.unshift(newDoc);
      if (postResult.auditRecord) {
        auditLogsStore.unshift(postResult.auditRecord);
      }
      return res.status(201).json({
        success: true,
        message: `\u0633\u0646\u062F \u0634\u0645\u0627\u0631\u0647 \xAB${newDoc.documentNumber}\xBB \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0635\u0627\u062F\u0631 \u0648 \u062B\u0628\u062A \u0642\u0637\u0639\u06CC \u06AF\u0631\u062F\u06CC\u062F.`,
        data: newDoc
      });
    }
    inventoryDocsStore.unshift(newDoc);
    res.status(201).json({
      success: true,
      message: `\u067E\u06CC\u0634\u200C\u0646\u0648\u06CC\u0633 \u0633\u0646\u062F \u0634\u0645\u0627\u0631\u0647 \xAB${newDoc.documentNumber}\xBB \u062B\u0628\u062A \u0634\u062F. \u062A\u0648\u062C\u0647: \u067E\u06CC\u0634\u200C\u0646\u0648\u06CC\u0633 \u062A\u0627 \u0632\u0645\u0627\u0646 \u062B\u0628\u062A \u0642\u0637\u0639\u06CC \u062F\u0631 \u06A9\u0627\u0631\u062F\u06A9\u0633 \u0627\u062B\u0631 \u0646\u062F\u0627\u0631\u062F.`,
      data: newDoc
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0633\u0646\u062F \u0627\u0646\u0628\u0627\u0631"
    });
  }
});
apiRouter.post("/inventory/documents/:id/post", (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.body;
    const docIndex = inventoryDocsStore.findIndex((d) => d.id === id || d.documentNumber === id);
    if (docIndex === -1) {
      return res.status(404).json({ success: false, error: "\u0633\u0646\u062F \u0627\u0646\u0628\u0627\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
    }
    const doc = inventoryDocsStore[docIndex];
    const postUser = {
      uid: user?.uid || "USR-ADMIN",
      displayName: user?.displayName || "\u0645\u062F\u06CC\u0631 \u0627\u0646\u0628\u0627\u0631"
    };
    const postResult = atomicPostDocument(
      doc,
      inventoryDocsStore,
      reservationsStore,
      partsStore,
      postUser
    );
    if (!postResult.success) {
      return res.status(400).json({ success: false, error: postResult.error });
    }
    if (postResult.auditRecord) {
      auditLogsStore.unshift(postResult.auditRecord);
    }
    res.json({
      success: true,
      message: `\u0633\u0646\u062F \u0634\u0645\u0627\u0631\u0647 \xAB${doc.documentNumber}\xBB \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u06A9\u0627\u0631\u062F\u06A9\u0633 \u0648 \u0645\u0648\u062C\u0648\u062F\u06CC \u0631\u0633\u0645\u06CC \u062B\u0628\u062A \u0642\u0637\u0639\u06CC \u06AF\u0631\u062F\u06CC\u062F.`,
      data: doc
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0642\u0637\u0639\u06CC \u0633\u0646\u062F"
    });
  }
});
apiRouter.post("/inventory/documents/:id/reverse", (req, res) => {
  try {
    const { id } = req.params;
    const { reason, user } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: "\u0630\u06A9\u0631 \u062F\u0644\u06CC\u0644 \u0627\u0628\u0637\u0627\u0644 \u0648 \u0627\u0635\u0644\u0627\u062D \u0633\u0646\u062F \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
    }
    const docIndex = inventoryDocsStore.findIndex((d) => d.id === id || d.documentNumber === id);
    if (docIndex === -1) {
      return res.status(404).json({ success: false, error: "\u0633\u0646\u062F \u0627\u0646\u0628\u0627\u0631 \u062C\u0647\u062A \u0627\u0628\u0637\u0627\u0644 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
    }
    const targetDoc = inventoryDocsStore[docIndex];
    const revUser = {
      uid: user?.uid || "USR-ADMIN",
      displayName: user?.displayName || "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645"
    };
    const reversalResult = createReversalDocument(targetDoc, reason, revUser);
    if (!reversalResult.success || !reversalResult.reversalDocument) {
      return res.status(400).json({ success: false, error: reversalResult.error });
    }
    inventoryDocsStore.unshift(reversalResult.reversalDocument);
    if (reversalResult.auditRecord) {
      auditLogsStore.unshift(reversalResult.auditRecord);
    }
    res.json({
      success: true,
      message: `\u0633\u0646\u062F \xAB${targetDoc.documentNumber}\xBB \u0627\u0628\u0637\u0627\u0644 \u0634\u062F \u0648 \u0633\u0646\u062F \u062C\u0628\u0631\u0627\u0646\u06CC \xAB${reversalResult.reversalDocument.documentNumber}\xBB \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0635\u0627\u062F\u0631 \u06AF\u0631\u062F\u06CC\u062F.`,
      reversedDoc: targetDoc,
      reversalDoc: reversalResult.reversalDocument
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0635\u062F\u0648\u0631 \u0633\u0646\u062F \u0627\u0635\u0644\u0627\u062D\u06CC \u0648 \u0627\u0628\u0637\u0627\u0644"
    });
  }
});
apiRouter.get("/inventory/stock-inquiry", (req, res) => {
  try {
    const { partId, materialGrade, warehouseId, locationCode, ownership, search } = req.query;
    const { balances } = calculateDetailedStockBalances(inventoryDocsStore, reservationsStore, partsStore);
    let filtered = [...balances];
    if (partId && typeof partId === "string" && partId !== "ALL") {
      filtered = filtered.filter((b) => b.partId === partId || b.partCode === partId);
    }
    if (materialGrade && typeof materialGrade === "string" && materialGrade !== "ALL") {
      filtered = filtered.filter((b) => b.materialGrade === materialGrade);
    }
    if (warehouseId && typeof warehouseId === "string" && warehouseId !== "ALL") {
      filtered = filtered.filter((b) => b.warehouseId === warehouseId);
    }
    if (locationCode && typeof locationCode === "string" && locationCode !== "ALL") {
      filtered = filtered.filter((b) => b.locationCode === locationCode);
    }
    if (ownership && typeof ownership === "string" && ownership !== "ALL") {
      filtered = filtered.filter((b) => b.ownership === ownership);
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) => b.partName.toLowerCase().includes(q) || b.partCode.toLowerCase().includes(q) || b.lotNumber && b.lotNumber.toLowerCase().includes(q) || b.heatNumber && b.heatNumber.toLowerCase().includes(q) || b.warehouseName.toLowerCase().includes(q)
      );
    }
    filtered = filtered.filter((b) => b.physicalQty > 0 || b.reservedQty > 0 || b.qualityBlockedQty > 0);
    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0627\u0633\u062A\u0639\u0644\u0627\u0645 \u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0646\u0628\u0627\u0631"
    });
  }
});
apiRouter.get("/inventory/ledger", (req, res) => {
  try {
    const { partId, warehouseId, lotNumber, offset, limit } = req.query;
    const postedDocs = inventoryDocsStore.filter((d) => d.postingStatus === "POSTED").sort((a, b) => new Date(b.documentDate).getTime() - new Date(a.documentDate).getTime());
    const ledgerEntries = [];
    for (const doc of postedDocs) {
      for (const line of doc.lines) {
        if (partId && line.partId !== partId && line.partCode !== partId) continue;
        if (warehouseId && doc.warehouseId !== warehouseId && doc.targetWarehouseId !== warehouseId) continue;
        if (lotNumber && line.lotNumber !== lotNumber) continue;
        ledgerEntries.push({
          id: `${doc.id}-${line.id}`,
          documentNumber: doc.documentNumber,
          documentType: doc.documentType,
          date: doc.postedAt || doc.documentDate,
          partId: line.partId,
          partCode: line.partCode,
          partName: line.partName,
          warehouseName: doc.warehouseName,
          targetWarehouseName: doc.targetWarehouseName,
          locationCode: line.locationCode,
          lotNumber: line.lotNumber,
          heatNumber: line.heatNumber,
          ownership: line.ownership,
          contractNumber: line.contractNumber,
          quantity: line.quantity,
          unit: line.unit,
          quantityKg: line.quantityKg,
          qualityStatus: line.qualityStatus,
          referenceDoc: doc.referenceNumber,
          postedByName: doc.postedByName || doc.createdByName,
          notes: line.notes || doc.adjustmentReason
        });
      }
    }
    const total = ledgerEntries.length;
    const start = offset ? parseInt(offset, 10) : 0;
    const count = limit ? parseInt(limit, 10) : 100;
    const paged = ledgerEntries.slice(start, start + count);
    res.json({
      success: true,
      total,
      data: paged
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u062F\u0641\u062A\u0631 \u06AF\u0631\u062F\u0634 \u0645\u0648\u062C\u0648\u062F\u06CC"
    });
  }
});
apiRouter.get("/inventory/reservations", (_req, res) => {
  res.json({ success: true, count: reservationsStore.length, data: reservationsStore });
});
apiRouter.post("/inventory/reservations", (req, res) => {
  try {
    const payload = req.body;
    if (!payload.partId || !payload.warehouseId || !payload.quantity) {
      return res.status(400).json({ success: false, error: "\u0642\u0637\u0639\u0647\u060C \u0627\u0646\u0628\u0627\u0631 \u0648 \u0645\u0642\u062F\u0627\u0631 \u0631\u0632\u0631\u0648 \u0627\u0644\u0632\u0627\u0645\u06CC \u0647\u0633\u062A\u0646\u062F." });
    }
    const part = partsStore.find((p) => p.id === payload.partId);
    if (!part) {
      return res.status(404).json({ success: false, error: "\u0642\u0637\u0639\u0647 \u0645\u0648\u0631\u062F \u0646\u0638\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
    }
    const warehouse = WAREHOUSES_LIST.find((w) => w.id === payload.warehouseId);
    const qty = Number(payload.quantity);
    const weightPerUnit = part.weightPerUnitKg || 1;
    const weightKg = part.unit === "KG" ? qty : Number((qty * weightPerUnit).toFixed(3));
    const { balances } = calculateDetailedStockBalances(inventoryDocsStore, reservationsStore, partsStore);
    const matching = balances.filter((b) => b.partId === part.id && b.warehouseId === payload.warehouseId);
    const available = matching.reduce((sum, b) => sum + b.availableQty, 0);
    if (qty > available) {
      return res.status(400).json({
        success: false,
        error: `\u0645\u0648\u062C\u0648\u062F\u06CC \u0622\u0632\u0627\u062F \u062C\u0647\u062A \u0631\u0632\u0631\u0648 \u0646\u0627\u06A9\u0627\u0641\u06CC \u0627\u0633\u062A. \u0645\u0648\u062C\u0648\u062F\u06CC \u0622\u0632\u0627\u062F: ${available} ${part.unit}\u060C \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0631\u0632\u0631\u0648: ${qty} ${part.unit}`
      });
    }
    const newRes = {
      id: `RES-${Date.now()}`,
      reservationNumber: `RES-1403-${Math.floor(100 + Math.random() * 900)}`,
      partId: part.id,
      partCode: part.code,
      partName: part.name,
      warehouseId: payload.warehouseId,
      warehouseName: warehouse ? warehouse.name : payload.warehouseId,
      lotNumber: payload.lotNumber,
      ownership: payload.ownership || "SAPCO_SUPPLIER_OWNED",
      reservedFor: payload.reservedFor || "\u062A\u062E\u0635\u06CC\u0635 \u062E\u0637 \u062A\u0648\u0644\u06CC\u062F",
      quantity: qty,
      quantityKg: weightKg,
      unit: part.unit,
      status: "ACTIVE",
      validUntil: payload.validUntil,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    reservationsStore.unshift(newRes);
    res.status(201).json({ success: true, message: "\u0631\u0632\u0631\u0648 \u0645\u0648\u062C\u0648\u062F\u06CC \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062B\u0628\u062A \u0634\u062F.", data: newRes });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0631\u0632\u0631\u0648 \u0645\u0648\u062C\u0648\u062F\u06CC"
    });
  }
});
apiRouter.post("/inventory/reservations/:id/release", (req, res) => {
  const { id } = req.params;
  const resIndex = reservationsStore.findIndex((r) => r.id === id);
  if (resIndex === -1) {
    return res.status(404).json({ success: false, error: "\u0633\u0646\u062F \u0631\u0632\u0631\u0648 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
  }
  reservationsStore[resIndex].status = "RELEASED";
  res.json({ success: true, message: "\u0631\u0632\u0631\u0648 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0622\u0632\u0627\u062F \u06AF\u0631\u062F\u06CC\u062F \u0648 \u0628\u0647 \u0645\u0648\u062C\u0648\u062F\u06CC \u0642\u0627\u0628\u0644 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0628\u0627\u0632\u06AF\u0634\u062A.", data: reservationsStore[resIndex] });
});
apiRouter.get("/inventory/sapco-account", (_req, res) => {
  try {
    const { contractsWithBalances, ledgerEntries } = calculateSapcoContractLedger(contractsStore, inventoryDocsStore);
    res.json({
      success: true,
      contracts: contractsWithBalances,
      ledger: ledgerEntries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0645\u062D\u0627\u0633\u0628\u0647 \u062D\u0633\u0627\u0628\u062F\u0627\u0631\u06CC \u0627\u0645\u0627\u0646\u06CC \u0633\u0627\u067E\u06A9\u0648"
    });
  }
});
apiRouter.get("/inventory/audit-logs", (_req, res) => {
  res.json({ success: true, count: auditLogsStore.length, data: auditLogsStore });
});
apiRouter.get("/wip/dashboard", (_req, res) => {
  try {
    const metrics = getWipDashboardMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0645\u062D\u0627\u0633\u0628\u0647 \u062F\u0627\u0634\u0628\u0648\u0631\u062F WIP"
    });
  }
});
apiRouter.get("/wip/manufacturing-orders", (_req, res) => {
  try {
    const orders = getManufacturingOrdersList();
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u062F\u0633\u062A\u0648\u0631\u0627\u062A \u0633\u0627\u062E\u062A"
    });
  }
});
apiRouter.get("/wip/manufacturing-orders/:id", (req, res) => {
  try {
    const mo = getManufacturingOrderById(req.params.id);
    if (!mo) {
      return res.status(404).json({ success: false, error: "\u062F\u0633\u062A\u0648\u0631 \u062A\u0648\u0644\u06CC\u062F \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
    }
    res.json({ success: true, data: mo });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u062C\u0632\u0626\u06CC\u0627\u062A \u062F\u0633\u062A\u0648\u0631 \u062A\u0648\u0644\u06CC\u062F"
    });
  }
});
apiRouter.post("/wip/manufacturing-orders", (req, res) => {
  try {
    const result = createManufacturingOrder(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0627\u06CC\u062C\u0627\u062F \u062F\u0633\u062A\u0648\u0631 \u0633\u0627\u062E\u062A"
    });
  }
});
apiRouter.post("/wip/operations/input", (req, res) => {
  try {
    const result = registerOperationInput(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, message: "\u0648\u0631\u0648\u062F\u06CC \u0645\u0631\u062D\u0644\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062B\u0628\u062A \u0634\u062F \u0648 \u0628\u0647 \u067E\u0627\u06CC \u062F\u0633\u062A\u06AF\u0627\u0647 \u0645\u0646\u062A\u0642\u0644 \u06AF\u0631\u062F\u06CC\u062F.", data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0648\u0631\u0648\u062F\u06CC \u0645\u0631\u062D\u0644\u0647"
    });
  }
});
apiRouter.post("/wip/operations/production", (req, res) => {
  try {
    const result = registerOperationProduction(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, message: "\u062A\u0648\u0644\u06CC\u062F \u0645\u0631\u062D\u0644\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u062F\u0641\u0627\u062A\u0631 WIP \u062B\u0628\u062A \u06AF\u0631\u062F\u06CC\u062F \u0648 \u0622\u0645\u0627\u062F\u0647 \u0627\u0646\u062A\u0642\u0627\u0644 \u0634\u062F.", data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0639\u0645\u0644\u06A9\u0631\u062F \u062A\u0648\u0644\u06CC\u062F \u0645\u0631\u062D\u0644\u0647"
    });
  }
});
apiRouter.get("/wip/transfers", (_req, res) => {
  try {
    res.json({ success: true, count: wipTransfersStore.length, data: wipTransfersStore });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u062D\u0648\u0627\u0644\u0647\u200C\u0647\u0627\u06CC \u0627\u0646\u062A\u0642\u0627\u0644"
    });
  }
});
apiRouter.post("/wip/transfers", (req, res) => {
  try {
    const result = createOperationTransfer(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json({ success: true, message: "\u062D\u0648\u0627\u0644\u0647 \u0627\u0646\u062A\u0642\u0627\u0644 \u0635\u0627\u062F\u0631 \u0634\u062F \u0648 \u062F\u0631 \u0648\u0636\u0639\u06CC\u062A \u062F\u0631 \u062D\u0627\u0644 \u0627\u0646\u062A\u0642\u0627\u0644 \u0642\u0631\u0627\u0631 \u06AF\u0631\u0641\u062A.", data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0635\u062F\u0648\u0631 \u062D\u0648\u0627\u0644\u0647 \u0627\u0646\u062A\u0642\u0627\u0644 \u0628\u06CC\u0646\u200C\u0645\u0631\u0627\u062D\u0644"
    });
  }
});
apiRouter.post("/wip/transfers/:id/approve", (req, res) => {
  try {
    const { receivedBy, notes } = req.body;
    const result = approveOperationTransfer({
      transferId: req.params.id,
      receivedBy: receivedBy || "\u0633\u0631\u067E\u0631\u0633\u062A \u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u0645\u0642\u0635\u062F",
      notes
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, message: "\u062D\u0648\u0627\u0644\u0647 \u062A\u062D\u0648\u06CC\u0644 \u0634\u062F \u0648 \u0628\u0647 \u0645\u0648\u062C\u0648\u062F\u06CC \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u06CC\u0633\u062A\u06AF\u0627\u0647 \u0645\u0642\u0635\u062F \u0627\u0636\u0627\u0641\u0647 \u06AF\u0631\u062F\u06CC\u062F.", data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062A\u0623\u06CC\u06CC\u062F \u0648 \u062A\u062D\u0648\u06CC\u0644 \u062D\u0648\u0627\u0644\u0647 \u0627\u0646\u062A\u0642\u0627\u0644"
    });
  }
});
apiRouter.post("/wip/transfers/:id/reject", (req, res) => {
  try {
    const { rejectedBy, rejectionReason } = req.body;
    const result = rejectOperationTransfer({
      transferId: req.params.id,
      rejectedBy: rejectedBy || "\u0628\u0627\u0632\u0631\u0633 \u06A9\u0646\u062A\u0631\u0644 \u06A9\u06CC\u0641\u06CC\u062A",
      rejectionReason: rejectionReason || "\u0645\u063A\u0627\u06CC\u0631\u062A \u062A\u0639\u062F\u0627\u062F \u06CC\u0627 \u0639\u062F\u0645 \u0627\u0646\u0637\u0628\u0627\u0642 \u06A9\u06CC\u0641\u06CC \u062F\u0631 \u0648\u0631\u0648\u062F\u06CC"
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, message: "\u062D\u0648\u0627\u0644\u0647 \u0631\u062F \u0634\u062F \u0648 \u0642\u0637\u0639\u0627\u062A \u0628\u0647 \u0645\u0631\u062D\u0644\u0647 \u0645\u0628\u062F\u0623 \u0628\u0627\u0632\u06AF\u0631\u062F\u0627\u0646\u062F\u0647 \u0634\u062F\u0646\u062F.", data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0631\u062F \u062D\u0648\u0627\u0644\u0647 \u0627\u0646\u062A\u0642\u0627\u0644"
    });
  }
});
apiRouter.get("/wip/reconciliation/:moId", (req, res) => {
  try {
    const audit = calculateMoReconciliation(req.params.moId);
    if (!audit) {
      return res.status(404).json({ success: false, error: "\u062F\u0633\u062A\u0648\u0631 \u062A\u0648\u0644\u06CC\u062F \u062C\u0647\u062A \u0628\u0627\u0632\u0631\u0633\u06CC \u062A\u0631\u0627\u0632 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
    }
    res.json({ success: true, data: audit });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0627\u0646\u062C\u0627\u0645 \u0645\u0648\u0627\u0632\u0646\u0647 \u067E\u0627\u06CC\u0633\u062A\u06AF\u06CC \u0642\u0637\u0639\u0627\u062A"
    });
  }
});
apiRouter.get("/wip/logs", (_req, res) => {
  try {
    res.json({ success: true, count: productionLogsStore.length, data: productionLogsStore });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0644\u0627\u06AF \u0641\u0639\u0627\u0644\u06CC\u062A\u200C\u0647\u0627\u06CC \u06A9\u0627\u0631\u06AF\u0627\u0647\u06CC"
    });
  }
});
apiRouter.get("/planning/dashboard-metrics", (_req, res) => {
  try {
    const metrics = getPlanningDashboardMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0645\u062D\u0627\u0633\u0628\u0647 \u0645\u0639\u06CC\u0627\u0631\u0647\u0627\u06CC \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC \u062A\u0648\u0644\u06CC\u062F"
    });
  }
});
apiRouter.get("/planning/net-requirements", (_req, res) => {
  try {
    const requirements = calculateNetRequirements();
    res.json({ success: true, count: requirements.length, data: requirements });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0645\u062D\u0627\u0633\u0628\u0647 \u062E\u0627\u0644\u0635 \u0627\u062D\u062A\u06CC\u0627\u062C\u0627\u062A \u062A\u0648\u0644\u06CC\u062F"
    });
  }
});
apiRouter.get("/planning/suggestions", (_req, res) => {
  try {
    res.json({ success: true, count: planSuggestionsStore.length, data: planSuggestionsStore });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC"
    });
  }
});
apiRouter.get("/planning/suggestions/:id", (req, res) => {
  try {
    const suggestion = planSuggestionsStore.find((s) => s.id === req.params.id);
    if (!suggestion) {
      return res.status(404).json({ success: false, error: "\u0628\u0631\u0646\u0627\u0645\u0647 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
    }
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u062C\u0632\u0626\u06CC\u0627\u062A \u0628\u0631\u0646\u0627\u0645\u0647"
    });
  }
});
apiRouter.post("/planning/suggestions/regenerate", (_req, res) => {
  try {
    planSuggestionsStore.length = 0;
    const fresh = generateProductionPlanSuggestions();
    planSuggestionsStore.push(...fresh);
    res.json({ success: true, message: "\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC \u062A\u0648\u0644\u06CC\u062F \u0628\u0631 \u0645\u0628\u0646\u0627\u06CC \u0622\u062E\u0631\u06CC\u0646 \u0633\u0641\u0627\u0631\u0634\u0627\u062A \u0648 \u0648\u0636\u0639\u06CC\u062A WIP \u0645\u062C\u062F\u062F\u0627\u064B \u0645\u062D\u0627\u0633\u0628\u0647 \u0634\u062F.", data: fresh });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0628\u0627\u0632\u062A\u0648\u0644\u06CC\u062F \u0645\u062D\u0627\u0633\u0628\u0627\u062A \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC"
    });
  }
});
apiRouter.post("/planning/suggestions/:id/approve", (req, res) => {
  try {
    const approvedBy = req.body.approvedBy || "\u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC (\u0645\u062F\u06CC\u0631 \u062A\u0648\u0644\u06CC\u062F)";
    const result = approvePlanSuggestion(req.params.id, approvedBy);
    if (!result.success) return res.status(400).json(result);
    res.json({ success: true, message: "\u0628\u0631\u0646\u0627\u0645\u0647 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u0623\u06CC\u06CC\u062F \u0634\u062F \u0648 \u0622\u0645\u0627\u062F\u0647 \u0635\u062F\u0648\u0631 \u0628\u0647 \u0633\u0627\u0644\u0646 \u062A\u0648\u0644\u06CC\u062F \u06AF\u0631\u062F\u06CC\u062F.", data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062A\u0623\u06CC\u06CC\u062F \u0628\u0631\u0646\u0627\u0645\u0647 \u062A\u0648\u0644\u06CC\u062F"
    });
  }
});
apiRouter.post("/planning/suggestions/:id/release-mo", (req, res) => {
  try {
    const releasedBy = req.body.releasedBy || "\u0645\u0647\u0646\u062F\u0633 \u062D\u0633\u06CC\u0646\u06CC (\u0645\u062F\u06CC\u0631 \u062A\u0648\u0644\u06CC\u062F)";
    const result = releasePlanToManufacturingOrder(req.params.id, releasedBy);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json({
      success: true,
      message: `\u0628\u0631\u0646\u0627\u0645\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0647 \u062F\u0633\u062A\u0648\u0631 \u0633\u0627\u062E\u062A \u0631\u0633\u0645\u06CC \u0634\u0645\u0627\u0631\u0647 ${result.mo?.moNumber} \u062A\u0628\u062F\u06CC\u0644 \u0648 \u0645\u0631\u0627\u062D\u0644 \u0639\u0645\u0644\u06CC\u0627\u062A\u06CC \u0635\u0627\u062F\u0631 \u0634\u062F\u0646\u062F.`,
      mo: result.mo,
      plan: result.plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0635\u062F\u0648\u0631 \u062F\u0633\u062A\u0648\u0631 \u06A9\u0627\u0631 \u0627\u0632 \u0631\u0648\u06CC \u0628\u0631\u0646\u0627\u0645\u0647"
    });
  }
});
apiRouter.post("/planning/suggestions/:id/revise", (req, res) => {
  try {
    const { modifiedOperations, note } = req.body;
    const result = revisePlanVersion(req.params.id, modifiedOperations, note || "\u0627\u0635\u0644\u0627\u062D \u062F\u0633\u062A\u06CC \u062A\u062E\u0635\u06CC\u0635 \u0645\u0627\u0634\u06CC\u0646\u200C\u0622\u0644\u0627\u062A");
    if (!result.success) return res.status(400).json(result);
    res.json({ success: true, message: `\u0646\u0633\u062E\u0647 \u0628\u0631\u0646\u0627\u0645\u0647 \u0628\u0647 ${result.data?.planVersion} \u0627\u0631\u062A\u0642\u0627 \u06CC\u0627\u0641\u062A \u0648 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F.`, data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0646\u0633\u062E\u0647 \u0628\u0631\u0646\u0627\u0645\u0647"
    });
  }
});
apiRouter.post("/planning/evaluate-machine-eligibility", (req, res) => {
  try {
    const candidateMachines = evaluateMachineEligibility(req.body);
    res.json({ success: true, data: candidateMachines });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0627\u0631\u0632\u06CC\u0627\u0628\u06CC \u0634\u0631\u0627\u06CC\u0637 \u0645\u0627\u0634\u06CC\u0646\u200C\u0622\u0644\u0627\u062A"
    });
  }
});
apiRouter.get("/planning/customer-orders", (_req, res) => {
  try {
    res.json({ success: true, count: customerOrdersStore.length, data: customerOrdersStore });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0633\u0641\u0627\u0631\u0634\u0627\u062A \u0645\u0634\u062A\u0631\u06CC"
    });
  }
});
apiRouter.post("/planning/customer-orders", (req, res) => {
  try {
    const payload = req.body;
    const newOrder = {
      id: `ORD-2026-${String(customerOrdersStore.length + 1).padStart(3, "0")}`,
      orderNumber: payload.orderNumber || `SO-SAPCO-1405-${String(customerOrdersStore.length + 10)}`,
      customerName: payload.customerName || "\u0633\u0627\u067E\u06A9\u0648",
      contractNumber: payload.contractNumber || "CNT-SAP-2026-001",
      orderDate: payload.orderDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      dueDate: payload.dueDate || new Date(Date.now() + 7 * 24 * 3600 * 1e3).toISOString().slice(0, 10),
      priority: payload.priority || 2,
      status: "OPEN",
      lines: payload.lines || [],
      notes: payload.notes,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    customerOrdersStore.unshift(newOrder);
    planSuggestionsStore.length = 0;
    planSuggestionsStore.push(...generateProductionPlanSuggestions());
    res.status(201).json({ success: true, message: "\u0633\u0641\u0627\u0631\u0634 \u0645\u0634\u062A\u0631\u06CC \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062B\u0628\u062A \u0634\u062F \u0648 \u0646\u06CC\u0627\u0632\u0645\u0646\u062F\u06CC\u200C\u0647\u0627\u06CC \u062A\u0648\u0644\u06CC\u062F \u0628\u0647\u200C\u0631\u0648\u0632 \u06AF\u0631\u062F\u06CC\u062F\u0646\u062F.", data: newOrder });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0633\u0641\u0627\u0631\u0634 \u0645\u0634\u062A\u0631\u06CC"
    });
  }
});
function extractReportFilters(req) {
  return {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    partId: req.query.partId,
    customerId: req.query.customerId,
    customerName: req.query.customerName,
    machineId: req.query.machineId,
    processType: req.query.processType,
    status: req.query.status
  };
}
apiRouter.get("/reports/dashboard-summary", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const summary = getManagementDashboardSummary(filters);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u062E\u0644\u0627\u0635\u0647 \u0645\u062F\u06CC\u0631\u06CC\u062A\u06CC" });
  }
});
apiRouter.get("/reports/plan-vs-actual", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getPlanVsActualReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u0628\u0631\u0646\u0627\u0645\u0647 \u062F\u0631 \u0628\u0631\u0627\u0628\u0631 \u0648\u0627\u0642\u0639\u06CC" });
  }
});
apiRouter.get("/reports/customer-order-fulfillment", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getCustomerOrderFulfillmentReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u062A\u062D\u0642\u0642 \u0633\u0641\u0627\u0631\u0634\u0627\u062A" });
  }
});
apiRouter.get("/reports/production-backlog", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getProductionBacklogReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u0645\u0639\u0648\u0642\u0627\u062A \u062A\u0648\u0644\u06CC\u062F" });
  }
});
apiRouter.get("/reports/wip-by-part-operation", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getWipByPartAndOperationReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 WIP" });
  }
});
apiRouter.get("/reports/wip-aging", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getWipAgingReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u0633\u0646\u200C\u06CC\u0627\u0628\u06CC WIP" });
  }
});
apiRouter.get("/reports/material-consumption-vs-standard", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getMaterialConsumptionVsStandardReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u0645\u0635\u0631\u0641 \u0645\u0648\u0627\u062F" });
  }
});
apiRouter.get("/reports/sapco-material-account", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getSapcoMaterialAccountReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u062D\u0633\u0627\u0628 \u0633\u0627\u067E\u06A9\u0648" });
  }
});
apiRouter.get("/reports/inventory-valuation-quantities", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getInventoryValuationQuantitiesReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u062A\u0641\u06A9\u06CC\u06A9 \u0645\u0642\u062F\u0627\u0631\u06CC \u0645\u0648\u062C\u0648\u062F\u06CC" });
  }
});
apiRouter.get("/reports/scrap-by-part-operation", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getScrapByPartAndOperationReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u0636\u0627\u06CC\u0639\u0627\u062A" });
  }
});
apiRouter.get("/reports/machine-workload-capacity", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getMachineWorkloadCapacityReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u0644\u0648\u062F \u06A9\u0627\u0631\u06CC \u0645\u0627\u0634\u06CC\u0646\u200C\u0622\u0644\u0627\u062A" });
  }
});
apiRouter.get("/reports/production-delays", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getProductionDelaysReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u062A\u0623\u062E\u06CC\u0631\u0627\u062A \u062A\u0648\u0644\u06CC\u062F" });
  }
});
apiRouter.get("/reports/inventory-movements", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getInventoryMovementsReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u06AF\u0631\u062F\u0634 \u0627\u0633\u0646\u0627\u062F \u0627\u0646\u0628\u0627\u0631" });
  }
});
apiRouter.get("/reports/inventory-reconciliation", (req, res) => {
  try {
    const filters = extractReportFilters(req);
    const report = getInventoryReconciliationReport(filters);
    res.json({ success: true, ...report });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "\u062E\u0637\u0627 \u062F\u0631 \u06AF\u0632\u0627\u0631\u0634 \u0627\u0646\u0628\u0627\u0631\u06AF\u0631\u062F\u0627\u0646\u06CC" });
  }
});

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var args = process.argv.slice(2);
var portArgIndex = args.indexOf("--port");
var portFromArgs = portArgIndex !== -1 && args[portArgIndex + 1] ? Number(args[portArgIndex + 1]) : void 0;
var hostArgIndex = args.indexOf("--host");
var hostFromArgs = hostArgIndex !== -1 && args[hostArgIndex + 1] ? args[hostArgIndex + 1] : void 0;
var PORT = portFromArgs || Number(process.env.PORT) || 3e3;
var HOST = hostFromArgs || process.env.HOST || "0.0.0.0";
async function startServer() {
  const app = express();
  app.use(express.json());
  app.get("/healthz", (_req, res) => {
    res.status(200).send("OK");
  });
  app.use("/api", apiRouter);
  if (process.env.NODE_ENV !== "production" && !fs.existsSync(path.join(__dirname, "dist"))) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: PORT
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      app.get("*", (_req, res) => {
        res.status(503).send("Application is building. Please refresh in a moment.");
      });
    }
  }
  app.listen(PORT, HOST, () => {
    console.log(`KPIMS Server successfully started and listening on http://${HOST}:${PORT}`);
  });
}
startServer();
