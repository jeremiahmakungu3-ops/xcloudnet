/**
 * XCLOUD.NET — Financial & Operations Reporting Routes
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import { db } from '../db/database.ts';
import {
  PaymentTransaction,
  Voucher,
  Router as RouterModel,
  HotspotSession,
} from '../../types/index.ts';
import { SubscriptionService } from '../services/subscriptionService.ts';

const router = Router();

router.get('/summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;

  // 1. Hotspot Customer Revenue
  const hotspotTxs = db.find<PaymentTransaction>(
    'payment_transactions',
    (p) =>
      p.organizationId === orgId &&
      p.paymentType === 'HOTSPOT_PACKAGE' &&
      p.status === 'COMPLETED'
  );
  const totalHotspotRevenue = hotspotTxs.reduce((sum, t) => sum + t.amount, 0);

  // 2. Vouchers stats
  const vouchers = db.find<Voucher>('vouchers', (v) => v.organizationId === orgId);
  const activeVouchers = vouchers.filter((v) => v.status === 'ACTIVE').length;
  const usedVouchers = vouchers.filter((v) => v.status === 'USED').length;

  // 3. Routers
  const routers = db.find<RouterModel>('routers', (r) => r.organizationId === orgId);
  const onlineRouters = routers.filter((r) => r.status === 'ONLINE').length;

  // 4. Active Sessions
  const sessions = db.find<HotspotSession>(
    'hotspot_sessions',
    (s) => s.organizationId === orgId && s.isActive
  );

  // 5. Subscription Status
  const subInfo = SubscriptionService.getOrgSubscription(orgId);

  res.json({
    totalHotspotRevenueTZS: totalHotspotRevenue,
    voucherStats: {
      total: vouchers.length,
      active: activeVouchers,
      used: usedVouchers,
    },
    routerStats: {
      total: routers.length,
      online: onlineRouters,
      offline: routers.length - onlineRouters,
      deviceLimit: subInfo.deviceLimit,
    },
    activeSessionsCount: sessions.length,
    subscription: {
      status: subInfo.subscription.status,
      daysRemaining: subInfo.daysRemaining,
      isInGracePeriod: subInfo.isInGracePeriod,
    },
  });
});

export default router;
