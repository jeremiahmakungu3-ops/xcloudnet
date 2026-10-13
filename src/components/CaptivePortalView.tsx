import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Smartphone,
  Monitor,
  Download,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  Phone,
  Palette,
  FileCode,
  Terminal,
  Play,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Globe,
  Radio,
  Sliders,
} from 'lucide-react';
import JSZip from 'jszip';
import { CaptivePortalConfig, HotspotPackage, Router as RouterModel } from '../types/index.ts';
import { ApiClient } from '../lib/api.ts';

interface CaptivePortalViewProps {
  packages: HotspotPackage[];
  routers: RouterModel[];
  onRefresh?: () => void;
}

export const CaptivePortalView: React.FC<CaptivePortalViewProps> = ({
  packages,
  routers,
  onRefresh,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'studio' | 'files' | 'deploy'>('studio');
  const [devicePreview, setDevicePreview] = useState<'mobile' | 'desktop'>('mobile');
  const [previewScreen, setPreviewScreen] = useState<'login' | 'status' | 'logout'>('login');

  const [config, setConfig] = useState<CaptivePortalConfig>({
    id: 'default',
    organizationId: 'org_default_01',
    ssidName: 'XCLOUD-Free-WiFi',
    portalTitle: 'Karibu kwenye Mtandao wa Kasi',
    portalSubtitle: 'Unganisha kifaa chako kwa kuweka vocha au kulipia mtandaoni',
    themeColor: '#4f46e5',
    supportPhone: '+255 754 000 000',
    supportEmail: 'support@xcloud.net',
    termsOfService: 'Kwa kutumia mtandao huu, unakubali masharti na vigezo vya huduma.',
    enableVoucherLogin: true,
    enableMobileMoneyBuy: true,
    enableFreeTrial: true,
    freeTrialMinutes: 15,
    enableMemberLogin: true,
    routerDns: 'wifi.xcloudtz.net',
    updatedAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // File templates viewer state
  const [selectedFile, setSelectedFile] = useState<string>('login.html');
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Simulator Interactive States
  const [simActiveTab, setSimActiveTab] = useState<'voucher' | 'packages' | 'trial' | 'member'>('voucher');
  const [simVoucherCode, setSimVoucherCode] = useState('');
  const [simPhone, setSimPhone] = useState('');
  const [simSelectedPackage, setSimSelectedPackage] = useState<HotspotPackage | null>(null);
  const [simPaymentModal, setSimPaymentModal] = useState(false);
  const [simConnecting, setSimConnecting] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simStatusData, setSimStatusData] = useState({
    ip: '10.10.20.142',
    mac: '74:4D:28:B1:09:AF',
    uptime: '0h 24m 12s',
    bytesIn: '34.8 MB',
    bytesOut: '142.6 MB',
    timeLeft: '5h 35m 48s',
  });

  // Load config on mount
  useEffect(() => {
    loadConfig();
    loadTemplates();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.get<CaptivePortalConfig>('/api/v1/captive-portal/config');
      if (res) {
        setConfig(res);
      }
    } catch {
      // Keep default
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await ApiClient.get<Record<string, string>>('/api/v1/captive-portal/templates');
      if (res) {
        setTemplates(res);
      }
    } catch {
      // Handled
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await ApiClient.post<CaptivePortalConfig>('/api/v1/captive-portal/config', config);
      if (res) {
        setConfig(res);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        loadTemplates();
      }
    } catch (err: any) {
      alert(`Failed to save configuration: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      const zip = new JSZip();
      const folder = zip.folder('hotspot') || zip;

      // Fetch or use cached templates
      let fileData = templates;
      if (!fileData['login.html']) {
        const res = await ApiClient.get<Record<string, string>>('/api/v1/captive-portal/templates');
        if (res) fileData = res;
      }

      folder.file('login.html', fileData['login.html'] || '<!-- login.html -->');
      folder.file('status.html', fileData['status.html'] || '<!-- status.html -->');
      folder.file('logout.html', fileData['logout.html'] || '<!-- logout.html -->');
      folder.file('alogin.html', fileData['alogin.html'] || '<!-- alogin.html -->');
      folder.file('md5.js', fileData['md5.js'] || '/* md5.js */');
      folder.file('errors.txt', fileData['errors.txt'] || '# errors.txt');

      const readme = `# XCLOUD.NET MikroTik RouterOS v7 Captive Portal
Network SSID: ${config.ssidName}
DNS Gateway: ${config.routerDns}

HOW TO INSTALL IN WINBOX:
1. Extract this ZIP archive.
2. Open WinBox -> Connect to your MikroTik Router.
3. Open "Files" menu from the left panel.
4. Drag and drop the "hotspot" folder into Files.
5. In Terminal, run:
   /ip hotspot profile set [find] html-directory=hotspot dns-name="${config.routerDns}"
6. Test on a mobile phone!
`;
      zip.file('README.txt', readme);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xcloud-hotspot-${config.ssidName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Could not build zip: ${err.message}`);
    }
  };

  const handleDownloadFile = (fileName: string) => {
    const content = templates[fileName] || '';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyFileContent = (fileName: string) => {
    const content = templates[fileName] || '';
    navigator.clipboard.writeText(content);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  // Simulator Functional Testing
  const handleSimConnect = async () => {
    if (!simVoucherCode) {
      setSimError('Tafadhali weka namba ya vocha (Enter voucher code)');
      return;
    }
    setSimConnecting(true);
    setSimError(null);

    try {
      const res = await ApiClient.post<any>('/api/v1/vouchers/redeem', {
        code: simVoucherCode.trim().toUpperCase(),
        macAddress: simStatusData.mac,
        ipAddress: simStatusData.ip,
      });

      if (res && res.status === 'SUCCESS') {
        setSimStatusData((prev) => ({
          ...prev,
          timeLeft: `${Math.round(res.sessionTimeoutSeconds / 60)} dakika`,
        }));
        setPreviewScreen('status');
      } else {
        setSimError('Namba ya vocha si sahihi au imekwisha kutumika');
      }
    } catch (err: any) {
      // In simulator mode, if code doesn't exist, allow a graceful demo connect or show real error
      if (err.message && err.message.includes('not found')) {
        setSimError('Namba ya vocha si sahihi (Invalid Voucher Code)');
      } else {
        // Successful simulation fallback
        setPreviewScreen('status');
      }
    } finally {
      setSimConnecting(false);
    }
  };

  const handleSimTrialConnect = async () => {
    setSimConnecting(true);
    setSimError(null);
    try {
      await ApiClient.post('/api/v1/captive-portal/trial', {
        macAddress: simStatusData.mac,
        ipAddress: simStatusData.ip,
      });
      setSimStatusData((prev) => ({
        ...prev,
        timeLeft: `${config.freeTrialMinutes || 15} dakika (Majaribio ya Bure)`,
      }));
      setPreviewScreen('status');
    } catch {
      setSimStatusData((prev) => ({
        ...prev,
        timeLeft: `${config.freeTrialMinutes || 15} dakika (Majaribio ya Bure)`,
      }));
      setPreviewScreen('status');
    } finally {
      setSimConnecting(false);
    }
  };

  const activePackages = packages.filter((p) => p.isActive);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-950 text-indigo-400 border border-indigo-800">
              Hotspot Captive Portal Studio
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
              RouterOS v7 Compatible
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-2 tracking-tight">
            Captive Portal &amp; Branding Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Design your customer Wi-Fi login screen, configure mobile money payments (M-Pesa, Tigo, Airtel, HaloPesa), test voucher redemptions interactively, and export ready-to-deploy MikroTik RouterOS v7 templates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadZip}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Download className="w-4 h-4" /> Download Hotspot ZIP
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {saveSuccess ? 'Saved Successfully!' : 'Save Branding'}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center border-b border-slate-800 pb-1 gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveMainTab('studio')}
          className={`px-4 py-2 rounded-lg cursor-pointer transition flex items-center gap-2 ${
            activeMainTab === 'studio'
              ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" /> Visual Studio &amp; Simulator
        </button>

        <button
          onClick={() => setActiveMainTab('files')}
          className={`px-4 py-2 rounded-lg cursor-pointer transition flex items-center gap-2 ${
            activeMainTab === 'files'
              ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileCode className="w-4 h-4" /> RouterOS v7 Template Files ({Object.keys(templates).length || 6})
        </button>

        <button
          onClick={() => setActiveMainTab('deploy')}
          className={`px-4 py-2 rounded-lg cursor-pointer transition flex items-center gap-2 ${
            activeMainTab === 'deploy'
              ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" /> WinBox &amp; Terminal Deployment Guide
        </button>
      </div>

      {/* TAB 1: VISUAL STUDIO & SIMULATOR */}
      {activeMainTab === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Customizer Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Palette className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Brand Identity &amp; Wi-Fi Network</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Wi-Fi SSID Name
                </label>
                <input
                  type="text"
                  value={config.ssidName}
                  onChange={(e) => setConfig({ ...config, ssidName: e.target.value })}
                  placeholder="e.g. Serengeti-Free-WiFi"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Portal Title (Headline)
                </label>
                <input
                  type="text"
                  value={config.portalTitle}
                  onChange={(e) => setConfig({ ...config, portalTitle: e.target.value })}
                  placeholder="Karibu kwenye Mtandao wa Kasi"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Portal Subtitle / Greeting
                </label>
                <input
                  type="text"
                  value={config.portalSubtitle}
                  onChange={(e) => setConfig({ ...config, portalSubtitle: e.target.value })}
                  placeholder="Unganisha kifaa chako kwa kuweka vocha..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.themeColor}
                      onChange={(e) => setConfig({ ...config, themeColor: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={config.themeColor}
                      onChange={(e) => setConfig({ ...config, themeColor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Hotspot Gateway DNS
                  </label>
                  <input
                    type="text"
                    value={config.routerDns}
                    onChange={(e) => setConfig({ ...config, routerDns: e.target.value })}
                    placeholder="wifi.xcloudtz.net"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Support Contact Phone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={config.supportPhone}
                    onChange={(e) => setConfig({ ...config, supportPhone: e.target.value })}
                    placeholder="+255 754 000 000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                Authentication &amp; Payment Modules
              </h3>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                  <span className="text-slate-300 font-medium">🎟️ Voucher Code Login</span>
                  <input
                    type="checkbox"
                    checked={config.enableVoucherLogin}
                    onChange={(e) => setConfig({ ...config, enableVoucherLogin: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                  <span className="text-slate-300 font-medium">💳 Mobile Money Online Purchase</span>
                  <input
                    type="checkbox"
                    checked={config.enableMobileMoneyBuy}
                    onChange={(e) => setConfig({ ...config, enableMobileMoneyBuy: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                  <span className="text-slate-300 font-medium">🎁 Free Trial Access (Complimentary)</span>
                  <input
                    type="checkbox"
                    checked={config.enableFreeTrial}
                    onChange={(e) => setConfig({ ...config, enableFreeTrial: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                </label>

                {config.enableFreeTrial && (
                  <div className="pl-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Trial Duration (Minutes):</span>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={config.freeTrialMinutes}
                      onChange={(e) => setConfig({ ...config, freeTrialMinutes: Number(e.target.value) })}
                      className="w-20 bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white text-right"
                    />
                  </div>
                )}

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                  <span className="text-slate-300 font-medium">👤 Staff / Member Username Login</span>
                  <input
                    type="checkbox"
                    checked={config.enableMemberLogin}
                    onChange={(e) => setConfig({ ...config, enableMemberLogin: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Device Simulator (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Simulator Controls Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setDevicePreview('mobile')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer transition ${
                    devicePreview === 'mobile'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Phone Frame
                </button>
                <button
                  onClick={() => setDevicePreview('desktop')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer transition ${
                    devicePreview === 'desktop'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Desktop / Tablet
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setPreviewScreen('login')}
                  className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition ${
                    previewScreen === 'login'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  login.html
                </button>
                <button
                  onClick={() => setPreviewScreen('status')}
                  className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition ${
                    previewScreen === 'status'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  status.html
                </button>
                <button
                  onClick={() => setPreviewScreen('logout')}
                  className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition ${
                    previewScreen === 'logout'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  logout.html
                </button>
              </div>
            </div>

            {/* Simulated Device Canvas */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 min-h-[580px] flex items-center justify-center relative overflow-hidden">
              <div
                className={`transition-all duration-300 w-full shadow-2xl ${
                  devicePreview === 'mobile'
                    ? 'max-w-[390px] border-[8px] border-slate-800 rounded-[38px] bg-slate-900 overflow-hidden ring-1 ring-slate-700/50'
                    : 'max-w-[640px] border border-slate-700/80 rounded-2xl bg-slate-900 overflow-hidden'
                }`}
              >
                {/* Mobile Speaker Notch */}
                {devicePreview === 'mobile' && (
                  <div className="bg-slate-800 py-1 flex justify-center items-center">
                    <div className="w-16 h-2.5 bg-slate-950 rounded-full"></div>
                  </div>
                )}

                {/* Simulated Portal Content */}
                <div className="p-5 text-white select-none">
                  {/* SCREEN 1: LOGIN.HTML */}
                  {previewScreen === 'login' && (
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="text-center pb-3 border-b border-white/10">
                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2"
                          style={{
                            backgroundColor: `${config.themeColor}26`,
                            color: config.themeColor,
                            border: `1px solid ${config.themeColor}4D`,
                          }}
                        >
                          ⚡ {config.ssidName}
                        </div>
                        <h2 className="text-base font-extrabold text-white">{config.portalTitle}</h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">{config.portalSubtitle}</p>
                      </div>

                      {/* Error Banner in Preview */}
                      {simError && (
                        <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-[11px] text-center flex items-center justify-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{simError}</span>
                        </div>
                      )}

                      {/* Tabs */}
                      <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1 text-[11px] font-semibold">
                        {config.enableVoucherLogin && (
                          <button
                            onClick={() => setSimActiveTab('voucher')}
                            className={`flex-1 py-1.5 rounded-lg transition ${
                              simActiveTab === 'voucher'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            style={simActiveTab === 'voucher' ? { backgroundColor: config.themeColor } : {}}
                          >
                            🎟️ Vocha
                          </button>
                        )}
                        {config.enableMobileMoneyBuy && (
                          <button
                            onClick={() => setSimActiveTab('packages')}
                            className={`flex-1 py-1.5 rounded-lg transition ${
                              simActiveTab === 'packages'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            style={simActiveTab === 'packages' ? { backgroundColor: config.themeColor } : {}}
                          >
                            💳 Nunua
                          </button>
                        )}
                        {config.enableFreeTrial && (
                          <button
                            onClick={() => setSimActiveTab('trial')}
                            className={`flex-1 py-1.5 rounded-lg transition ${
                              simActiveTab === 'trial'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            style={simActiveTab === 'trial' ? { backgroundColor: config.themeColor } : {}}
                          >
                            🎁 Bure
                          </button>
                        )}
                        {config.enableMemberLogin && (
                          <button
                            onClick={() => setSimActiveTab('member')}
                            className={`flex-1 py-1.5 rounded-lg transition ${
                              simActiveTab === 'member'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            style={simActiveTab === 'member' ? { backgroundColor: config.themeColor } : {}}
                          >
                            👤 Akaunti
                          </button>
                        )}
                      </div>

                      {/* Tab 1 Content: Voucher */}
                      {simActiveTab === 'voucher' && (
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Weka Namba ya Vocha (Voucher Code)
                            </label>
                            <input
                              type="text"
                              value={simVoucherCode}
                              onChange={(e) => setSimVoucherCode(e.target.value.toUpperCase())}
                              placeholder="XC-8492-7103"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-center text-sm font-mono tracking-widest text-white uppercase focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          <button
                            onClick={handleSimConnect}
                            disabled={simConnecting}
                            className="w-full py-2.5 text-white font-bold rounded-xl text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                            style={{ backgroundColor: config.themeColor }}
                          >
                            {simConnecting ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                            Unganisha Mtandao (Connect)
                          </button>

                          <div className="text-center pt-2">
                            <span className="text-[10px] text-slate-400">
                              Jaribu vocha au bonyeza{' '}
                              <button
                                type="button"
                                onClick={() => setSimVoucherCode('XC-DEMO-TEST')}
                                className="text-indigo-400 underline cursor-pointer"
                              >
                                weka namba ya majaribio
                              </button>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tab 2 Content: Packages */}
                      {simActiveTab === 'packages' && (
                        <div className="space-y-2 pt-1 max-h-[240px] overflow-y-auto pr-1">
                          <p className="text-[11px] text-slate-400 text-center mb-1">
                            Lipia kwa M-Pesa, Tigo Pesa, au Airtel Money kupata vocha:
                          </p>
                          {activePackages.length === 0 ? (
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                              Hakuna vifurushi vilivyowekwa. Ongeza kwenye ukurasa wa Hotspot Plans.
                            </div>
                          ) : (
                            activePackages.slice(0, 4).map((pkg) => (
                              <div
                                key={pkg.id}
                                onClick={() => {
                                  setSimSelectedPackage(pkg);
                                  setSimPaymentModal(true);
                                }}
                                className="p-2.5 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500 rounded-xl flex items-center justify-between cursor-pointer transition"
                              >
                                <div>
                                  <div className="text-xs font-bold text-white">{pkg.name}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {Math.round(pkg.downloadSpeedKbps / 1024)} Mbps •{' '}
                                    {pkg.dataLimitMb && pkg.dataLimitMb > 0
                                      ? `${(pkg.dataLimitMb / 1024).toFixed(1)}GB`
                                      : 'Unlimited'}
                                  </div>
                                </div>
                                <div className="text-xs font-black text-sky-400">
                                  TSh {Number(pkg.price).toLocaleString()}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Tab 3 Content: Free Trial */}
                      {simActiveTab === 'trial' && (
                        <div className="text-center py-4 space-y-3">
                          <div className="text-3xl">🎁</div>
                          <h4 className="text-xs font-bold text-white">
                            Dakika {config.freeTrialMinutes || 15} za Majaribio ya Bure
                          </h4>
                          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                            Unganisha kifaa chako kupokea mtandao wa bure bila malipo kwa matumizi ya kwanza.
                          </p>
                          <button
                            onClick={handleSimTrialConnect}
                            disabled={simConnecting}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg transition cursor-pointer"
                          >
                            {simConnecting ? 'Inaunganisha...' : 'Anza Majaribio ya Bure Sasa'}
                          </button>
                        </div>
                      )}

                      {/* Tab 4 Content: Member */}
                      {simActiveTab === 'member' && (
                        <div className="space-y-2.5 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                              Jina la Mtumiaji (Username)
                            </label>
                            <input
                              type="text"
                              placeholder="username"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                              Nenosiri (Password)
                            </label>
                            <input
                              type="password"
                              placeholder="••••••••"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                            />
                          </div>
                          <button
                            onClick={() => setPreviewScreen('status')}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                          >
                            Ingia Kama Mwanachama
                          </button>
                        </div>
                      )}

                      {/* Footer Info */}
                      <div className="pt-3 border-t border-white/10 text-center text-[10px] text-slate-400">
                        Msaada kwa Wateja:{' '}
                        <span className="font-semibold text-slate-200">{config.supportPhone}</span>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 2: STATUS.HTML */}
                  {previewScreen === 'status' && (
                    <div className="space-y-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-800 rounded-full text-emerald-400 text-[11px] font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Umeunganishwa kwenye Mtandao
                      </div>

                      <h3 className="text-base font-black text-white">{config.ssidName}</h3>

                      <div className="grid grid-cols-2 gap-2 text-left">
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Muda Uliotumika</div>
                          <div className="text-xs font-mono font-bold text-white mt-0.5">
                            {simStatusData.uptime}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Muda Uliobaki</div>
                          <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                            {simStatusData.timeLeft}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Data Download</div>
                          <div className="text-xs font-mono font-bold text-white mt-0.5">
                            {simStatusData.bytesOut}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Data Upload</div>
                          <div className="text-xs font-mono font-bold text-white mt-0.5">
                            {simStatusData.bytesIn}
                          </div>
                        </div>

                        <div className="col-span-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">IP / MAC Address</div>
                          <div className="text-xs font-mono text-slate-300 mt-0.5">
                            {simStatusData.ip} • {simStatusData.mac}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setPreviewScreen('logout')}
                        className="w-full py-2.5 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800 text-rose-300 font-bold rounded-xl text-xs cursor-pointer transition"
                      >
                        Ondoka Kwenye Mtandao (Log Out)
                      </button>
                    </div>
                  )}

                  {/* SCREEN 3: LOGOUT.HTML */}
                  {previewScreen === 'logout' && (
                    <div className="text-center py-6 space-y-3">
                      <div className="text-3xl">👋</div>
                      <h3 className="text-base font-bold text-white">Umetoka kwenye Mtandao</h3>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Kipindi chako kimefungwa kwa usalama. Unaweza kuunganisha tena muda wowote.
                      </p>
                      <button
                        onClick={() => setPreviewScreen('login')}
                        className="w-full py-2.5 text-white font-bold rounded-xl text-xs shadow-lg transition cursor-pointer"
                        style={{ backgroundColor: config.themeColor }}
                      >
                        Ingia Tena Mtandaoni (Login Again)
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Purchase Modal in Preview */}
              {simPaymentModal && simSelectedPackage && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-30 flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-xs w-full space-y-3 shadow-2xl">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white">{simSelectedPackage.name}</h4>
                      <button
                        onClick={() => setSimPaymentModal(false)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>

                    <div className="text-base font-black text-sky-400">
                      TSh {Number(simSelectedPackage.price).toLocaleString()}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Namba ya Simu (M-Pesa / Tigo / Airtel)
                      </label>
                      <input
                        type="tel"
                        value={simPhone}
                        onChange={(e) => setSimPhone(e.target.value)}
                        placeholder="07XXXXXXXX"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                      />
                    </div>

                    <button
                      onClick={() => {
                        alert(
                          `Simulated M-Pesa push initiated to ${simPhone || '0754123456'} for TSh ${simSelectedPackage.price}!`
                        );
                        setSimPaymentModal(false);
                        setSimVoucherCode('XC-VODA-9982');
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Lipia Sasa (Leta Ombi la PIN)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROUTEROS V7 TEMPLATE FILES */}
      {activeMainTab === 'files' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  RouterOS v7 Production Template Code
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect and copy the source code for the individual files that MikroTik serves from its <code className="text-indigo-300">/hotspot</code> directory.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyFileContent(selectedFile)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedFile === selectedFile ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedFile === selectedFile ? 'Copied!' : `Copy ${selectedFile}`}
                </button>

                <button
                  onClick={() => handleDownloadFile(selectedFile)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download {selectedFile}
                </button>
              </div>
            </div>

            {/* File Switcher Tabs */}
            <div className="flex flex-wrap gap-2 pt-4">
              {['login.html', 'status.html', 'logout.html', 'alogin.html', 'md5.js', 'errors.txt'].map(
                (fileName) => (
                  <button
                    key={fileName}
                    onClick={() => setSelectedFile(fileName)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer transition ${
                      selectedFile === fileName
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {fileName}
                  </button>
                )
              )}
            </div>

            {/* Code Box */}
            <div className="mt-4 relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400 font-mono">
                <span>hotspot/{selectedFile}</span>
                <span>
                  {templates[selectedFile] ? `${templates[selectedFile].length} bytes` : 'Loading...'}
                </span>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed">
                {templates[selectedFile] || 'Loading template content...'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WINBOX & TERMINAL DEPLOYMENT GUIDE */}
      {activeMainTab === 'deploy' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">
                How to Install the Captive Portal on MikroTik RouterOS v7
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Follow these verified steps using WinBox or Terminal to upload your custom branding and enable hotspot customer authentication.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h4 className="text-sm font-bold text-white">Download Archive</h4>
                <p className="text-xs text-slate-400">
                  Click the <b>Download Hotspot ZIP</b> button above and extract the zip file on your PC. You will see a folder named <code className="text-indigo-300">hotspot</code>.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h4 className="text-sm font-bold text-white">Upload to WinBox</h4>
                <p className="text-xs text-slate-400">
                  Open WinBox, connect to your router, click <b>Files</b> in the left menu, and drag the extracted <code className="text-indigo-300">hotspot</code> folder into the Files window.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h4 className="text-sm font-bold text-white">Apply Profile Settings</h4>
                <p className="text-xs text-slate-400">
                  Run the command below in WinBox Terminal to activate the HTML directory and set the captive portal DNS name.
                </p>
              </div>
            </div>

            {/* Terminal Command Box */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  MikroTik Terminal Setup Command
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `/ip hotspot profile set [find] html-directory=hotspot dns-name="${config.routerDns}" login-by=http-chap,http-pap,cookie`
                    );
                    setCopiedCmd(true);
                    setTimeout(() => setCopiedCmd(false), 2000);
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCmd ? 'Copied Command!' : 'Copy Terminal Command'}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400">
                # Enable custom captive portal html directory and DNS host on MikroTik v7<br />
                /ip hotspot profile set [find] html-directory=hotspot dns-name="{config.routerDns}" login-by=http-chap,http-pap,cookie
              </div>
            </div>

            {/* Walled Garden Box */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Walled Garden Whitelist (Allow Mobile Money Telcos Before Login)
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1">
                <div>/ip hotspot walled-garden</div>
                <div className="text-sky-300">add dst-host="*.selcom.net" action=allow comment="XCLOUD-SELCOM-GATEWAY"</div>
                <div className="text-sky-300">add dst-host="*.mpesa.vm.co.tz" action=allow comment="XCLOUD-VODACOM-MPESA"</div>
                <div className="text-sky-300">add dst-host="*.tigo.co.tz" action=allow comment="XCLOUD-TIGO-PESA"</div>
                <div className="text-sky-300">add dst-host="*.airtel.co.tz" action=allow comment="XCLOUD-AIRTEL-MONEY"</div>
                <div className="text-sky-300">add dst-host="*.halopesa.co.tz" action=allow comment="XCLOUD-HALOPESA"</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
