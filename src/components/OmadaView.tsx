import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api.ts';
import { Server, CheckCircle, AlertTriangle, RefreshCw, KeyRound, Globe } from 'lucide-react';

export const OmadaView: React.FC = () => {
  const [config, setConfig] = useState<any | null>(null);
  const [controllerUrl, setControllerUrl] = useState('https://omada.local:8043');
  const [siteId, setSiteId] = useState('Default');
  const [operatorUsername, setOperatorUsername] = useState('admin');
  const [operatorPassword, setOperatorPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await ApiClient.get('/api/v1/omada/config');
      if (res.configured) {
        setConfig(res);
        setControllerUrl(res.controllerUrl);
        setSiteId(res.siteId);
        setOperatorUsername(res.operatorUsername);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ApiClient.post('/api/v1/omada/config', {
        controllerUrl,
        siteId,
        operatorUsername,
        operatorPassword,
      });
      alert('Omada Controller configuration saved securely.');
      fetchConfig();
    } catch (err: any) {
      alert(`Error saving Omada configuration: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    setLoading(true);
    try {
      const res = await ApiClient.post('/api/v1/omada/test-connection');
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ connected: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" /> TP-Link Omada SDN Controller Integration
        </h2>
        <p className="text-xs text-slate-400">
          Connect to Omada Software, OC200, OC300, or Cloud Essentials Controller for centralized Wi-Fi &amp; Voucher sync
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white">Controller Connection Settings</h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Controller Base URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={controllerUrl}
                  onChange={(e) => setControllerUrl(e.target.value)}
                  placeholder="https://192.168.1.200:8043 or https://omada.tplinkcloud.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Site ID / Name
              </label>
              <input
                type="text"
                required
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="Default"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Operator Username
                </label>
                <input
                  type="text"
                  required
                  value={operatorUsername}
                  onChange={(e) => setOperatorUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Operator Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={operatorPassword}
                    onChange={(e) => setOperatorPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Save Controller Configuration
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={loading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Test Connection
              </button>
            </div>
          </form>
        </div>

        {/* Status & Diagnostic Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-2">Adapter Verification Status</h3>
            <p className="text-xs text-slate-400 mb-4">
              XCLOUD never fakes integration status. Verified physical or cloud controller states
              are accurately reported.
            </p>

            {testResult ? (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  testResult.connected
                    ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-700 text-rose-200'
                }`}
              >
                <div className="font-bold flex items-center gap-2">
                  {testResult.connected ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Connected to Omada Controller
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Controller Unreachable / Offline
                    </>
                  )}
                </div>
                <div className="text-[11px] font-mono">Host: {testResult.controllerUrl || controllerUrl}</div>
                {testResult.error && (
                  <div className="text-[11px] p-2 bg-slate-950 rounded border border-rose-800 font-mono text-rose-300">
                    Diagnostic: {testResult.error}
                  </div>
                )}
              </div>
            ) : config ? (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Configured URL:</span>
                  <span className="font-mono text-slate-200">{config.controllerUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Site ID:</span>
                  <span className="font-semibold text-white">{config.siteId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-slate-300">{config.status}</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800/80">
                Omada controller credentials not yet set up for this organization. Enter controller
                details and click test.
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
            <span className="font-bold text-slate-300 block">Omada Integration Capabilities:</span>
            <div>&bull; Voucher synchronization with Omada Hotspot Portal</div>
            <div>&bull; Omada EAP Access Point client telemetry and roaming records</div>
            <div>&bull; External RADIUS server mode configuration via controller</div>
          </div>
        </div>
      </div>
    </div>
  );
};
