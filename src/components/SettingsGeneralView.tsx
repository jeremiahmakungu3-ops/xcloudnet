import React, { useState } from 'react';
import { User, OrgSubscription } from '../types/index.ts';
import { ApiClient } from '../lib/api.ts';
import {
  Settings,
  Save,
  Check,
  Building,
  Globe,
  Clock,
  Phone,
  Mail,
  Zap,
  Shield,
  Radio,
} from 'lucide-react';

interface SettingsGeneralViewProps {
  currentUser?: User | null;
  subscription?: OrgSubscription | null;
  onRefresh?: () => void;
}

export const SettingsGeneralView: React.FC<SettingsGeneralViewProps> = ({
  currentUser,
  subscription,
  onRefresh,
}) => {
  const [networkName, setNetworkName] = useState(
    currentUser?.organizationName || 'MR WIFI HOTSPOT'
  );
  const [currency, setCurrency] = useState('TZS');
  const [timezone, setTimezone] = useState('Africa/Dar_es_Salaam (EAT, UTC+3)');
  const [supportPhone, setSupportPhone] = useState('+255 784 123 456');
  const [supportEmail, setSupportEmail] = useState(currentUser?.email || 'support@xcloud.net');
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(120);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(15);
  const [defaultRateLimit, setDefaultRateLimit] = useState('5M/5M');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Simulate/persist settings update
      await new Promise((r) => setTimeout(r, 400));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save general settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          General Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure default hotspot network identity, currency, support contacts, and session timeouts
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Hotspot & Tenant Identity */}
        <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#182233]">
            <Building className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Hotspot &amp; Network Branding</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Hotspot Network Name (SSID &amp; Dashboard)
              </label>
              <input
                type="text"
                value={networkName}
                onChange={(e) => setNetworkName(e.target.value)}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-medium text-xs focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Rendered across the MikroTik portal login screen and header.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Billing Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="TZS">TZS — Tanzanian Shilling (TSh)</option>
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="UGX">UGX — Ugandan Shilling</option>
                <option value="USD">USD — US Dollar ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                System Time Zone
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Default Hotspot Bandwidth Limit
              </label>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <input
                  type="text"
                  value={defaultRateLimit}
                  onChange={(e) => setDefaultRateLimit(e.target.value)}
                  placeholder="5M/5M"
                  className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Support & Contact Details */}
        <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#182233]">
            <Phone className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Public Support Contacts</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Customer Support Helpline / WhatsApp
              </label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Displayed on customer captive portal vouchers for assistance.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Support Email Address
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* RADIUS Session Limits */}
        <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#182233]">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">RADIUS Session Policies</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Max Session Timeout (Minutes)
              </label>
              <input
                type="number"
                min="10"
                max="10080"
                value={sessionTimeoutMinutes}
                onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Idle Inactivity Kick (Minutes)
              </label>
              <input
                type="number"
                min="2"
                max="120"
                value={idleTimeoutMinutes}
                onChange={(e) => setIdleTimeoutMinutes(Number(e.target.value))}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          {saved && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>General settings updated successfully!</span>
            </div>
          )}
          {!saved && <div />}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save General Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
export default SettingsGeneralView;
