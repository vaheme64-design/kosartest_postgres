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
5. The WIP snapshot's initial input and first-operation waiting queue are updated before the transaction commits. The update uses the snapshot's expected version and compare-and-swap; a stale server snapshot rejects the whole coil issue transaction with a conflict instead of overwriting newer WIP state. After commit, the local WIP version is advanced.
6. A failure in any raw-material or WIP posting step rolls back both sides.

This flow preserves the requested one-way operational handoff: once the production report is posted, good output automatically moves to the next stage; no receiving confirmation is added.

### WIP snapshot optimistic concurrency

The transitional JSON WIP snapshot now carries a monotonically increasing integer `version` (default 1). Every ordinary WIP mutation persists with compare-and-swap semantics: `UPDATE ... WHERE id = 'production-wip-state' AND version = expectedVersion`, incrementing the version only when exactly one row is updated. If the affected row count is zero, the stale mutation is rejected and the API returns HTTP 409. The losing process restores its local pre-mutation arrays and reloads the latest committed snapshot before it can accept another WIP mutation.

Atomic production posting applies the same version predicate inside the existing Serializable PostgreSQL transaction that creates the production report, updates normalized operation/order counters, and posts inventory movements. A stale snapshot therefore rolls back the report and every related ledger/stock movement together. On successful commit, the process advances its in-memory snapshot version. Startup also handles two instances racing to initialize a missing snapshot: the loser reloads the winner's initialized state.

CI includes a database concurrency test that simulates two independent writers reading the same version, verifies exactly one wins, verifies a stale retry is rejected, and verifies a retry after reloading the latest version succeeds.

**Boundary:** this protects the shared WIP snapshot and the atomic production-posting path. It does not yet make every in-memory module (inventory UI caches, planning stores, etc.) distributed or multi-instance safe, nor does it add automatic replay of a rejected operator action. On HTTP 409, the client must refresh current WIP state and the operator should review/re-submit the action. Multi-instance production deployment still requires the remaining in-memory application stores to be externalized or guarded similarly.

### Coil issue idempotency

Every physical-coil issue request now requires a stable `issueRequestKey` (accepted in the request body or `Idempotency-Key` header). The UI creates one key when the issue modal opens and reuses it for retries until the issue succeeds or the modal is reopened. The key is stored uniquely on the posted `InventoryDocument`, together with a normalized request fingerprint:
- Replaying the same key and same payload returns the original document and issue records without reducing stock or adding WIP PCS again.
- Reusing the key with a changed coil, weight, MO, operation, variance, or PCS payload is rejected with HTTP 409.
- A unique database constraint is the final duplicate guard; if concurrent requests race, only one can create the document and commit stock movements. A losing concurrent request may need to retry with the same key to receive the original document response.

The schema change adds nullable unique `InventoryDocument.issueRequestKey` and `issueRequestFingerprint` columns. Existing inventory documents remain valid because both fields are nullable. The generated CI migration preview validates the schema change; no live database migration is run here.

### End-to-end CI coverage

`scripts/test-first-operation-coil-wip.ts` exercises the HTTP route against disposable PostgreSQL data. It allocates one 100 kg coil across two contracts (60/40 kg), issues 70 kg to the first operation, and verifies that the operator-confirmed 15 PCS are posted as 12/3 PCS while preserving each contract, coil, lot, and MO identity. It then returns a 5 kg remnant and verifies that the coil and lot reconcile to 35 kg without changing WIP PCS. Finally, it forces the material-lot guard to fail after the issue transaction has begun and verifies that coil, raw stock, WIP stock, and issue-document counts remain unchanged. The fixture temporarily reopens the seeded first operation in the disposable CI database and restores its original status during cleanup.

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
- The physical-coil issue flow now supports first-operation input posting when a matching WIP order exists. Its WIP snapshot write is guarded by the same database version/CAS rule as production reporting; if another instance has committed a newer snapshot, the complete issue transaction is rejected and no coil, lot, stock, or ledger movement is committed. The operator sees an editable PCS suggestion calculated from (issued coil weight - recorded weight variance) / the part's engineering gross weight per piece. On confirmation, the same database transaction posts the raw-coil issue by contract/lot and creates the first-stage PCS stock balance and inbound inventory transaction, preserving coil, lot, ownership, and contract lineage. The WIP snapshot's initial input and first-operation waiting queue are updated in that transaction. This path requires a matching WIP order number/part, a valid one-to-one WIP identity mapping, a PCS unit, positive engineering net weight, and a unique active first-stage location. Multi-part coil issues and non-coil material issue are not yet integrated with the WIP queue.
- Rework and rejected stock are distinguished by quality status at the source location. A dedicated rework route and a dedicated QC quarantine location/workflow are future enhancements.
- Stage-specific input/output part identities are not yet modeled. Routes where the physical part identity changes between operations must not be posted through this fallback.
- The transaction uses \`Serializable\` isolation and source-balance checks. Coil issue idempotency and conflicting-key replay are covered by the first-operation integration test; simultaneous concurrent request stress tests and multi-instance WIP snapshot locking/version checks remain future hardening.
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
