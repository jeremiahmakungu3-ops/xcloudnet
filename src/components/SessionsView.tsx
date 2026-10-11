import React from 'react';
import { ApiClient } from '../lib/api.ts';
import { HotspotSession } from '../types/index.ts';
import { Wifi, LogOut, Radio } from 'lucide-react';

interface SessionsViewProps {
  sessions: HotspotSession[];
  onRefresh: () => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({ sessions, onRefresh }) => {
  const handleDisconnect = async (id: string) => {
    if (!confirm('Disconnect this active hotspot session?')) return;
    try {
      await ApiClient.post(`/api/v1/sessions/${id}/disconnect`);
      onRefresh();
    } catch (err: any) {
      alert(`Error disconnecting session: ${err.message}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wifi className="w-5 h-5 text-purple-400" /> Active RADIUS &amp; Hotspot Sessions
          </h2>
          <p className="text-xs text-slate-400">
            Real-time telemetry of clients authorized on your MikroTik and Omada gateways
          </p>
        </div>

        <span className="text-xs font-bold px-3 py-1 bg-purple-950 text-purple-300 border border-purple-800 rounded-full self-start">
          {sessions.length} Live Clients
        </span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User / Voucher</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4">MAC Address</th>
                <th className="py-3 px-4">Connected At</th>
                <th className="py-3 px-4">Data Usage</th>
                <th className="py-3 px-4 text-right">Disconnect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-850/50">
                  <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {sess.voucherCode}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">{sess.ipAddress}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{sess.macAddress}</td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(sess.startedAt).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <span className="text-emerald-400">↓ {formatBytes(sess.bytesIn)}</span> &bull;{' '}
                    <span className="text-sky-400">↑ {formatBytes(sess.bytesOut)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDisconnect(sess.id)}
                      className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded text-xs transition cursor-pointer flex items-center gap-1 ml-auto"
                    >
                      <LogOut className="w-3 h-3" /> Drop
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No active clients online right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
