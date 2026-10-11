/**
 * XCLOUD.NET — Active Hotspot Sessions & RADIUS Routes
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import { RadiusService } from '../services/radiusService.ts';

const router = Router();

// Get Active Sessions for Organization
router.get('/active', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;
  const sessions = RadiusService.getActiveSessions(orgId);
  res.json(sessions);
});

// Disconnect Session
router.post('/:id/disconnect', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const success = RadiusService.disconnectSession(id);
  if (!success) {
    return res.status(404).json({ error: 'Session not found.' });
  }
  res.json({ success: true, message: 'Session disconnected successfully.' });
});

export default router;
