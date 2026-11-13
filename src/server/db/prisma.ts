import { PrismaClient } from '@prisma/client';

/**
 * KPIMS Database Connection Configuration
 * Singleton Prisma Client with lazy connection & status checks
 */

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export const isDatabaseUrlConfigured = (): boolean => {
  const rawUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, '');
  if (!rawUrl) return false;

  try {
    const parsed = new URL(rawUrl);
    return (
      (parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:') &&
      Boolean(parsed.hostname) &&
      parsed.pathname.length > 1 &&
      parsed.hostname.toLowerCase() !== 'your_host' &&
      parsed.username.toLowerCase() !== 'your_user' &&
      parsed.pathname.slice(1).toLowerCase() !== 'your_database'
    );
  } catch {
    return false;
  }
};

export const resolveDatabaseUrl = (): string => {
  const rawValue = process.env.DATABASE_URL?.trim();
  const rawUrl =
    rawValue && ((rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'")))
      ? rawValue.slice(1, -1).trim()
      : rawValue;

  if (!rawUrl) {
    throw new Error(
      'DATABASE_URL is required. Configure the PostgreSQL connection string in the runtime environment before starting the application.'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL.');
  }

  if (
    (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') ||
    !parsed.hostname ||
    parsed.pathname.length <= 1 ||
    parsed.hostname.toLowerCase() === 'your_host' ||
    parsed.username.toLowerCase() === 'your_user' ||
    parsed.pathname.slice(1).toLowerCase() === 'your_database'
  ) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL with a host and database name.');
  }

  process.env.DATABASE_URL = rawUrl;
  return rawUrl;
};

export const getPrismaClient = (): PrismaClient => {
  if (!global.__prismaClient) {
    const dbUrl = resolveDatabaseUrl();

    const client = new PrismaClient({
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
  if (!isDatabaseUrlConfigured()) {
    return {
      isConfigured: false,
      isConnected: false,
      databaseType: 'PostgreSQL',
      databaseUrlMasked: '',
      errorMessage: 'DATABASE_URL is missing or is not a valid PostgreSQL connection URL.',
      lastChecked: new Date().toISOString(),
    };
  }

  const rawUrl = resolveDatabaseUrl();
  const maskedUrl = rawUrl.replace(/:([^@]+)@/, ':****@');
  const dbType: 'SQLite' | 'PostgreSQL' = 'PostgreSQL';

  try {
    const prisma = getPrismaClient();
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
