/**
 * XCLOUD.NET — Agent & POS Management Service
 * Auditable financial ledgers, agent wallet float balances, POS voucher sales & commission records.
 */

import { db } from '../db/database.ts';
import { Agent, LedgerEntry, HotspotPackage, Voucher } from '../../types/index.ts';
import { VoucherService } from './voucherService.ts';
import { AuditService } from './auditService.ts';

export class AgentService {
  /**
   * Adjust Agent Float Balance with an immutable Ledger Entry
   */
  public static adjustFloat(params: {
    organizationId: string;
    agentId: string;
    amount: number;
    type: 'FLOAT_CREDIT' | 'FLOAT_DEBIT' | 'COMMISSION_CREDIT' | 'VOUCHER_SALE' | 'PAYOUT';
    reference: string;
    description: string;
    performedBy: string;
  }): { agent: Agent; ledgerEntry: LedgerEntry } {
    const agent = db.findById<Agent>('agents', params.agentId);
    if (!agent || agent.organizationId !== params.organizationId) {
      throw new Error(`Agent with ID ${params.agentId} not found.`);
    }

    const balanceBefore = Number(agent.walletBalance);
    let balanceAfter = balanceBefore;

    if (params.type === 'FLOAT_CREDIT' || params.type === 'COMMISSION_CREDIT') {
      balanceAfter = balanceBefore + params.amount;
    } else if (params.type === 'FLOAT_DEBIT' || params.type === 'VOUCHER_SALE' || params.type === 'PAYOUT') {
      if (balanceBefore < params.amount) {
        throw new Error(
          `Insufficient agent wallet float. Required: TZS ${params.amount.toLocaleString()}, Available: TZS ${balanceBefore.toLocaleString()}`
        );
      }
      balanceAfter = balanceBefore - params.amount;
    }

    // 1. Create immutable ledger entry
    const ledgerEntry: LedgerEntry = {
      id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: params.organizationId,
      agentId: agent.id,
      type: params.type,
      amount: params.amount,
      balanceBefore,
      balanceAfter,
      reference: params.reference,
      description: params.description,
      performedBy: params.performedBy,
      createdAt: new Date().toISOString(),
    };
    db.insert('ledger_entries', ledgerEntry);

    // 2. Update agent wallet balance
    const updatedAgent = db.update<Agent>('agents', agent.id, {
      walletBalance: balanceAfter,
    })!;

    return { agent: updatedAgent, ledgerEntry };
  }

  /**
   * Agent sells voucher via Point-of-Sale (POS)
   */
  public static sellVoucherPOS(params: {
    organizationId: string;
    agentId: string;
    packageId: string;
    customerPhone?: string;
  }): { voucher: Voucher; agent: Agent; commissionEarned: number } {
    const agent = db.findById<Agent>('agents', params.agentId);
    if (!agent || agent.organizationId !== params.organizationId) {
      throw new Error('Agent not found.');
    }

    const pkg = db.findById<HotspotPackage>('hotspot_packages', params.packageId);
    if (!pkg) {
      throw new Error('Selected package not found.');
    }

    const voucherPrice = pkg.price;
    const commissionRate = agent.commissionRatePercent / 100;
    const commissionEarned = Math.round(voucherPrice * commissionRate);
    const netDeduction = voucherPrice - commissionEarned;

    // Check float
    if (agent.walletBalance < netDeduction) {
      throw new Error(
        `Insufficient float. Balance: TZS ${agent.walletBalance.toLocaleString()}, Net needed: TZS ${netDeduction.toLocaleString()}`
      );
    }

    // 1. Deduct net amount from float and record ledger
    const ref = `POS-SALE-${Date.now()}-${agent.id.slice(-4)}`;
    this.adjustFloat({
      organizationId: params.organizationId,
      agentId: agent.id,
      amount: netDeduction,
      type: 'VOUCHER_SALE',
      reference: ref,
      description: `POS Sale: ${pkg.name} (Price: TZS ${voucherPrice}, Commission: TZS ${commissionEarned})`,
      performedBy: agent.userId || agent.id,
    });

    // 2. Track total commission earned
    db.update('agents', agent.id, {
      totalCommissionEarned: (agent.totalCommissionEarned || 0) + commissionEarned,
    });

    // 3. Generate active voucher
    const voucher = VoucherService.createSingleVoucher({
      organizationId: params.organizationId,
      packageId: params.packageId,
      customerPhone: params.customerPhone,
      soldByAgentId: agent.id,
    });

    AuditService.log({
      organizationId: params.organizationId,
      userId: agent.userId || agent.id,
      userEmail: agent.name,
      action: 'POS_VOUCHER_SALE',
      resourceType: 'VOUCHER',
      resourceId: voucher.id,
      details: {
        agentId: agent.id,
        voucherCode: voucher.code,
        price: voucherPrice,
        commissionEarned,
      },
    });

    const refreshedAgent = db.findById<Agent>('agents', agent.id)!;
    return { voucher, agent: refreshedAgent, commissionEarned };
  }
}
