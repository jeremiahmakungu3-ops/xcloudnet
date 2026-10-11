/**
 * XCLOUD.NET — Hotspot Package & Voucher Management Service
 * Generates single/bulk vouchers, processes captive portal redemption, tracks usage.
 */

import crypto from 'crypto';
import { db } from '../db/database.ts';
import { HotspotPackage, Voucher, VoucherStatus, HotspotSession } from '../../types/index.ts';
import { AuditService } from './auditService.ts';

export class VoucherService {
  /**
   * Helper to format random voucher codes like "XC-7821-4902"
   */
  public static generateCode(prefix: string = 'XC'): string {
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${part1}-${part2}`;
  }

  /**
   * Create a single voucher
   */
  public static createSingleVoucher(params: {
    organizationId: string;
    packageId: string;
    customerPhone?: string;
    soldByAgentId?: string;
    transactionId?: string;
  }): Voucher {
    const pkg = db.findById<HotspotPackage>('hotspot_packages', params.packageId);
    if (!pkg) {
      throw new Error(`Package with ID ${params.packageId} not found.`);
    }

    const code = this.generateCode();

    const voucher: Voucher = {
      id: `vch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: params.organizationId,
      packageId: params.packageId,
      code,
      status: 'ACTIVE',
      price: pkg.price,
      customerPhone: params.customerPhone,
      soldByAgentId: params.soldByAgentId,
      transactionId: params.transactionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.insert('vouchers', voucher);
    return voucher;
  }

  /**
   * Bulk voucher generation (e.g. 5, 20, 50 vouchers for an event, kiosk or physical sales)
   */
  public static generateBulkVouchers(params: {
    organizationId: string;
    packageId: string;
    count: number;
    prefix?: string;
    performedBy: { id: string; email: string };
  }): Voucher[] {
    const pkg = db.findById<HotspotPackage>('hotspot_packages', params.packageId);
    if (!pkg) {
      throw new Error(`Package with ID ${params.packageId} not found.`);
    }

    if (params.count <= 0 || params.count > 500) {
      throw new Error('Bulk voucher count must be between 1 and 500 per request.');
    }

    const batchId = `batch_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const prefix = params.prefix || 'XC';
    const vouchers: Voucher[] = [];

    for (let i = 0; i < params.count; i++) {
      const code = this.generateCode(prefix);
      const voucher: Voucher = {
        id: `vch_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        organizationId: params.organizationId,
        packageId: params.packageId,
        code,
        batchId,
        status: 'ACTIVE',
        price: pkg.price,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.insert('vouchers', voucher);
      vouchers.push(voucher);
    }

    AuditService.log({
      organizationId: params.organizationId,
      userId: params.performedBy.id,
      userEmail: params.performedBy.email,
      action: 'BULK_GENERATE_VOUCHERS',
      resourceType: 'VOUCHER_BATCH',
      resourceId: batchId,
      details: {
        packageId: params.packageId,
        packageName: pkg.name,
        count: params.count,
        pricePerVoucher: pkg.price,
      },
    });

    return vouchers;
  }

  /**
   * Redeem a voucher at the Captive Portal / Hotspot Gateway
   */
  public static redeemVoucher(params: {
    code: string;
    macAddress: string;
    ipAddress: string;
    routerId?: string;
  }): {
    success: boolean;
    voucher: Voucher;
    package: HotspotPackage;
    session: HotspotSession;
    sessionTimeoutSeconds: number;
    rateLimitString: string;
  } {
    const cleanCode = params.code.trim().toUpperCase();

    // Look for voucher by code
    const voucher = db.findOne<Voucher>(
      'vouchers',
      (v) => v.code.toUpperCase() === cleanCode
    );

    if (!voucher) {
      throw new Error(`Voucher '${params.code}' is invalid or does not exist.`);
    }

    if (voucher.status === 'REVOKED') {
      throw new Error('This voucher has been revoked by the administrator.');
    }

    if (voucher.status === 'EXPIRED') {
      throw new Error('This voucher has expired and can no longer be used.');
    }

    const pkg = db.findById<HotspotPackage>('hotspot_packages', voucher.packageId);
    if (!pkg) {
      throw new Error('Package associated with this voucher is missing.');
    }

    const now = new Date();

    // If voucher was previously used, check if it's within duration window
    if (voucher.status === 'USED' && voucher.expiresAt) {
      const expiresAt = new Date(voucher.expiresAt);
      if (now > expiresAt) {
        db.update('vouchers', voucher.id, { status: 'EXPIRED' });
        throw new Error('This voucher session has expired.');
      }
      // Re-connection for the same device / session
    }

    // First time redemption
    if (voucher.status === 'ACTIVE') {
      const durationMs = pkg.durationMinutes * 60 * 1000;
      const expiresAt = new Date(now.getTime() + durationMs);

      db.update('vouchers', voucher.id, {
        status: 'USED',
        activatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        usedByMac: params.macAddress,
        usedByIp: params.ipAddress,
      });

      voucher.status = 'USED';
      voucher.activatedAt = now.toISOString();
      voucher.expiresAt = expiresAt.toISOString();
    }

    // Determine router
    const defaultRouter = db.findOne('routers', (r) => r.organizationId === voucher.organizationId);
    const routerId = params.routerId || defaultRouter?.id || 'router_default';

    // Create or update hotspot session
    const session: HotspotSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: voucher.organizationId,
      routerId,
      voucherCode: voucher.code,
      username: voucher.code,
      ipAddress: params.ipAddress,
      macAddress: params.macAddress,
      startedAt: now.toISOString(),
      lastAccountingAt: now.toISOString(),
      bytesIn: 0,
      bytesOut: 0,
      sessionTimeSeconds: 0,
      isActive: true,
    };
    db.insert('hotspot_sessions', session);

    // MikroTik rate limit format: "upload/download" e.g. "2048k/4096k"
    const rateLimitString = `${pkg.uploadSpeedKbps}k/${pkg.downloadSpeedKbps}k`;
    const sessionTimeoutSeconds = pkg.durationMinutes * 60;

    return {
      success: true,
      voucher,
      package: pkg,
      session,
      sessionTimeoutSeconds,
      rateLimitString,
    };
  }

  /**
   * Revoke a voucher
   */
  public static revokeVoucher(
    voucherId: string,
    adminUser: { id: string; email: string; organizationId: string }
  ): Voucher {
    const voucher = db.findById<Voucher>('vouchers', voucherId);
    if (!voucher) throw new Error('Voucher not found.');

    const updated = db.update<Voucher>('vouchers', voucher.id, { status: 'REVOKED' });
    if (!updated) throw new Error('Failed to revoke voucher.');

    AuditService.log({
      organizationId: voucher.organizationId,
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: 'REVOKE_VOUCHER',
      resourceType: 'VOUCHER',
      resourceId: voucher.id,
      details: { code: voucher.code },
    });

    return updated;
  }
}
