import React, { useState } from 'react';
import { ApiClient } from '../lib/api.ts';
import { Router as RouterModel } from '../types/index.ts';
import { RouterInstallWizard } from './RouterInstallWizard.tsx';
import {
  Radio,
  Plus,
  Terminal,
  Copy,
  Download,
  Check,
  Activity,
  AlertCircle,
  HelpCircle,
  Trash2,
  ExternalLink,
  Zap,
  FileCode,
  BookOpen,
  Layers,
  Settings,
  ShieldCheck,
} from 'lucide-react';

interface RoutersViewProps {
  routers: RouterModel[];
  deviceLimit: number;
  onRefresh: () => void;
}

export const RoutersView: React.FC<RoutersViewProps> = ({
  routers,
  deviceLimit,
  onRefresh,
}) => {
  const [showWizard, setShowWizard] = useState(false);

  // Script viewer state for existing routers
  const [selectedRouter, setSelectedRouter] = useState<RouterModel | null>(null);
  const [scriptData, setScriptData] = useState<{ script: string; bootstrapUrl?: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'auto' | 'manual' | 'guide'>('manual');

  const handleDeleteRouter = async (id: string) => {
    if (!confirm('Are you sure you want to remove this router from your organization?')) return;
    try {
      await ApiClient.delete(`/api/v1/routers/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenScript = async (router: RouterModel) => {
    setSelectedRouter(router);
    setScriptData(null);
    setCopied(false);

    try {
      // 1. Fetch script content
      const scriptRes = await ApiClient.get(`/api/v1/routers/${router.id}/script`);
      // 2. Fetch fresh installation token
      const tokenRes = await ApiClient.post(`/api/v1/routers/${router.id}/installation-token`);

      setScriptData({
        script: scriptRes.script,
        bootstrapUrl: tokenRes.bootstrapUrl,
      });
    } catch (err: any) {
      alert(`Error loading installation script: ${err.message}`);
    }
  };

  const handleTestHeartbeat = async (routerId: string) => {
    try {
      await ApiClient.post(`/api/v1/routers/${routerId}/heartbeat`, {
        identity: 'MikroTik-Test-Terminal',
        rosVersion: '7.15.2',
        activeHotspotUsers: 5,
        uptime: '2d 04:12:00',
        cpuLoad: 8,
        freeMemory: 114200000,
      });
      alert('Heartbeat telemetry signal acknowledged! Router marked ONLINE.');
      onRefresh();
    } catch (err: any) {
      alert(`Heartbeat error: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadRscFile = () => {
    if (!scriptData || !selectedRouter) return;
    const blob = new Blob([scriptData.script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xcloud_${selectedRouter.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.rsc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-400" /> MikroTik &amp; RouterOS Gateways
          </h2>
          <p className="text-xs text-slate-400">
            RouterOS v7 prioritized management, manual .rsc script generation, 1-click bootstrap, and real-time telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-semibold">
            {routers.length} of {deviceLimit} Routers Registered
          </span>
          <button
            onClick={() => setShowWizard(true)}
            disabled={routers.length >= deviceLimit}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" /> Add Router Wizard
          </button>
        </div>
      </div>

      {/* Quick Overview Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Manual .rsc Script</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Production script with version safety checks, pre-install backups, and interface mappings.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Automatic HTTPS Install</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              1-line terminal command fetches encrypted config over HTTPS via secure bootstrap token.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">RADIUS AAA Accounting</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Standard RFC2865/2866 accounting with 2-minute interim telemetry and walled-garden bypass.
            </p>
          </div>
        </div>
      </div>

      {/* Routers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routers.map((router) => {
          const isOnline = router.status === 'ONLINE';
          const netCfg = router.networkConfig;
          return (
            <div
              key={router.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1.5 ${
                      isOnline
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : router.status === 'UNCONFIGURED'
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                      }`}
                    />
                    {router.status}
                  </span>

                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                    RouterOS {router.rosVersion || 'v7'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white truncate">{router.name}</h3>
                <p className="text-xs text-slate-400 truncate">
                  {router.location || 'Location Not Specified'}
                </p>

                <div className="mt-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>IP / Gateway:</span>
                    <span className="font-mono text-slate-200">
                      {netCfg?.gatewayIp || router.ipAddress || '10.10.20.1/24'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Hotspot DNS:</span>
                    <span className="font-mono text-slate-200">
                      {netCfg?.dnsName || router.dnsName || 'wifi.xcloudtz.net'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>WAN Uplink:</span>
                    <span className="font-mono text-slate-200">
                      {netCfg?.wanInterface || 'ether1'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Last Telemetry:</span>
                    <span className="text-slate-300 text-[11px]">
                      {router.lastHeartbeat
                        ? new Date(router.lastHeartbeat).toLocaleTimeString()
                        : 'Never (Pending Script Run)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenScript(router)}
                  className="px-3 py-1.5 bg-sky-950 text-sky-300 hover:bg-sky-900 border border-sky-800 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" /> Setup Script (.rsc)
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTestHeartbeat(router.id)}
                    title="Simulate / Send Live Heartbeat Ping"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRouter(router.id)}
                    title="Remove Router"
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {routers.length === 0 && (
          <div className="col-span-full p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
            No routers registered yet. Click &quot;Add Router Wizard&quot; above to connect your first MikroTik
            gateway using automated or manual script installation.
          </div>
        )}
      </div>

      {/* Script & Installation Modal for Existing Routers */}
      {selectedRouter && scriptData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-sky-400" />
                  Provisioning: {selectedRouter.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Target: MikroTik RouterOS v7.x / v6.x • DNS: {selectedRouter.dnsName || 'wifi.xcloudtz.net'}
                </p>
              </div>
              <button
                onClick={() => setSelectedRouter(null)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="px-5 pt-3 border-b border-slate-800 flex gap-4">
              <button
                onClick={() => setActiveTab('manual')}
                className={`pb-2 text-xs font-semibold cursor-pointer border-b-2 transition ${
                  activeTab === 'manual'
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Manual Script (.rsc)
              </button>
              <button
                onClick={() => setActiveTab('auto')}
                className={`pb-2 text-xs font-semibold cursor-pointer border-b-2 transition ${
                  activeTab === 'auto'
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-400'
                }`}
              >
                1-Line Bootstrap Command
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`pb-2 text-xs font-semibold cursor-pointer border-b-2 transition ${
                  activeTab === 'guide'
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-400'
                }`}
              >
                WinBox Instructions
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {activeTab === 'manual' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-300">
                      Generated RouterOS .rsc Script:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={downloadRscFile}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-sky-400 rounded-lg flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Download .rsc
                      </button>
                      <button
                        onClick={() => copyToClipboard(scriptData.script)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-80">
                    {scriptData.script}
                  </pre>
                </>
              )}

              {activeTab === 'auto' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    Run this in MikroTik Terminal:
                  </label>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-300 flex items-center justify-between gap-3">
                    <span className="truncate">
                      /tool fetch url=&quot;{scriptData.bootstrapUrl}&quot; dst-path=xcloud.rsc; /import
                      xcloud.rsc
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `/tool fetch url="${scriptData.bootstrapUrl}" dst-path=xcloud.rsc; /import xcloud.rsc`
                        )
                      }
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'guide' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="font-bold text-white block">Step 1: Upload or Paste</span>
                    <p className="text-slate-400">
                      In WinBox, open <strong>Files</strong> and drop the downloaded <code className="text-amber-300 font-mono">.rsc</code> file, or open <strong>New Terminal</strong> and paste the script directly.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="font-bold text-white block">Step 2: RADIUS AAA &amp; Port Verification</span>
                    <p className="text-slate-400">
                      Check <strong>Radius</strong> menu in WinBox to confirm the entry with service=hotspot is active. Check <strong>IP &rarr; Hotspot</strong> to see the server and walled garden rules.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="font-bold text-white block">Step 3: Verification &amp; Heartbeat</span>
                    <p className="text-slate-400">
                      The scheduler posts telemetry every 2 minutes. Click the activity icon next to the router to simulate or verify heartbeat updates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Router Installation Wizard Modal */}
      {showWizard && (
        <RouterInstallWizard
          deviceLimit={deviceLimit}
          currentCount={routers.length}
          onClose={() => setShowWizard(false)}
          onSuccess={(newRouter) => {
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
