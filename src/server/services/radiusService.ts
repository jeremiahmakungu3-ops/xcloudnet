/**
 * XCLOUD.NET — RADIUS & Hotspot AAA Engine
 * Authentication, Authorization & Accounting (AAA) for MikroTik, Omada, and Cisco gateways.
 */

import { db } from '../db/database.ts';
import { HotspotSession, Voucher, HotspotPackage } from '../../types/index.ts';

export class RadiusService {
  /**
   * Process RADIUS Access-Request
   */
  public static authenticateUser(params: {
    username: string; // usually the voucher code
    password?: string;
    macAddress: string;
    nasIpAddress: string;
  }): {
    authenticated: boolean;
    attributes: Record<string, any>;
    replyMessage?: string;
  } {
    const voucher = db.findOne<Voucher>(
      'vouchers',
      (v) => v.code.toUpperCase() === params.username.trim().toUpperCase()
    );

    if (!voucher) {
      return {
        authenticated: false,
        attributes: {},
        replyMessage: 'Invalid Voucher Code',
      };
    }

    if (voucher.status === 'REVOKED' || voucher.status === 'EXPIRED') {
      return {
        authenticated: false,
        attributes: {},
        replyMessage: `Voucher is ${voucher.status}`,
      };
    }

    const pkg = db.findById<HotspotPackage>('hotspot_packages', voucher.packageId);
    if (!pkg) {
      return { authenticated: false, attributes: {}, replyMessage: 'Package configuration error' };
    }

    // RADIUS Standard + MikroTik Vendor Specific Attributes (VSA)
    const attributes: Record<string, any> = {
      'Session-Timeout': pkg.durationMinutes * 60,
      'Idle-Timeout': 600, // 10 minutes
      'Mikrotik-Rate-Limit': `${pkg.uploadSpeedKbps}k/${pkg.downloadSpeedKbps}k`,
      'Mikrotik-Total-Limit': pkg.dataLimitMb ? pkg.dataLimitMb * 1024 * 1024 : 0,
      'Port-Limit': pkg.simultaneousDevices,
    };

    return {
      authenticated: true,
      attributes,
    };
  }

  /**
   * Get all active sessions for an organization
   */
  public static getActiveSessions(organizationId: string): HotspotSession[] {
    return db.find<HotspotSession>(
      'hotspot_sessions',
      (s) => s.organizationId === organizationId && s.isActive
    );
  }

  /**
   * Terminate / Disconnect session
   */
  public static disconnectSession(sessionId: string): boolean {
    const session = db.findById<HotspotSession>('hotspot_sessions', sessionId);
    if (!session) return false;

    db.update('hotspot_sessions', session.id, {
      isActive: false,
      endedAt: new Date().toISOString(),
      terminateCause: 'ADMIN_DISCONNECT_REQUEST',
    });

    return true;
  }
}
