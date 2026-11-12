# Production Planning PostgreSQL Persistence

## Implemented in this increment

Customer-order entry and inquiry now use the relational PostgreSQL models whenever `DATABASE_URL` is configured.

- `GET /api/planning/customer-orders` reads customer orders, customer names, order lines, and part identities from PostgreSQL. It refreshes the process-local compatibility cache from the committed database result.
- `POST /api/planning/customer-orders` creates the customer order and all order lines in one Serializable transaction.
- `PUT /api/planning/customer-orders/:id` updates the order header and replaces its order lines in one Serializable transaction.
- Part references are resolved against active relational `Part` rows by database ID or part number. Unknown parts are rejected before any order is committed.
- Customer references are resolved against active relational `Customer` rows by ID, code, or exact name.
- Order priority is persisted on `CustomerOrder.priority` (1 urgent, 2 normal, 3 low).
- Duplicate order numbers return HTTP 409. Invalid customer/part/quantity/priority input returns HTTP 400.
- The customer-order HTTP integration test covers create, relational persistence, update, read-after-write, duplicate rejection, and invalid-part rejection.

## Important boundary

This change makes customer-order CRUD durable and read-through from PostgreSQL. It does **not** yet claim that all planning calculations are relational. The current planning suggestion engine still contains legacy in-memory/sample master-data assumptions for parts, routings, machine capabilities, and inventory balances. Suggestions and dashboard metrics must not be treated as authoritative production recommendations until those inputs are replaced with relational queries and the suggestion approval/release lifecycle is persisted transactionally.

The next implementation stage is to build a relational planning read model:
1. Load active parts, routes/route operations, machines/capabilities, dies/compatibilities, finished-goods stock, raw-material stock, reservations, and WIP from PostgreSQL.
2. Calculate demand netting and machine eligibility from that read model without falling back to sample data.
3. Persist generated plan suggestions and their versioned operation proposals, then make approve/revise/release database transactions idempotent.
4. Link released plan lines and manufacturing orders to the relational source suggestion and customer demand.

## Migration and deployment

The new `priority` column is part of the Prisma schema. CI generates and applies an initial migration preview against a clean disposable PostgreSQL database. No live factory database migration is performed by this repository workflow.


## Relational planning read model (implemented; lifecycle still pending)

The first database-backed read-model increment is now implemented in `src/server/relationalPlanningReadModel.ts`.

- Reads confirmed customer orders and their non-completed order lines directly from PostgreSQL, resolving demand by relational `Part.id` and retaining customer-order IDs/numbers.
- Loads active finished-good parts, their material master, and the active default route with ordered route operations, linked operations, assigned machines, and dies.
- Reads available finished-good balances, WIP balances, active non-expired finished-good reservations, and raw-material balances from relational stock tables.
- Calculates remaining demand, available finished goods, downstream WIP credit, net production quantity, engineering gross-material requirement (including route scrap norms), and raw-material shortage.
- Includes relational machine capabilities and die-to-machine compatibility in the read model for the next machine-evaluation increment.
- `GET /api/planning/read-model` exposes the complete read model; `GET /api/planning/net-requirements` now uses it whenever PostgreSQL is configured.
- Added an HTTP integration test that creates a real relational customer order, verifies demand and route identity, checks netting arithmetic, and ensures legacy sample-backed endpoints fail closed.

### Safety boundary

Planning suggestions, dashboard metrics, manual machine evaluation, approval, revision, and MO release still depend on the legacy in-memory engine. In database mode these endpoints now return HTTP 409 with an explicit pending-implementation code rather than displaying or mutating sample/in-memory planning data. They will be re-enabled only after proposal persistence and the approval/release lifecycle are implemented transactionally.

### Calculation assumptions to validate with factory data

- Finished-goods stock is read from active `FINISHED_GOODS` warehouses and `AVAILABLE` quality-status balances. Active reservations are subtracted from physical on-hand quantity.
- WIP credit is the sum of available balances in active `WIP` warehouses for the same finished-good part. This assumes stage stock uses the same part identity across the route.
- Raw material availability is matched by the finished-good part's `materialId` to raw-material parts in active `RAW_MATERIALS` warehouses.
- Required sheet weight uses `Part.weightGrossKg` multiplied by the sum of route-operation scrap norms. If material identity or engineering gross weight is missing, the read model emits a warning and does not claim a valid material-shortage calculation.
- Machine capability data is loaded but no recommendation is issued yet. A candidate must later pass process, tonnage, material-thickness, machine-status, and die-compatibility checks; schedule capacity must not be inferred from the previous sample workload map.
