import dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import express from 'express';
import { app } from './server/app.ts';

const isProd = process.env.NODE_ENV === 'production';
const PORT = isProd && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  // Vite Middleware in local dev
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Outreach Flow server running on http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });

  // In production on Cloud Run, if PORT is not 3000, also bind port 3000 if available
  if (isProd && PORT !== 3000) {
    try {
      const secondaryServer = app.listen(3000, '0.0.0.0', () => {
        console.log(`Outreach Flow secondary listener running on http://0.0.0.0:3000`);
      });
      secondaryServer.on('error', (e: any) => {
        console.log('Port 3000 listener note:', e.message);
      });
    } catch {
      // ignore
    }
  }
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
