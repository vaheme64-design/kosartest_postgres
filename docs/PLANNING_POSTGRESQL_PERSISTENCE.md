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
