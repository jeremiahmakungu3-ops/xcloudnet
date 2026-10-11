import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api.ts';
import { ActivityEvent, Router as RouterModel, OmadaControllerConfig } from '../types/index.ts';
import {
  Activity,
  Radio,
  Server,
  ShieldAlert,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  X,
  ExternalLink,
  Wifi,
  Cpu,
  Layers,
  Terminal,
} from 'lucide-react';

export const GlobalMonitoringView: React.FC = () => {
  const [summary, setSummary] = useState<any | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [routers, setRouters] = useState<any[]>([]);
  const [controllers, setControllers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedResult, setSelectedResult] = useState<string>('ALL');
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Selected Device Detail Modal
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDeviceTypeModal, setSelectedDeviceTypeModal] = useState<'MIKROTIK' | 'OMADA' | null>(null);
  const [deviceDetailData, setDeviceDetailData] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, evtsRes, rtrsRes, omdRes] = await Promise.all([
        ApiClient.get('/api/v1/admin/activity/summary'),
        ApiClient.get(
          `/api/v1/admin/activity?limit=${pageSize}&offset=${(currentPage - 1) * pageSize}${
            selectedCategory !== 'ALL' ? `&category=${selectedCategory}` : ''
          }${selectedResult !== 'ALL' ? `&result=${selectedResult}` : ''}${
            selectedDeviceType !== 'ALL' ? `&deviceType=${selectedDeviceType}` : ''
          }${search ? `&search=${encodeURIComponent(search)}` : ''}`
        ),
        ApiClient.get('/api/v1/admin/routers'),
        ApiClient.get('/api/v1/admin/omada/controllers'),
      ]);

      setSummary(sumRes);
      setEvents(evtsRes.events || []);
      setTotalEvents(evtsRes.total || 0);
      setRouters(rtrsRes || []);
      setControllers(omdRes || []);
    } catch (err: any) {
      console.error('Failed to load global monitoring data:', err);
      if (err.status === 403 || err.message?.includes('403') || err.message?.includes('Forbidden')) {
        setForbiddenError(
          'Access Denied: Only Special Administrator accounts have authorization to view global cross-tenant router and Omada activity telemetry.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, selectedCategory, selectedResult, selectedDeviceType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData();
  };

  const handleOpenDeviceDetail = async (id: string, type: 'MIKROTIK' | 'OMADA') => {
    setSelectedDeviceId(id);
    setSelectedDeviceTypeModal(type);
    setDetailLoading(true);
    setDeviceDetailData(null);

    try {
      if (type === 'MIKROTIK') {
        const res = await ApiClient.get(`/api/v1/admin/routers/${id}/activity`);
        setDeviceDetailData(res);
      } else {
        const res = await ApiClient.get(`/api/v1/admin/omada/controllers/${id}/activity`);
        setDeviceDetailData(res);
      }
    } catch (e: any) {
      alert(`Error loading device details: ${e.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportCsv = () => {
    const token = ApiClient.getToken();
    const params = new URLSearchParams();
    if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
    if (selectedResult !== 'ALL') params.append('result', selectedResult);
    if (search) params.append('search', search);

    const exportUrl = `/api/v1/admin/activity/export?${params.toString()}`;

    // Direct authenticated fetch & download
    fetch(exportUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Access Denied`);
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xcloud_global_activity_${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => alert(err.message));
  };

  const totalPages = Math.ceil(totalEvents / pageSize) || 1;

  return (
    <div className="space-y-6">
      {forbiddenError && (
        <div className="p-4 bg-red-950/80 border border-red-700 rounded-lg text-red-200 flex items-start gap-3 shadow-lg">
          <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm text-red-100">Super Admin Privilege Required</h3>
            <p className="text-xs text-red-300 mt-1">{forbiddenError}</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-950 text-purple-300 border border-purple-800">
              Super Admin Exclusive
            </span>
            <span className="text-xs text-slate-400 font-mono">Cross-Tenant Audit Authority</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mt-1">
            <Activity className="w-5 h-5 text-indigo-400" /> Global Router &amp; Omada Activity Monitoring
          </h2>
          <p className="text-xs text-slate-400">
            Real-time audit trail of all physical MikroTik gateways, Omada controllers, client sessions, and security events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Refresh Monitoring Data"
            className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Audit</span>
          </button>
        </div>
      </div>

      {/* Global Telemetry Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Organizations */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Organizations
          </span>
          <span className="text-xl font-black text-white">{summary?.totalOrganizations || 0}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {summary?.totalUsers || 0} Total Users
          </span>
        </div>

        {/* MikroTik Gateways Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-bold text-sky-400 block mb-1 flex items-center gap-1">
            <Radio className="w-3 h-3" /> MikroTik Routers
          </span>
          <span className="text-xl font-black text-white">{summary?.totalRouters || 0}</span>
          <div className="text-[10px] text-slate-400 mt-0.5 space-x-1">
            <span className="text-emerald-400 font-bold">{summary?.routerStatuses?.online || 0} Online</span>
            <span>&bull;</span>
            <span className="text-rose-400 font-bold">{summary?.routerStatuses?.offline || 0} Offline</span>
            {summary?.routerStatuses?.unknown > 0 && (
              <span className="text-amber-400">({summary.routerStatuses.unknown} Unknown)</span>
            )}
          </div>
        </div>

        {/* Omada Controllers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1 flex items-center gap-1">
            <Server className="w-3 h-3" /> Omada Controllers
          </span>
          <span className="text-xl font-black text-white">{summary?.totalOmadaControllers || 0}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {summary?.totalOmadaDevices || 0} Managed APs/Devices
          </span>
        </div>

        {/* Successful Ops */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Success Events
          </span>
          <span className="text-xl font-black text-emerald-400">
            {summary?.operationsSummary?.successfulOperations || 0}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Provisioned &amp; Synced</span>
        </div>

        {/* Failed Ops */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Failed Operations
          </span>
          <span className="text-xl font-black text-rose-400">
            {summary?.operationsSummary?.failedOperations || 0}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Errors recorded</span>
        </div>

        {/* Security Denials */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Security Denials
          </span>
          <span className="text-xl font-black text-amber-400">
            {summary?.operationsSummary?.deniedOperations || 0}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Cross-tenant / 403</span>
        </div>
      </div>

      {/* Routers & Controllers Quick Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MikroTik Fleet Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-sky-400" /> Registered MikroTik Fleet Across Organizations
            </h3>
            <span className="text-xs font-mono text-slate-400">{routers.length} devices</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {routers.map((r) => (
              <div
                key={r.id}
                onClick={() => handleOpenDeviceDetail(r.id, 'MIKROTIK')}
                className="p-2.5 bg-slate-950/70 hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        r.calculatedStatus === 'ONLINE'
                          ? 'bg-emerald-400 animate-pulse'
                          : r.calculatedStatus === 'UNCONFIGURED'
                          ? 'bg-slate-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-white truncate">{r.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      ROS {r.rosVersion || 'v7'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Org: {r.organizationName} &bull; IP: {r.ipAddress || 'DHCP'}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block">
                    {r.lastHeartbeat ? new Date(r.lastHeartbeat).toLocaleTimeString() : 'Never'}
                  </span>
                  <span className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5 justify-end">
                    View Activity <Eye className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
            {routers.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-6">No routers registered.</div>
            )}
          </div>
        </div>

        {/* Omada Controllers Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Server className="w-4 h-4 text-indigo-400" /> TP-Link Omada Controllers &amp; Managed Sites
            </h3>
            <span className="text-xs font-mono text-slate-400">{controllers.length} controllers</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {controllers.map((c) => (
              <div
                key={c.id}
                onClick={() => handleOpenDeviceDetail(c.id, 'OMADA')}
                className="p-2.5 bg-slate-950/70 hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        c.status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-white truncate">
                      Omada Site: {c.siteId}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {c.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Org: {c.organizationName} &bull; URL: {c.controllerUrl}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block">
                    {c.deviceCount || 0} Devices Reported
                  </span>
                  <span className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5 justify-end">
                    Controller Audit <Eye className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
            {controllers.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-6">No Omada controllers configured.</div>
            )}
          </div>
        </div>
      </div>

      {/* Global Activity Table Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, message, correlation ID, user email, or router name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="ROUTER_CONNECTION">Router Connection</option>
              <option value="INSTALLATION">Installation / Bootstrap</option>
              <option value="CONFIGURATION">Configuration</option>
              <option value="HEARTBEAT">Heartbeat Telemetry</option>
              <option value="SECURITY">Security / 403 Denials</option>
              <option value="AUTHENTICATION">User Authentication</option>
              <option value="MANAGEMENT">Device Management</option>
            </select>

            <select
              value={selectedResult}
              onChange={(e) => {
                setSelectedResult(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
            >
              <option value="ALL">All Results</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="DENIED">DENIED (Security)</option>
            </select>

            <select
              value={selectedDeviceType}
              onChange={(e) => {
                setSelectedDeviceType(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
            >
              <option value="ALL">All Device Types</option>
              <option value="MIKROTIK">MikroTik RouterOS</option>
              <option value="OMADA">TP-Link Omada</option>
              <option value="SYSTEM">System Operations</option>
            </select>

            <button
              type="submit"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Filter
            </button>
          </div>
        </form>

        {/* Global Activity Table */}
        <div className="overflow-x-auto border-t border-slate-800/80 pt-2">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Organization</th>
                <th className="py-3 px-3">User &amp; Role</th>
                <th className="py-3 px-3">Target Device</th>
                <th className="py-3 px-3">Action &amp; Category</th>
                <th className="py-3 px-3">Result</th>
                <th className="py-3 px-3">Source IP</th>
                <th className="py-3 px-3">Message &amp; Correlation ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-850/50">
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                    {new Date(ev.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                    {ev.organizationName || ev.organizationId}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-medium text-slate-200 block truncate max-w-36">
                      {ev.userEmail || 'System / Service'}
                    </span>
                    {ev.userRole && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {ev.userRole}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {ev.deviceId ? (
                      <button
                        onClick={() =>
                          handleOpenDeviceDetail(
                            ev.deviceId!,
                            ev.deviceType === 'OMADA' ? 'OMADA' : 'MIKROTIK'
                          )
                        }
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline flex items-center gap-1 cursor-pointer"
                      >
                        {ev.deviceName || ev.deviceId}
                      </button>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                    <span className="text-[10px] text-slate-400 block font-mono">{ev.deviceType}</span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-mono font-bold text-amber-300 text-[11px] block">
                      {ev.action}
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase">{ev.category}</span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ev.result === 'SUCCESS'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : ev.result === 'DENIED'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {ev.result}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {ev.sourceIp || '127.0.0.1'}
                  </td>
                  <td className="py-2.5 px-3 max-w-xs">
                    <span className="text-slate-300 block truncate text-xs" title={ev.message}>
                      {ev.message || 'Action executed'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono block truncate">
                      CID: {ev.correlationId}
                    </span>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No activity events found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalEvents)} of {totalEvents} events
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 py-1 font-bold text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* DEVICE DETAILS MODAL (MikroTik / Omada) */}
      {selectedDeviceId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {selectedDeviceTypeModal === 'MIKROTIK' ? (
                    <Radio className="w-5 h-5 text-sky-400" />
                  ) : (
                    <Server className="w-5 h-5 text-indigo-400" />
                  )}
                  {selectedDeviceTypeModal === 'MIKROTIK'
                    ? `MikroTik Gateway: ${deviceDetailData?.router?.name || selectedDeviceId}`
                    : `Omada Controller: ${deviceDetailData?.controller?.siteId || selectedDeviceId}`}
                </h3>
                <p className="text-xs text-slate-400">
                  Cross-tenant deep inspection, heartbeat history, reported devices, and telemetry
                </p>
              </div>
              <button
                onClick={() => setSelectedDeviceId(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {detailLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading device diagnostic telemetry...
                </div>
              ) : selectedDeviceTypeModal === 'MIKROTIK' ? (
                <>
                  {/* MikroTik Details Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 uppercase font-semibold text-[10px] block">
                        Status
                      </span>
                      <span
                        className={`font-bold ${
                          deviceDetailData?.router?.calculatedStatus === 'ONLINE'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {deviceDetailData?.router?.calculatedStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-semibold text-[10px] block">
                        RouterOS Version
                      </span>
                      <span className="font-bold text-white">
                        {deviceDetailData?.router?.rosVersion || 'v7'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-semibold text-[10px] block">
                        Tenant Organization
                      </span>
                      <span className="font-bold text-white truncate block">
                        {deviceDetailData?.router?.organizationName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-semibold text-[10px] block">
                        Last Heartbeat
                      </span>
                      <span className="font-semibold text-slate-300 text-[11px]">
                        {deviceDetailData?.router?.lastHeartbeat
                          ? new Date(deviceDetailData.router.lastHeartbeat).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>

                  {/* Status History Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Recent Status Transitions &amp; Heartbeats
                    </h4>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto text-xs">
                      {deviceDetailData?.statusHistory?.map((h: any) => (
                        <div key={h.id} className="flex justify-between items-center text-slate-300">
                          <span className="font-semibold">{h.status}: {h.reason}</span>
                          <span className="text-slate-500 text-[10px]">
                            {new Date(h.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                      {(!deviceDetailData?.statusHistory || deviceDetailData.statusHistory.length === 0) && (
                        <div className="text-slate-500 text-center py-2">No status transitions recorded.</div>
                      )}
                    </div>
                  </div>

                  {/* Device Specific Activity Events */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Device Audit Trail (Last 50 Events)
                    </h4>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                          <tr>
                            <th className="py-2 px-3">Time</th>
                            <th className="py-2 px-3">Action</th>
                            <th className="py-2 px-3">Result</th>
                            <th className="py-2 px-3">Message</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {deviceDetailData?.activityEvents?.map((ev: any) => (
                            <tr key={ev.id}>
                              <td className="py-2 px-3 text-slate-400 text-[11px]">
                                {new Date(ev.createdAt).toLocaleTimeString()}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-amber-300">
                                {ev.action}
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-[10px]">{ev.result}</span>
                              </td>
                              <td className="py-2 px-3 text-slate-300 truncate max-w-xs">{ev.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Omada Controller Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 uppercase font-semibold text-[10px] block">
                        Controller Status
                      </span>
                      <span
                        className={`font-bold ${
                          deviceDetailData?.controller?.status === 'CONNECTED'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {deviceDetailData?.controller?.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-semibold text-[10px] block">
                        Site ID
                      </span>
                      <span className="font-bold text-white">
                        {deviceDetailData?.controller?.siteId}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-semibold text-[10px] block">
                        Tenant Organization
                      </span>
                      <span className="font-bold text-white truncate block">
                        {deviceDetailData?.controller?.organizationName}
                      </span>
                    </div>
                  </div>

                  {/* Managed Devices List (Distinguishing controller connectivity from individual devices) */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Reported Omada Devices &amp; EAP Access Points
                    </h4>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                      {deviceDetailData?.managedDevices?.map((dev: any) => (
                        <div key={dev.id} className="flex justify-between items-center text-slate-300 p-2 bg-slate-900 rounded-lg">
                          <div>
                            <span className="font-bold text-white block">{dev.name} ({dev.model})</span>
                            <span className="text-[10px] text-slate-400 font-mono">MAC: {dev.mac} &bull; Type: {dev.type}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${dev.status === 'ONLINE' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                            {dev.status}
                          </span>
                        </div>
                      ))}
                      {(!deviceDetailData?.managedDevices || deviceDetailData.managedDevices.length === 0) && (
                        <div className="text-slate-500 text-center py-4">
                          No individual Omada devices reported by this controller yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
