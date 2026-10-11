/**
 * XCLOUD.NET — Unified Payment & Billing Routes
 * Automatic Gateway + Manual Reviewer Flow
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { PaymentService } from '../services/paymentService.ts';
import { db } from '../db/database.ts';
import { PaymentTransaction } from '../../types/index.ts';

const router = Router();

// Gateway Configuration Status
router.get('/gateway-config', requireAuth, (_req, res: Response) => {
  const status = PaymentService.getGatewayConfigStatus();
  res.json(status);
});

// Initiate Payment Checkout (Public or Authenticated: e.g. Customer buys hotspot package)
router.post('/checkout', async (req, res: Response) => {
  const { organizationId, amount, paymentMethod, paymentType, customerPhone, customerName, packageId } = req.body;

  if (!organizationId || !amount || !paymentType) {
    return res.status(400).json({ error: 'Missing required checkout parameters.' });
  }

  try {
    const result = await PaymentService.initiateCheckout({
      organizationId,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'SELCOM',
      paymentType,
      customerPhone,
      customerName,
      packageId,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Payment Provider Webhook Callback (Public endpoint for Selcom / Telcos)
router.post('/webhook', async (req, res: Response) => {
  const { reference, providerReference, status, amount, signature } = req.body;

  try {
    const result = await PaymentService.processWebhook({
      reference,
      providerReference,
      status: status || 'COMPLETED',
      amount,
      signature,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Check status by internal reference
router.get('/status/:reference', async (req, res: Response) => {
  const { reference } = req.params;
  const tx = db.findOne<PaymentTransaction>('payment_transactions', (t) => t.reference === reference);
  if (!tx) {
    return res.status(404).json({ error: 'Transaction reference not found.' });
  }
  res.json(tx);
});

// Get organization payment transactions
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const type = req.query.type as any;
  const status = req.query.status as any;
  const txs = PaymentService.getTransactions({
    organizationId: orgId,
    paymentType: type,
    status: status,
  });
  res.json(txs);
});

// Record Manual Payment (Staff records cash or manual mobile money transaction)
router.post('/manual', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const user = req.user!;
  const { amount, paymentMethod, paymentType, providerReference, customerPhone, customerName, packageId, notes } =
    req.body;

  if (!amount || !providerReference || !paymentType) {
    return res.status(400).json({
      error: 'Amount, payment type, and external transaction reference are required.',
    });
  }

  try {
    const tx = PaymentService.recordManualPayment({
      organizationId: orgId,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'CASH',
      paymentType,
      providerReference,
      customerPhone,
      customerName,
      packageId,
      notes,
      staffUser: user,
    });
    res.status(201).json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Pending Manual Payments (Awaiting Reviewer Approval)
router.get('/manual/pending', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const pending = db.find<PaymentTransaction>(
    'payment_transactions',
    (t) => t.organizationId === orgId && t.status === 'PENDING_VERIFICATION'
  );
  res.json(pending);
});

// Verify / Review Manual Payment (Requires ORG_ADMIN or SUPER_ADMIN)
router.post(
  '/manual/:id/verify',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'ORG_ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { approved, rejectionReason } = req.body;
    const user = req.user!;

    if (approved === undefined) {
      return res.status(400).json({ error: "Field 'approved' (boolean) is required." });
    }

    try {
      const result = PaymentService.verifyManualPayment({
        transactionId: id,
        approved: Boolean(approved),
        rejectionReason,
        reviewerUser: user,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
