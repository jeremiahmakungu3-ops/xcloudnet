/**
 * XCLOUD.NET — Agent & POS Terminal Routes
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import { AgentService } from '../services/agentService.ts';
import { db } from '../db/database.ts';
import { Agent, LedgerEntry } from '../../types/index.ts';

const router = Router();

// List Agents
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const agents = db.find<Agent>('agents', (a) => a.organizationId === orgId);
  res.json(agents);
});

// Create Agent
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const { name, phone, commissionRatePercent, initialFloat } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required.' });
  }

  const agent: Agent = {
    id: `agent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organizationId: orgId,
    name,
    phone,
    commissionRatePercent: commissionRatePercent ? Number(commissionRatePercent) : 10,
    walletBalance: 0,
    totalCommissionEarned: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.insert('agents', agent);

  if (initialFloat && Number(initialFloat) > 0) {
    AgentService.adjustFloat({
      organizationId: orgId,
      agentId: agent.id,
      amount: Number(initialFloat),
      type: 'FLOAT_CREDIT',
      reference: `INIT-FLOAT-${Date.now()}`,
      description: 'Initial agent float allocation',
      performedBy: req.user!.id,
    });
  }

  const updated = db.findById<Agent>('agents', agent.id);
  res.status(201).json(updated);
});

// Adjust Float (Top-up or Payout)
router.post('/:id/float', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.organizationId!;
  const user = req.user!;
  const { amount, type, reference, description } = req.body;

  if (!amount || !type) {
    return res.status(400).json({ error: 'Amount and type (FLOAT_CREDIT or FLOAT_DEBIT) are required.' });
  }

  try {
    const result = AgentService.adjustFloat({
      organizationId: orgId,
      agentId: id,
      amount: Number(amount),
      type,
      reference: reference || `ADJ-${Date.now()}`,
      description: description || 'Manual float adjustment',
      performedBy: user.id,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POS Voucher Sale (Agent sells voucher directly to walk-in customer)
router.post('/pos-sell', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const { agentId, packageId, customerPhone } = req.body;

  if (!agentId || !packageId) {
    return res.status(400).json({ error: 'agentId and packageId are required.' });
  }

  try {
    const result = AgentService.sellVoucherPOS({
      organizationId: orgId,
      agentId,
      packageId,
      customerPhone,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Financial Ledger History
router.get('/ledger', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const agentId = req.query.agentId as string;

  let entries = db.find<LedgerEntry>('ledger_entries', (l) => {
    if (l.organizationId !== orgId) return false;
    if (agentId && l.agentId !== agentId) return false;
    return true;
  });

  res.json(entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

export default router;
