/**
 * XCLOUD.NET — Hotspot Packages Routes
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth, requireActiveSubscription } from '../middleware/auth.ts';
import { db } from '../db/database.ts';
import { HotspotPackage } from '../../types/index.ts';
import { AuditService } from '../services/auditService.ts';

const router = Router();

// List Packages for organization (public or authenticated)
router.get('/', (req, res: Response) => {
  const orgId = (req.query.organizationId as string) || (req as any).organizationId;
  let pkgs = db.getCollection<HotspotPackage>('hotspot_packages');
  if (orgId) {
    pkgs = pkgs.filter((p) => p.organizationId === orgId);
  }
  res.json(pkgs.filter((p) => p.isActive));
});

// Create Package
router.post(
  '/',
  requireAuth,
  requireActiveSubscription,
  (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.organizationId!;
    const user = req.user!;
    const {
      name,
      description,
      price,
      durationMinutes,
      dataLimitMb,
      uploadSpeedKbps,
      downloadSpeedKbps,
      simultaneousDevices,
    } = req.body;

    if (!name || !price || !durationMinutes) {
      return res.status(400).json({ error: 'Name, price (TZS), and duration are required.' });
    }

    const pkg: HotspotPackage = {
      id: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: orgId,
      name,
      description,
      price: Number(price),
      durationMinutes: Number(durationMinutes),
      dataLimitMb: dataLimitMb ? Number(dataLimitMb) : 0,
      uploadSpeedKbps: uploadSpeedKbps ? Number(uploadSpeedKbps) : 2048,
      downloadSpeedKbps: downloadSpeedKbps ? Number(downloadSpeedKbps) : 4096,
      simultaneousDevices: simultaneousDevices ? Number(simultaneousDevices) : 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.insert('hotspot_packages', pkg);

    AuditService.log({
      organizationId: orgId,
      userId: user.id,
      userEmail: user.email,
      action: 'CREATE_HOTSPOT_PACKAGE',
      resourceType: 'PACKAGE',
      resourceId: pkg.id,
      details: { name: pkg.name, price: pkg.price },
    });

    res.status(201).json(pkg);
  }
);

// Update Package
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.organizationId!;
  const user = req.user!;

  const existing = db.findById<HotspotPackage>('hotspot_packages', id);
  if (!existing || existing.organizationId !== orgId) {
    return res.status(404).json({ error: 'Package not found.' });
  }

  const updated = db.update<HotspotPackage>('hotspot_packages', id, req.body);
  AuditService.log({
    organizationId: orgId,
    userId: user.id,
    userEmail: user.email,
    action: 'UPDATE_HOTSPOT_PACKAGE',
    resourceType: 'PACKAGE',
    resourceId: id,
    details: req.body,
  });

  res.json(updated);
});

export default router;
