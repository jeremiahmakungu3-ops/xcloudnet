import React from 'react';
import { User, OrgSubscription } from '../types/index.ts';
import {
  Activity,
  Users,
  Ticket,
  Radio,
  DollarSign,
  CreditCard,
  Layers,
  Wifi,
  ShoppingBag,
  Server,
  ShieldCheck,
  Sliders,
  LogOut,
  X,
  ChevronRight,
  Shield,
  UserCheck,
} from 'lucide-react';

interface SidebarProps {
  user: User | null;
  subscription: OrgSubscription | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenLogin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  subscription,
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  onLogout,
  onOpenLogin,
}) => {
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, section: 'Core' },
    { id: 'users', label: 'Users & Team', icon: Users, section: 'Core' },
    { id: 'vouchers', label: 'Vouchers', icon: Ticket, section: 'Hotspot Billing' },
    { id: 'routers', label: 'Routers & MikroTik', icon: Radio, section: 'Hotspot Billing' },
    { id: 'payments', label: 'Billing & Payments', icon: DollarSign, section: 'Hotspot Billing' },
    { id: 'packages', label: 'Hotspot Plans', icon: Layers, section: 'Hotspot Billing' },
    { id: 'sessions', label: 'RADIUS Sessions', icon: Wifi, section: 'Hotspot Billing' },
    { id: 'agents', label: 'Agents & POS', icon: ShoppingBag, section: 'Resellers' },
    { id: 'subscription', label: 'Platform Plan (TSh 7k)', icon: CreditCard, section: 'Platform' },
    { id: 'omada', label: 'TP-Link Omada', icon: Server, section: 'Platform' },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck, section: 'Platform' },
  ];

  if (isSuperAdmin) {
    navItems.push({
      id: 'global-activity',
      label: 'Global Router & Omada Activity',
      icon: Activity,
      section: 'Super Admin Only',
    });
    navItems.push({
      id: 'superadmin',
      label: 'Platform Control Console',
      icon: Sliders,
      section: 'Super Admin Only',
    });
  }

  const subStatus = subscription?.status || 'ACTIVE';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: Logo & Organization Info */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-lg">
              X
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">
                  XCLOUD<span className="text-indigo-400">.NET</span>
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                  v7
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-none">ISP &amp; Hotspot Platform</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subscription Plan Ribbon */}
        <div className="px-3 pt-3">
          <div
            onClick={() => {
              setActiveTab('subscription');
              onClose();
            }}
            className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition"
          >
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Platform Plan
              </span>
              <span className="text-xs font-bold text-white">TSh 7,000 / mo</span>
            </div>
            <span
              className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-full border uppercase tracking-wider ${
                subStatus === 'ACTIVE'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : subStatus === 'GRACE_PERIOD'
                  ? 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse'
                  : 'bg-rose-950 text-rose-400 border-rose-800'
              }`}
            >
              {subStatus}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const showSection = idx === 0 || navItems[idx - 1].section !== item.section;

            return (
              <React.Fragment key={item.id}>
                {showSection && (
                  <div className="pt-3 pb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer group ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer: User Profile & Role Status */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="truncate pr-2">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                    {isSuperAdmin ? (
                      <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 font-bold border border-purple-800 text-[9px] flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5 text-purple-400" /> Special Admin
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 text-[9px]">
                        {user.role === 'ORG_ADMIN' ? 'Org Admin' : user.role}
                      </span>
                    )}
                    <span className="text-slate-500 text-[9px] truncate">
                      {isSuperAdmin ? 'Global Access' : 'Tenant Restricted'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onOpenLogin && (
                    <button
                      onClick={onOpenLogin}
                      title="Switch Account / Role"
                      className="p-1 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={onLogout}
                    title="Sign Out"
                    className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-xs text-slate-400">Not signed in</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
