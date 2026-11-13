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
- Route-level eligible machine candidates are now filtered from relational machine capabilities, machine status, machine tonnage, material-thickness limits, and explicit die-to-machine compatibility. Preferred capability and closer tonnage fit are used only to order the eligible list. These are technical eligibility candidates, not a finite-capacity schedule: shift calendars, setup/load commitments, downtime, and existing assignments are not yet netted, so the list must not be interpreted as a final dispatch schedule.


## Persisted proposal lifecycle (implemented; UI and execution bridge remain)

The proposal lifecycle is now backed by `ProductionPlanProposal` and `ProductionPlanProposalLine`.

- Proposal versions are stored with a stable revision-group ID, monotonically increasing version, status, generation timestamp, and immutable JSON input snapshot.
- Each proposal line links to the exact `CustomerOrderLine`, relational `Part`, and active `PartRoute`. This preserves demand traceability down to the customer-order line rather than only the order header.
- Demand is allocated to order lines by customer priority, requested date, and line number. Finished-goods/WIP stock cover is applied once in that order. Quantities already committed to open plan lines (PLANNED/RELEASED/IN_PROGRESS) are excluded from new proposals.
- Regeneration supersedes older DRAFT proposals. A new proposal is blocked while an APPROVED proposal remains unreleased, preventing two approved plans from claiming the same demand.
- Proposal operation assignments store the selected machine and eligible-machine IDs from the relational capability calculation. Revision creates a new version and supersedes the previous DRAFT version; machine selections are restricted to the original eligible list.
- Approval records approver and timestamp. Release revalidates each selected machine's active state, operation capability, tonnage, material-thickness range, and die compatibility inside the release transaction.
- Release creates a relational `ProductionPlan`, demand-linked `ProductionPlanLine` records, one `ManufacturingOrder` per proposal line, and all route `ProductionOperation` rows in one Serializable PostgreSQL transaction. The first operation is READY; later operations are PENDING. The source customer order line is moved to IN_PRODUCTION.
- Repeated release of an already released proposal returns the original plan and MOs; it does not create duplicates.

### API

- `GET /api/planning/proposals`
- `GET /api/planning/proposals/:id`
- `POST /api/planning/proposals/regenerate` (optional body: `{ "notes": "..." }`)
- `POST /api/planning/proposals/:id/revise` (body: `{ "note": "...", "changes": [{ "proposalLineId": "...", "operationAssignments": [{ "routeOperationId": "...", "machineId": "..." }] }] }`)
- `POST /api/planning/proposals/:id/approve` (body: `{ "approvedBy": "..." }`)
- `POST /api/planning/proposals/:id/release` (body: `{ "releasedBy": "..." }`)

### Explicit operational boundary

This increment persists planning proposals and creates relational plans/MOs, but it does not yet reserve raw materials or create a coil issue. It also does not yet create the legacy WIP snapshot identity link for a newly released MO; the normalized MO and route operations are durable, while the WIP execution bridge remains a separate integration step. Proposal dates currently use generation date through customer requested date as a planning window, not a finite-capacity schedule. Machine eligibility is technical filtering only; shift capacity, downtime, setup/load commitments, and dispatch sequencing are not solved here. The existing legacy planning UI still uses the old suggestion endpoints; UI wiring to the new `/planning/proposals` API is a follow-up, and legacy sample-backed endpoints remain blocked in database mode.


### رابط کاربری چرخه پیشنهاد برنامه
- تب «پیشنهاد برنامه و پرس» اکنون به APIهای پایدار `/api/planning/proposals` متصل است و فهرست نسخه‌ها، وضعیت هر پیشنهاد، ردیف‌های سفارش، موعد تحویل، هشدارها و عملیات مسیر را از PostgreSQL می‌خواند.
- برای هر عملیات، انتخاب ماشین فقط از فهرست ماشین‌های واجد شرایط ذخیره‌شده در snapshot پیشنهاد ممکن است؛ انتخاب‌ها با «ذخیره به‌عنوان نسخه جدید» در نسخه جدید ثبت می‌شوند و نسخه قبلی باقی می‌ماند.
- گردش کار رابط کاربری: تولید پیشنهاد ← بررسی/اصلاح تخصیص ← تأیید ← صدور دستورهای تولید. صدور فقط برای پیشنهاد تأییدشده فعال است.
- دکمه تولید پیشنهاد در داشبورد نیز به endpoint relational منتقل شد؛ رابط کاربری دیگر برای تولید یا تأیید برنامه به endpoint نمونه‌محور قدیمی متکی نیست.
- محدودیت‌ها همچنان برقرارند: صدور برنامه هنوز رزرو/حواله خودکار مواد را انجام نمی‌دهد، MOهای relational هنوز به‌صورت خودکار به snapshot اجرایی WIP پل نمی‌شوند و تاریخ‌ها زمان‌بندی ظرفیت محدود ماشین/شیفت نیستند.


### پل خودکار دستور ساخت relational به WIP
- هنگام صدور پیشنهاد تأییدشده، برای هر دستور ساخت relational یک شناسه اجرایی WIP پایدار با پیشوند `WIP-` ساخته می‌شود؛ برای هر عملیات نیز شناسه WIP متناظر با پیشوند `WIPOP-` ایجاد می‌شود.
- رکوردهای `WipManufacturingOrderLink` و `WipOperationLink` در همان تراکنش صدور برنامه ایجاد می‌شوند؛ بنابراین ایجاد برنامه، MOها، عملیات‌ها، پیوندهای هویتی و به‌روزرسانی snapshot WIP همگی یا با هم commit می‌شوند یا هیچ‌کدام.
- snapshot با کنترل نسخه optimistic و شرط version به‌روزرسانی می‌شود. پس از commit، سرویس snapshot پایدار را دوباره بارگذاری می‌کند تا state محلی با نسخه commit‌شده هماهنگ شود.
- دستور ساخت تازه با وضعیت RELEASED وارد WIP می‌شود؛ عملیات اول READY و عملیات‌های بعدی PENDING هستند. **صدور برنامه به معنی صدور مواد نیست**: مقدار ورودی اولیه و موجودی انتظار عملیات اول صفر باقی می‌ماند تا حواله/صدور واقعی مواد از انبار ثبت شود.
- تست یکپارچه‌سازی بررسی می‌کند که هر MO و هر عملیات دقیقاً پل هویتی داشته باشد، snapshot شامل دستور ساخت باشد و هیچ مقدار ورودی ساختگی ایجاد نشود.
- این تغییر هنوز رزرو یا حواله خودکار مواد اولیه را انجام نمی‌دهد؛ آن مرحله باید جداگانه به چرخه انبار متصل شود.
