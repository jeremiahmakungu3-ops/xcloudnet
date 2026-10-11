/**
 * XCLOUD.NET — TP-Link Omada Controller Routes
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import { OmadaService } from '../services/omadaService.ts';
import { db } from '../db/database.ts';
import { OmadaControllerConfig } from '../../types/index.ts';

const router = Router();

router.get('/config', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const config = db.findOne<OmadaControllerConfig>(
    'omada_controllers',
    (c) => c.organizationId === orgId
  );
  if (!config) {
    return res.json({ configured: false });
  }
  res.json({
    configured: true,
    controllerUrl: config.controllerUrl,
    siteId: config.siteId,
    operatorUsername: config.operatorUsername,
    status: config.status,
    lastCheckedAt: config.lastCheckedAt,
    lastErrorMessage: config.lastErrorMessage,
  });
});

router.post('/config', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const user = req.user!;
  const { controllerUrl, siteId, operatorUsername, operatorPassword } = req.body;

  if (!controllerUrl || !siteId || !operatorUsername || !operatorPassword) {
    return res.status(400).json({ error: 'All fields are required to configure Omada controller.' });
  }

  const updated = OmadaService.saveConfig({
    organizationId: orgId,
    controllerUrl,
    siteId,
    operatorUsername,
    operatorPasswordEncrypted: operatorPassword, // Stored encrypted/securely on server
    performedBy: user,
  });

  res.json(updated);
});

router.post('/test-connection', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const result = await OmadaService.testConnection(orgId);
  res.json(result);
});

export default router;
