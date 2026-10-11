/**
 * XCLOUD.NET — Voucher Generation & Captive Portal Redemption Routes
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth, requireActiveSubscription } from '../middleware/auth.ts';
import { VoucherService } from '../services/voucherService.ts';
import { db } from '../db/database.ts';
import { Voucher, HotspotPackage } from '../../types/index.ts';

const router = Router();

// List Vouchers
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const status = req.query.status as string;
  const packageId = req.query.packageId as string;
  const batchId = req.query.batchId as string;

  let vouchers = db.find<Voucher>('vouchers', (v) => {
    if (v.organizationId !== orgId) return false;
    if (status && v.status !== status) return false;
    if (packageId && v.packageId !== packageId) return false;
    if (batchId && v.batchId !== batchId) return false;
    return true;
  });

  const pkgs = db.getCollection<HotspotPackage>('hotspot_packages');
  const pkgMap = new Map(pkgs.map((p) => [p.id, p]));

  const enriched = vouchers.map((v) => ({
    ...v,
    package: pkgMap.get(v.packageId),
  }));

  res.json(enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// Generate Vouchers (Single or Bulk)
router.post(
  '/generate',
  requireAuth,
  requireActiveSubscription,
  (req: AuthenticatedRequest, res: Response) => {
    const orgId = req.organizationId!;
    const user = req.user!;
    const { packageId, count, prefix } = req.body;

    if (!packageId) {
      return res.status(400).json({ error: 'Package ID is required.' });
    }

    const qty = count ? Number(count) : 1;

    try {
      if (qty === 1) {
        const vch = VoucherService.createSingleVoucher({
          organizationId: orgId,
          packageId,
        });
        return res.status(201).json([vch]);
      } else {
        const list = VoucherService.generateBulkVouchers({
          organizationId: orgId,
          packageId,
          count: qty,
          prefix,
          performedBy: user,
        });
        return res.status(201).json(list);
      }
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Redeem Voucher (Public endpoint used by Captive Portal Login Page)
router.post('/redeem', (req, res: Response) => {
  const { code, macAddress, ipAddress, routerId } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Voucher code is required.' });
  }

  try {
    const result = VoucherService.redeemVoucher({
      code,
      macAddress: macAddress || '00:00:00:00:00:00',
      ipAddress: ipAddress || req.ip || '127.0.0.1',
      routerId,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Revoke Voucher
router.post('/:id/revoke', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  try {
    const revoked = VoucherService.revokeVoucher(id, user);
    res.json(revoked);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
