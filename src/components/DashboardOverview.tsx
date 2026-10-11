import React from 'react';
import {
  CreditCard,
  Wifi,
  Radio,
  Ticket,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { PaymentTransaction } from '../types/index.ts';

interface DashboardOverviewProps {
  summary: {
    totalHotspotRevenueTZS: number;
    voucherStats: { total: number; active: number; used: number };
    routerStats: { total: number; online: number; offline: number; deviceLimit: number };
    activeSessionsCount: number;
    subscription: { status: string; daysRemaining: number; isInGracePeriod: boolean };
  } | null;
  recentTransactions: PaymentTransaction[];
  onNavigate: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  summary,
  recentTransactions,
  onNavigate,
}) => {
  const subStatus = summary?.subscription.status || 'ACTIVE';
  const isInGrace = summary?.subscription.isInGracePeriod;

  return (
    <div className="space-y-6">
      {/* Grace period / Expired Alert */}
      {isInGrace && (
        <div className="p-4 bg-amber-950/40 border border-amber-600/50 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                Platform Subscription in Grace Period
              </h4>
              <p className="text-xs text-amber-300/80">
                Your monthly TSh 7,000 ISP platform plan is due. Physical routers remain connected,
                but please renew to prevent management lockout.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('subscription')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Renew Now
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hotspot Customer Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Hotspot Customer Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            TZS {(summary?.totalHotspotRevenueTZS || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Direct collections from wifi packages
          </p>
        </div>

        {/* Platform Monthly Plan */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Platform Subscription
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">TSh 7,000 / mo</div>
          <div className="flex items-center justify-between mt-1 text-xs">
            <span
              className={`font-semibold ${
                subStatus === 'ACTIVE'
                  ? 'text-emerald-400'
                  : subStatus === 'GRACE_PERIOD'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              Status: {subStatus}
            </span>
            <span className="text-slate-400">{summary?.subscription.daysRemaining} days left</span>
          </div>
        </div>

        {/* Routers & Device Limit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Registered Routers
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white flex items-baseline gap-2">
            <span>{summary?.routerStats.total || 0}</span>
            <span className="text-sm font-medium text-slate-500">
              / {summary?.routerStats.deviceLimit || 5} limit
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-sky-500 h-1.5 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  ((summary?.routerStats.total || 0) / (summary?.routerStats.deviceLimit || 5)) * 100
                )}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary?.routerStats.online || 0} Online &bull;{' '}
            {(summary?.routerStats.total || 0) - (summary?.routerStats.online || 0)} Offline
          </p>
        </div>

        {/* Live Active Sessions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active RADIUS Sessions
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {summary?.activeSessionsCount || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary?.voucherStats.active || 0} Vouchers Ready &bull;{' '}
            {summary?.voucherStats.used || 0} Used
          </p>
        </div>
      </div>

      {/* Fast Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('vouchers')}
          className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-left transition flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Generate Vouchers</div>
              <div className="text-[10px] text-slate-400">Single or bulk codes</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
        </button>

        <button
          onClick={() => onNavigate('routers')}
          className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-left transition flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">MikroTik Script</div>
              <div className="text-[10px] text-slate-400">One-click ROS v7 setup</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
        </button>

        <button
          onClick={() => onNavigate('agents')}
          className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-left transition flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">POS Terminal</div>
              <div className="text-[10px] text-slate-400">Sell voucher from float</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
        </button>

        <button
          onClick={() => onNavigate('subscription')}
          className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-left transition flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Platform Billing</div>
              <div className="text-[10px] text-slate-400">Invoices &amp; Selcom pay</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
        </button>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Recent Financial Transactions</h3>
            <p className="text-xs text-slate-400">
              Clear distinction between Platform Subscriptions and Hotspot Customer purchases
            </p>
          </div>
          <button
            onClick={() => onNavigate('payments')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            View All Billing <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {recentTransactions.slice(0, 5).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-850/50">
                  <td className="py-3 px-4 font-mono font-medium text-white">{tx.reference}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.paymentType === 'PLATFORM_SUBSCRIPTION'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : tx.paymentType === 'HOTSPOT_PACKAGE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {tx.paymentType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-white">
                    TZS {tx.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-400">{tx.paymentMethod}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'COMPLETED'
                          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                          : tx.status === 'PENDING_VERIFICATION'
                          ? 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No transactions recorded yet.
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
