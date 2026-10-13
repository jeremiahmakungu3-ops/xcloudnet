/**
 * XCLOUD.NET — Unified Production Full-Stack Server
 * Express Backend API + Vite Dev Middleware / Production Static Servicing
 */

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './src/server/db/database.ts';

// API Routes
import authRoutes from './src/server/routes/authRoutes.ts';
import subscriptionRoutes from './src/server/routes/subscriptionRoutes.ts';
import paymentRoutes from './src/server/routes/paymentRoutes.ts';
import routerRoutes from './src/server/routes/routerRoutes.ts';
import mikrotikRoutes from './src/server/routes/mikrotikRoutes.ts';
import packageRoutes from './src/server/routes/packageRoutes.ts';
import voucherRoutes from './src/server/routes/voucherRoutes.ts';
import sessionRoutes from './src/server/routes/sessionRoutes.ts';
import agentRoutes from './src/server/routes/agentRoutes.ts';
import omadaRoutes from './src/server/routes/omadaRoutes.ts';
import reportRoutes from './src/server/routes/reportRoutes.ts';
import adminRoutes from './src/server/routes/adminRoutes.ts';
import userRoutes from './src/server/routes/userRoutes.ts';
import captivePortalRoutes from './src/server/routes/captivePortalRoutes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // 1. Initialize persistent database engine (PostgreSQL or persistent disk engine)
  await db.initialize();

  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  // Security and parsing middlewares
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Basic security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health and Readiness Check
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({
      status: 'HEALTHY',
      service: 'XCLOUD.NET Hotspot Billing & ISP Platform',
      database: db.isPg() ? 'PostgreSQL (Cloud SQL / Pool)' : 'Persistent Storage Engine',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Endpoints
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/subscription', subscriptionRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/manual-payments', paymentRoutes);
  app.use('/api/v1/routers', routerRoutes);
  app.use('/api/v1/mikrotik', mikrotikRoutes);
  app.use('/api/v1/packages', packageRoutes);
  app.use('/api/v1/vouchers', voucherRoutes);
  app.use('/api/v1/sessions', sessionRoutes);
  app.use('/api/v1/agents', agentRoutes);
  app.use('/api/v1/omada', omadaRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/captive-portal', captivePortalRoutes);

  // Direct Public Captive Portal URL for Wi-Fi Clients
  app.get('/portal', (req: Request, res: Response) => {
    res.redirect('/api/v1/captive-portal/live');
  });

  const server = http.createServer(app);

  // Serve Frontend
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('✓ Vite dev middlewares mounted');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      error: 'An unexpected internal server error occurred.',
      message: err.message || 'Unknown error',
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 XCLOUD.NET Server is actively running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal: Failed to start XCLOUD server:', err);
  process.exit(1);
});
