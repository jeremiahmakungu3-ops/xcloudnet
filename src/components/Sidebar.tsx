import React, { useState } from 'react';
import { User, OrgSubscription } from '../types/index.ts';
import {
  Home,
  Radio,
  BarChart3,
  LifeBuoy,
  Tag,
  Users,
  Box,
  CreditCard,
  UserCheck,
  Ticket,
  Globe,
  Settings,
  ChevronDown,
  ChevronUp,
  LogOut,
  X,
  Shield,
  LogIn,
  Sliders,
  ShieldCheck,
  ChevronsUpDown,
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
  const [salesOpen, setSalesOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Network/tenant name matching screenshot "MR WIFI HOTSPOT" or user's org
  const hotspotNetworkName = user?.organizationName || 'MR WIFI HOTSPOT';

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
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-[#0b0f19] border-r border-[#1a2333] flex flex-col justify-between transition-transform duration-200 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: Brand Logo & Hotspot Network Selector */}
        <div className="p-4 space-y-3 border-b border-[#182233]">
          {/* Logo matching Xcloud brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-lg shadow-sm shadow-emerald-500/20">
                <span className="text-[#10b981] font-bold">X</span>
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center">
                X<span className="text-[#10b981]">cloud</span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="md:hidden p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Network Selector Pill matching screenshot "🟢 MR WIFI HOTSPOT ⬍" */}
          <div className="p-2.5 bg-[#121927] border border-[#1e2738] rounded-xl flex items-center justify-between text-xs cursor-pointer hover:border-[#2a374e] transition">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50" />
              <span className="font-bold text-white text-[11px] truncate uppercase tracking-wider">
                {hotspotNetworkName}
              </span>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
        </div>

        {/* Navigation Items matching Screenshot */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 text-xs">
          {/* Dashboard */}
          <button
            onClick={() => {
              setActiveTab('dashboard');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
              activeTab === 'dashboard'
                ? 'bg-[#182233] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#121927]'
            }`}
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Dashboard</span>
          </button>

          {/* Router */}
          <button
            onClick={() => {
              setActiveTab('routers');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
              activeTab === 'routers'
                ? 'bg-[#182233] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#121927]'
            }`}
          >
            <Radio className="w-4 h-4 text-slate-400" />
            <span>Router</span>
          </button>

          {/* Usage Analytics */}
          <button
            onClick={() => {
              setActiveTab('sessions');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
              activeTab === 'sessions'
                ? 'bg-[#182233] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#121927]'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span>Usage Analytics</span>
          </button>

          {/* Support Hub */}
          <button
            onClick={() => {
              setActiveTab('captive-portal');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
              activeTab === 'captive-portal'
                ? 'bg-[#182233] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#121927]'
            }`}
          >
            <LifeBuoy className="w-4 h-4 text-slate-400" />
            <span>Support Hub</span>
          </button>

          {/* Sales (Collapsible dropdown matching screenshot) */}
          <div>
            <button
              onClick={() => setSalesOpen(!salesOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#121927] transition cursor-pointer font-medium"
            >
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-slate-400" />
                <span>Sales</span>
              </div>
              {salesOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {salesOpen && (
              <div className="pl-9 pr-2 py-1 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('vouchers');
                    onClose();
                  }}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] ${
                    activeTab === 'vouchers' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Voucher Sales
                </button>
                <button
                  onClick={() => {
                    setActiveTab('payments');
                    onClose();
                  }}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] ${
                    activeTab === 'payments' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Payment Receipts
                </button>
              </div>
            )}
          </div>

          {/* Users (Collapsible dropdown matching screenshot) */}
          <div>
            <button
              onClick={() => setUsersOpen(!usersOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#121927] transition cursor-pointer font-medium"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Users</span>
              </div>
              {usersOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {usersOpen && (
              <div className="pl-9 pr-2 py-1 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('users');
                    onClose();
                  }}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] ${
                    activeTab === 'users' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active Users
                </button>
              </div>
            )}
          </div>

          {/* Packages */}
          <button
            onClick={() => {
              setActiveTab('packages');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
              activeTab === 'packages'
                ? 'bg-[#182233] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#121927]'
            }`}
          >
            <Box className="w-4 h-4 text-slate-400" />
            <span>Packages</span>
          </button>

          {/* Transactions */}
          <button
            onClick={() => {
              setActiveTab('payments');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
              activeTab === 'payments'
                ? 'bg-[#182233] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#121927]'
            }`}
          >
            <CreditCard className="w-4 h-4 text-slate-400" />
            <span>Transactions</span>
          </button>

          {/* Agent PoS */}
          <button
            onClick={() => {
              setActiveTab('agents');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
              activeTab === 'agents'
                ? 'bg-[#182233] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#121927]'
            }`}
          >
            <UserCheck className="w-4 h-4 text-slate-400" />
            <span>Agent PoS</span>
          </button>

          {/* Vouchers */}
          <button
            onClick={() => {
              setActiveTab('vouchers');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
              activeTab === 'vouchers'
                ? 'bg-[#182233] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#121927]'
            }`}
          >
            <Ticket className="w-4 h-4 text-slate-400" />
            <span>Vouchers</span>
          </button>

          {/* Remote Access (WinBox & RouterOS Management) */}
          <button
            onClick={() => {
              setActiveTab('routers');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
              activeTab === 'remote-access'
                ? 'bg-[#182233] text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-[#121927]'
            }`}
          >
            <Globe className="w-4 h-4 text-slate-400" />
            <span>Remote Access</span>
          </button>

          {/* Settings (Collapsible dropdown matching screenshot structure) */}
          <div>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#121927] transition cursor-pointer font-medium"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Settings</span>
              </div>
              {settingsOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {settingsOpen && (
              <div className="pl-9 pr-2 py-1 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('settings-general');
                    onClose();
                  }}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] transition ${
                    activeTab === 'settings-general' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  General
                </button>
                <button
                  onClick={() => {
                    setActiveTab('routers');
                    onClose();
                  }}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] transition ${
                    activeTab === 'routers' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Routers
                </button>
                <button
                  onClick={() => {
                    setActiveTab('captive-portal');
                    onClose();
                  }}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] transition ${
                    activeTab === 'captive-portal' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Captive Templates
                </button>
                <button
                  onClick={() => {
                    setActiveTab('settings-sms');
                    onClose();
                  }}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] transition ${
                    activeTab === 'settings-sms' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SMS
                </button>
                <button
                  onClick={() => {
                    setActiveTab('payment-gateways');
                    onClose();
                  }}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] transition ${
                    activeTab === 'payment-gateways' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Payment Gateways
                </button>
                <button
                  onClick={() => {
                    setActiveTab('settings-advanced');
                    onClose();
                  }}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] transition ${
                    activeTab === 'settings-advanced' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Advanced
                </button>
              </div>
            )}
          </div>

          {/* Super Admin Items */}
          {isSuperAdmin && (
            <div className="pt-2 border-t border-[#182233]">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Super Admin
              </div>
              <button
                onClick={() => {
                  setActiveTab('superadmin');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition cursor-pointer font-medium ${
                  activeTab === 'superadmin' ? 'bg-[#182233] text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Platform Admin</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer: User Account */}
        <div className="p-3 border-t border-[#182233] bg-[#090d16]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pb-1.5">
            ACCOUNT
          </div>
          {user ? (
            <div className="flex items-center justify-between px-2 py-1.5 bg-[#121927] border border-[#1e2738] rounded-xl">
              <div className="truncate pr-2">
                <div className="text-xs font-bold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
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
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
