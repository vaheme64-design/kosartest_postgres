import 'dotenv/config';

// Force validate/sanitize DATABASE_URL immediately so PostgreSQL provider in Prisma is always valid
if (!process.env.DATABASE_URL || (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://'))) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kpims_db?schema=public';
}

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/apiRouter';
import { resolveDatabaseUrl } from './src/server/db/prisma';

resolveDatabaseUrl();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI flags if provided (e.g. --host 0.0.0.0 --port 3000)
const args = process.argv.slice(2);
const portArgIndex = args.indexOf('--port');
const portFromArgs = portArgIndex !== -1 && args[portArgIndex + 1] ? Number(args[portArgIndex + 1]) : undefined;
const hostArgIndex = args.indexOf('--host');
const hostFromArgs = hostArgIndex !== -1 && args[hostArgIndex + 1] ? args[hostArgIndex + 1] : undefined;

const PORT = Number(process.env.PORT) || portFromArgs || 3000;
const HOST = process.env.HOST || hostFromArgs || '0.0.0.0';

async function startServer() {
  const app = express();

  // Support large Excel/CSV file imports (up to 50MB payloads)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Cloud Run / Kubernetes Health Check Endpoint
  app.get('/healthz', (_req, res) => {
    res.status(200).send('OK');
  });

  // Mount backend API router
  app.use('/api', apiRouter);

  // Global JSON error handler for API routes to always return structured JSON instead of HTML
  app.use('/api', (err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      return res.status(413).json({
        success: false,
        error: 'حجم داده‌های فایل ارسالی بیش از حد مجاز سرور است (خطای ۴۱۳). لطفاً فایل را در بخش‌های کوچکتری وارد نمایید.',
      });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
        success: false,
        error: 'ساختار داده‌های ارسالی نامعتبر است (خطای اعتبارسنجی JSON).',
      });
    }
    console.error('API Error:', err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'خطای غیرمنتظره در سرور رخ داد.',
    });
  });

  // In development, mount Vite dev server middlewares
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static assets in production
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      app.get('*', (_req, res) => {
        res.status(503).send('Application is building. Please refresh in a moment.');
      });
    }
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`KPIMS Server successfully started and listening on http://${HOST}:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });
}

startServer();
