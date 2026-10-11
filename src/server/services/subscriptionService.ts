/**
 * XCLOUD.NET — Platform Subscription Management Service
 * Controls monthly ISP platform subscriptions (TSh 7,000/mo, 5 devices limit)
 */

import { db } from '../db/database.ts';
import {
  OrgSubscription,
  SubscriptionPlan,
  Invoice,
  PaymentTransaction,
  SubscriptionStatus,
} from '../../types/index.ts';
import { AuditService } from './auditService.ts';

export class SubscriptionService {
  /**
   * Get the primary plan for ISP owners (TSh 7,000 / month, 5 devices)
   */
  public static getPrimaryPlan(): SubscriptionPlan {
    const plan = db.findOne<SubscriptionPlan>('subscription_plans', (p) => p.isActive);
    if (!plan) {
      throw new Error('Default subscription plan not configured.');
    }
    return plan;
  }

  /**
   * Get all available plans (Super Admin view / list)
   */
  public static getAllPlans(): SubscriptionPlan[] {
    return db.getCollection<SubscriptionPlan>('subscription_plans');
  }

  /**
   * Update plan settings (Super Admin only: price, device limit, grace period, duration)
   */
  public static updatePlan(
    planId: string,
    updates: Partial<SubscriptionPlan>,
    adminUser: { id: string; email: string; organizationId: string }
  ): SubscriptionPlan {
    const updated = db.update<SubscriptionPlan>('subscription_plans', planId, updates);
    if (!updated) {
      throw new Error(`Plan with ID ${planId} not found.`);
    }

    AuditService.log({
      organizationId: adminUser.organizationId,
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: 'UPDATE_SUBSCRIPTION_PLAN',
      resourceType: 'SUBSCRIPTION_PLAN',
      resourceId: planId,
      details: updates,
    });

    return updated;
  }

  /**
   * Get organization subscription details, updating status dynamically if expired
   */
  public static getOrgSubscription(organizationId: string): {
    subscription: OrgSubscription;
    plan: SubscriptionPlan;
    registeredDeviceCount: number;
    deviceLimit: number;
    canRegisterMoreDevices: boolean;
    daysRemaining: number;
    isInGracePeriod: boolean;
  } {
    let sub = db.findOne<OrgSubscription>(
      'org_subscriptions',
      (s) => s.organizationId === organizationId
    );

    const plan = this.getPrimaryPlan();

    if (!sub) {
      // Auto-create initial pending subscription if none exists
      const now = new Date();
      const periodEnd = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
      const graceEnd = new Date(periodEnd.getTime() + plan.gracePeriodDays * 24 * 60 * 60 * 1000);

      sub = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organizationId,
        planId: plan.id,
        status: 'PENDING',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        gracePeriodEnd: graceEnd.toISOString(),
        deviceLimit: plan.deviceLimit,
        autoRenew: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      db.insert('org_subscriptions', sub);
    }

    // Refresh dynamic status based on time
    const now = new Date();
    const periodEnd = new Date(sub.currentPeriodEnd);
    const graceEnd = new Date(sub.gracePeriodEnd);

    let calculatedStatus: SubscriptionStatus = sub.status;
    if (sub.status === 'ACTIVE' || sub.status === 'GRACE_PERIOD' || sub.status === 'PAST_DUE') {
      if (now > graceEnd) {
        calculatedStatus = 'EXPIRED';
      } else if (now > periodEnd) {
        calculatedStatus = 'GRACE_PERIOD';
      }
      if (calculatedStatus !== sub.status) {
        db.update('org_subscriptions', sub.id, { status: calculatedStatus });
        sub.status = calculatedStatus;
      }
    }

    // Count currently registered routers
    const routers = db.find('routers', (r) => r.organizationId === organizationId);
    const registeredDeviceCount = routers.length;
    const deviceLimit = sub.deviceLimit || plan.deviceLimit;
    const canRegisterMoreDevices = registeredDeviceCount < deviceLimit;

    const diffTime = periodEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const isInGracePeriod = sub.status === 'GRACE_PERIOD';

    return {
      subscription: sub,
      plan,
      registeredDeviceCount,
      deviceLimit,
      canRegisterMoreDevices,
      daysRemaining,
      isInGracePeriod,
    };
  }

  /**
   * Check whether organization can register another device
   */
  public static canAddDevice(organizationId: string): { allowed: boolean; reason?: string } {
    const { registeredDeviceCount, deviceLimit, subscription } =
      this.getOrgSubscription(organizationId);

    if (subscription.status === 'EXPIRED' || subscription.status === 'SUSPENDED') {
      return {
        allowed: false,
        reason: `Cannot register new routers while subscription is ${subscription.status}. Please renew your plan.`,
      };
    }

    if (registeredDeviceCount >= deviceLimit) {
      return {
        allowed: false,
        reason: `Device limit reached (${registeredDeviceCount}/${deviceLimit} routers registered). Upgrade your plan or contact support to increase limit.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Generate an invoice for platform renewal
   */
  public static createRenewalInvoice(organizationId: string): Invoice {
    const plan = this.getPrimaryPlan();
    const invoiceNumber = `INV-XCL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const invoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId,
      invoiceNumber,
      amount: plan.price,
      currency: plan.currency,
      status: 'PENDING',
      type: 'PLATFORM_SUBSCRIPTION',
      description: `Monthly XCLOUD Platform Subscription (${plan.durationDays} days - up to ${plan.deviceLimit} routers)`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    db.insert('invoices', invoice);
    return invoice;
  }

  /**
   * Activate or extend subscription after verified payment
   */
  public static activateOrExtend(params: {
    organizationId: string;
    paymentId: string;
    amount: number;
    days?: number;
    performedBy?: { id: string; email: string };
  }): OrgSubscription {
    const { subscription, plan } = this.getOrgSubscription(params.organizationId);
    const extensionDays = params.days || plan.durationDays;

    const now = new Date();
    let newStart = now;
    let currentEnd = new Date(subscription.currentPeriodEnd);

    // If current subscription is still active and has future end date, extend from current end
    if (subscription.status === 'ACTIVE' && currentEnd > now) {
      newStart = currentEnd;
    }

    const newEnd = new Date(newStart.getTime() + extensionDays * 24 * 60 * 60 * 1000);
    const newGraceEnd = new Date(newEnd.getTime() + plan.gracePeriodDays * 24 * 60 * 60 * 1000);

    const updated = db.update<OrgSubscription>('org_subscriptions', subscription.id, {
      status: 'ACTIVE',
      currentPeriodStart: (subscription.status === 'ACTIVE' ? new Date(subscription.currentPeriodStart) : now).toISOString(),
      currentPeriodEnd: newEnd.toISOString(),
      gracePeriodEnd: newGraceEnd.toISOString(),
      lastPaymentId: params.paymentId,
    });

    if (!updated) {
      throw new Error('Failed to update organization subscription.');
    }

    AuditService.log({
      organizationId: params.organizationId,
      userId: params.performedBy?.id || 'system_payment',
      userEmail: params.performedBy?.email || 'billing@xcloud.net',
      action: 'EXTEND_SUBSCRIPTION',
      resourceType: 'SUBSCRIPTION',
      resourceId: updated.id,
      details: {
        paymentId: params.paymentId,
        amount: params.amount,
        extendedDays: extensionDays,
        newPeriodEnd: newEnd.toISOString(),
      },
    });

    return updated;
  }

  /**
   * Super Admin manual extension (e.g. grace extension, promotional grant, bank transfer clearing)
   */
  public static manualAdminExtension(params: {
    organizationId: string;
    days: number;
    deviceLimit?: number;
    reason: string;
    adminUser: { id: string; email: string; organizationId: string };
  }): OrgSubscription {
    const { subscription, plan } = this.getOrgSubscription(params.organizationId);
    const now = new Date();
    const currentEnd = new Date(subscription.currentPeriodEnd);
    const baseDate = currentEnd > now ? currentEnd : now;

    const newEnd = new Date(baseDate.getTime() + params.days * 24 * 60 * 60 * 1000);
    const newGraceEnd = new Date(newEnd.getTime() + plan.gracePeriodDays * 24 * 60 * 60 * 1000);

    const updates: Partial<OrgSubscription> = {
      status: 'ACTIVE',
      currentPeriodEnd: newEnd.toISOString(),
      gracePeriodEnd: newGraceEnd.toISOString(),
    };

    if (params.deviceLimit !== undefined && params.deviceLimit > 0) {
      updates.deviceLimit = params.deviceLimit;
    }

    const updated = db.update<OrgSubscription>('org_subscriptions', subscription.id, updates);
    if (!updated) throw new Error('Could not apply manual extension.');

    AuditService.log({
      organizationId: params.organizationId,
      userId: params.adminUser.id,
      userEmail: params.adminUser.email,
      action: 'MANUAL_ADMIN_SUBSCRIPTION_EXTENSION',
      resourceType: 'SUBSCRIPTION',
      resourceId: updated.id,
      details: {
        daysAdded: params.days,
        deviceLimit: params.deviceLimit,
        reason: params.reason,
        newEnd: newEnd.toISOString(),
      },
    });

    return updated;
  }

  /**
   * Get all organization subscriptions with stats (Super Admin Overview)
   */
  public static getAdminSubscriptionOverview(): {
    subscriptions: (OrgSubscription & {
      organizationName: string;
      deviceCount: number;
    })[];
    totalActive: number;
    totalExpired: number;
    totalGracePeriod: number;
    monthlyPlatformRevenueTZS: number;
  } {
    const orgs = db.getCollection('organizations');
    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));
    const routers = db.getCollection('routers');

    const subs = db.getCollection<OrgSubscription>('org_subscriptions');

    let totalActive = 0;
    let totalExpired = 0;
    let totalGracePeriod = 0;
    let monthlyPlatformRevenueTZS = 0;

    const enriched = subs.map((sub) => {
      const devCount = routers.filter((r) => r.organizationId === sub.organizationId).length;
      if (sub.status === 'ACTIVE') totalActive++;
      else if (sub.status === 'EXPIRED') totalExpired++;
      else if (sub.status === 'GRACE_PERIOD') totalGracePeriod++;

      return {
        ...sub,
        organizationName: orgMap.get(sub.organizationId) || 'Unknown Organization',
        deviceCount: devCount,
      };
    });

    // Sum up completed platform subscription payments from the last 30 days
    const payments = db.find<PaymentTransaction>(
      'payment_transactions',
      (p) => p.paymentType === 'PLATFORM_SUBSCRIPTION' && p.status === 'COMPLETED'
    );
    monthlyPlatformRevenueTZS = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      subscriptions: enriched,
      totalActive,
      totalExpired,
      totalGracePeriod,
      monthlyPlatformRevenueTZS,
    };
  }
}
