import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api.ts';
import { PaymentTransaction, PaymentMethod, PaymentType } from '../types/index.ts';
import {
  DollarSign,
  Plus,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Download,
} from 'lucide-react';

interface PaymentsViewProps {
  transactions: PaymentTransaction[];
  onRefresh: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ transactions, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending_review' | 'manual_record'>('all');
  const [gatewayConfig, setGatewayConfig] = useState<any | null>(null);

  // Manual payment form fields
  const [amount, setAmount] = useState(1000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentType, setPaymentType] = useState<PaymentType>('HOTSPOT_PACKAGE');
  const [providerReference, setProviderReference] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ApiClient.get('/api/v1/payments/gateway-config')
      .then(setGatewayConfig)
      .catch(console.error);
  }, []);

  const pendingReview = transactions.filter((t) => t.status === 'PENDING_VERIFICATION');

  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ApiClient.post('/api/v1/payments/manual', {
        amount,
        paymentMethod,
        paymentType,
        providerReference,
        customerPhone,
        customerName,
        notes,
      });
      alert('Manual payment recorded successfully! It is now pending reviewer verification.');
      setActiveTab('pending_review');
      setProviderReference('');
      onRefresh();
    } catch (err: any) {
      alert(`Error recording manual payment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (id: string, approved: boolean) => {
    const reason = !approved ? prompt('Please enter reason for rejection:') || 'Rejected' : undefined;
    if (!approved && !reason) return;

    try {
      const res = await ApiClient.post(`/api/v1/payments/manual/${id}/verify`, {
        approved,
        rejectionReason: reason,
      });
      alert(
        approved
          ? `Payment verified and approved! ${
              res.voucherCode ? `Created voucher: ${res.voucherCode}` : 'Activated service.'
            }`
          : 'Payment rejected.'
      );
      onRefresh();
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    }
  };

  const exportCSV = () => {
    const headers = ['Reference', 'ProviderRef', 'Type', 'Amount', 'Currency', 'Method', 'Status', 'Date'];
    const rows = transactions.map((t) => [
      t.reference,
      t.providerReference || '',
      t.paymentType,
      t.amount,
      t.currency,
      t.paymentMethod,
      t.status,
      new Date(t.createdAt).toISOString(),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `xcloud_payments_${Date.now()}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" /> Billing, Payments &amp; Manual Approvals
          </h2>
          <p className="text-xs text-slate-400">
            Real-time Tanzania payment gateway integration + staff manual cash/mobile-money review workflow
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => setActiveTab('manual_record')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record Manual Payment
          </button>
        </div>
      </div>

      {/* Gateway Configuration Alert */}
      {gatewayConfig && !gatewayConfig.isConfigured && (
        <div className="p-4 bg-amber-950/40 border border-amber-600/40 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">
              Payment Gateway Setup Required for Live Mobile Money
            </span>
            <p className="text-amber-300/80">
              Provider: {gatewayConfig.provider}. Credentials (
              {gatewayConfig.missingCredentials.join(', ')}) are unconfigured in server environment
              variables. You can still use the reviewer-backed manual cash/mobile-money approval workflow or test sandbox callbacks.
            </p>
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Transactions ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('pending_review')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pending_review'
              ? 'bg-amber-950 text-amber-400 border border-amber-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Pending Reviewer Queue ({pendingReview.length})
        </button>
        <button
          onClick={() => setActiveTab('manual_record')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'manual_record'
              ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> Record Cash / Slip
        </button>
      </div>

      {/* TAB 1: ALL TRANSACTIONS */}
      {activeTab === 'all' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Internal Ref</th>
                  <th className="py-3 px-4">Provider Ref</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-mono font-bold text-white">{t.reference}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {t.providerReference || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.paymentType === 'PLATFORM_SUBSCRIPTION'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {t.paymentType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      TZS {t.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-semibold">{t.paymentMethod}</td>
                    <td className="py-3 px-4 text-slate-400">{t.customerPhone || 'Walk-in'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : t.status === 'PENDING_VERIFICATION'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING REVIEWER QUEUE */}
      {activeTab === 'pending_review' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-amber-950/20">
            <h3 className="text-sm font-bold text-amber-200">
              Manual Payments Awaiting Reviewer Approval
            </h3>
            <p className="text-xs text-slate-400">
              Review cash or mobile money codes before activating vouchers or subscriptions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Ref Code</th>
                  <th className="py-3 px-4">Target Purpose</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4 text-right">Reviewer Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {pendingReview.map((t) => (
                  <tr key={t.id}>
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">
                      {t.providerReference}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {t.paymentType.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      TZS {t.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{t.paymentMethod}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {t.metadata?.recordedByEmail || 'Staff'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleReviewAction(t.id, true)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition cursor-pointer"
                      >
                        Approve &amp; Activate
                      </button>
                      <button
                        onClick={() => handleReviewAction(t.id, false)}
                        className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded text-xs transition cursor-pointer"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingReview.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No payments currently pending verification.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RECORD MANUAL PAYMENT FORM */}
      {activeTab === 'manual_record' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl">
          <h3 className="text-base font-bold text-white mb-1">Record Customer Manual Payment</h3>
          <p className="text-xs text-slate-400 mb-4">
            Authorized staff can record cash payments or external mobile money transfers. Enters
            reviewer verification.
          </p>

          <form onSubmit={handleRecordManualPayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Amount (TZS)
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="CASH">Physical Cash</option>
                  <option value="MPESA">M-Pesa SMS Code</option>
                  <option value="TIGO_PESA">Tigo Pesa SMS Code</option>
                  <option value="AIRTEL_MONEY">Airtel Money SMS Code</option>
                  <option value="HALOPESA">Halopesa SMS Code</option>
                  <option value="BANK_TRANSFER">Bank Deposit / Slip</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Payment Target / Purpose
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="HOTSPOT_PACKAGE">Hotspot Customer Package</option>
                  <option value="PLATFORM_SUBSCRIPTION">Platform Subscription (TSh 7,000)</option>
                  <option value="AGENT_FLOAT_TOPUP">Agent Float Top-Up</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Reference / SMS / Slip #
                </label>
                <input
                  type="text"
                  required
                  value={providerReference}
                  onChange={(e) => setProviderReference(e.target.value)}
                  placeholder="e.g. 9F8A72B3C"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Customer Phone
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+255710000000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Hassan Bakari"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit for Reviewer Approval'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
