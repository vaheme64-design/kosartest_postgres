import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * KPIMS Database Connection Configuration
 * Singleton Prisma Client with lazy connection & status checks
 */

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

import { execSync } from 'child_process';

let clientGeneratedAttempted = false;

export const isDatabaseUrlConfigured = (): boolean => {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
};

export const resolveDatabaseUrl = (): string => {
  let rawUrl = (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0)
    ? process.env.DATABASE_URL.trim()
    : 'postgresql://postgres:postgres@localhost:5432/kpims_db?schema=public';

  // Strip surrounding quotes if present
  if ((rawUrl.startsWith('"') && rawUrl.endsWith('"')) || (rawUrl.startsWith("'") && rawUrl.endsWith("'"))) {
    rawUrl = rawUrl.slice(1, -1).trim();
  }

  // The Prisma schema is configured with provider = "postgresql".
  // If the user's local .env still contains a leftover SQLite/file URL (e.g., file:./prisma/dev.db)
  // or an invalid protocol, replace it with the PostgreSQL connection string so Prisma validation succeeds.
  if (!rawUrl.startsWith('postgresql://') && !rawUrl.startsWith('postgres://')) {
    console.warn(`[KPIMS Notice] DATABASE_URL "${rawUrl}" is not a valid PostgreSQL URL. Replacing with postgresql://postgres:postgres@localhost:5432/kpims_db?schema=public`);
    rawUrl = 'postgresql://postgres:postgres@localhost:5432/kpims_db?schema=public';
  }

  process.env.DATABASE_URL = rawUrl;
  return rawUrl;
};

export const getPrismaClient = (): PrismaClient => {
  if (!global.__prismaClient) {
    const dbUrl = resolveDatabaseUrl();

    let client: PrismaClient;
    try {
      client = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl,
          },
        },
        log: [
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
      });
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      if (errMsg.includes('did not initialize yet') && !clientGeneratedAttempted) {
        clientGeneratedAttempted = true;
        console.warn('⚠️ @prisma/client is not initialized yet. Running "npx prisma generate" automatically...');
        try {
          execSync('npx prisma generate', { stdio: 'inherit' });
          client = new PrismaClient({
            datasources: {
              db: {
                url: dbUrl,
              },
            },
            log: [
              { emit: 'event', level: 'error' },
              { emit: 'event', level: 'warn' },
            ],
          });
        } catch (genErr) {
          console.error('❌ Failed to auto-generate Prisma client:', genErr);
          throw err;
        }
      } else {
        throw err;
      }
    }

    // Intercept Prisma connection events to gracefully handle socket closures
    (client as any).$on('error', (e: any) => {
      const msg = String(e?.message || '');
      if (msg.includes('Closed') || msg.includes('kind: Closed')) {
        try {
          client.$disconnect().catch(() => {});
        } catch {}
        global.__prismaClient = undefined;
      } else {
        console.warn('[Prisma Notice]:', msg || e);
      }
    });

    global.__prismaClient = client;
  }
  return global.__prismaClient;
};

export interface DatabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  databaseType: 'SQLite' | 'PostgreSQL';
  databaseUrlMasked: string;
  errorMessage?: string;
  lastChecked: string;
}

/**
 * Health check & diagnostic utility for the Database connection
 */
export async function checkDatabaseConnection(): Promise<DatabaseStatus> {
  const rawUrl = resolveDatabaseUrl();
  const maskedUrl = rawUrl.replace(/:([^@]+)@/, ':****@');
  const dbType: 'SQLite' | 'PostgreSQL' =
    rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://') ? 'PostgreSQL' : 'SQLite';

  try {
    const prisma = getPrismaClient();
    // Test simple connectivity query with raw SQL and a safe 3.5s timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1 as connected`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('اتصال به دیتابیس منقضی شد (Timeout)')), 3500)
      ),
    ]);
    return {
      isConfigured: true,
      isConnected: true,
      databaseType: dbType,
      databaseUrlMasked: maskedUrl,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    // If connection was closed or broken, safely clean up and reset client
    try {
      await global.__prismaClient?.$disconnect().catch(() => {});
    } catch {}
    global.__prismaClient = undefined;

    const errorMsg = error instanceof Error ? error.message : 'خطای نامشخص در اتصال به دیتابیس';
    return {
      isConfigured: true,
      isConnected: false,
      databaseType: dbType,
      databaseUrlMasked: maskedUrl,
      errorMessage: errorMsg,
      lastChecked: new Date().toISOString(),
    };
  }
}
