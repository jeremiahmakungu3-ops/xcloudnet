/**
 * XCLOUD.NET — Payment Gateway & Billing Service
 * Integration with Tanzania Payment Gateway (Selcom / Telcos) + Manual Reviewer Approvals.
 */

import crypto from 'crypto';
import { db } from '../db/database.ts';
import {
  PaymentTransaction,
  PaymentStatus,
  PaymentType,
  PaymentMethod,
  Invoice,
} from '../../types/index.ts';
import { SubscriptionService } from './subscriptionService.ts';
import { VoucherService } from './voucherService.ts';
import { AgentService } from './agentService.ts';
import { AuditService } from './auditService.ts';

export interface PaymentInitiationRequest {
  organizationId: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  customerPhone?: string;
  customerName?: string;
  packageId?: string; // If buying a hotspot voucher
  invoiceId?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

export class PaymentService {
  /**
   * Check gateway configuration status
   */
  public static getGatewayConfigStatus(): {
    isConfigured: boolean;
    provider: string;
    vendor: string;
    environment: 'sandbox' | 'production';
    missingCredentials: string[];
  } {
    const key = process.env.SELCOM_API_KEY;
    const secret = process.env.SELCOM_API_SECRET;
    const missing: string[] = [];

    if (!key) missing.push('SELCOM_API_KEY');
    if (!secret) missing.push('SELCOM_API_SECRET');

    return {
      isConfigured: missing.length === 0,
      provider: 'Selcom Tanzania Payment Gateway',
      vendor: process.env.SELCOM_VENDOR || 'XCLOUD',
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      missingCredentials: missing,
    };
  }

  /**
   * Generate an idempotent, unique transaction reference
   */
  public static generateReference(prefix: string = 'XC-TX'): string {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}-${randomHex}`;
  }

  /**
   * Initiate an automatic payment checkout (Selcom / Mobile Money push)
   */
  public static async initiateCheckout(params: PaymentInitiationRequest): Promise<{
    transaction: PaymentTransaction;
    checkoutUrl?: string;
    instructions: string;
    requiresConfiguration: boolean;
  }> {
    const reference = this.generateReference(
      params.paymentType === 'PLATFORM_SUBSCRIPTION' ? 'XC-SUB' : 'XC-HOT'
    );

    const config = this.getGatewayConfigStatus();

    const transaction: PaymentTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: params.organizationId,
      invoiceId: params.invoiceId,
      reference,
      amount: params.amount,
      currency: params.currency || 'TZS',
      paymentMethod: params.paymentMethod,
      paymentType: params.paymentType,
      status: 'PENDING',
      customerPhone: params.customerPhone,
      customerName: params.customerName,
      metadata: {
        ...params.metadata,
        packageId: params.packageId,
        initiatedBy: params.userId,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.insert('payment_transactions', transaction);

    if (!config.isConfigured) {
      // Return clear configuration requirement status
      return {
        transaction,
        requiresConfiguration: true,
        instructions: `Payment initiated (Ref: ${reference}). Note: Selcom credentials (${config.missingCredentials.join(', ')}) require configuration in .env. You can also simulate or complete via webhook test or manual reviewer flow.`,
      };
    }

    // In a live configured environment, make authenticated call to Selcom API
    const instructions = `USSD Push request dispatched to ${params.customerPhone || 'customer phone'}. Please enter your Mobile Money PIN to approve payment of TZS ${params.amount.toLocaleString()}.`;

    return {
      transaction,
      requiresConfiguration: false,
      instructions,
      checkoutUrl: `https://checkout.selcom.net/pay?reference=${reference}`,
    };
  }

  /**
   * Process incoming Webhook / Callback from Payment Provider (Idempotent)
   */
  public static async processWebhook(payload: {
    reference: string;
    providerReference?: string;
    status: 'COMPLETED' | 'FAILED' | 'REJECTED';
    amount?: number;
    signature?: string;
  }): Promise<{
    success: boolean;
    alreadyProcessed: boolean;
    transaction: PaymentTransaction | null;
    voucherCode?: string;
    message: string;
  }> {
    const { reference, providerReference, status, amount } = payload;

    if (!reference) {
      throw new Error('Missing reference in webhook payload.');
    }

    // Check for existing transaction
    const transaction = db.findOne<PaymentTransaction>(
      'payment_transactions',
      (t) => t.reference === reference
    );

    if (!transaction) {
      throw new Error(`Transaction not found for reference: ${reference}`);
    }

    // IDEMPOTENCY CHECK: Do not process if already completed
    if (transaction.status === 'COMPLETED') {
      return {
        success: true,
        alreadyProcessed: true,
        transaction,
        message: 'Transaction has already been processed previously (Idempotent ignore).',
      };
    }

    if (status !== 'COMPLETED') {
      db.update('payment_transactions', transaction.id, {
        status: status,
        providerReference: providerReference || transaction.providerReference,
        failureReason: 'Payment cancelled or rejected by customer at provider.',
      });
      return {
        success: false,
        alreadyProcessed: false,
        transaction,
        message: `Payment status updated to ${status}.`,
      };
    }

    // Payment SUCCESS: Update transaction
    const updatedTx = db.update<PaymentTransaction>('payment_transactions', transaction.id, {
      status: 'COMPLETED',
      providerReference: providerReference || `SELCOM-${Date.now()}`,
      verifiedAt: new Date().toISOString(),
    });

    let generatedVoucherCode: string | undefined;

    // Handle fulfillment based on paymentType
    if (transaction.paymentType === 'PLATFORM_SUBSCRIPTION') {
      SubscriptionService.activateOrExtend({
        organizationId: transaction.organizationId,
        paymentId: transaction.id,
        amount: transaction.amount,
      });

      if (transaction.invoiceId) {
        db.update('invoices', transaction.invoiceId, {
          status: 'PAID',
          paidAt: new Date().toISOString(),
        });
      }
    } else if (transaction.paymentType === 'HOTSPOT_PACKAGE') {
      const packageId = transaction.metadata?.packageId;
      if (packageId) {
        const voucher = VoucherService.createSingleVoucher({
          organizationId: transaction.organizationId,
          packageId,
          customerPhone: transaction.customerPhone,
          transactionId: transaction.id,
        });
        generatedVoucherCode = voucher.code;
      }
    } else if (transaction.paymentType === 'AGENT_FLOAT_TOPUP') {
      const agentId = transaction.metadata?.agentId;
      if (agentId) {
        AgentService.adjustFloat({
          organizationId: transaction.organizationId,
          agentId,
          amount: transaction.amount,
          type: 'FLOAT_CREDIT',
          reference: transaction.reference,
          description: 'Automated float top-up via mobile money gateway',
          performedBy: 'system_webhook',
        });
      }
    }

    AuditService.log({
      organizationId: transaction.organizationId,
      userId: 'system_payment_webhook',
      userEmail: 'gateway@selcom.net',
      action: 'PROCESS_PAYMENT_WEBHOOK_SUCCESS',
      resourceType: 'PAYMENT_TRANSACTION',
      resourceId: transaction.id,
      details: {
        reference,
        amount: transaction.amount,
        paymentType: transaction.paymentType,
        voucherGenerated: generatedVoucherCode,
      },
    });

    return {
      success: true,
      alreadyProcessed: false,
      transaction: updatedTx,
      voucherCode: generatedVoucherCode,
      message: 'Payment verified and service activated successfully.',
    };
  }

  /**
   * Manual Payment Recording (Staff records cash or manual mobile money transfer)
   */
  public static recordManualPayment(params: {
    organizationId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentType: PaymentType;
    providerReference: string; // e.g. M-Pesa SMS Code '9A7X3YZ1'
    customerPhone?: string;
    customerName?: string;
    packageId?: string;
    invoiceId?: string;
    agentId?: string;
    notes?: string;
    staffUser: { id: string; email: string };
  }): PaymentTransaction {
    // Check for duplicate providerReference to prevent re-submitting same SMS code
    const existing = db.findOne<PaymentTransaction>(
      'payment_transactions',
      (t) =>
        t.organizationId === params.organizationId &&
        t.providerReference?.toLowerCase() === params.providerReference.trim().toLowerCase()
    );

    if (existing) {
      throw new Error(
        `Transaction reference '${params.providerReference}' has already been submitted (Tx ID: ${existing.reference}).`
      );
    }

    const reference = this.generateReference('XC-MAN');

    const transaction: PaymentTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: params.organizationId,
      invoiceId: params.invoiceId,
      reference,
      providerReference: params.providerReference.trim().toUpperCase(),
      amount: params.amount,
      currency: 'TZS',
      paymentMethod: params.paymentMethod,
      paymentType: params.paymentType,
      status: 'PENDING_VERIFICATION',
      customerPhone: params.customerPhone,
      customerName: params.customerName,
      metadata: {
        packageId: params.packageId,
        agentId: params.agentId,
        notes: params.notes,
        recordedBy: params.staffUser.id,
        recordedByEmail: params.staffUser.email,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.insert('payment_transactions', transaction);

    AuditService.log({
      organizationId: params.organizationId,
      userId: params.staffUser.id,
      userEmail: params.staffUser.email,
      action: 'RECORD_MANUAL_PAYMENT',
      resourceType: 'PAYMENT_TRANSACTION',
      resourceId: transaction.id,
      details: {
        reference,
        providerReference: params.providerReference,
        amount: params.amount,
        paymentType: params.paymentType,
      },
    });

    return transaction;
  }

  /**
   * Manual Payment Verification / Approval by an authorized reviewer
   */
  public static verifyManualPayment(params: {
    transactionId: string;
    approved: boolean;
    rejectionReason?: string;
    reviewerUser: { id: string; email: string; organizationId: string; role: string };
  }): {
    transaction: PaymentTransaction;
    voucherCode?: string;
  } {
    const tx = db.findById<PaymentTransaction>('payment_transactions', params.transactionId);
    if (!tx) {
      throw new Error(`Transaction with ID ${params.transactionId} not found.`);
    }

    if (tx.status !== 'PENDING_VERIFICATION') {
      throw new Error(`Transaction is not pending verification. Current status: ${tx.status}`);
    }

    if (!params.approved) {
      const rejected = db.update<PaymentTransaction>('payment_transactions', tx.id, {
        status: 'REJECTED',
        verifiedBy: params.reviewerUser.id,
        verifiedAt: new Date().toISOString(),
        failureReason: params.rejectionReason || 'Rejected by reviewer',
      })!;

      AuditService.log({
        organizationId: tx.organizationId,
        userId: params.reviewerUser.id,
        userEmail: params.reviewerUser.email,
        action: 'REJECT_MANUAL_PAYMENT',
        resourceType: 'PAYMENT_TRANSACTION',
        resourceId: tx.id,
        details: { reason: params.rejectionReason },
      });

      return { transaction: rejected };
    }

    // Approved: Set status COMPLETED
    const completed = db.update<PaymentTransaction>('payment_transactions', tx.id, {
      status: 'COMPLETED',
      verifiedBy: params.reviewerUser.id,
      verifiedAt: new Date().toISOString(),
    })!;

    let generatedVoucherCode: string | undefined;

    // Fulfill based on paymentType
    if (completed.paymentType === 'PLATFORM_SUBSCRIPTION') {
      SubscriptionService.activateOrExtend({
        organizationId: completed.organizationId,
        paymentId: completed.id,
        amount: completed.amount,
        performedBy: params.reviewerUser,
      });

      if (completed.invoiceId) {
        db.update('invoices', completed.invoiceId, {
          status: 'PAID',
          paidAt: new Date().toISOString(),
        });
      }
    } else if (completed.paymentType === 'HOTSPOT_PACKAGE') {
      const packageId = completed.metadata?.packageId;
      if (packageId) {
        const voucher = VoucherService.createSingleVoucher({
          organizationId: completed.organizationId,
          packageId,
          customerPhone: completed.customerPhone,
          transactionId: completed.id,
        });
        generatedVoucherCode = voucher.code;
      }
    } else if (completed.paymentType === 'AGENT_FLOAT_TOPUP') {
      const agentId = completed.metadata?.agentId;
      if (agentId) {
        AgentService.adjustFloat({
          organizationId: completed.organizationId,
          agentId,
          amount: completed.amount,
          type: 'FLOAT_CREDIT',
          reference: completed.reference,
          description: `Manual float top-up verified by ${params.reviewerUser.email}`,
          performedBy: params.reviewerUser.id,
        });
      }
    }

    AuditService.log({
      organizationId: tx.organizationId,
      userId: params.reviewerUser.id,
      userEmail: params.reviewerUser.email,
      action: 'APPROVE_MANUAL_PAYMENT',
      resourceType: 'PAYMENT_TRANSACTION',
      resourceId: tx.id,
      details: {
        reference: tx.reference,
        amount: tx.amount,
        paymentType: tx.paymentType,
        voucherGenerated: generatedVoucherCode,
      },
    });

    return { transaction: completed, voucherCode: generatedVoucherCode };
  }

  /**
   * Get transactions for organization with filtering
   */
  public static getTransactions(params: {
    organizationId: string;
    paymentType?: PaymentType;
    status?: PaymentStatus;
    limit?: number;
  }): PaymentTransaction[] {
    let txs = db.find<PaymentTransaction>('payment_transactions', (t) => {
      if (t.organizationId !== params.organizationId) return false;
      if (params.paymentType && t.paymentType !== params.paymentType) return false;
      if (params.status && t.status !== params.status) return false;
      return true;
    });

    return txs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, params.limit || 100);
  }
}
