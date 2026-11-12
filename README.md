# Kosar Sanat Abrar — Rebuilt

This repository is the clean working copy of `vaheme64-design/kosartest_postgres`.

Local SQLite databases and generated build artifacts are excluded. PostgreSQL is the target database.

## Database bootstrap

1. Configure a real PostgreSQL connection string in `DATABASE_URL`. The application does not fall back to a local database or default credentials.
2. Apply the Prisma schema with `bun run db:push`.
3. For a new database, seed the canonical master data with `bun run seed:master`. This creates units, material grades, canonical application parts, warehouses, locations, and the built-in saved coil report. It does not create demo stock or production transactions and is safe to re-run.
4. For local development or disposable test databases only, `bun run seed` adds the larger demo dataset. It is blocked when `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true` is explicitly set. Do not run the demo seed against live production data.

## Validation

The draft pull request tracks the active repair work. GitHub Actions uses a disposable PostgreSQL service and verifies Prisma schema, TypeScript, production build, both seed paths, inventory persistence, WIP snapshot persistence, planning logic, and management-report tests.
