import React, { useState } from 'react';
import {
  Terminal,
  Shield,
  Key,
  Database,
  Download,
  Save,
  Check,
  RefreshCw,
  Copy,
  Laptop,
  AlertTriangle,
} from 'lucide-react';

export const SettingsAdvancedView: React.FC = () => {
  const [radiusSecret, setRadiusSecret] = useState('xcloud-radius-secret-v7');
  const [authPort, setAuthPort] = useState(1812);
  const [acctPort, setAcctPort] = useState(1813);
  const [coaPort, setCoaPort] = useState(3799);
  const [interimIntervalSeconds, setInterimIntervalSeconds] = useState(120);
  const [defaultWinboxPort, setDefaultWinboxPort] = useState(8291);
  const [webhookSecret, setWebhookSecret] = useState('whsec_98472948294729184729');
  const [saved, setSaved] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Advanced Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Low-level RADIUS protocol parameters, WinBox remote ports, Change of Authorization (CoA), and webhook secrets
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* RADIUS Protocol Settings */}
        <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#182233]">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">RADIUS Protocol &amp; Accounting</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                RADIUS Shared Secret
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={radiusSecret}
                  onChange={(e) => setRadiusSecret(e.target.value)}
                  className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(radiusSecret, 'secret')}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                >
                  {copiedField === 'secret' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Interim-Accounting Interval (Seconds)
              </label>
              <input
                type="number"
                min="30"
                max="600"
                value={interimIntervalSeconds}
                onChange={(e) => setInterimIntervalSeconds(Number(e.target.value))}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Frequency MikroTik sends bytes/time sync packets (default: 120s).
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Authentication Port (UDP)
              </label>
              <input
                type="number"
                value={authPort}
                onChange={(e) => setAuthPort(Number(e.target.value))}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Accounting Port (UDP)
              </label>
              <input
                type="number"
                value={acctPort}
                onChange={(e) => setAcctPort(Number(e.target.value))}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Change of Authorization (CoA / Disconnect Port)
              </label>
              <input
                type="number"
                value={coaPort}
                onChange={(e) => setCoaPort(Number(e.target.value))}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Default WinBox Remote Access Port
              </label>
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-sky-400" />
                <input
                  type="number"
                  value={defaultWinboxPort}
                  onChange={(e) => setDefaultWinboxPort(Number(e.target.value))}
                  className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security & Webhook Signatures */}
        <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#182233]">
            <Key className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Webhook Signing Secret</h3>
          </div>

          <div className="text-xs space-y-2">
            <label className="block text-slate-300 font-medium">
              Payment Gateway HMAC Verification Secret
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookSecret}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-slate-300 font-mono text-xs select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopy(webhookSecret, 'webhook')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
              >
                {copiedField === 'webhook' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Used to verify SHA-256 HMAC signatures on incoming webhook notifications from ClickPesa, Snippe, and AzamPay.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {saved && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Check className="w-4 h-4" />
              <span>Advanced protocol parameters saved!</span>
            </div>
          )}
          {!saved && <div />}

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Advanced Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
export default SettingsAdvancedView;
