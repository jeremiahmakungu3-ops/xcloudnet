import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient } from './lib/api.ts';
import {
  auth,
  onAuthStateChanged,
  fbSignOut,
  testConnection,
  syncUserToFirestore,
  signInWithPopup,
  googleProvider,
} from './lib/firebase.ts';
import {
  User,
  OrgSubscription,
  SubscriptionPlan,
  Router as RouterModel,
  HotspotPackage,
  Voucher,
  HotspotSession,
  Agent,
  Invoice,
  PaymentTransaction,
} from './types/index.ts';

// Components
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { UsersView } from './components/UsersView.tsx';
import { VouchersView } from './components/VouchersView.tsx';
import { RoutersView } from './components/RoutersView.tsx';
import { PaymentsView } from './components/PaymentsView.tsx';
import { SubscriptionView } from './components/SubscriptionView.tsx';
import { PackagesView } from './components/PackagesView.tsx';
import { SessionsView } from './components/SessionsView.tsx';
import { AgentsView } from './components/AgentsView.tsx';
import { OmadaView } from './components/OmadaView.tsx';
import { SuperAdminView } from './components/SuperAdminView.tsx';
import { GlobalMonitoringView } from './components/GlobalMonitoringView.tsx';
import { AuditLogsView } from './components/AuditLogsView.tsx';
import { LoginModal } from './components/LoginModal.tsx';

import { Menu, Bell, RefreshCw, Shield, Lock, UserCheck, LogIn } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // App State
  const [subscription, setSubscription] = useState<OrgSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [registeredDeviceCount, setRegisteredDeviceCount] = useState(0);
  const [deviceLimit, setDeviceLimit] = useState(5);

  const [summary, setSummary] = useState<any | null>(null);
  const [routers, setRouters] = useState<RouterModel[]>([]);
  const [packages, setPackages] = useState<HotspotPackage[]>([]);
  const [vouchers, setVouchers] = useState<(Voucher & { package?: HotspotPackage })[]>([]);
  const [sessions, setSessions] = useState<HotspotSession[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Initial Auth Check & Firebase State Listener
  useEffect(() => {
    // Validate Firestore connectivity per system skills
    testConnection();

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const res = await ApiClient.post('/api/v1/auth/firebase-login', {
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email?.split('@')[0],
            uid: fbUser.uid,
          });
          ApiClient.setToken(res.token);
          setCurrentUser(res.user);

          // Synchronize to Firestore
          syncUserToFirestore({
            id: fbUser.uid,
            email: res.user.email,
            name: res.user.name,
            role: res.user.role,
            organizationId: res.user.organizationId,
          }).catch((err) => console.warn('Firestore sync note:', err));
          setLoading(false);
          return;
        } catch (e) {
          console.error('Firebase auto-auth session sync failed:', e);
        }
      }

      // If no active Firebase session yet, check existing backend session or auto-auth Special Admin
      try {
        const res = await ApiClient.get('/api/v1/auth/me');
        setCurrentUser(res.user);
      } catch {
        // Auto-auth with designated Super Admin mussamatembo3@gmail.com
        try {
          const loginRes = await ApiClient.post('/api/v1/auth/login', {
            email: 'mussamatembo3@gmail.com',
            password: 'Password123!',
          });
          ApiClient.setToken(loginRes.token);
          setCurrentUser(loginRes.user);
        } catch {
          setShowLoginModal(true);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      const [
        subRes,
        sumRes,
        rtrsRes,
        pkgsRes,
        vchsRes,
        sessRes,
        agtsRes,
        invsRes,
        txsRes,
        usersRes,
      ] = await Promise.all([
        ApiClient.get('/api/v1/subscription/me').catch(() => null),
        ApiClient.get('/api/v1/reports/summary').catch(() => null),
        ApiClient.get('/api/v1/routers').catch(() => []),
        ApiClient.get('/api/v1/packages').catch(() => []),
        ApiClient.get('/api/v1/vouchers').catch(() => []),
        ApiClient.get('/api/v1/sessions/active').catch(() => []),
        ApiClient.get('/api/v1/agents').catch(() => []),
        ApiClient.get('/api/v1/subscription/invoices').catch(() => []),
        ApiClient.get('/api/v1/payments').catch(() => []),
        ApiClient.get('/api/v1/users').catch(() => []),
      ]);

      if (subRes) {
        setSubscription(subRes.subscription);
        setPlan(subRes.plan);
        setRegisteredDeviceCount(subRes.registeredDeviceCount);
        setDeviceLimit(subRes.deviceLimit);
      }

      if (sumRes) setSummary(sumRes);
      if (rtrsRes) setRouters(rtrsRes);
      if (pkgsRes) setPackages(pkgsRes);
      if (vchsRes) setVouchers(vchsRes);
      if (sessRes) setSessions(sessRes);
      if (agtsRes) setAgents(agtsRes);
      if (invsRes) setInvoices(invsRes);
      if (txsRes) setTransactions(txsRes);
      if (usersRes) setUsersList(usersRes);
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshData();
      // Enforce strict access control: non-super admin cannot remain on global-activity or superadmin views
      if (currentUser.role !== 'SUPER_ADMIN') {
        if (activeTab === 'global-activity' || activeTab === 'superadmin') {
          setActiveTab('dashboard');
        }
      }
    }
  }, [currentUser, activeTab, refreshData]);

  const handleLogout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase signout note:', e);
    }
    ApiClient.setToken(null);
    setCurrentUser(null);
    setShowLoginModal(true);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Network & Billing Dashboard';
      case 'users':
        return 'Users & Team Management';
      case 'vouchers':
        return 'Hotspot Vouchers & Access Codes';
      case 'routers':
        return 'Routers & MikroTik ROS v7';
      case 'payments':
        return 'Billing, Invoices & Cash Approvals';
      case 'subscription':
        return 'XCLOUD Monthly Platform Plan (TSh 7,000)';
      case 'packages':
        return 'Hotspot Speed & Time Plans';
      case 'sessions':
        return 'Active RADIUS Hotspot Clients';
      case 'agents':
        return 'Resellers, Float & POS Terminal';
      case 'omada':
        return 'TP-Link Omada SDN Controller';
      case 'audit':
        return 'Security Audit Trail';
      case 'global-activity':
        return 'Super Admin — Global Router & Omada Activity Monitoring';
      case 'superadmin':
        return 'Super Admin Platform Control Console';
      default:
        return 'XCLOUD.NET';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased selection:bg-indigo-500 selection:text-white">
      {/* Responsive Sidebar */}
      <Sidebar
        user={currentUser}
        subscription={subscription}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        onOpenLogin={() => setShowLoginModal(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-white truncate">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Current Role Badge */}
            {currentUser && (
              <div className="flex items-center gap-1.5">
                {currentUser.role === 'SUPER_ADMIN' ? (
                  <span
                    title="Logged in as Super Admin: Global cross-tenant monitoring is visible and active"
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-950/80 text-purple-300 border border-purple-700/60 shadow-xs"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    Special Admin (Global Access)
                  </span>
                ) : (
                  <span
                    title="Logged in as standard user: Global monitoring is restricted and hidden"
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    {currentUser.role === 'ORG_ADMIN' ? 'Org Admin' : 'Staff'} (Tenant Only)
                  </span>
                )}

                {/* Switch Role / Account shortcut */}
                <button
                  onClick={() => setShowLoginModal(true)}
                  title="Switch between Special Admin and Standard Tenant Admin"
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden md:inline">Switch Role</span>
                </button>
              </div>
            )}

            <button
              onClick={refreshData}
              title="Refresh Data"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {subscription && (
              <span
                onClick={() => setActiveTab('subscription')}
                className={`hidden lg:inline-flex px-2.5 py-1 text-[11px] font-bold rounded-full border cursor-pointer uppercase tracking-wider ${
                  subscription.status === 'ACTIVE'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : subscription.status === 'GRACE_PERIOD'
                    ? 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse'
                    : 'bg-rose-950 text-rose-400 border-rose-800'
                }`}
              >
                Plan: {subscription.status}
              </span>
            )}
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              summary={summary}
              recentTransactions={transactions}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'users' && (
            <UsersView
              users={usersList}
              currentUser={currentUser}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'vouchers' && (
            <VouchersView
              vouchers={vouchers}
              packages={packages}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'routers' && (
            <RoutersView
              routers={routers}
              deviceLimit={deviceLimit}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              transactions={transactions}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'subscription' && (
            <SubscriptionView
              subscription={subscription}
              plan={plan}
              registeredDeviceCount={registeredDeviceCount}
              deviceLimit={deviceLimit}
              invoices={invoices}
              payments={transactions.filter((t) => t.paymentType === 'PLATFORM_SUBSCRIPTION')}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'packages' && (
            <PackagesView
              packages={packages}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionsView
              sessions={sessions}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'agents' && (
            <AgentsView
              agents={agents}
              packages={packages}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'omada' && <OmadaView />}

          {activeTab === 'audit' && <AuditLogsView />}

          {activeTab === 'global-activity' && (
            currentUser?.role === 'SUPER_ADMIN' ? (
              <GlobalMonitoringView />
            ) : (
              <div className="p-8 bg-rose-950/40 border border-rose-800 rounded-2xl text-center">
                <h3 className="text-lg font-bold text-rose-300">Access Denied</h3>
                <p className="text-sm text-slate-400 mt-2">
                  Only Super Administrators have authorization to access global cross-tenant router and Omada activity telemetry.
                </p>
              </div>
            )
          )}

          {activeTab === 'superadmin' && (
            currentUser?.role === 'SUPER_ADMIN' ? (
              <SuperAdminView onNavigate={setActiveTab} />
            ) : (
              <div className="p-8 bg-rose-950/40 border border-rose-800 rounded-2xl text-center">
                <h3 className="text-lg font-bold text-rose-300">Access Denied</h3>
                <p className="text-sm text-slate-400 mt-2">
                  Super Administrator credentials required.
                </p>
              </div>
            )
          )}
        </main>
      </div>

      {/* Authentication Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onSuccess={(user) => {
          setCurrentUser(user);
          setShowLoginModal(false);
          refreshData();
        }}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
