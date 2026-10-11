/**
 * XCLOUD.NET — MikroTik Direct RSC Script Delivery Endpoint
 * Pure text/plain RouterOS script format. Never returns HTML or JSON errors.
 */

import { Router, Request, Response } from 'express';
import { MikrotikService } from '../services/mikrotikService.ts';
import { ActivityService } from '../services/activityService.ts';
import { db } from '../db/database.ts';
import { Router as RouterModel } from '../../types/index.ts';

const router = Router();

router.get('/bootstrap/:routerId', (req: Request, res: Response) => {
  const { routerId } = req.params;
  const token = req.query.token as string;

  // Always return text/plain with RouterOS script mime type
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (!token) {
    ActivityService.log({
      organizationId: 'system',
      deviceId: routerId,
      deviceType: 'MIKROTIK',
      action: 'BOOTSTRAP_FETCH_FAILED',
      category: 'SECURITY',
      result: 'DENIED',
      sourceIp: req.ip,
      message: 'Bootstrap script request denied: Authorization token missing',
    });
    res.status(401).send(
      `# ERROR: Authorization token missing.\n:log error "XCLOUD: Bootstrap failed - Missing authorization token."\n`
    );
    return;
  }

  const isValid = MikrotikService.validateToken(routerId, token);
  if (!isValid) {
    ActivityService.log({
      organizationId: 'system',
      deviceId: routerId,
      deviceType: 'MIKROTIK',
      action: 'BOOTSTRAP_FETCH_FAILED',
      category: 'SECURITY',
      result: 'DENIED',
      sourceIp: req.ip,
      message: 'Bootstrap script request denied: Invalid or expired token',
    });
    res.status(403).send(
      `# ERROR: Invalid or expired bootstrap token.\n:log error "XCLOUD: Bootstrap rejected - Invalid or expired token."\n`
    );
    return;
  }

  const rtr = db.findById<RouterModel>('routers', routerId);
  if (!rtr) {
    res.status(404).send(
      `# ERROR: Target router profile not found.\n:log error "XCLOUD: Bootstrap failed - Unknown router ID."\n`
    );
    return;
  }

  // Mark token used
  MikrotikService.markTokenUsed(routerId);

  ActivityService.log({
    organizationId: rtr.organizationId,
    deviceId: rtr.id,
    deviceName: rtr.name,
    deviceType: 'MIKROTIK',
    action: 'BOOTSTRAP_SCRIPT_DELIVERED',
    category: 'INSTALLATION',
    result: 'SUCCESS',
    sourceIp: req.ip,
    message: `RouterOS v7 provisioning script successfully delivered to router ${rtr.name}`,
  });

  // Generate real RouterOS script
  const appUrl = `${req.protocol}://${req.get('host')}`;
  const script = MikrotikService.generateRouterOSScript({
    router: rtr,
    appUrl,
  });

  res.status(200).send(script);
});

export default router;
