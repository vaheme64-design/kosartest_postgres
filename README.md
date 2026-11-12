# Kosar Sanat Abrar — Rebuilt

This repository is the clean working copy of `vaheme64-design/kosartest_postgres`.

Local SQLite databases and generated build artifacts are excluded. PostgreSQL is the target database.

## Database bootstrap

1. Configure a real PostgreSQL connection string in `DATABASE_URL`. The application does not fall back to a local database or default credentials.
2. For a new development database, use the committed Prisma migration history with `bunx prisma migrate deploy` once reviewed migrations are present. Until the initial migration is approved and committed, the schema can be applied to a disposable development database with `bun run db:push`.
3. For a new database, seed canonical master data with `bun run seed:master`. This creates units, material grades, canonical application parts, warehouses, locations, and the built-in saved coil report. It does not create demo stock or production transactions and is safe to re-run.
4. For local development or disposable test databases only, `bun run seed` adds the larger demo dataset. It is blocked when `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true` is explicitly set. Do not run the demo seed against live production data.

## Validation

GitHub Actions uses a disposable PostgreSQL 16 service. It validates the Prisma schema, generates an initial migration preview from an empty database, applies that preview with `prisma migrate deploy`, and uploads the SQL artifact for review. It then runs TypeScript, production build, seed, inventory, WIP, planning, reports, and physical-coil persistence checks.

The generated migration preview is not yet an approved production migration. Existing databases created with `prisma db push` must not run the initial `CREATE TABLE` migration directly. Review the SQL, test it against a disposable copy of the real database, and follow [the migration runbook](docs/database-migration-runbook.md) before baselining or deploying any existing database.
