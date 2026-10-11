/**
 * XCLOUD.NET — User & Staff Management Routes
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { db } from '../db/database.ts';
import { User } from '../../types/index.ts';
import { AuditService } from '../services/auditService.ts';

const router = Router();

// List Users for current Organization (or all if Super Admin)
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let usersList = db.getCollection<User>('users');

  if (user.role !== 'SUPER_ADMIN') {
    usersList = usersList.filter((u) => u.organizationId === user.organizationId);
  }

  // Remove passwordHash before returning
  const sanitized = usersList.map((u) => {
    const { ...rest } = u as any;
    delete rest.passwordHash;
    return rest;
  });

  res.json(sanitized);
});

// Add New Staff / Agent / Admin User to Organization
router.post(
  '/',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'ORG_ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { name, email, password, role, phone, organizationId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = db.findOne<User>('users', (u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const targetOrgId =
      currentUser.role === 'SUPER_ADMIN' && organizationId
        ? organizationId
        : currentUser.organizationId;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: email.toLowerCase(),
      name,
      passwordHash,
      role: role || 'STAFF',
      organizationId: targetOrgId,
      phone: phone || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    db.insert('users', newUser);

    AuditService.log({
      organizationId: targetOrgId,
      userId: currentUser.id,
      userEmail: currentUser.email,
      action: 'CREATE_USER',
      resourceType: 'USER',
      resourceId: newUser.id,
      details: { name: newUser.name, email: newUser.email, role: newUser.role },
    });

    const { ...sanitized } = newUser as any;
    delete sanitized.passwordHash;

    res.status(201).json(sanitized);
  }
);

// Delete or Deactivate User
router.delete(
  '/:id',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'ORG_ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { id } = req.params;

    if (id === currentUser.id) {
      return res.status(400).json({ error: 'Cannot delete your own active account.' });
    }

    const targetUser = db.findById<User>('users', id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && targetUser.organizationId !== currentUser.organizationId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    db.delete('users', id);

    AuditService.log({
      organizationId: targetUser.organizationId,
      userId: currentUser.id,
      userEmail: currentUser.email,
      action: 'DELETE_USER',
      resourceType: 'USER',
      resourceId: id,
      details: { email: targetUser.email },
    });

    res.json({ success: true, message: 'User removed successfully.' });
  }
);

export default router;
