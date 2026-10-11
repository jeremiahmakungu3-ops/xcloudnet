import React, { useState } from 'react';
import { ApiClient } from '../lib/api.ts';
import { OrgSubscription, SubscriptionPlan, Invoice, PaymentTransaction } from '../types/index.ts';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Radio,
  FileText,
  Clock,
  ArrowRight,
  Phone,
} from 'lucide-react';

interface SubscriptionViewProps {
  subscription: OrgSubscription | null;
  plan: SubscriptionPlan | null;
  registeredDeviceCount: number;
  deviceLimit: number;
  invoices: Invoice[];
  payments: PaymentTransaction[];
  onRefresh: () => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  subscription,
  plan,
  registeredDeviceCount,
  deviceLimit,
  invoices,
  payments,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('+255710000111');
  const [method, setMethod] = useState<'SELCOM' | 'MPESA' | 'TIGO_PESA' | 'AIRTEL_MONEY' | 'CASH'>('SELCOM');
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const price = plan?.price || 7000;
  const status = subscription?.status || 'PENDING';
  const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const graceEnd = subscription?.gracePeriodEnd ? new Date(subscription.gracePeriodEnd) : null;
  const isGrace = status === 'GRACE_PERIOD';
  const isExpired = status === 'EXPIRED';

  const handleRenewCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCheckoutResult(null);

    try {
      const res = await ApiClient.post('/api/v1/subscription/checkout', {
        paymentMethod: method,
        customerPhone: phone,
      });
      setCheckoutResult(res);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate renewal checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateWebhook = async (reference: string) => {
    try {
      await ApiClient.post('/api/v1/payments/webhook', {
        reference,
        providerReference: `TEST-SELCOM-${Date.now()}`,
        status: 'COMPLETED',
      });
      alert('Payment confirmed and verified on backend! Subscription extended.');
      setCheckoutResult(null);
      onRefresh();
    } catch (e: any) {
      alert(`Webhook error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">XCLOUD Monthly Platform Subscription</h2>
        <p className="text-xs text-slate-400">
          Fixed ISP platform plan: TSh 7,000 per month for up to 5 registered routers/devices
        </p>
      </div>

      {/* Primary Plan Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Col 1: Status & Price */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Current Plan
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  status === 'ACTIVE'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                    : isGrace
                    ? 'bg-amber-950 text-amber-400 border-amber-700 animate-pulse'
                    : 'bg-rose-950 text-rose-400 border-rose-700'
                }`}
              >
                {status}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">TSh {price.toLocaleString()}</span>
              <span className="text-xs text-slate-400">/ 30 days</span>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Next Due: {periodEnd ? periodEnd.toLocaleDateString() : 'Immediate'}</span>
              </div>
              {isGrace && graceEnd && (
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Grace Period Ends: {graceEnd.toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Col 2: Device Limit Enforcement */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-sky-400" /> Router Device Limit
                </span>
                <span className="font-bold text-white">
                  {registeredDeviceCount} / {deviceLimit} Routers
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className={`h-2 rounded-full ${
                    registeredDeviceCount >= deviceLimit ? 'bg-amber-500' : 'bg-indigo-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (registeredDeviceCount / deviceLimit) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Default limit is 5 physical routers per organization. Super Admin can adjust device
                limits if needed.
              </p>
            </div>
          </div>

          {/* Col 3: Expiry Policy Assurance */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Safe Expiry Policy
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Even if your monthly subscription expires, your routers and connected hotspot
                customers will NOT be automatically disconnected. You retain uninterrupted access to
                renewals, invoices, support, and account management.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Renewal Checkout Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-1">Renew Platform Subscription</h3>
        <p className="text-xs text-slate-400 mb-4">
          Pay TSh 7,000 to extend your platform access by 30 days via Tanzania Mobile Money / Selcom
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-700 text-red-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleRenewCheckout} className="space-y-4 max-w-xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Payment Provider
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              >
                <option value="SELCOM">Selcom Gateway (USSD Push)</option>
                <option value="MPESA">Vodacom M-Pesa</option>
                <option value="TIGO_PESA">Tigo Pesa</option>
                <option value="AIRTEL_MONEY">Airtel Money</option>
                <option value="CASH">Bank Transfer / Cash Slip</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Customer Phone
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+255710000000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            {loading ? 'Initiating Checkout...' : 'Generate Invoice & Pay TSh 7,000'}
          </button>
        </form>

        {/* Checkout Feedback Box */}
        {checkoutResult && (
          <div className="mt-4 p-4 bg-slate-950 border border-indigo-700/50 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-300">
                Invoice Reference: {checkoutResult.transaction?.reference}
              </span>
              <span className="text-slate-400">
                Amount: TZS {checkoutResult.transaction?.amount.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-slate-300">{checkoutResult.instructions}</p>

            {checkoutResult.requiresConfiguration && (
              <div className="p-2 bg-amber-950/40 border border-amber-800 rounded text-[11px] text-amber-300">
                Provider credentials missing in .env (Selcom Gateway requires configuration). You can
                simulate immediate completion below:
              </div>
            )}

            <button
              onClick={() => handleSimulateWebhook(checkoutResult.transaction.reference)}
              className="mt-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded transition cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Confirm Payment &amp; Activate Plan
            </button>
          </div>
        )}
      </div>

      {/* Invoices List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" /> Platform Subscription Invoices
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-3 px-4 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 text-slate-400">{inv.description}</td>
                  <td className="py-3 px-4 font-bold text-white">TZS {inv.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(inv.dueDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No subscription invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
