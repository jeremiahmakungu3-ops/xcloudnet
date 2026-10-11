/**
 * XCLOUD.NET — Platform Subscription Routes
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import { SubscriptionService } from '../services/subscriptionService.ts';
import { PaymentService } from '../services/paymentService.ts';
import { db } from '../db/database.ts';
import { Invoice, PaymentTransaction } from '../../types/index.ts';

const router = Router();

// Current Org Subscription & Device Usage
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  try {
    const data = SubscriptionService.getOrgSubscription(orgId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Available Subscription Plans
router.get('/plans', requireAuth, (_req, res: Response) => {
  const plans = SubscriptionService.getAllPlans();
  res.json(plans);
});

// Generate Renewal Invoice & Initiate Payment Checkout
router.post('/checkout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const user = req.user!;
  const { paymentMethod, customerPhone } = req.body;

  try {
    const invoice = SubscriptionService.createRenewalInvoice(orgId);
    const result = await PaymentService.initiateCheckout({
      organizationId: orgId,
      amount: invoice.amount,
      currency: invoice.currency,
      paymentMethod: paymentMethod || 'SELCOM',
      paymentType: 'PLATFORM_SUBSCRIPTION',
      customerPhone: customerPhone || user.phone,
      customerName: user.name,
      invoiceId: invoice.id,
      userId: user.id,
    });

    res.json({
      invoice,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Organization Invoices
router.get('/invoices', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const invoices = db.find<Invoice>(
    'invoices',
    (i) => i.organizationId === orgId && i.type === 'PLATFORM_SUBSCRIPTION'
  );
  res.json(invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

// Organization Subscription Payment History
router.get('/payments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const payments = db.find<PaymentTransaction>(
    'payment_transactions',
    (p) => p.organizationId === orgId && p.paymentType === 'PLATFORM_SUBSCRIPTION'
  );
  res.json(payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

export default router;
