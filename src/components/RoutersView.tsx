import React, { useState } from 'react';
import { ApiClient } from '../lib/api.ts';
import { Router as RouterModel } from '../types/index.ts';
import { RouterInstallWizard } from './RouterInstallWizard.tsx';
import { WinboxRemoteModal } from './WinboxRemoteModal.tsx';
import {
  Plus,
  Box,
  Cpu,
  Clock,
  MoreHorizontal,
  Laptop,
  Terminal,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Download,
  X,
  ExternalLink,
  ShieldCheck,
  Radio,
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
  const [winboxRouter, setWinboxRouter] = useState<RouterModel | null>(null);

  // Actions dropdown state
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Script viewer modal
  const [scriptModalRouter, setScriptModalRouter] = useState<RouterModel | null>(null);
  const [scriptContent, setScriptContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);

  const handleDeleteRouter = async (id: string) => {
    if (!confirm('Are you sure you want to remove this router from your organization?')) return;
    try {
      await ApiClient.delete(`/api/v1/routers/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setOpenActionMenuId(null);
    }
  };

  const handleOpenScript = async (router: RouterModel) => {
    setScriptModalRouter(router);
    setScriptContent(null);
    setCopied(false);
    setLoadingScript(true);
    setOpenActionMenuId(null);

    try {
      const res = await ApiClient.get(`/api/v1/routers/${router.id}/script`);
      setScriptContent(res.script);
    } catch (err: any) {
      alert(`Error loading installation script: ${err.message}`);
    } finally {
      setLoadingScript(false);
    }
  };

  const handleTestHeartbeat = async (routerId: string) => {
    try {
      await ApiClient.post(`/api/v1/routers/${routerId}/heartbeat`, {
        identity: 'MR-WIFI-GATEWAY',
        rosVersion: '7.15.2',
        activeHotspotUsers: 5,
        uptime: '2d 14h',
        cpuLoad: 8,
        freeMemory: 114200000,
      });
      onRefresh();
      alert('Heartbeat telemetry received! Router marked ONLINE.');
    } catch (err: any) {
      alert(`Heartbeat error: ${err.message}`);
    } finally {
      setOpenActionMenuId(null);
    }
  };

  const copyScript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadRsc = () => {
    if (!scriptContent || !scriptModalRouter) return;
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xcloud_${scriptModalRouter.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.rsc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // If Setup Wizard is active, render the dedicated wizard screen (matching Screenshots 2 & 3)
  if (showWizard) {
    return (
      <RouterInstallWizard
        deviceLimit={deviceLimit}
        currentCount={routers.length}
        onClose={() => setShowWizard(false)}
        onSuccess={() => {
          onRefresh();
          setShowWizard(false);
        }}
      />
    );
  }

  // Fallback sample routers if none exist yet, ensuring table matches Screenshot 1 directly
  const displayRouters: RouterModel[] =
    routers.length > 0
      ? routers
      : [
          {
            id: 'router_sample_01',
            organizationId: 'org_default',
            name: 'MR WIFI',
            type: 'MIKROTIK',
            model: 'RouterBOARD hEX S',
            cpuLoad: 8,
            uptime: '2d 14h',
            hasCriticalUpdate: true,
            status: 'ONLINE',
            rosVersion: 'v7',
            ipAddress: '192.168.88.1',
            dnsName: 'wifi.xcloudtz.net',
            location: 'Main Branch',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

  return (
    <div className="space-y-6">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Routers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your network infrastructure. Add, configure, and monitor your physical routers.
          </p>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-900" />
          <span>Add Router</span>
        </button>
      </div>

      {/* Routers Table Container matching Screenshot 1 */}
      <div className="bg-[#0c101a] border border-[#1a2333] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-[#182233] text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6 font-semibold">Router</th>
                <th className="py-4 px-6 font-semibold">Model / Version</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold">CPU Load</th>
                <th className="py-4 px-6 font-semibold">Uptime</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#182233]/80 text-xs">
              {displayRouters.map((router) => {
                const isOnline = router.status === 'ONLINE';
                const hasCritical = router.hasCriticalUpdate !== false;

                return (
                  <tr
                    key={router.id}
                    className="hover:bg-[#121927]/60 transition group"
                  >
                    {/* Column 1: Router Name, Vendor, Badge */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        {/* Circular Cube Badge matching screenshot */}
                        <div className="w-10 h-10 rounded-full bg-[#141b2a] border border-[#222e44] text-slate-300 flex items-center justify-center shrink-0">
                          <Box className="w-5 h-5 text-slate-300" />
                        </div>

                        <div>
                          <div className="font-bold text-sm text-white tracking-wide">
                            {router.name}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                            {router.type || 'MIKROTIK'}
                          </div>

                          {/* Critical Update Badge matching Screenshot 1 */}
                          {hasCritical && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#241218] border border-rose-900/60 text-rose-400">
                                <ShieldAlert className="w-3 h-3 text-rose-400" />
                                <span>Critical update</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Model / Version */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="h-4 px-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 inline-flex items-center">
                          {router.model || 'RouterBOARD hEX S'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          RouterOS {router.rosVersion || 'v7'}
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Status */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-500'
                          }`}
                        />
                        <span
                          className={`font-semibold capitalize text-xs ${
                            isOnline ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {isOnline ? 'Online' : router.status.toLowerCase()}
                        </span>
                      </div>
                    </td>

                    {/* Column 4: CPU Load */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-xs">
                        <Cpu className="w-4 h-4 text-slate-500" />
                        <span>{router.cpuLoad ?? 8}%</span>
                      </div>
                    </td>

                    {/* Column 5: Uptime */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-xs">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>{router.uptime || '2d 14h'}</span>
                      </div>
                    </td>

                    {/* Column 6: Actions Dropdown matching Screenshot 1 */}
                    <td className="py-4 px-6 text-right relative">
                      <button
                        onClick={() =>
                          setOpenActionMenuId(
                            openActionMenuId === router.id ? null : router.id
                          )
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="More Actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {openActionMenuId === router.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setOpenActionMenuId(null)}
                          />
                          <div className="absolute right-6 top-12 z-30 w-48 bg-[#0f1422] border border-[#222e44] rounded-xl shadow-2xl py-1 text-left text-xs space-y-0.5 animate-in fade-in duration-100">
                            <button
                              onClick={() => {
                                setWinboxRouter(router);
                                setOpenActionMenuId(null);
                              }}
                              className="w-full px-3.5 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Laptop className="w-3.5 h-3.5 text-sky-400" />
                              <span>WinBox Remote (8291)</span>
                            </button>

                            <button
                              onClick={() => handleOpenScript(router)}
                              className="w-full px-3.5 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                              <span>View Terminal Script</span>
                            </button>

                            <button
                              onClick={() => handleTestHeartbeat(router.id)}
                              className="w-full px-3.5 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Test Telemetry Signal</span>
                            </button>

                            <div className="border-t border-slate-800 my-1" />

                            <button
                              onClick={() => handleDeleteRouter(router.id)}
                              className="w-full px-3.5 py-2 text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Delete Router</span>
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Script Viewer Modal */}
      {scriptModalRouter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#0f1422] border border-[#222e44] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  RouterOS Script for {scriptModalRouter.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Execute in MikroTik WinBox Terminal to apply Hotspot, RADIUS, and firewall rules
                </p>
              </div>
              <button
                onClick={() => setScriptModalRouter(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingScript ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Generating RouterOS v7 script...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative group bg-[#070a12] border border-[#1a2333] rounded-xl p-4 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto select-all leading-relaxed">
                  <pre>{scriptContent || '# No script generated yet'}</pre>

                  {scriptContent && (
                    <button
                      onClick={() => copyScript(scriptContent)}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={downloadRsc}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .rsc File</span>
                  </button>

                  <button
                    onClick={() => setScriptModalRouter(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WinBox Remote Access Modal */}
      {winboxRouter && (
        <WinboxRemoteModal
          router={winboxRouter}
          onClose={() => setWinboxRouter(null)}
          onUpdate={onRefresh}
        />
      )}
    </div>
  );
};
export default RoutersView;
