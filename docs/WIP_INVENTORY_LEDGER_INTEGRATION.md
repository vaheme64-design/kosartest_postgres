# WIP and Inventory Ledger Integration

## Status

The first atomic production-posting slice is implemented on this feature branch and covered by CI schema validation, TypeScript, build, and the existing regression suite. This is not yet a production cutover and no migration has been applied to a factory database.

The application retains two persistence representations:
- WIP execution snapshot: \`WipStateSnapshot\` stores stage queues and execution state.
- Normalized relational records: \`ManufacturingOrder\`, \`ProductionOperation\`, \`ProductionReport\`, \`InventoryTransaction\`, and \`StockBalance\` store the production report and inventory ledger.

Explicit identity mapping is provided by \`WipManufacturingOrderLink\` and \`WipOperationLink\`. The mapping endpoint validates part number, operation count, step number, and process type. The production form can select the corresponding relational MO on first posting; an existing mapping is preselected on later postings.

## Atomic production posting now implemented

\`POST /api/wip/operations/production\` now:
1. Requires a stable idempotency key, active shift, and active posting user. It also requires a relational MO selection on first use.
2. Resolves the WIP order/operation through the explicit identity bridge.
3. Validates the linked relational operation, part/process identity, active machine, shift, and user. The planned relational machine is used when present; otherwise the production form must supply a relational machine ID.
4. Applies the WIP mutation in memory, then passes the proposed snapshot to a single Prisma \`Serializable\` transaction.
5. Creates the relational \`ProductionReport\`, updates relational operation/MO cumulative quantities, writes the updated WIP snapshot, and posts inventory movements plus \`StockBalance\` updates in the same database transaction.
6. Rolls back the in-memory WIP mutation if the relational transaction fails.
7. Uses a unique \`ProductionReport.wipIdempotencyKey\` so retrying a completed request returns the existing report and does not re-post stock movements.

The posted inventory movements:
- Consume the full reported quantity from the current operation's \`AVAILABLE\` stock at its resolved source location.
- Add good output to the next operation's location, or to \`LOC-FIN-P1\` for the final operation.
- Add scrap to the first active location in the active \`SCRAP\` warehouse.
- Keep rework and rejected quantities at the source location in separate \`REWORK\` and \`REJECTED\` quality-status balances.
- Preserve ownership, contract, material-lot, and physical-coil identity across split source balances.
- Link every movement to the relational production report, MO, and operation.

No destination receipt confirmation is required. A report is rejected if the source location does not have enough available stock, a location code is ambiguous/missing, or required relational master data is inactive/missing. The transaction rolls back completely in those cases.

## First-operation raw-material / coil issue integration

`POST /api/inventory/coils/:id/issue` can seed the first WIP operation for a single-MO coil issue:
1. The issue-options endpoint returns the matching WIP snapshot ID and the part's engineering net/gross weights. The first route operation is explicitly marked; a later ready operation is never treated as the first step.
2. The UI suggests a whole-piece input quantity using the issued net material weight and engineering gross weight per piece. The operator can edit and confirm the PCS quantity before posting.
3. The API validates the matching WIP and relational MO, creates the explicit identity bridge when absent, and rejects non-integer PCS quantities or attempts to seed a non-first operation.
4. In the same PostgreSQL transaction as the coil issue, the API creates first-stage PCS stock balances and inbound inventory transactions split by the source contract/lot/coil identity. Whole PCS are allocated across contract balances, with any rounding remainder assigned to the final segment.
5. The WIP snapshot's initial input and first-operation waiting queue are updated before the transaction commits. A failure in any raw-material or WIP posting step rolls back both sides.

This flow preserves the requested one-way operational handoff: once the production report is posted, good output automatically moves to the next stage; no receiving confirmation is added.

## Required master-data and operational prerequisites

- The WIP order must be explicitly linked to a normalized relational MO with the same part number and a one-to-one operation mapping.
- The corresponding relational operation must match by step number and process type.
- WIP stage location codes must resolve to exactly one active \`WarehouseLocation\`.
- The source location must already contain sufficient \`AVAILABLE\` stock for the reported quantity. This implementation intentionally does not invent opening stock.
- A final-stage output requires the configured \`LOC-FIN-P1\` location.
- Scrap requires an active \`SCRAP\` warehouse with at least one active location.
- A valid active machine, shift, and posting user are required. The machine can be inherited from the relational operation's planned machine.
- The current WIP data model uses one MO part code across stages. If a route changes item/part number between operations, stage-specific input/output part mapping is a further schema enhancement and must be configured before those routes are posted.

## Known limitations / next hardening steps

- The current WIP engine remains process-memory based with a JSON snapshot. The production endpoint serializes requests within one server process and commits its proposed snapshot atomically with the ledger. Multi-instance execution still needs database-backed locking/version checks for the snapshot to prevent stale in-memory state from competing across application instances.
- The physical-coil issue flow now supports first-operation input posting when a matching WIP order exists. The operator sees an editable PCS suggestion calculated from (issued coil weight - recorded weight variance) / the part's engineering gross weight per piece. On confirmation, the same database transaction posts the raw-coil issue by contract/lot and creates the first-stage PCS stock balance and inbound inventory transaction, preserving coil, lot, ownership, and contract lineage. The WIP snapshot's initial input and first-operation waiting queue are updated in that transaction. This path requires a matching WIP order number/part, a valid one-to-one WIP identity mapping, a PCS unit, positive engineering net weight, and a unique active first-stage location. Multi-part coil issues and non-coil material issue are not yet integrated with the WIP queue.
- Rework and rejected stock are distinguished by quality status at the source location. A dedicated rework route and a dedicated QC quarantine location/workflow are future enhancements.
- Stage-specific input/output part identities are not yet modeled. Routes where the physical part identity changes between operations must not be posted through this fallback.
- The transaction uses \`Serializable\` isolation and source-balance checks; concurrency tests for two simultaneous WIP reports against the same balance, rollback on movement failure, and idempotent replay should be added to the integration suite.
- The implementation creates report-linked inventory transactions directly; it does not yet create a separate \`InventoryDocument\` wrapper for each production report.
- No production database migration, backfill, or live cutover has been performed.

## Quantity rule

For a report with input quantity I and dispositions G (good), S (scrap), R (rework), and X (rejected):

\`I = G + S + R + X\`

for a fully reported batch. Partial reporting is supported when the unreported balance remains in progress. The ledger consumes exactly the reported quantity and recreates each disposition in its destination quality/location bucket; the WIP snapshot and relational ledger commit together.

## Safety constraints

- Do not run the generated migration against the live factory database as part of this implementation.
- Do not infer or auto-seed real warehouse, part, machine, shift, or user IDs from demo data.
- Do not treat the snapshot and relational ledger as independent write targets for production reports.
- Do not count both snapshot quantities and posted inventory quantities in the same inventory total.
- Do not introduce routine two-sided receiving approval.
