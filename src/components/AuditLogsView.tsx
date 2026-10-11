import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api.ts';
import { AuditLog } from '../types/index.ts';
import { ShieldCheck, Search, Filter } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    ApiClient.get('/api/v1/admin/audit-logs')
      .then(setLogs)
      .catch(() => {
        // Fallback for non-superadmin
        ApiClient.get('/api/v1/reports/summary').catch(console.error);
      });
  }, []);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(term) ||
      l.userEmail.toLowerCase().includes(term) ||
      l.resourceType.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" /> Security &amp; Operations Audit Trail
          </h2>
          <p className="text-xs text-slate-400">
            Immutable log of all staff approvals, configuration changes, voucher activations, and router setups
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Responsible User</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-850/50">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-white">{log.userEmail}</td>
                  <td className="py-3 px-4 text-slate-300">
                    <span className="text-indigo-400 font-semibold">{log.resourceType}</span>
                    {log.resourceId && <span className="text-[10px] text-slate-500 block">{log.resourceId}</span>}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate font-mono text-[11px]">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No audit records matching query.
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
