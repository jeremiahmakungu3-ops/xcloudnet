import React, { useState } from 'react';
import { ApiClient } from '../lib/api.ts';
import { Voucher, HotspotPackage } from '../types/index.ts';
import {
  Ticket,
  Plus,
  Printer,
  Search,
  Filter,
  Ban,
  CheckCircle,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { PrintVouchersModal } from './PrintVouchersModal.tsx';

interface VouchersViewProps {
  vouchers: (Voucher & { package?: HotspotPackage })[];
  packages: HotspotPackage[];
  onRefresh: () => void;
}

export const VouchersView: React.FC<VouchersViewProps> = ({ vouchers, packages, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Generate inputs
  const [selectedPackageId, setSelectedPackageId] = useState(packages[0]?.id || '');
  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState('XC');
  const [loading, setLoading] = useState(false);

  // Test redemption inputs
  const [testCode, setTestCode] = useState('');
  const [testMac, setTestMac] = useState('AA:BB:CC:DD:EE:01');
  const [testResult, setTestResult] = useState<any | null>(null);

  const filtered = vouchers.filter((v) => {
    if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
    if (searchTerm && !v.code.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ApiClient.post('/api/v1/vouchers/generate', {
        packageId: selectedPackageId || packages[0]?.id,
        count,
        prefix,
      });
      setShowGenerateModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`Error generating vouchers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this voucher? It cannot be redeemed.')) return;
    try {
      await ApiClient.post(`/api/v1/vouchers/${id}/revoke`);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTestRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    try {
      const res = await ApiClient.post('/api/v1/vouchers/redeem', {
        code: testCode,
        macAddress: testMac,
        ipAddress: '192.168.88.105',
      });
      setTestResult(res);
      onRefresh();
    } catch (err: any) {
      alert(`Redemption error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-400" /> Hotspot Voucher Management
          </h2>
          <p className="text-xs text-slate-400">
            Generate single or bulk access vouchers, export printable tickets with QR codes, and track redemption
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowTestModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" /> Portal Test
          </button>
          <button
            onClick={() => setShowPrintModal(true)}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print Sheet
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Generate Vouchers
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by voucher code..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active (Unused)</option>
            <option value="USED">Used / Online</option>
            <option value="EXPIRED">Expired</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Voucher Code</th>
                <th className="py-3 px-4">Plan / Package</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Activated At</th>
                <th className="py-3 px-4">Expires At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-slate-850/50">
                  <td className="py-3 px-4 font-mono font-extrabold text-amber-300 tracking-wider">
                    {v.code}
                  </td>
                  <td className="py-3 px-4 font-medium text-white">
                    {v.package?.name || 'General Access'}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">TZS {v.price.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.status === 'ACTIVE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : v.status === 'USED'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : v.status === 'EXPIRED'
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {v.activatedAt ? new Date(v.activatedAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {v.expiresAt ? new Date(v.expiresAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {v.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRevoke(v.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 transition cursor-pointer"
                        title="Revoke Voucher"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No vouchers matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Vouchers Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Generate Hotspot Vouchers</h3>
            <p className="text-xs text-slate-400 mb-4">
              Create single or bulk printable vouchers tied to a hotspot speed &amp; time package.
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Select Package
                </label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — TZS {pkg.price.toLocaleString()} ({pkg.durationMinutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Voucher Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Code Prefix
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    placeholder="XC"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Generating...' : `Generate ${count} Vouchers`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Captive Portal Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Captive Portal Login Tester</h3>
            <p className="text-xs text-slate-400 mb-4">
              Simulates a Wi-Fi client redeeming a voucher code at the captive portal redirect page.
            </p>

            <form onSubmit={handleTestRedeem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Voucher Code
                </label>
                <input
                  type="text"
                  required
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                  placeholder="XC-8492-7103"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Client MAC Address
                </label>
                <input
                  type="text"
                  value={testMac}
                  onChange={(e) => setTestMac(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Redeem &amp; Authorize Access
                </button>
              </div>
            </form>

            {testResult && (
              <div className="mt-4 p-3 bg-slate-950 border border-emerald-700 rounded-lg text-xs text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Hotspot Access Granted!
                </div>
                <div>Session Timeout: {testResult.sessionTimeoutSeconds}s</div>
                <div>Bandwidth Limit: {testResult.rateLimitString}</div>
                <div>Expires At: {new Date(testResult.voucher.expiresAt).toLocaleTimeString()}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print Modal */}
      <PrintVouchersModal
        vouchers={filtered}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />
    </div>
  );
};
