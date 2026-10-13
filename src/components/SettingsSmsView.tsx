import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Save,
  Check,
  AlertCircle,
  Key,
  Shield,
  Smartphone,
  Info,
} from 'lucide-react';

export const SettingsSmsView: React.FC = () => {
  const [provider, setProvider] = useState<'BEEM_AFRICA' | 'NEXTSMS' | 'TWILIO'>('BEEM_AFRICA');
  const [apiKey, setApiKey] = useState('beem_live_9384920483');
  const [secretKey, setSecretKey] = useState('••••••••••••••••');
  const [senderId, setSenderId] = useState('XCLOUD');
  const [isEnabled, setIsEnabled] = useState(true);
  const [smsBalance, setSmsBalance] = useState(482);
  const [smsTemplate, setSmsTemplate] = useState(
    'Habari! Vocha yako ya intaneti ni: {VOUCHER_CODE}. Kifurushi: {PACKAGE_NAME}. Asante kwa kujiunga na {HOTSPOT_NAME}!'
  );
  const [testPhone, setTestPhone] = useState('+255 784 000 000');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSendTestSms = () => {
    setIsSendingTest(true);
    setTestStatus(null);
    setTimeout(() => {
      setIsSendingTest(false);
      setTestStatus(`Test SMS dispatched to ${testPhone}! Check your phone.`);
      setSmsBalance((b) => Math.max(0, b - 1));
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          SMS Gateway Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Deliver instant hotspot vouchers and payment receipts to customers via Tanzanian SMS gateways
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Gateway Selection & Account Status */}
        <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#182233]">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">SMS Service Provider</h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Status:</span>
              <button
                type="button"
                onClick={() => setIsEnabled(!isEnabled)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                  isEnabled
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isEnabled ? 'ACTIVE' : 'DISABLED'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'BEEM_AFRICA',
                name: 'Beem Africa (Tanzania)',
                desc: 'Official Vodacom, Tigo, Airtel, Halotel aggregator',
              },
              {
                id: 'NEXTSMS',
                name: 'NextSMS Tanzania',
                desc: 'BoT compliant Tanzanian bulk SMS gateway',
              },
              {
                id: 'TWILIO',
                name: 'Twilio Global',
                desc: 'International SMS and WhatsApp API',
              },
            ].map((p) => (
              <div
                key={p.id}
                onClick={() => setProvider(p.id as any)}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  provider === p.id
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                    : 'bg-[#080c14] border-[#1e293b] text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold text-xs text-white">{p.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-mono">
                    {provider === p.id ? 'Selected' : 'Select'}
                  </span>
                  {provider === p.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              </div>
            ))}
          </div>

          {/* Balance Widget */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400">Available SMS Credits:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {smsBalance} SMS Credits Remaining
            </span>
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Secret Key / Password
              </label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Registered Sender ID
              </label>
              <input
                type="text"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                placeholder="XCLOUD"
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Voucher Delivery Template */}
        <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#182233]">
            <Smartphone className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Voucher SMS Notification Template</h3>
          </div>

          <div className="space-y-2 text-xs">
            <textarea
              rows={3}
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              className="w-full bg-[#080c14] border border-[#1e293b] rounded-xl p-3.5 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
            />
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
              <span className="text-slate-500">Available Variables:</span>
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono">
                {'{VOUCHER_CODE}'}
              </code>
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-mono">
                {'{PACKAGE_NAME}'}
              </code>
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400 font-mono">
                {'{HOTSPOT_NAME}'}
              </code>
            </div>
          </div>
        </div>

        {/* Live Test Dispatch */}
        <div className="bg-[#111724] border border-[#1e2738] rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Test Live Delivery
          </h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+255 7XX XXX XXX"
              className="w-full sm:w-64 bg-[#080c14] border border-[#1e293b] rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleSendTestSms}
              disabled={isSendingTest}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>{isSendingTest ? 'Sending...' : 'Send Test SMS'}</span>
            </button>
          </div>
          {testStatus && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{testStatus}</span>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {saved && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Check className="w-4 h-4" />
              <span>SMS gateway preferences saved!</span>
            </div>
          )}
          {!saved && <div />}

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <Save className="w-4 h-4" />
            <span>Save SMS Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
export default SettingsSmsView;
