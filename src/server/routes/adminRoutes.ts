/**
 * XCLOUD.NET — Super Admin Management Routes
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { SubscriptionService } from '../services/subscriptionService.ts';
import { AuditService } from '../services/auditService.ts';
import { ActivityService } from '../services/activityService.ts';
import { MikrotikService } from '../services/mikrotikService.ts';
import { db } from '../db/database.ts';
import {
  OrgSubscription,
  PaymentTransaction,
  Organization,
  Router as RouterModel,
  OmadaControllerConfig,
  OmadaDevice,
  User,
} from '../../types/index.ts';

const router = Router();

// Super Admin authorization guard for all /admin routes
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

// -------------------------------------------------------------
// GLOBAL ROUTER & OMADA ACTIVITY MONITORING ENDPOINTS
// -------------------------------------------------------------

// Global Activity Monitoring Summary (Metrics & Counters)
router.get('/activity/summary', (_req, res: Response) => {
  const summary = ActivityService.getGlobalMonitoringSummary();
  res.json(summary);
});

// Searchable, filterable, paginated activity log
router.get('/activity', (req: AuthenticatedRequest, res: Response) => {
  const {
    organizationId,
    userId,
    deviceId,
    deviceType,
    category,
    result,
    search,
    startDate,
    endDate,
    limit,
    offset,
  } = req.query;

  const events = ActivityService.getActivityEvents({
    organizationId: organizationId as string,
    userId: userId as string,
    deviceId: deviceId as string,
    deviceType: deviceType as any,
    category: category as any,
    result: result as any,
    search: search as string,
    startDate: startDate as string,
    endDate: endDate as string,
    limit: limit ? Number(limit) : 50,
    offset: offset ? Number(offset) : 0,
  });

  res.json(events);
});

// Export activity log as CSV (Rate-limited, Super Admin only)
router.get('/activity/export', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const csvData = ActivityService.exportActivityCsv({
    organizationId: req.query.organizationId as string,
    category: req.query.category as any,
    result: req.query.result as any,
    search: req.query.search as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  });

  // Log export action in security audit
  AuditService.log({
    organizationId: user.organizationId,
    userId: user.id,
    userEmail: user.email,
    action: 'EXPORT_GLOBAL_ACTIVITY_LOG',
    resourceType: 'ACTIVITY_LOG',
    details: { format: 'CSV', requestedBy: user.email },
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="xcloud_activity_export_${Date.now()}.csv"`
  );
  res.status(200).send(csvData);
});

// Global list of all MikroTik routers across all organizations
router.get('/routers', (_req, res: Response) => {
  const routers = db.getCollection<RouterModel>('routers');
  const orgs = db.getCollection<Organization>('organizations');
  const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

  const enriched = routers.map((r) => ({
    ...r,
    organizationName: orgMap.get(r.organizationId) || 'Unknown Organization',
    calculatedStatus: MikrotikService.getRouterStatus(r),
  }));

  res.json(enriched);
});

// Device-specific activity trail & diagnostics
router.get('/routers/:id/activity', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const router = db.findById<RouterModel>('routers', id);
  if (!router) {
    return res.status(404).json({ error: 'Router not found' });
  }

  const details = ActivityService.getDeviceDetails(id);
  const org = db.findById<Organization>('organizations', router.organizationId);

  res.json({
    ...details,
    router: {
      ...router,
      calculatedStatus: MikrotikService.getRouterStatus(router),
      organizationName: org?.name || 'Unknown Organization',
    },
  });
});

// Global list of all Omada controllers across all organizations
router.get('/omada/controllers', (_req, res: Response) => {
  const controllers = db.getCollection<OmadaControllerConfig>('omada_controllers');
  const orgs = db.getCollection<Organization>('organizations');
  const omadaDevices = db.getCollection<OmadaDevice>('omada_devices');
  const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

  const enriched = controllers.map((c) => {
    const devices = omadaDevices.filter((d) => d.controllerId === c.id);
    return {
      ...c,
      organizationName: orgMap.get(c.organizationId) || 'Unknown Organization',
      deviceCount: devices.length,
      devices,
    };
  });

  res.json(enriched);
});

// Omada controller activity trail & managed devices
router.get('/omada/controllers/:id/activity', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const controller = db.findById<OmadaControllerConfig>('omada_controllers', id);
  if (!controller) {
    return res.status(404).json({ error: 'Omada Controller not found' });
  }

  const details = ActivityService.getDeviceDetails(id);
  const org = db.findById<Organization>('organizations', controller.organizationId);
  const devices = db.find<OmadaDevice>('omada_devices', (d) => d.controllerId === id);

  res.json({
    ...details,
    controller: {
      ...controller,
      organizationName: org?.name || 'Unknown Organization',
    },
    managedDevices: devices,
  });
});

// User-specific activity trail
router.get('/users/:id/activity', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = db.findById<User>('users', id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const events = ActivityService.getActivityEvents({
    userId: id,
    limit: 100,
  });

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
    activity: events,
  });
});

// Overview of all ISP organization subscriptions
router.get('/subscriptions', (_req, res: Response) => {
  const overview = SubscriptionService.getAdminSubscriptionOverview();
  res.json(overview);
});

// Update an organization subscription status
router.patch('/subscriptions/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const user = req.user!;

  const updated = db.update<OrgSubscription>('org_subscriptions', id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Subscription not found.' });
  }

  AuditService.log({
    organizationId: updated.organizationId,
    userId: user.id,
    userEmail: user.email,
    action: 'ADMIN_UPDATE_SUBSCRIPTION',
    resourceType: 'SUBSCRIPTION',
    resourceId: id,
    details: updates,
  });

  res.json(updated);
});

// Manual Authorized Extension of Subscription
router.post('/subscriptions/:id/extend', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { days, deviceLimit, reason } = req.body;
  const user = req.user!;

  const sub = db.findById<OrgSubscription>('org_subscriptions', id);
  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found.' });
  }

  try {
    const updated = SubscriptionService.manualAdminExtension({
      organizationId: sub.organizationId,
      days: days ? Number(days) : 30,
      deviceLimit: deviceLimit ? Number(deviceLimit) : undefined,
      reason: reason || 'Authorized Super Admin Extension',
      adminUser: { id: user.id, email: user.email, organizationId: user.organizationId },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// All Platform Payments (Reconciliation & Audit)
router.get('/payments', (_req, res: Response) => {
  const payments = db.getCollection<PaymentTransaction>('payment_transactions');
  res.json(payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// Global Audit Logs
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  const logs = AuditService.getLogs(undefined, limit);
  res.json(logs);
});

// Subscription Plans Management
router.get('/plans', (_req, res: Response) => {
  res.json(SubscriptionService.getAllPlans());
});

router.put('/plans/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  try {
    const updated = SubscriptionService.updatePlan(id, req.body, user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Organizations List
router.get('/organizations', (_req, res: Response) => {
  const orgs = db.getCollection<Organization>('organizations');
  res.json(orgs);
});

export default router;
