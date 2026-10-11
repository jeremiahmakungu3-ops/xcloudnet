/**
 * XCLOUD.NET — Audit Logging Service
 * Records all system-critical operations, financial approvals, and router changes.
 */

import { db } from '../db/database.ts';
import { AuditLog } from '../../types/index.ts';

export class AuditService {
  public static log(params: {
    organizationId: string;
    userId: string;
    userEmail: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
  }): AuditLog {
    const entry: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: params.organizationId,
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      details: params.details || {},
      ipAddress: params.ipAddress || '127.0.0.1',
      createdAt: new Date().toISOString(),
    };

    db.insert('audit_logs', entry);
    return entry;
  }

  public static getLogs(organizationId?: string, limit: number = 100): AuditLog[] {
    let logs = db.getCollection<AuditLog>('audit_logs');
    if (organizationId) {
      logs = logs.filter((l) => l.organizationId === organizationId);
    }
    return logs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}
