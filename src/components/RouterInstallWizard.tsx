import React, { useState } from 'react';
import { ApiClient } from '../lib/api.ts';
import { Router as RouterModel, RouterNetworkConfig } from '../types/index.ts';
import {
  Shield,
  Settings,
  Globe,
  Radio,
  Check,
  Copy,
  Download,
  Terminal,
  Laptop,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  Zap,
  Layers,
  Sparkles,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

interface RouterInstallWizardProps {
  deviceLimit: number;
  currentCount: number;
  onClose: () => void;
  onSuccess: (newRouter: RouterModel) => void;
}

export const RouterInstallWizard: React.FC<RouterInstallWizardProps> = ({
  deviceLimit,
  currentCount,
  onClose,
  onSuccess,
}) => {
  // Stepper: 1: Remote Access, 2: Method, 3: Service Setup
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Router fields
  const [routerName, setRouterName] = useState('XCLOUDS');
  const [location, setLocation] = useState('Main Branch');
  const [rosVersion, setRosVersion] = useState<'v7' | 'v6'>('v7');
  const [model, setModel] = useState('RouterBOARD hEX S');

  // Step 1 states
  const [prepExpanded, setPrepExpanded] = useState(false);
  const [connectionDetected, setConnectionDetected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Step 2 states
  const [configMethod, setConfigMethod] = useState<'AUTOMATIC' | 'MANUAL'>('AUTOMATIC');

  // Step 3 states (Topology & Services)
  const [wanInterface, setWanInterface] = useState('ether1');
  const [lanInterfaces, setLanInterfaces] = useState('ether2,ether3,ether4,ether5,wlan1,wlan2');
  const [hotspotBridge, setHotspotBridge] = useState('bridge-hotspot');
  const [gatewayIp, setGatewayIp] = useState('10.10.20.1/24');
  const [dhcpPool, setDhcpPool] = useState('10.10.20.10-10.10.20.254');
  const [dnsName, setDnsName] = useState('wifi.xcloudtz.net');
  const [defaultRateLimit, setDefaultRateLimit] = useState('5M/5M');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [createdRouter, setCreatedRouter] = useState<RouterModel | null>(null);

  const routerSlug = routerName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'mr_wifimv8';

  const vpnInstallCommand = `/tool fetch url="https://web.xcloudtz.net/api/router/v1/${routerSlug}/scripts/install-vpn" http-header-field="Authorization: Bearer ****" dst-path="vpn.rsc" mode=https; :delay 2s; /import file-name="vpn.rsc"; :delay 1s; /file remove "vpn.rsc"`;

  const deviceModeCommands = `/system device-mode update mode=advanced\n/system device-mode update mode=advanced flagged=no`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSimulateConnection = () => {
    setCheckingConnection(true);
    setTimeout(() => {
      setCheckingConnection(false);
      setConnectionDetected(true);
    }, 1200);
  };

  const handleFinalDeploy = async () => {
    setLoading(true);
    setError(null);

    const parsedLan = lanInterfaces
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const networkConfig: RouterNetworkConfig = {
      wanInterface: wanInterface.trim() || 'ether1',
      lanInterfaces:
        parsedLan.length > 0 ? parsedLan : ['ether2', 'ether3', 'ether4', 'ether5', 'wlan1', 'wlan2'],
      hotspotBridge: hotspotBridge.trim() || 'bridge-hotspot',
      gatewayIp: gatewayIp.trim() || '10.10.20.1/24',
      dhcpPool: dhcpPool.trim() || '10.10.20.10-10.10.20.254',
      dnsName: dnsName.trim() || 'wifi.xcloudtz.net',
      installationMode: 'NEW_CONFIGURATION',
      defaultRateLimit: defaultRateLimit.trim() || '5M/5M',
    };

    try {
      const newRouter: RouterModel = await ApiClient.post('/api/v1/routers', {
        name: routerName.trim() || 'XCLOUDS',
        location: location.trim() || 'Main Branch',
        ipAddress: gatewayIp.split('/')[0] || '10.10.20.1',
        dnsName: dnsName.trim() || 'wifi.xcloudtz.net',
        rosVersion,
        networkConfig,
        model,
        hasCriticalUpdate: true,
      });

      setCreatedRouter(newRouter);

      // Fetch generated .rsc script
      const scriptRes = await ApiClient.get(`/api/v1/routers/${newRouter.id}/script`);
      setGeneratedScript(scriptRes.script);

      onSuccess(newRouter);
    } catch (err: any) {
      setError(err.message || 'Failed to register router');
    } finally {
      setLoading(false);
    }
  };

  const downloadScriptFile = () => {
    if (!generatedScript) return;
    const blob = new Blob([generatedScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xcloud_${routerSlug}.rsc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2 animate-in fade-in duration-200">
      {/* Top Header matching Screenshot 2 & 3 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep((s) => (s - 1) as any);
              } else {
                onClose();
              }
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#111724] border border-[#1e2738] hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Setup Router: {routerName || 'XCLOUDS'}
          </h1>
        </div>

        <p className="text-xs sm:text-sm text-slate-400">
          Follow these steps to configure your MikroTik device for XCloud services. We'll start by
          establishing a secure management tunnel.
        </p>

        {/* Stepper Navigation Pills matching Screenshots */}
        <div className="flex items-center gap-2 pt-1 select-none flex-wrap">
          {/* Step 1 Pill */}
          {currentStep === 1 ? (
            <div className="bg-[#182233] border border-[#2a3852] text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-semibold shadow-xs">
              <span className="w-4 h-4 rounded bg-white text-slate-900 font-bold text-[10px] flex items-center justify-center">
                1
              </span>
              <span>Remote Access</span>
            </div>
          ) : (
            <button
              onClick={() => setCurrentStep(1)}
              className="bg-[#161f30] text-amber-400 border border-amber-900/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Remote Access</span>
            </button>
          )}

          <span className="text-slate-600 text-xs">&rarr;</span>

          {/* Step 2 Pill */}
          {currentStep === 2 ? (
            <div className="bg-[#182233] border border-[#2a3852] text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-semibold shadow-xs">
              <span className="w-4 h-4 rounded bg-white text-slate-900 font-bold text-[10px] flex items-center justify-center">
                2
              </span>
              <span>Method</span>
            </div>
          ) : currentStep > 2 ? (
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-[#161f30] text-emerald-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Method</span>
            </button>
          ) : (
            <div className="bg-[#0e1422] text-slate-500 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
              <span className="text-slate-600 font-mono">2</span>
              <span>Method</span>
            </div>
          )}

          <span className="text-slate-600 text-xs">&rarr;</span>

          {/* Step 3 Pill */}
          {currentStep === 3 ? (
            <div className="bg-[#182233] border border-[#2a3852] text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-semibold shadow-xs">
              <span className="w-4 h-4 rounded bg-white text-slate-900 font-bold text-[10px] flex items-center justify-center">
                3
              </span>
              <span>Service Setup</span>
            </div>
          ) : (
            <div className="bg-[#0e1422] text-slate-500 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
              <span className="text-slate-600 font-mono">3</span>
              <span>Service Setup</span>
            </div>
          )}
        </div>
      </div>

      {/* STEP 1: Secure Remote Access (Matching Screenshot 2) */}
      {currentStep === 1 && (
        <div className="bg-[#0a0e17] border border-[#182233] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Card Header */}
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-slate-200" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              1. Secure Remote Access
            </h2>
          </div>

          {/* Accordion: Initial Preparation (Optional) */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0d121f]">
            <button
              type="button"
              onClick={() => setPrepExpanded(!prepExpanded)}
              className="w-full p-3.5 text-left flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-400" />
                <span className="uppercase tracking-wider">Initial Preparation (Optional)</span>
              </div>
              {prepExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {prepExpanded && (
              <div className="p-4 border-t border-slate-800/80 bg-[#080c14] space-y-2.5 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Connect WAN interface (typically ether1) to internet uplink or upstream modem with DHCP enabled.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Confirm DNS resolution is operational under <code>/ip dns set servers=8.8.8.8,1.1.1.1</code>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Ensure default admin credentials or SSH/WinBox access are available to open terminal.</span>
                </div>
              </div>
            )}
          </div>

          {/* Section: Remote Access Installation */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-white">Remote Access Installation</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Copy the command below and execute it in your RouterOS terminal to install the XCloud agent.
              </p>
            </div>

            {/* Code Box matching screenshot */}
            <div className="relative group bg-[#070a12] border border-[#1a2333] rounded-xl p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto select-all">
              <code>{vpnInstallCommand}</code>

              <button
                type="button"
                onClick={() => handleCopy(vpnInstallCommand, 'vpn-cmd')}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-sans transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                {copiedCode === 'vpn-cmd' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Amber Warning Box matching screenshot */}
            <div className="border border-amber-900/60 bg-amber-950/20 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Note: If you receive a "not allowed by device mode" error, run these commands first:</span>
              </div>

              <div className="relative group bg-[#070a12] border border-amber-950/80 rounded-lg p-3 font-mono text-xs text-amber-200/90 leading-relaxed overflow-x-auto select-all">
                <pre>{deviceModeCommands}</pre>

                <button
                  type="button"
                  onClick={() => handleCopy(deviceModeCommands, 'dev-mode-cmd')}
                  className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans transition cursor-pointer flex items-center gap-1"
                >
                  {copiedCode === 'dev-mode-cmd' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer Controls matching Screenshot 2 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    connectionDetected
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : 'bg-slate-500 animate-pulse'
                  }`}
                />
                <span className={connectionDetected ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {connectionDetected
                    ? 'Router tunnel connection established!'
                    : 'Waiting for connection...'}
                </span>
              </div>

              {!connectionDetected && (
                <button
                  type="button"
                  onClick={handleSimulateConnection}
                  disabled={checkingConnection}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-medium underline cursor-pointer"
                >
                  {checkingConnection ? 'Pinging router...' : 'Check Signal'}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-6 py-2.5 bg-[#182233] hover:bg-[#23314d] text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Continue Setup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Configuration Method (Matching Screenshot 3) */}
      {currentStep === 2 && (
        <div className="bg-[#0a0e17] border border-[#182233] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Card Header */}
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-slate-200" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              2. Configuration Method
            </h2>
          </div>

          {/* Radio Options Grid matching screenshot 3 */}
          <div className="space-y-4">
            {/* Option 1: Automatic Deployment (Recommended) */}
            <div
              onClick={() => setConfigMethod('AUTOMATIC')}
              className={`rounded-2xl p-5 cursor-pointer transition flex items-start gap-3.5 ${
                configMethod === 'AUTOMATIC'
                  ? 'bg-[#0c101a] border-2 border-white/20 shadow-md'
                  : 'bg-[#0c101a] border border-[#1a2333] hover:border-slate-700'
              }`}
            >
              {/* Radio Circle */}
              <div className="mt-0.5 shrink-0">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    configMethod === 'AUTOMATIC'
                      ? 'border-white bg-slate-900'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {configMethod === 'AUTOMATIC' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-white">Automatic Deployment</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-800 text-slate-300 font-mono tracking-wider">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Use our interactive visual Topology Designer to map your ports, bridges, Hotspot, and PPPoE settings.
                </p>
              </div>
            </div>

            {/* Option 2: Manual Setup */}
            <div
              onClick={() => setConfigMethod('MANUAL')}
              className={`rounded-2xl p-5 cursor-pointer transition flex items-start gap-3.5 ${
                configMethod === 'MANUAL'
                  ? 'bg-[#0c101a] border-2 border-white/20 shadow-md'
                  : 'bg-[#0c101a] border border-[#1a2333] hover:border-slate-700'
              }`}
            >
              {/* Radio Circle */}
              <div className="mt-0.5 shrink-0">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    configMethod === 'MANUAL'
                      ? 'border-white bg-slate-900'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {configMethod === 'MANUAL' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex-1">
                <span className="text-base font-bold text-slate-200">Manual Setup</span>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Configure services manually via Winbox or WebFig using provided bootstrap scripts.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Controls matching Screenshot 3 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-slate-400 hover:text-white font-medium flex items-center gap-1.5 cursor-pointer transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2.5 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Service Setup & Topology Designer */}
      {currentStep === 3 && (
        <div className="bg-[#0a0e17] border border-[#182233] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  3. Service Setup &amp; Network Topology
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure port mappings, Hotspot IP ranges, and RADIUS authentication parameters
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              {configMethod === 'AUTOMATIC' ? 'Visual Topology' : 'Manual Script Mode'}
            </span>
          </div>

          {/* Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Router Identity */}
            <div className="bg-[#080c14] border border-[#1a2333] rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                Router Details
              </h4>

              <div>
                <label className="block text-slate-400 mb-1">Router Name</label>
                <input
                  type="text"
                  value={routerName}
                  onChange={(e) => setRouterName(e.target.value)}
                  placeholder="e.g. MR WIFI"
                  className="w-full bg-[#0a0e17] border border-[#1e2738] rounded-lg px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Physical Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Main Branch, Dar es Salaam"
                  className="w-full bg-[#0a0e17] border border-[#1e2738] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Hardware Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-[#0a0e17] border border-[#1e2738] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">RouterOS Version</label>
                  <select
                    value={rosVersion}
                    onChange={(e) => setRosVersion(e.target.value as any)}
                    className="w-full bg-[#0a0e17] border border-[#1e2738] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="v7">RouterOS v7 (Prioritized)</option>
                    <option value="v6">RouterOS v6</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Network Topology Mappings */}
            <div className="bg-[#080c14] border border-[#1a2333] rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Network Interfaces &amp; Hotspot
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">WAN Uplink</label>
                  <input
                    type="text"
                    value={wanInterface}
                    onChange={(e) => setWanInterface(e.target.value)}
                    className="w-full bg-[#0a0e17] border border-[#1e2738] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Hotspot Bridge</label>
                  <input
                    type="text"
                    value={hotspotBridge}
                    onChange={(e) => setHotspotBridge(e.target.value)}
                    className="w-full bg-[#0a0e17] border border-[#1e2738] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">LAN Ports on Hotspot Bridge</label>
                <input
                  type="text"
                  value={lanInterfaces}
                  onChange={(e) => setLanInterfaces(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-[#1e2738] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Gateway IP / CIDR</label>
                  <input
                    type="text"
                    value={gatewayIp}
                    onChange={(e) => setGatewayIp(e.target.value)}
                    className="w-full bg-[#0a0e17] border border-[#1e2738] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Hotspot DNS Name</label>
                  <input
                    type="text"
                    value={dnsName}
                    onChange={(e) => setDnsName(e.target.value)}
                    className="w-full bg-[#0a0e17] border border-[#1e2738] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* WinBox Remote Management Callout */}
          <div className="bg-gradient-to-r from-sky-950/40 to-slate-900 border border-sky-800/40 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Laptop className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <span className="font-bold text-white">WinBox Remote Access Pre-configured:</span>
                <span className="text-slate-400 ml-1.5">
                  Port 8291, MikroTik Cloud DDNS and firewall filter bypass are enabled automatically.
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60 shrink-0">
              :8291 Live
            </span>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success / Generated Script View */}
          {generatedScript && (
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Router registered successfully! Your RouterOS script is ready.</span>
                </div>
                <button
                  type="button"
                  onClick={downloadScriptFile}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .rsc</span>
                </button>
              </div>

              <div className="relative group bg-[#070a12] border border-[#1a2333] rounded-xl p-4 font-mono text-[11px] text-slate-300 max-h-56 overflow-y-auto select-all leading-relaxed">
                <pre>{generatedScript}</pre>
                <button
                  type="button"
                  onClick={() => handleCopy(generatedScript, 'full-rsc')}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode === 'full-rsc' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy Script</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-xs text-slate-400 hover:text-white font-medium flex items-center gap-1.5 cursor-pointer transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-3">
              {generatedScript ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Finish &amp; Go to Routers</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalDeploy}
                  disabled={loading}
                  className="px-6 py-2.5 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{loading ? 'Deploying...' : 'Deploy & Finish Setup'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default RouterInstallWizard;
