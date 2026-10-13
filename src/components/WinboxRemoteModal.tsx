import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api.ts';
import { Router as RouterModel, RouterRemoteAccess } from '../types/index.ts';
import {
  Radio,
  ExternalLink,
  Copy,
  Check,
  Download,
  Terminal,
  Activity,
  Shield,
  Settings,
  Globe,
  Lock,
  RefreshCw,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Laptop,
} from 'lucide-react';

interface WinboxRemoteModalProps {
  router: RouterModel;
  onClose: () => void;
  onUpdate?: () => void;
}

export const WinboxRemoteModal: React.FC<WinboxRemoteModalProps> = ({
  router,
  onClose,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(true);
  const [remoteData, setRemoteData] = useState<{
    remoteAccess: RouterRemoteAccess;
    connectHost: string;
    winboxConnectString: string;
    winboxUri: string;
    webfigUrl: string;
    sshCommand: string;
  } | null>(null);

  const [scriptContent, setScriptContent] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: string;
    message: string;
    checkedAt: string;
  } | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'connect' | 'script' | 'settings' | 'guide'>('connect');

  // Form settings state
  const [method, setMethod] = useState<
    'MIKROTIK_CLOUD_DDNS' | 'WIREGUARD_TUNNEL' | 'SSTP_VPN' | 'PUBLIC_IP'
  >(router.remoteAccess?.method || 'MIKROTIK_CLOUD_DDNS');
  const [winboxPort, setWinboxPort] = useState(router.remoteAccess?.winboxPort || 8291);
  const [webfigPort, setWebfigPort] = useState(router.remoteAccess?.webfigPort || 80);
  const [sshPort, setSshPort] = useState(router.remoteAccess?.sshPort || 22);
  const [cloudDdnsHost, setCloudDdnsHost] = useState(router.remoteAccess?.cloudDdnsHost || '');
  const [allowedIpRanges, setAllowedIpRanges] = useState(
    router.remoteAccess?.allowedIpRanges || '0.0.0.0/0'
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchRemoteDetails();
    fetchRemoteScript();
  }, [router.id]);

  const fetchRemoteDetails = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.get(`/api/v1/routers/${router.id}/remote-access`);
      setRemoteData(res);
      if (res.remoteAccess) {
        setMethod(res.remoteAccess.method);
        setWinboxPort(res.remoteAccess.winboxPort || 8291);
        setWebfigPort(res.remoteAccess.webfigPort || 80);
        setSshPort(res.remoteAccess.sshPort || 22);
        setCloudDdnsHost(res.remoteAccess.cloudDdnsHost || '');
        setAllowedIpRanges(res.remoteAccess.allowedIpRanges || '0.0.0.0/0');
      }
    } catch (err: any) {
      console.error('Failed to load remote access details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRemoteScript = async () => {
    try {
      const res = await ApiClient.get(`/api/v1/routers/${router.id}/remote-access/script`);
      setScriptContent(res.script);
    } catch (err: any) {
      console.error('Failed to load script:', err);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await ApiClient.post(`/api/v1/routers/${router.id}/remote-access/test`);
      setTestResult({
        status: res.status,
        message: res.message,
        checkedAt: new Date(res.checkedAt).toLocaleTimeString(),
      });
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setTestResult({
        status: 'UNREACHABLE',
        message: err.message || 'Remote port 8291 probe timed out.',
        checkedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      await ApiClient.post(`/api/v1/routers/${router.id}/remote-access`, {
        enabled: true,
        method,
        winboxPort: Number(winboxPort),
        webfigPort: Number(webfigPort),
        sshPort: Number(sshPort),
        cloudDdnsHost,
        allowedIpRanges,
      });
      setSaveSuccess(true);
      await fetchRemoteDetails();
      await fetchRemoteScript();
      if (onUpdate) onUpdate();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const downloadRscFile = () => {
    if (!scriptContent) return;
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `winbox_remote_${router.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.rsc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const defaultConnectString = remoteData?.winboxConnectString || `${router.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.sn.mynetname.net:8291`;
  const defaultWebfigUrl = remoteData?.webfigUrl || `http://${defaultConnectString.split(':')[0]}`;
  const defaultSshCommand = remoteData?.sshCommand || `ssh admin@${defaultConnectString.split(':')[0]} -p 22`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  WinBox Remote Access — {router.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800">
                  Port {winboxPort}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                  RouterOS v7
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connect your physical WinBox software from any PC or mobile app through MikroTik Cloud DDNS &amp; BTH VPN
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-800 flex gap-4 bg-slate-950/30">
          <button
            onClick={() => setActiveTab('connect')}
            className={`pb-2.5 text-xs font-semibold cursor-pointer border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'connect'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Quick Connect
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`pb-2.5 text-xs font-semibold cursor-pointer border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'script'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> RouterOS Script (.rsc)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 text-xs font-semibold cursor-pointer border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Ports &amp; Security
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 text-xs font-semibold cursor-pointer border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" /> WinBox Instructions
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'connect' && (
            <div className="space-y-5">
              {/* Primary WinBox Connection Hero Card */}
              <div className="bg-gradient-to-br from-slate-900 to-sky-950/40 border border-sky-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" /> WinBox &quot;Connect To&quot; Address
                    </span>
                    <div className="font-mono text-lg sm:text-xl font-bold text-white tracking-wide select-all bg-slate-950/80 px-3.5 py-2 rounded-xl border border-sky-500/20 inline-block">
                      {defaultConnectString}
                    </div>
                    <p className="text-xs text-slate-300">
                      Copy this address and paste it directly into the <strong>Connect To:</strong> field in WinBox.
                    </p>
                  </div>

                  <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(defaultConnectString, 'winbox-address')}
                      className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-sky-600/20"
                    >
                      {copiedKey === 'winbox-address' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300" /> Copied Address!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copy WinBox Address
                        </>
                      )}
                    </button>

                    <a
                      href={`winbox://${defaultConnectString}`}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 justify-center cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400" /> Open in WinBox App
                    </a>
                  </div>
                </div>
              </div>

              {/* Management Access Protocol Row (WebFig & SSH) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* WebFig Browser GUI */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-emerald-400" /> WebFig Browser Access
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                        HTTP Port {webfigPort}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">
                      Access MikroTik graphical WebFig dashboard directly in your web browser.
                    </p>
                    <div className="font-mono text-xs text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 truncate mb-3">
                      {defaultWebfigUrl}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={defaultWebfigUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800 text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Launch WebFig
                    </a>
                    <button
                      onClick={() => handleCopy(defaultWebfigUrl, 'webfig-url')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'webfig-url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* SSH Terminal */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-amber-400" /> SSH Command-Line Access
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                        SSH Port {sshPort}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">
                      Connect via terminal on Mac, Linux, or Windows PowerShell.
                    </p>
                    <div className="font-mono text-xs text-amber-300 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 truncate mb-3">
                      {defaultSshCommand}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(defaultSshCommand, 'ssh-cmd')}
                    className="self-start px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === 'ssh-cmd' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Command
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy SSH Command
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Real-time Connectivity Diagnostic Test */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" /> Remote Access Health &amp; Port 8291 Probe
                  </h4>
                  <p className="text-xs text-slate-400">
                    Verify that your router has updated its MikroTik Cloud DDNS and accepted the remote WinBox firewall rule.
                  </p>
                  {testResult && (
                    <div className="mt-2 text-xs flex items-center gap-2 text-slate-300">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          testResult.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                      <span>{testResult.message}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({testResult.checkedAt})
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-sky-400' : ''}`} />
                  {testing ? 'Probing Port 8291...' : 'Run Connectivity Check'}
                </button>
              </div>

              {/* CGNAT Traversal Note */}
              <div className="bg-sky-950/30 border border-sky-800/40 rounded-xl p-3.5 flex items-start gap-3">
                <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-sky-200">
                    Carrier-Grade NAT (CGNAT) &amp; Dynamic IP Friendly
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    XCLOUD uses MikroTik&apos;s native RouterOS v7 <strong>Cloud DDNS</strong> and <strong>Back-To-Home (BTH) VPN</strong>. Even if your router is using mobile 4G/5G data (Vodacom, Tigo, Airtel, Halotel) or Starlink behind CGNAT, WinBox connects directly using your router&apos;s unique hardware token without requiring expensive public static IP SIM cards.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Standalone RouterOS WinBox Enablement Script (.rsc)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Run this script in MikroTik WinBox Terminal to enable port 8291, WebFig, Cloud DDNS, and firewall input rules.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(scriptContent, 'script-all')}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-600/20"
                  >
                    {copiedKey === 'script-all' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Script
                      </>
                    )}
                  </button>

                  <button
                    onClick={downloadRscFile}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download .rsc
                  </button>
                </div>
              </div>

              {/* Terminal Code Viewer */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-sky-200 leading-relaxed overflow-x-auto max-h-[380px] space-y-1">
                <pre>{scriptContent || '# Loading WinBox configuration script...'}</pre>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Quick Terminal Command: Open Terminal in WinBox, paste the script above, and press Enter.
                </span>
                <span className="font-mono text-sky-400">/ip cloud force-update</span>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4 h-4 text-sky-400" /> Remote Access Parameters
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Remote Access Method */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Connection Method
                    </label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-sky-500"
                    >
                      <option value="MIKROTIK_CLOUD_DDNS">
                        MikroTik Cloud DDNS &amp; Back-To-Home (Recommended - No Static IP Needed)
                      </option>
                      <option value="WIREGUARD_TUNNEL">
                        WireGuard / VPN Relay Tunnel (Encrypted CGNAT Traversal)
                      </option>
                      <option value="SSTP_VPN">
                        SSTP VPN Tunnel (TCP 443 / Strict Firewall Bypass)
                      </option>
                      <option value="PUBLIC_IP">
                        Public Static IP / Upstream Port Forwarding
                      </option>
                    </select>
                  </div>

                  {/* WinBox Port */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      WinBox Management Port
                    </label>
                    <input
                      type="number"
                      value={winboxPort}
                      onChange={(e) => setWinboxPort(Number(e.target.value))}
                      placeholder="8291"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-sky-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Standard MikroTik WinBox port is 8291.
                    </p>
                  </div>

                  {/* WebFig Port */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      WebFig (HTTP) Port
                    </label>
                    <input
                      type="number"
                      value={webfigPort}
                      onChange={(e) => setWebfigPort(Number(e.target.value))}
                      placeholder="80"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-sky-500"
                    />
                  </div>

                  {/* SSH Port */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      SSH Port
                    </label>
                    <input
                      type="number"
                      value={sshPort}
                      onChange={(e) => setSshPort(Number(e.target.value))}
                      placeholder="22"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Cloud DDNS Domain */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Custom Cloud DDNS / Domain Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={cloudDdnsHost}
                    onChange={(e) => setCloudDdnsHost(e.target.value)}
                    placeholder="e.g. 72a801b2c3d4.sn.mynetname.net or router1.mydomain.tz"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-sky-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Found on your router under <code>/ip cloud print</code>.
                  </p>
                </div>

                {/* IP Whitelist Security */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Allowed IP Whitelist (CIDR)
                  </label>
                  <input
                    type="text"
                    value={allowedIpRanges}
                    onChange={(e) => setAllowedIpRanges(e.target.value)}
                    placeholder="0.0.0.0/0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-sky-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Set <code>0.0.0.0/0</code> to allow connection from any internet location, or specify your office static IP (e.g. <code>196.249.12.0/24</code>) for heightened security.
                  </p>
                </div>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-600 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Remote access configuration saved! Updated scripts have been generated.
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Remote Access Configuration
                </button>
              </div>
            </form>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-sky-400" /> Step-by-Step WinBox Connection Guide
                </h4>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 font-bold">
                      1
                    </span>
                    <div>
                      <h5 className="font-bold text-white">Execute Script on MikroTik</h5>
                      <p className="text-slate-400 mt-0.5">
                        Open <strong>Terminal</strong> in WinBox or SSH into your router locally. Paste the script from the <strong>RouterOS Script (.rsc)</strong> tab and hit Enter.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 font-bold">
                      2
                    </span>
                    <div>
                      <h5 className="font-bold text-white">Locate MikroTik Cloud DNS</h5>
                      <p className="text-slate-400 mt-0.5">
                        In RouterOS Terminal, type: <code>/ip cloud print</code>. Notice the <code>dns-name</code> (e.g. <code>520008abcdef.sn.mynetname.net</code>).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 font-bold">
                      3
                    </span>
                    <div>
                      <h5 className="font-bold text-white">Open WinBox on PC / Laptop</h5>
                      <p className="text-slate-400 mt-0.5">
                        Launch the latest WinBox v3.40+ or WinBox v4 from the official MikroTik website.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 font-bold">
                      4
                    </span>
                    <div>
                      <h5 className="font-bold text-white">Connect Remotely</h5>
                      <p className="text-slate-400 mt-0.5">
                        In the <strong>Connect To:</strong> box, enter: <code>{defaultConnectString}</code>. Fill in your admin login and password, then click <strong>Connect</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Encrypted RouterOS v7 Tunnel with Port 8291 Security Filters</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
