import React from 'react';
import { User, OrgSubscription } from '../types/index.ts';
import {
  Wifi,
  Radio,
  Ticket,
  Users,
  CreditCard,
  Layers,
  ShieldCheck,
  Server,
  LogOut,
  Sliders,
  DollarSign,
  Activity,
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  subscription: OrgSubscription | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  subscription,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenLogin,
}) => {
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'subscription', label: 'Platform Plan', icon: CreditCard },
    { id: 'routers', label: 'Routers & MikroTik', icon: Radio },
    { id: 'omada', label: 'Omada SDN', icon: Server },
    { id: 'packages', label: 'Hotspot Plans', icon: Layers },
    { id: 'vouchers', label: 'Vouchers', icon: Ticket },
    { id: 'sessions', label: 'RADIUS Sessions', icon: Wifi },
    { id: 'agents', label: 'Agents & POS', icon: Users },
    { id: 'payments', label: 'Billing & Cash', icon: DollarSign },
    { id: 'audit', label: 'Audit Logs', icon: ShieldCheck },
  ];

  if (isSuperAdmin) {
    navItems.push({ id: 'global-activity', label: 'Global Activity', icon: Activity });
    navItems.push({ id: 'superadmin', label: 'Super Admin', icon: Sliders });
  }

  const getSubStatusBadge = () => {
    if (!subscription) return null;
    const s = subscription.status;
    let color = 'bg-emerald-950 text-emerald-400 border-emerald-800';
    if (s === 'GRACE_PERIOD') color = 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse';
    else if (s === 'EXPIRED' || s === 'SUSPENDED') color = 'bg-rose-950 text-rose-400 border-rose-800';

    return (
      <span
        onClick={() => setActiveTab('subscription')}
        className={`px-2 py-0.5 text-[11px] font-bold rounded-full border cursor-pointer uppercase tracking-wider ${color}`}
      >
        Plan: {s.replace('_', ' ')}
      </span>
    );
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xl">
              X
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">
                  XCLOUD<span className="text-indigo-400">.NET</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  v7 PROD
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">
                Hotspot Billing &bull; MikroTik RouterOS v7 &bull; RADIUS &bull; Omada
              </p>
            </div>
          </div>

          {/* User & Status Bar */}
          <div className="flex items-center gap-3">
            {getSubStatusBadge()}

            {user ? (
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5 justify-end">
                    <span>{user.name}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                      {user.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">{user.email}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 overflow-x-auto">
        <nav className="flex space-x-1 py-2" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
