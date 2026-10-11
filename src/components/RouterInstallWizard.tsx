import React, { useState } from 'react';
import { ApiClient } from '../lib/api.ts';
import { Router as RouterModel, RouterNetworkConfig } from '../types/index.ts';
import {
  Radio,
  Zap,
  FileCode,
  BookOpen,
  Check,
  Copy,
  Download,
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Server,
  Layers,
  ChevronRight,
  RefreshCw,
  Info,
  Terminal,
} from 'lucide-react';

interface RouterInstallWizardProps {
  deviceLimit: number;
  currentCount: number;
  onClose: () => void;
  onSuccess: (newRouter: RouterModel) => void;
}

type InstallationMethod = 'AUTO' | 'MANUAL' | 'PHYSICAL_GUIDE';

export const RouterInstallWizard: React.FC<RouterInstallWizardProps> = ({
  deviceLimit,
  currentCount,
  onClose,
  onSuccess,
}) => {
  // Method selection
  const [selectedMethod, setSelectedMethod] = useState<InstallationMethod>('MANUAL');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // Step 1: Method, Step 2: Config/Register, Step 3: Script & Commands, Step 4: Verification

  // Form Fields
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [rosVersion, setRosVersion] = useState<'v7' | 'v6'>('v7');
  const [location, setLocation] = useState('');
  const [installationMode, setInstallationMode] = useState<'NEW_CONFIGURATION' | 'EXISTING_HOTSPOT'>('NEW_CONFIGURATION');
  const [wanInterface, setWanInterface] = useState('ether1');
  const [lanInterfacesInput, setLanInterfacesInput] = useState('ether2,ether3,ether4,ether5,wlan1,wlan2');
  const [hotspotBridge, setHotspotBridge] = useState('bridge-hotspot');
  const [gatewayIp, setGatewayIp] = useState('10.10.20.1/24');
  const [dhcpPool, setDhcpPool] = useState('10.10.20.10-10.10.20.254');
  const [dnsName, setDnsName] = useState('wifi.xcloudtz.net');
  const [defaultRateLimit, setDefaultRateLimit] = useState('5M/5M');
  const [overwriteConfirm, setOverwriteConfirm] = useState(false);

  // Registered state
  const [createdRouter, setCreatedRouter] = useState<RouterModel | null>(null);
  const [scriptContent, setScriptContent] = useState<string>('');
  const [bootstrapUrl, setBootstrapUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    checked: boolean;
    online: boolean;
    details?: any;
  }>({ checked: false, online: false });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleRegisterAndGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a router name.');
      return;
    }

    if (installationMode === 'NEW_CONFIGURATION' && !overwriteConfirm) {
      setError('Please check the confirmation box to authorize configuring network interfaces and IP ranges.');
      return;
    }

    setLoading(true);
    setError(null);

    const parsedLan = lanInterfacesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const networkConfig: RouterNetworkConfig = {
      wanInterface: wanInterface.trim() || 'ether1',
      lanInterfaces: parsedLan.length > 0 ? parsedLan : ['ether2', 'ether3', 'ether4', 'ether5', 'wlan1', 'wlan2'],
      hotspotBridge: hotspotBridge.trim() || 'bridge-hotspot',
      gatewayIp: gatewayIp.trim() || '10.10.20.1/24',
      dhcpPool: dhcpPool.trim() || '10.10.20.10-10.10.20.254',
      dnsName: dnsName.trim() || 'wifi.xcloudtz.net',
      installationMode,
      defaultRateLimit: defaultRateLimit.trim() || '5M/5M',
    };

    try {
      // 1. Register Router
      const newRouter: RouterModel = await ApiClient.post('/api/v1/routers', {
        name: name.trim(),
        location: location.trim() || 'HQ Gateway',
        ipAddress: gatewayIp.split('/')[0] || '10.10.20.1',
        dnsName: dnsName.trim() || 'wifi.xcloudtz.net',
        rosVersion,
        networkConfig,
      });

      setCreatedRouter(newRouter);

      // 2. Fetch Script Content
      const scriptRes = await ApiClient.get(`/api/v1/routers/${newRouter.id}/script`);
      setScriptContent(scriptRes.script);

      // 3. Fetch Token if auto
      try {
        const tokenRes = await ApiClient.post(`/api/v1/routers/${newRouter.id}/installation-token`);
        setBootstrapUrl(tokenRes.bootstrapUrl);
      } catch (_) {}

      // Move to Step 3 (Script & Instructions)
      setStep(3);
      onSuccess(newRouter);
    } catch (err: any) {
      setError(err.message || 'Failed to register router');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadRsc = () => {
    if (!createdRouter || !scriptContent) return;
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xcloud_${createdRouter.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.rsc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCheckConnection = async () => {
    if (!createdRouter) return;
    setVerifying(true);
    try {
      const refreshed: RouterModel = await ApiClient.get(`/api/v1/routers/${createdRouter.id}`);
      setCreatedRouter(refreshed);
      setVerificationResult({
        checked: true,
        online: refreshed.status === 'ONLINE',
        details: refreshed,
      });
    } catch (err: any) {
      setVerificationResult({
        checked: true,
        online: false,
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Wizard Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 rounded text-[11px] font-bold tracking-wide uppercase">
                Add Router
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                MikroTik RouterOS v7 Installation Wizard
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Organization capacity: {currentCount} of {deviceLimit} routers registered
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="bg-slate-950/40 border-b border-slate-800/80 px-6 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <button
              onClick={() => step > 1 && !createdRouter && setStep(1)}
              className={`flex items-center gap-1.5 font-semibold ${
                step === 1 ? 'text-indigo-400' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-800 border border-slate-700">
                1
              </span>
              <span>Method Selection</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            <button
              onClick={() => step > 2 && !createdRouter && setStep(2)}
              className={`flex items-center gap-1.5 font-semibold ${
                step === 2 ? 'text-indigo-400' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-800 border border-slate-700">
                2
              </span>
              <span>Register &amp; Network</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            <button
              disabled={!createdRouter}
              onClick={() => createdRouter && setStep(3)}
              className={`flex items-center gap-1.5 font-semibold ${
                step === 3 ? 'text-indigo-400' : 'text-slate-400 disabled:opacity-50'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-800 border border-slate-700">
                3
              </span>
              <span>Script &amp; WinBox Setup</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            <button
              disabled={!createdRouter}
              onClick={() => createdRouter && setStep(4)}
              className={`flex items-center gap-1.5 font-semibold ${
                step === 4 ? 'text-indigo-400' : 'text-slate-400 disabled:opacity-50'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-800 border border-slate-700">
                4
              </span>
              <span>Live Verification</span>
            </button>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-700 text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: METHOD SELECTION */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Select Installation Method
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Choose how you want to link your physical MikroTik router to XCLOUD Central Hotspot Cloud.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Method 1: Automatic */}
                <div
                  onClick={() => setSelectedMethod('AUTO')}
                  className={`border rounded-2xl p-5 cursor-pointer transition flex flex-col justify-between ${
                    selectedMethod === 'AUTO'
                      ? 'bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-3">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">1. Automatic HTTPS Install</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Fetch script over HTTPS via single-use bootstrap token directly into WinBox Terminal.
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> Fast 1-click execution
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span>• Requires Router WAN internet</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Method 2: Manual Script */}
                <div
                  onClick={() => setSelectedMethod('MANUAL')}
                  className={`border rounded-2xl p-5 cursor-pointer transition flex flex-col justify-between ${
                    selectedMethod === 'MANUAL'
                      ? 'bg-sky-950/30 border-sky-500 ring-2 ring-sky-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center mb-3">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">2. Manual Script (.rsc)</h4>
                      <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-300 text-[9px] font-bold rounded">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Custom RouterOS v7 script file with pre-flight checks, backup creation, and interface mapping.
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> Full config review &amp; offline safe
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span>• WinBox Files upload or Terminal paste</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Method 3: Physical Guide */}
                <div
                  onClick={() => setSelectedMethod('PHYSICAL_GUIDE')}
                  className={`border rounded-2xl p-5 cursor-pointer transition flex flex-col justify-between ${
                    selectedMethod === 'PHYSICAL_GUIDE'
                      ? 'bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">3. Physical Setup Guide</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Step-by-step physical cabling, default IP access, WinBox download, and manual terminal checklist.
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <Check className="w-3.5 h-3.5" /> Ideal for new router unboxing
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span>• Visual WinBox instructions</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer"
                >
                  Continue to Router Configuration <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: REGISTER & NETWORK PARAMETERS */}
          {step === 2 && (
            <form onSubmit={handleRegisterAndGenerate} className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Step 2: Router Registration &amp; Network Configuration
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Specify physical router identities, interfaces, and hotspot parameters. Validation is enforced.
                </p>
              </div>

              {/* Basic router info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Router Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kariakoo HQ Gateway"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Location / Site Name
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mlimani City Mall, Dar es Salaam"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    RouterOS Version
                  </label>
                  <select
                    value={rosVersion}
                    onChange={(e) => setRosVersion(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="v7">RouterOS v7.x (Recommended)</option>
                    <option value="v6">RouterOS v6.x (Legacy)</option>
                  </select>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold uppercase text-slate-300">
                  Installation Mode:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setInstallationMode('NEW_CONFIGURATION')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      installationMode === 'NEW_CONFIGURATION'
                        ? 'bg-indigo-950/40 border-indigo-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      Complete New Hotspot Configuration
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Creates bridge, DHCP server, IP pools, NAT masquerade, and hotspot server on selected ports.
                    </p>
                  </div>

                  <div
                    onClick={() => setInstallationMode('EXISTING_HOTSPOT')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      installationMode === 'EXISTING_HOTSPOT'
                        ? 'bg-indigo-950/40 border-indigo-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      Integrate Existing Hotspot Configuration
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Preserves existing IP pools, bridges, and DHCP. Only hooks RADIUS AAA and walled garden.
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Interface & IP Configuration */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-400" /> Interface &amp; Network Mapping
                  </span>
                  <span className="text-[11px] text-slate-400">
                    RouterOS v7 syntax auto-adapted
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      WAN Interface (Uplink / Internet)
                    </label>
                    <input
                      type="text"
                      value={wanInterface}
                      onChange={(e) => setWanInterface(e.target.value)}
                      placeholder="ether1"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Protected from hotspot capture. NAT Masquerade applies here.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Hotspot Bridge Name
                    </label>
                    <input
                      type="text"
                      value={hotspotBridge}
                      onChange={(e) => setHotspotBridge(e.target.value)}
                      placeholder="bridge-hotspot"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Dedicated bridge grouping all client ports.
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Hotspot LAN Ports &amp; Wireless (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={lanInterfacesInput}
                      onChange={(e) => setLanInterfacesInput(e.target.value)}
                      placeholder="ether2,ether3,ether4,ether5,wlan1,wlan2,wifi1,wifi2"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Script safely detects interface existence so missing wifi/wlan ports do not fail execution.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Hotspot Gateway IP (CIDR)
                    </label>
                    <input
                      type="text"
                      value={gatewayIp}
                      onChange={(e) => setGatewayIp(e.target.value)}
                      placeholder="10.10.20.1/24"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Hotspot DHCP Pool
                    </label>
                    <input
                      type="text"
                      value={dhcpPool}
                      onChange={(e) => setDhcpPool(e.target.value)}
                      placeholder="10.10.20.10-10.10.20.254"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Captive Portal DNS Name
                    </label>
                    <input
                      type="text"
                      value={dnsName}
                      onChange={(e) => setDnsName(e.target.value)}
                      placeholder="wifi.xcloudtz.net"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Default Package Speed
                    </label>
                    <input
                      type="text"
                      value={defaultRateLimit}
                      onChange={(e) => setDefaultRateLimit(e.target.value)}
                      placeholder="5M/5M"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {installationMode === 'NEW_CONFIGURATION' && (
                  <div className="pt-2">
                    <label className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/20 border border-amber-800/60 p-3 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overwriteConfirm}
                        onChange={(e) => setOverwriteConfirm(e.target.checked)}
                        className="mt-0.5 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>
                        I understand this script will add bridge ports and IP configurations on the specified
                        interfaces. Existing backups are created automatically by RouterOS before changes.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Generating Script...
                    </>
                  ) : (
                    <>
                      Save Router &amp; Generate Script <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SCRIPT DELIVERY & WINBOX INSTALLATION INSTRUCTIONS */}
          {step === 3 && createdRouter && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    Router Registered: {createdRouter.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ID: <span className="font-mono text-slate-300">{createdRouter.id}</span> • DNS: <span className="font-mono text-slate-300">{createdRouter.dnsName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadRsc}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download .rsc
                  </button>

                  <button
                    onClick={() => handleCopy(scriptContent, 'full_script')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied === 'full_script' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === 'full_script' ? 'Copied Full Script' : 'Copy Full Script'}
                  </button>
                </div>
              </div>

              {/* Method-Specific Run Instructions */}
              {selectedMethod === 'AUTO' && bootstrapUrl && (
                <div className="bg-slate-950 p-4 rounded-xl border border-indigo-900/60 space-y-2">
                  <span className="text-xs font-bold uppercase text-indigo-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> 1-Line Automatic WinBox Terminal Command
                  </span>
                  <p className="text-xs text-slate-400">
                    Paste this line into WinBox Terminal. It fetches your script over HTTPS and applies it automatically:
                  </p>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-amber-300 flex items-center justify-between gap-3">
                    <span className="truncate select-all">
                      /tool fetch url=&quot;{bootstrapUrl}&quot; dst-path=xcloud.rsc; /import xcloud.rsc
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          `/tool fetch url="${bootstrapUrl}" dst-path=xcloud.rsc; /import xcloud.rsc`,
                          'auto_cmd'
                        )
                      }
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] shrink-0 cursor-pointer"
                    >
                      {copied === 'auto_cmd' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Installation Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                  <h4 className="font-bold text-white uppercase text-[11px] tracking-wider text-sky-400 flex items-center gap-1.5">
                    Option A: Drag-and-Drop in WinBox (Recommended)
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-300">
                    <li>
                      Download the <strong className="text-white">.rsc</strong> script file using the button above.
                    </li>
                    <li>
                      Open <strong className="text-white">WinBox</strong> and connect to your MikroTik router.
                    </li>
                    <li>
                      Click <strong className="text-white">Files</strong> in the left sidebar menu.
                    </li>
                    <li>
                      Drag and drop the downloaded <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">.rsc</code> file directly into the WinBox file list.
                    </li>
                    <li>
                      Open <strong className="text-white">New Terminal</strong> and run:
                      <div className="mt-1 bg-slate-900 p-2 rounded font-mono text-amber-300 flex items-center justify-between">
                        <span>/import file-name={createdRouter.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.rsc</span>
                        <button
                          onClick={() =>
                            handleCopy(
                              `/import file-name=xcloud_${createdRouter.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.rsc`,
                              'import_cmd'
                            )
                          }
                          className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 hover:text-white"
                        >
                          Copy
                        </button>
                      </div>
                    </li>
                  </ol>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                  <h4 className="font-bold text-white uppercase text-[11px] tracking-wider text-emerald-400 flex items-center gap-1.5">
                    Option B: Direct Terminal Paste
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-300">
                    <li>
                      Click <strong className="text-white">Copy Full Script</strong> above.
                    </li>
                    <li>
                      In WinBox, click <strong className="text-white">New Terminal</strong>.
                    </li>
                    <li>
                      Right-click in the terminal window and choose <strong className="text-white">Paste</strong> (or press Shift+Insert).
                    </li>
                    <li>
                      Wait for the script to execute. You will see green status confirmation logs:
                      <code className="block mt-1 bg-slate-900 p-2 rounded font-mono text-emerald-300 text-[11px]">
                        XCLOUD: RouterOS v7 Provisioning completed successfully!
                      </code>
                    </li>
                  </ol>
                </div>
              </div>

              {/* Script code viewer */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase text-slate-300">
                    Generated RouterOS v7 .rsc File Preview
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {scriptContent.split('\n').length} lines
                  </span>
                </div>
                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-60">
                  {scriptContent}
                </pre>
              </div>

              {/* Bottom Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Edit Parameters
                </button>

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer"
                >
                  Verify Live Connection <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: VERIFICATION & HEALTH CHECK */}
          {step === 4 && createdRouter && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Step 4: Verify Router Connection &amp; Heartbeat
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Once the script runs, the router's scheduler posts periodic telemetry to XCLOUD Central.
                </p>
              </div>

              {/* Connection Status Card */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-4">
                <div className="flex justify-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                      createdRouter.status === 'ONLINE'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                        : 'bg-amber-950/40 border-amber-500 text-amber-400 animate-pulse'
                    }`}
                  >
                    <Activity className="w-8 h-8" />
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">
                    Router Status:{' '}
                    <span
                      className={
                        createdRouter.status === 'ONLINE' ? 'text-emerald-400' : 'text-amber-400'
                      }
                    >
                      {createdRouter.status}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {createdRouter.status === 'ONLINE'
                      ? 'Congratulations! The router has connected to XCLOUD Central, authenticated with RADIUS, and sent telemetry.'
                      : 'Waiting for first heartbeat telemetry signal from the router. Please ensure the script has been imported in WinBox.'}
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleCheckConnection}
                    disabled={verifying}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </button>
                </div>

                {/* Diagnostics details if online */}
                {createdRouter.lastHeartbeat && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 text-left grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Last Seen</span>
                      <span className="font-semibold text-slate-200">
                        {new Date(createdRouter.lastHeartbeat).toLocaleTimeString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">RouterOS</span>
                      <span className="font-semibold text-slate-200">
                        {createdRouter.rosVersion || 'v7'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Hotspot DNS</span>
                      <span className="font-semibold text-slate-200">{createdRouter.dnsName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Installation</span>
                      <span className="font-semibold text-emerald-400">VERIFIED</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Physical Troubleshooting Checklist */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-400" /> Troubleshooting &amp; Checklist
                </h4>
                <ul className="text-xs text-slate-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span>
                      <strong className="text-slate-300">WAN Connectivity:</strong> Verify port{' '}
                      <code className="text-amber-300 font-mono">{createdRouter.networkConfig?.wanInterface || 'ether1'}</code> is connected to your modem/ISP and has an active IP.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span>
                      <strong className="text-slate-300">DNS Resolution:</strong> Router must be able to resolve domain names in WinBox (<code className="text-amber-300 font-mono">/ping google.com</code>).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span>
                      <strong className="text-slate-300">Heartbeat Scheduler:</strong> Check <code className="text-amber-300 font-mono">/system scheduler print</code> in WinBox to confirm <code className="text-amber-300 font-mono">xcloud-heartbeat-sched</code> is running.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> View Script Again
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Finish &amp; Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
