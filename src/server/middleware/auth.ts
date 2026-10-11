/**
 * XCLOUD.NET — Authentication & Authorization Middleware
 * Multi-Tenant Isolation, Role-Based Access Control, and Subscription Gates
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.ts';
import { User, Role, OrgSubscription } from '../../types/index.ts';
import { ActivityService } from '../services/activityService.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'xcloud-net-master-secret-key-2026-prod';

export interface AuthenticatedRequest extends Request {
  user?: User;
  organizationId?: string;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: Role;
      organizationId: string;
    };

    const user = db.findById<User>('users', decoded.id);
    if (!user) {
      res.status(401).json({ error: 'User not found or session revoked.' });
      return;
    }

    req.user = user;
    req.organizationId = user.organizationId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (req.user.role === 'SUPER_ADMIN') {
      // Super Admin bypasses role checks
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      ActivityService.log({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'ACCESS_DENIED_UNAUTHORIZED_ROLE',
        category: 'SECURITY',
        result: 'DENIED',
        sourceIp: req.ip,
        targetResource: req.originalUrl,
        message: `Denied access to ${req.originalUrl}. Required: [${allowedRoles.join(', ')}], Current: ${req.user.role}`,
      });

      res.status(403).json({
        error: `Forbidden: This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware: Verify that organization's monthly platform subscription is in good standing.
 * Expired subscriptions still have access to renewal, invoices, payment history, support, and account management,
 * but are restricted from registering new routers, generating new batches of vouchers, or editing packages.
 */
export const requireActiveSubscription = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  const orgId = req.organizationId;
  if (!orgId) {
    res.status(400).json({ error: 'Organization context missing.' });
    return;
  }

  const sub = db.findOne<OrgSubscription>(
    'org_subscriptions',
    (s) => s.organizationId === orgId
  );

  if (!sub) {
    res.status(402).json({
      error: 'Payment Required: No platform subscription found for this organization.',
      code: 'SUBSCRIPTION_REQUIRED',
    });
    return;
  }

  const now = new Date();
  const periodEnd = new Date(sub.currentPeriodEnd);
  const graceEnd = new Date(sub.gracePeriodEnd);

  // Status transitions
  if (now > graceEnd && sub.status !== 'EXPIRED' && sub.status !== 'SUSPENDED') {
    db.update('org_subscriptions', sub.id, { status: 'EXPIRED' });
    sub.status = 'EXPIRED';
  } else if (now > periodEnd && now <= graceEnd && sub.status === 'ACTIVE') {
    db.update('org_subscriptions', sub.id, { status: 'GRACE_PERIOD' });
    sub.status = 'GRACE_PERIOD';
  }

  if (sub.status === 'EXPIRED' || sub.status === 'SUSPENDED' || sub.status === 'CANCELLED') {
    res.status(402).json({
      error: `Platform subscription is ${sub.status}. Please renew your monthly TSh 7,000 subscription to perform this action.`,
      code: 'SUBSCRIPTION_EXPIRED',
      subscription: sub,
    });
    return;
  }

  next();
};
