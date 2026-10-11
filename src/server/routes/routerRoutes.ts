/**
 * XCLOUD.NET — Router Management & MikroTik Script Delivery
 */

import { Router as ExpressRouter, Response } from 'express';
import { AuthenticatedRequest, requireAuth, requireActiveSubscription } from '../middleware/auth.ts';
import { MikrotikService } from '../services/mikrotikService.ts';
import { ActivityService } from '../services/activityService.ts';
import { db } from '../db/database.ts';
import { Router, RouterStatus } from '../../types/index.ts';

const router = ExpressRouter();

// List Routers for Organization with real-time status check
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const routers = db.find<Router>('routers', (r) => r.organizationId === orgId);

  const enriched = routers.map((r) => ({
    ...r,
    status: MikrotikService.getRouterStatus(r),
  }));

  res.json(enriched);
});

// Register New Router (enforces subscription device limit)
router.post(
  '/',
  requireAuth,
  requireActiveSubscription,
  (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.organizationId!;
    const user = req.user!;
    const { name, type, ipAddress, dnsName, rosVersion, location, networkConfig } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Router name is required.' });
    }

    try {
      const newRouter = MikrotikService.registerRouter({
        organizationId: orgId,
        name,
        type,
        ipAddress,
        dnsName,
        rosVersion,
        location,
        networkConfig,
        performedBy: user,
      });
      res.status(201).json(newRouter);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Update Router / Network Config
router.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const orgId = req.organizationId!;
  const rtr = db.findById<Router>('routers', id);

  if (!rtr) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  if (user.role !== 'SUPER_ADMIN' && rtr.organizationId !== orgId) {
    return res.status(403).json({ error: 'Forbidden: Access denied to another organization router.' });
  }

  const { name, location, dnsName, ipAddress, rosVersion, networkConfig } = req.body;
  const updatedNetworkConfig = networkConfig
    ? { ...(rtr.networkConfig || {}), ...networkConfig }
    : rtr.networkConfig;

  const updated = db.update<Router>('routers', id, {
    ...(name ? { name } : {}),
    ...(location !== undefined ? { location } : {}),
    ...(dnsName ? { dnsName } : {}),
    ...(ipAddress ? { ipAddress } : {}),
    ...(rosVersion ? { rosVersion } : {}),
    networkConfig: updatedNetworkConfig,
    updatedAt: new Date().toISOString(),
  });

  ActivityService.log({
    organizationId: orgId,
    userId: user.id,
    userEmail: user.email,
    deviceId: id,
    action: 'ROUTER_CONFIG_UPDATED',
    category: 'MANAGEMENT',
    result: 'SUCCESS',
    message: `Updated configuration for router ${rtr.name}`,
  });

  res.json({
    ...updated,
    status: MikrotikService.getRouterStatus(updated!),
  });
});

// Router Details
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const orgId = req.organizationId!;
  const rtr = db.findById<Router>('routers', id);

  if (!rtr) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  // Cross-tenant security check (Super Admin bypasses)
  if (user.role !== 'SUPER_ADMIN' && rtr.organizationId !== orgId) {
    ActivityService.log({
      organizationId: orgId,
      userId: user.id,
      userEmail: user.email,
      deviceId: id,
      action: 'CROSS_TENANT_ROUTER_ACCESS_BLOCKED',
      category: 'SECURITY',
      result: 'DENIED',
      sourceIp: req.ip,
      message: `Blocked attempt by ${user.email} (Org: ${orgId}) to access router ${id} belonging to Org ${rtr.organizationId}`,
    });
    return res.status(403).json({ error: 'Forbidden: Access denied to another organization router.' });
  }

  res.json({
    ...rtr,
    status: MikrotikService.getRouterStatus(rtr),
  });
});

// Delete Router
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const orgId = req.organizationId!;
  const rtr = db.findById<Router>('routers', id);

  if (!rtr) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  if (user.role !== 'SUPER_ADMIN' && rtr.organizationId !== orgId) {
    ActivityService.log({
      organizationId: orgId,
      userId: user.id,
      userEmail: user.email,
      deviceId: id,
      action: 'CROSS_TENANT_ROUTER_DELETE_BLOCKED',
      category: 'SECURITY',
      result: 'DENIED',
      sourceIp: req.ip,
      message: `Blocked attempt to delete router ${id} belonging to another organization`,
    });
    return res.status(403).json({ error: 'Forbidden: Cannot delete router belonging to another organization.' });
  }

  db.delete('routers', id);
  res.json({ success: true, message: 'Router deleted successfully.' });
});

// Generate Installation Token (Replay protected, short lived)
router.post('/:id/installation-token', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.organizationId!;

  try {
    const result = MikrotikService.generateInstallationToken(id, orgId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Router Configuration Script (authenticated preview / copy)
router.get('/:id/script', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const orgId = req.organizationId!;
  const rtr = db.findById<Router>('routers', id);

  if (!rtr || (user.role !== 'SUPER_ADMIN' && rtr.organizationId !== orgId)) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const appUrl = `${req.protocol}://${req.get('host')}`;
  const script = MikrotikService.generateRouterOSScript({
    router: rtr,
    appUrl,
  });

  // Track manual script generated timestamp
  db.update<Router>('routers', id, {
    manualScriptGeneratedAt: new Date().toISOString(),
  });

  ActivityService.log({
    organizationId: rtr.organizationId,
    userId: user.id,
    userEmail: user.email,
    deviceId: id,
    action: 'ROUTER_SCRIPT_GENERATED',
    category: 'INSTALLATION',
    result: 'SUCCESS',
    message: `Generated RouterOS v7 configuration script for router ${rtr.name}`,
  });

  res.json({
    routerId: rtr.id,
    rosVersion: rtr.rosVersion || 'v7',
    script,
  });
});

// Download Router Configuration Script as .rsc attachment
router.get('/:id/script/download', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const orgId = req.organizationId!;
  const rtr = db.findById<Router>('routers', id);

  if (!rtr || (user.role !== 'SUPER_ADMIN' && rtr.organizationId !== orgId)) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const appUrl = `${req.protocol}://${req.get('host')}`;
  const script = MikrotikService.generateRouterOSScript({
    router: rtr,
    appUrl,
  });

  db.update<Router>('routers', id, {
    manualScriptDownloadedAt: new Date().toISOString(),
  });

  ActivityService.log({
    organizationId: rtr.organizationId,
    userId: user.id,
    userEmail: user.email,
    deviceId: id,
    action: 'ROUTER_SCRIPT_DOWNLOADED',
    category: 'INSTALLATION',
    result: 'SUCCESS',
    message: `Downloaded .rsc script file for router ${rtr.name}`,
  });

  const safeFileName = `xcloud_${rtr.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.rsc`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
  res.send(script);
});

// Router Heartbeat (Public endpoint pinged by RouterOS scheduler)
router.post('/:id/heartbeat', (req, res: Response) => {
  const { id } = req.params;
  try {
    const result = MikrotikService.processHeartbeat(id, req.body || {});
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
