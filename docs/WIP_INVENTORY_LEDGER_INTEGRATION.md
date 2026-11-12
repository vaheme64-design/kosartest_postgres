# WIP and Inventory Ledger Integration Plan

## Status

Design checkpoint only. No production database migration or ledger posting is performed by this document.

The current branch contains two different persistence paths:

- Stage-level WIP execution is stored in `WipStateSnapshot` as a JSON payload. Its work-order identifiers are application-generated strings such as `MO-2026-001` and seeded identifiers such as `MO-ECU-MAIN-01`; operation identifiers are likewise generated strings such as `MOP-...`.
- The normalized inventory ledger uses relational `Part`, `Warehouse`, `WarehouseLocation`, `InventoryDocument`, `InventoryTransaction`, and `StockBalance` records. Its transaction relations expect actual database IDs. The normalized manufacturing models (`ManufacturingOrder`, `ProductionOperation`, `ProductionReport`) also use database IDs and foreign keys.

The normalized `ProductionReport` model requires machine and shift relations, while the current WIP production registration accepts an operator name and optional machine ID and does not create a relational production report. Therefore a direct dual-write from the current WIP snapshot engine into the normalized ledger is not safe yet.

## Target operating rule

A posted operation report is the single business event that changes production quantities.

For an operation report with input quantity (I), good output (G), scrap (S), rework (R), and rejected quantity (X):

- (I = G + S + R + X) for a fully reported processing batch. Partial reporting is permitted only when the unreported remainder stays in the operation's in-progress balance.
- Good output is transferred automatically to the next operation's waiting-input balance. The destination does not confirm routine receipt.
- Scrap is posted to the scrap stock/location; it must not remain in WIP.
- Rework and rejected quantities remain separately classified and must not be counted as good output. Rework must have an explicit disposition/return-to-operation path before it can re-enter good production.
- The same report must never post twice. Every posting needs a stable idempotency key and a unique database constraint.
- WIP stage balances and inventory balances must be derived from the same posted movement records, not maintained as independent totals.

## Required normalized posting model

Use one database transaction for the report and its inventory effects. A report posting should:

1. Resolve a real `ManufacturingOrder` and its `ProductionOperation` by database IDs. The external MO number may be used to look up the record, but must never be written into a foreign-key field.
2. Validate that the operation belongs to the MO, is executable, and has sufficient in-progress input.
3. Create the immutable `ProductionReport` (or a dedicated operation-posting record if the current report model cannot represent all required dispositions).
4. Update the operation and MO cumulative quantities/status in the same transaction.
5. Create balanced inventory transactions for the source operation location, next operation location (or finished-goods warehouse), and scrap location. Each movement must use real `Part`, `Warehouse`, `WarehouseLocation`, and `UnitOfMeasure` IDs.
6. Update affected `StockBalance` rows in the same transaction, using a deterministic lock/upsert strategy to prevent concurrent lost updates.
7. Create an audit event and retain a link from each movement to its source report and MO.

Routine stage-to-stage movement is automatic. `ProductionTransfer` may be retained as traceability metadata, but must not introduce a second quantity posting or a receiving-approval requirement.

## Critical schema gaps to resolve before implementation

- The WIP snapshot's generated MO/operation IDs do not match normalized UUID-based foreign keys.
- The WIP snapshot represents operation queues and in-progress quantities that are not directly represented by the current `StockBalance` dimensions.
- The current normalized report model has mandatory `machineId` and `shiftId`; the WIP endpoint does not currently guarantee both.
- The ledger transaction model has `productionReportId` and `manufacturingOrderId`, but no explicit idempotency key or source-operation posting key.
- The codebase has overlapping master-data families (`Part` versus `Item`, `ManufacturingOrder` versus `WorkOrder`, `ProductionOperation` versus `RoutingOperation`/ `ProductionLog`). The integration must select one canonical family for production and inventory. It must not create a third parallel model or silently mix IDs.
- Location codes in the WIP engine (for example `LOC-WIP-BLANK`) must be resolved to actual `WarehouseLocation` rows. A code string alone is not a valid relational foreign key.

## Safe implementation sequence

1. **Canonical model decision:** retain the existing normalized `Part` / `ManufacturingOrder` / `ProductionOperation` / `InventoryTransaction` family as the canonical production-ledger path, unless a repository-wide usage audit demonstrates that another family is already authoritative. Do not migrate or delete the parallel `Item` / `WorkOrder` family in this step.
2. **Identity bridge:** add explicit stable links from each WIP MO and operation to normalized records, or replace the snapshot execution identifiers with normalized IDs. Backfill only when a unique, validated match exists; leave unmatched snapshots untouched and report them for reconciliation.
3. **Ledger posting service:** implement a dedicated Prisma transaction service with idempotency constraints, quantity-conservation validation, row locking/concurrency control, and balanced movement creation.
4. **Controlled cutover:** stop accepting new writes through snapshot-only WIP mutation after the normalized posting path is proven. Keep a read-only snapshot compatibility path during transition.
5. **Reconciliation:** compare operation queue balances, WIP inventory by location, finished goods, scrap, and posted reports. Block cutover if any unexplained variance remains.
6. **Tests:** cover full and partial reports, automatic next-stage movement, final-stage finished-goods posting, scrap, rework/rejection dispositions, duplicate request replay, concurrent postings, missing mappings, rollback on any failed movement, and exact conservation.

## Explicit safety constraints

- Do not run schema migrations against a live or user production database as part of this integration work.
- Do not auto-seed or infer real warehouse, part, machine, shift, or user IDs from sample data.
- Do not dual-write snapshot and normalized ledger independently; either both are committed atomically or neither is changed.
- Do not count both a snapshot balance and a ledger balance in dashboards.
- Do not add a two-sided receipt approval for routine production flow.
