import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api.ts';
import { SubscriptionPlan, OrgSubscription } from '../types/index.ts';
import {
  Sliders,
  CreditCard,
  Building,
  CheckCircle,
  Clock,
  Shield,
  Radio,
  PlusCircle,
  FileCheck,
  Activity,
  ArrowRight,
} from 'lucide-react';

interface SuperAdminViewProps {
  onNavigate?: (tab: string) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ onNavigate }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [adminOverview, setAdminOverview] = useState<any | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPlanEditModal, setShowPlanEditModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [extendDays, setExtendDays] = useState(30);
  const [customDeviceLimit, setCustomDeviceLimit] = useState<number | undefined>(undefined);
  const [extendReason, setExtendReason] = useState('VIP ISP Business Expansion');

  // Plan edit form state
  const [price, setPrice] = useState(7000);
  const [deviceLimit, setDeviceLimit] = useState(5);
  const [durationDays, setDurationDays] = useState(30);
  const [gracePeriodDays, setGracePeriodDays] = useState(3);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p, o, orgs] = await Promise.all([
        ApiClient.get('/api/v1/admin/plans'),
        ApiClient.get('/api/v1/admin/subscriptions'),
        ApiClient.get('/api/v1/admin/organizations'),
      ]);
      setPlans(p);
      setAdminOverview(o);
      setOrganizations(orgs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setPrice(plan.price);
    setDeviceLimit(plan.deviceLimit);
    setDurationDays(plan.durationDays);
    setGracePeriodDays(plan.gracePeriodDays);
    setShowPlanEditModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      await ApiClient.put(`/api/v1/admin/plans/${selectedPlan.id}`, {
        price: Number(price),
        deviceLimit: Number(deviceLimit),
        durationDays: Number(durationDays),
        gracePeriodDays: Number(gracePeriodDays),
      });
      alert('Subscription plan updated successfully across platform.');
      setShowPlanEditModal(false);
      loadData();
    } catch (err: any) {
      alert(`Error updating plan: ${err.message}`);
    }
  };

  const handleManualExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) return;
    try {
      await ApiClient.post(`/api/v1/admin/subscriptions/${selectedSubId}/extend`, {
        days: extendDays,
        deviceLimit: customDeviceLimit,
        reason: extendReason,
      });
      alert('Manual subscription extension recorded with audit log entry.');
      setShowExtendModal(false);
      loadData();
    } catch (err: any) {
      alert(`Extension error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" /> Super Admin Platform Control Console
          </h2>
          <p className="text-xs text-slate-400">
            Global controls for ISP platform subscriptions, pricing, device limit overrides, and tenant organizations
          </p>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('global-activity')}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer w-fit"
          >
            <Activity className="w-4 h-4" />
            <span>Global Router &amp; Omada Activity</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Global Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">
            Total Organizations
          </div>
          <div className="text-2xl font-black text-white">{organizations.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Tenant ISP accounts</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">
            Active Subscriptions
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {adminOverview?.totalActive || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {adminOverview?.totalGracePeriod || 0} in Grace Period &bull;{' '}
            {adminOverview?.totalExpired || 0} Expired
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">
            Platform Collections
          </div>
          <div className="text-2xl font-black text-white">
            TZS {(adminOverview?.monthlyPlatformRevenueTZS || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Direct ISP platform subscription fees</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">
            Standard Plan Price
          </div>
          <div className="text-2xl font-black text-indigo-400">
            TSh {(plans[0]?.price || 7000).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Up to {plans[0]?.deviceLimit || 5} devices</p>
        </div>
      </div>

      {/* Subscription Plans Manager */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Platform Subscription Plans</h3>
            <p className="text-xs text-slate-400">
              Super Admin can change price, device limit, duration, and grace periods
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex justify-between items-start"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">{p.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Active
                  </span>
                </div>
                <div className="text-2xl font-black text-white">
                  TSh {p.price.toLocaleString()} <span className="text-xs text-slate-400">/ {p.durationDays} days</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>&bull; Router limit: <span className="font-bold text-sky-400">{p.deviceLimit} routers</span></div>
                  <div>&bull; Grace period: <span className="font-bold text-amber-400">{p.gracePeriodDays} days</span></div>
                  <div>&bull; Description: {p.description}</div>
                </div>
              </div>

              <button
                onClick={() => handleEditPlan(p)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold transition cursor-pointer"
              >
                Edit Plan
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Organization Subscriptions Overview Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">ISP Organization Subscriptions</h3>
            <p className="text-xs text-slate-400">
              Active subscriptions, registered devices, and authorized manual extensions
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Routers / Limit</th>
                <th className="py-3 px-4">Period End</th>
                <th className="py-3 px-4">Grace Period End</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {adminOverview?.subscriptions?.map((sub: any) => (
                <tr key={sub.id} className="hover:bg-slate-850/50">
                  <td className="py-3 px-4 font-bold text-white">{sub.organizationName}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sub.status === 'ACTIVE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : sub.status === 'GRACE_PERIOD'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className="font-bold text-sky-400">{sub.deviceCount}</span> /{' '}
                    <span>{sub.deviceLimit} routers</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(sub.gracePeriodEnd).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedSubId(sub.id);
                        setCustomDeviceLimit(sub.deviceLimit);
                        setShowExtendModal(true);
                      }}
                      className="px-2.5 py-1 bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-300 rounded text-xs font-semibold transition cursor-pointer"
                    >
                      Authorize Extension
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Plan Modal */}
      {showPlanEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Edit Plan Configuration</h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure baseline pricing, device limits, and durations for all ISP subscribers.
            </p>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Price (TZS)
                  </label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Device Limit (Routers)
                  </label>
                  <input
                    type="number"
                    required
                    value={deviceLimit}
                    onChange={(e) => setDeviceLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    required
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPlanEditModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Subscription Extension Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Authorize Manual Extension</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add days or increase the device limit for this tenant organization. Creates an auditable event.
            </p>

            <form onSubmit={handleManualExtend} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Days to Add
                  </label>
                  <input
                    type="number"
                    required
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Device Limit Override
                  </label>
                  <input
                    type="number"
                    value={customDeviceLimit || 5}
                    onChange={(e) => setCustomDeviceLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Reason / Authorization Note
                </label>
                <textarea
                  required
                  rows={2}
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="e.g. Cleared via direct bank transfer / partnership grant"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Apply Extension
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
