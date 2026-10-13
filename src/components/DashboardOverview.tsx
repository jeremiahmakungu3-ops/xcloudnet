import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  Ticket,
  Link as LinkIcon,
  Activity,
  Users,
  Cpu,
  Database,
  Calendar,
  ChevronDown,
  Moon,
  ChevronRight,
  Radio,
  Laptop,
  Plus,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
  Globe,
  CreditCard,
  Layers,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  PaymentTransaction,
  Router as RouterModel,
  HotspotPackage,
  Voucher,
  HotspotSession,
  User,
  OrgSubscription,
} from '../types/index.ts';
import { DashboardWidget } from './DashboardWidget.tsx';
import { WinboxRemoteModal } from './WinboxRemoteModal.tsx';

interface OverviewDayData {
  day: string;
  fullDate: string;
  netRevenue: number;
  grossRevenue: number;
  commission: number;
  expense: number;
}

interface RecentSaleItem {
  id: string;
  code: string;
  type: string;
  timeAgo: string;
  amount: number;
  status: string;
}

interface DashboardOverviewProps {
  summary: {
    totalHotspotRevenueTZS: number;
    netSales?: number;
    vouchersSales?: number;
    mobileMoneySales?: number;
    accountCredit?: number;
    systemInsights?: {
      activeUsers: number;
      cpuLoad: number;
      dataUsageGb: number;
      isOnline: boolean;
    };
    overviewDays?: OverviewDayData[];
    recentSalesList?: RecentSaleItem[];
    voucherStats?: { total: number; active: number; used: number };
    routerStats?: { total: number; online: number; offline: number; deviceLimit?: number };
    activeSessionsCount?: number;
    subscription?: { status: string; daysRemaining: number; isInGracePeriod: boolean };
  } | null;
  recentTransactions: PaymentTransaction[];
  routers?: RouterModel[];
  packages?: HotspotPackage[];
  vouchers?: (Voucher & { package?: HotspotPackage })[];
  sessions?: HotspotSession[];
  currentUser?: User | null;
  subscription?: OrgSubscription | null;
  onNavigate: (tab: string) => void;
  onRefresh?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  summary,
  recentTransactions,
  routers = [],
  packages = [],
  vouchers = [],
  sessions = [],
  currentUser,
  subscription,
  onNavigate,
  onRefresh,
}) => {
  const [selectedRange, setSelectedRange] = useState('Oct 1, 2026 - Oct 6, 2026');
  const [activeFilter, setActiveFilter] = useState<'all' | 'totals'>('all');
  const [winboxRouter, setWinboxRouter] = useState<RouterModel | null>(null);

  // Chart data from summary or fallback matching exact UI specs
  const chartData: OverviewDayData[] = summary?.overviewDays || [
    { day: 'Oct 1', fullDate: 'Thu, October 1 2026', netRevenue: 10000, grossRevenue: 10000, commission: 0, expense: 0 },
    { day: 'Oct 2', fullDate: 'Fri, October 2 2026', netRevenue: 8500, grossRevenue: 8500, commission: 0, expense: 0 },
    { day: 'Oct 3', fullDate: 'Sat, October 3 2026', netRevenue: 12500, grossRevenue: 12500, commission: 0, expense: 0 },
    { day: 'Oct 4', fullDate: 'Sun, October 4 2026', netRevenue: 9500, grossRevenue: 9500, commission: 0, expense: 0 },
    { day: 'Oct 5', fullDate: 'Mon, October 5 2026', netRevenue: 11000, grossRevenue: 11000, commission: 0, expense: 0 },
    { day: 'Oct 6', fullDate: 'Tue, October 6 2026', netRevenue: 12000, grossRevenue: 12000, commission: 0, expense: 0 },
  ];

  // Recent sales matching transactions or fallback list
  const recentSales: RecentSaleItem[] =
    summary?.recentSalesList ||
    (recentTransactions && recentTransactions.length > 0
      ? recentTransactions.slice(0, 10).map((tx, idx) => ({
          id: tx.id || `sale_${idx}`,
          code: tx.metadata?.voucherCode || tx.reference || tx.id.slice(-8).toUpperCase(),
          type: tx.paymentMethod === 'CASH' ? 'Printed Voucher' : 'Mobile Money (Selcom)',
          timeAgo: 'Recently',
          amount: tx.amount,
          status: tx.status,
        }))
      : [
          { id: 'sale_1', code: '78972326', type: 'Printed Voucher', timeAgo: '2 hours ago', amount: 1000, status: 'COMPLETED' },
          { id: 'sale_2', code: '59576966', type: 'Printed Voucher', timeAgo: '8 hours ago', amount: 1000, status: 'COMPLETED' },
          { id: 'sale_3', code: '57369953', type: 'Printed Voucher', timeAgo: '8 hours ago', amount: 1000, status: 'COMPLETED' },
          { id: 'sale_4', code: '19285373', type: 'Printed Voucher', timeAgo: '12 hours ago', amount: 1000, status: 'COMPLETED' },
          { id: 'sale_5', code: '57883239', type: 'Printed Voucher', timeAgo: '14 hours ago', amount: 1000, status: 'COMPLETED' },
          { id: 'sale_6', code: '84920184', type: 'Printed Voucher', timeAgo: '16 hours ago', amount: 2000, status: 'COMPLETED' },
          { id: 'sale_7', code: '31948201', type: 'Printed Voucher', timeAgo: '18 hours ago', amount: 500, status: 'COMPLETED' },
          { id: 'sale_8', code: '62948172', type: 'Printed Voucher', timeAgo: '1 day ago', amount: 1000, status: 'COMPLETED' },
          { id: 'sale_9', code: '91823849', type: 'Printed Voucher', timeAgo: '1 day ago', amount: 1000, status: 'COMPLETED' },
          { id: 'sale_10', code: '48192048', type: 'Printed Voucher', timeAgo: '2 days ago', amount: 5000, status: 'COMPLETED' },
        ]);

  const netSalesValue = summary?.netSales ?? summary?.totalHotspotRevenueTZS ?? 63500;
  const vouchersSalesValue = summary?.vouchersSales ?? 63500;
  const mobileMoneySalesValue = summary?.mobileMoneySales ?? 0;
  const accountCreditValue = summary?.accountCredit ?? 0;

  const activeUsers =
    summary?.systemInsights?.activeUsers ??
    (sessions.length > 0 ? sessions.length : summary?.activeSessionsCount ?? 2);
  const cpuLoad = summary?.systemInsights?.cpuLoad ?? 4;
  const dataUsage = summary?.systemInsights?.dataUsageGb ?? 134.56;

  const onlineRoutersCount =
    summary?.routerStats?.online ??
    (routers.length > 0 ? routers.filter((r) => r.status === 'ONLINE').length : 1);
  const totalRoutersCount = summary?.routerStats?.total ?? Math.max(1, routers.length);

  const activeVouchersCount =
    summary?.voucherStats?.active ??
    (vouchers.length > 0 ? vouchers.filter((v) => v.status === 'ACTIVE').length : 142);
  const totalVouchersCount = summary?.voucherStats?.total ?? (vouchers.length > 0 ? vouchers.length : 180);

  // Custom Dark Tooltip matching exact screenshot design
  const CustomOverviewTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as OverviewDayData;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
          <div className="font-bold text-white border-b border-slate-800/80 pb-1.5 text-xs">
            {dataPoint.fullDate}
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Expense
              </span>
              <span className="font-mono text-white">TSh {dataPoint.expense.toLocaleString()}.00</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Commission
              </span>
              <span className="font-mono text-white">TSh {dataPoint.commission.toLocaleString()}.00</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Net Proceeds
              </span>
              <span className="font-mono text-white">TSh {dataPoint.netRevenue.toLocaleString()}.00</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Net revenue
              </span>
              <span className="font-mono text-white">TSh {dataPoint.netRevenue.toLocaleString()}.00</span>
            </div>

            <div className="border-t border-slate-800/80 pt-1.5 flex justify-between items-center font-bold text-white">
              <span>Total (Gross)</span>
              <span className="font-mono">TSh {dataPoint.grossRevenue.toLocaleString()}.00</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Front View Hub Header & Quick Navigation Bar */}
      <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                {currentUser?.organizationName || 'MR WIFI HOTSPOT'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Gateway
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              MikroTik RouterOS v7 RADIUS Billing • WinBox Remote Management Active
            </p>
          </div>
        </div>

        {/* Quick Operational Jump Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('vouchers')}
            className="px-3 py-1.5 bg-[#172133] hover:bg-emerald-600 hover:text-white text-slate-200 border border-[#22314d] rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <Ticket className="w-3.5 h-3.5 text-emerald-400" />
            <span>Generate Vouchers</span>
          </button>

          <button
            onClick={() => {
              if (routers.length > 0) {
                setWinboxRouter(routers[0]);
              } else {
                onNavigate('routers');
              }
            }}
            className="px-3 py-1.5 bg-[#172133] hover:bg-sky-600 hover:text-white text-slate-200 border border-[#22314d] rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <Laptop className="w-3.5 h-3.5 text-sky-400" />
            <span>WinBox Remote (8291)</span>
          </button>

          <button
            onClick={() => onNavigate('captive-portal')}
            className="px-3 py-1.5 bg-[#172133] hover:bg-indigo-600 hover:text-white text-slate-200 border border-[#22314d] rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Captive Portal</span>
          </button>

          <button
            onClick={() => onNavigate('payments')}
            className="px-3 py-1.5 bg-[#172133] hover:bg-slate-700 text-slate-300 border border-[#22314d] rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>Billing</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh All Data"
              className="p-2 bg-[#172133] hover:bg-slate-800 text-slate-400 hover:text-white border border-[#22314d] rounded-xl text-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 1: 4 Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Sales */}
        <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 relative overflow-hidden shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Net Sales</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">
              TSh {netSalesValue.toLocaleString()}.00
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            | MM: TSh {mobileMoneySalesValue.toLocaleString()}.00 | Vouchers: TSh {vouchersSalesValue.toLocaleString()}.00
          </div>
        </div>

        {/* Card 2: Vouchers Sales & Inventory */}
        <div
          onClick={() => onNavigate('vouchers')}
          className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 relative overflow-hidden shadow-sm flex flex-col justify-between hover:border-emerald-700/50 transition cursor-pointer group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Vouchers Sales</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                <Ticket className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">
              TSh {vouchersSalesValue.toLocaleString()}.00
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{activeVouchersCount} active of {totalVouchersCount} total</span>
            <span className="text-emerald-400 font-semibold group-hover:underline">View &rarr;</span>
          </div>
        </div>

        {/* Card 3: Routers & WinBox Access */}
        <div
          onClick={() => onNavigate('routers')}
          className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 relative overflow-hidden shadow-sm flex flex-col justify-between hover:border-sky-700/50 transition cursor-pointer group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Routers &amp; WinBox</span>
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition">
                <Laptop className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              <span>{onlineRoutersCount} Online</span>
              <span className="text-xs text-slate-500 font-normal">/ {totalRoutersCount} Total</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-sky-400/90 flex items-center justify-between">
            <span className="flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              WinBox Port 8291 Ready
            </span>
            <span className="text-sky-400 font-semibold group-hover:underline">Manage &rarr;</span>
          </div>
        </div>

        {/* Card 4: System Insights & Live Sessions */}
        <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">System Insights</span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>

            {/* 3 Inline Mini Stats */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div
                onClick={() => onNavigate('sessions')}
                className="bg-[#0b0f19] border border-[#1a2333] hover:border-slate-700 rounded-xl p-2 text-center cursor-pointer transition"
              >
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-white">
                  <Users className="w-3 h-3 text-slate-400" /> {activeUsers}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Active</div>
              </div>

              <div className="bg-[#0b0f19] border border-[#1a2333] rounded-xl p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-white">
                  <Cpu className="w-3 h-3 text-slate-400" /> {cpuLoad}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">CPU</div>
              </div>

              <div className="bg-[#0b0f19] border border-[#1a2333] rounded-xl p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-white truncate">
                  <Database className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{dataUsage}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">Data (GB)</div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 text-right">
            Platform Gateway Telemetry
          </div>
        </div>
      </div>

      {/* Row 2: 2-Column Split (Overview Chart on Left & Recent Sales on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Overview Chart - 7 cols) */}
        <div className="lg:col-span-7 bg-[#111724] border border-[#1e2738] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header & Controls */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Overview</h3>
                <p className="text-xs text-slate-400 mt-0.5">Oct 1, 2026 - Oct 6, 2026</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveFilter(activeFilter === 'totals' ? 'all' : 'totals')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1 border ${
                    activeFilter === 'totals'
                      ? 'bg-slate-800 text-white border-slate-700'
                      : 'bg-white text-slate-900 border-transparent'
                  }`}
                >
                  <span className="font-mono">Σ</span> Totals
                </button>

                <div className="bg-[#121927] border border-[#1e2738] rounded-xl px-3 py-1 flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <span>All ...</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Recharts Composed Chart (Emerald Bars + Lavender Line) */}
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 15, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#182233" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#1e293b' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip content={<CustomOverviewTooltip />} />

                  {/* Emerald Revenue Bars */}
                  <Bar
                    dataKey="netRevenue"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                    name="Net Revenue"
                  />

                  {/* Lavender Gross Line */}
                  <Line
                    type="monotone"
                    dataKey="grossRevenue"
                    stroke="#c084fc"
                    strokeWidth={2}
                    dot={{ fill: '#ffffff', stroke: '#c084fc', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#ffffff', stroke: '#a855f7' }}
                    name="Gross Revenue"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Legend */}
          <div className="flex flex-wrap items-center justify-center gap-5 pt-4 border-t border-[#1a2333] text-xs">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              Net Revenue
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
              Commission
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
              Expense
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c084fc]" />
              Gross Revenue
            </span>
          </div>
        </div>

        {/* Right Column (Recent Sales - 5 cols) */}
        <div className="lg:col-span-5 bg-[#111724] border border-[#1e2738] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Recent Sales</h3>
                <p className="text-xs text-slate-400 mt-0.5">Real-time voucher redemptions &amp; payments</p>
              </div>

              <button
                onClick={() => onNavigate('payments')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {/* Scrollable Sales List */}
            <div className="overflow-y-auto max-h-[300px] space-y-3 pr-1 divide-y divide-slate-800/40">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="pt-3 first:pt-0 flex items-center justify-between hover:bg-[#151c2c]/50 p-1.5 rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    {/* Mint Green Voucher Badge */}
                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                      <Ticket className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="text-sm font-bold text-white font-mono tracking-wide">
                        {sale.code}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {sale.type} &bull; {sale.timeAgo}
                      </div>
                    </div>
                  </div>

                  <div className="font-bold text-sm text-emerald-400 font-mono">
                    +TSh {sale.amount.toLocaleString()}.00
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-[#1a2333] flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {recentSales.length} recent sales</span>
            <span className="text-slate-400">Auto-synced with RADIUS</span>
          </div>
        </div>
      </div>

      {/* Row 3: Quick Router Remote Access & Nodes Strip */}
      <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#182233] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Router Nodes &amp; WinBox Remote Access
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800">
                  Port 8291
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Direct remote GUI access to MikroTik hardware via Cloud DDNS and WireGuard tunnels
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('routers')}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
          >
            Manage All Routers <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Routers Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {routers.length > 0 ? (
            routers.map((r) => (
              <div
                key={r.id}
                className="bg-[#0c111d] border border-[#1c2638] rounded-xl p-3.5 flex flex-col justify-between space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white truncate">{r.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {r.ipAddress || '192.168.88.1'} • {r.location || 'Main Office'}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                    ROS v7
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Radio className="w-3 h-3 text-sky-400" />
                    WinBox: :8291
                  </span>

                  <button
                    onClick={() => setWinboxRouter(r)}
                    className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Connect WinBox</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-4 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center space-y-2">
              <Laptop className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-300">
                MikroTik hEX S Gateway is configured with WinBox Remote Port 8291.
              </p>
              <button
                onClick={() => onNavigate('routers')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Setup Router Wizard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Prominent 30-Day API Request Volume & Platform Usage (Recharts Widget) */}
      <div className="space-y-2">
        <DashboardWidget onRefreshParent={onRefresh} />
      </div>

      {/* Row 5: Quick Hotspot Packages Summary Strip */}
      <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#182233] pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Active Hotspot Speed &amp; Voucher Plans</h3>
          </div>
          <button
            onClick={() => onNavigate('packages')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
          >
            Configure Packages <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(packages.length > 0 ? packages.slice(0, 4) : [
            { id: 'p1', name: '1 Hour Fast Pass', price: 500, durationMinutes: 60, rateLimit: '5M/5M' },
            { id: 'p2', name: '3 Hours Standard', price: 1000, durationMinutes: 180, rateLimit: '5M/5M' },
            { id: 'p3', name: '24 Hours Day Pass', price: 2000, durationMinutes: 1440, rateLimit: '10M/10M' },
            { id: 'p4', name: '7 Days Unlimited', price: 5000, durationMinutes: 10080, rateLimit: '10M/10M' },
          ]).map((pkg: any) => (
            <div
              key={pkg.id}
              onClick={() => onNavigate('vouchers')}
              className="bg-[#0c111d] border border-[#1c2638] rounded-xl p-3 hover:border-emerald-500/40 transition cursor-pointer group"
            >
              <div className="text-xs font-semibold text-white group-hover:text-emerald-400 transition truncate">
                {pkg.name}
              </div>
              <div className="text-lg font-black text-white font-mono mt-1">
                TSh {pkg.price.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                <span>{pkg.rateLimit || '5M/5M'}</span>
                <span className="text-emerald-400 font-semibold group-hover:underline">Print &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WinBox Remote Modal (Direct Front View Launch) */}
      {winboxRouter && (
        <WinboxRemoteModal
          router={winboxRouter}
          onClose={() => setWinboxRouter(null)}
          onUpdate={onRefresh}
        />
      )}
    </div>
  );
};
export default DashboardOverview;
