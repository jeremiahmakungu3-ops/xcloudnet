import React, { useState } from 'react';
import { ApiClient } from '../lib/api.ts';
import { Agent, LedgerEntry, HotspotPackage } from '../types/index.ts';
import {
  Users,
  Plus,
  DollarSign,
  Wallet,
  ShoppingBag,
  History,
  CheckCircle,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

interface AgentsViewProps {
  agents: Agent[];
  packages: HotspotPackage[];
  onRefresh: () => void;
}

export const AgentsView: React.FC<AgentsViewProps> = ({ agents, packages, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'pos' | 'ledger'>('pos');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFloatModal, setShowFloatModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || '');
  const [selectedPackageId, setSelectedPackageId] = useState(packages[0]?.id || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [posSuccessVoucher, setPosSuccessVoucher] = useState<any | null>(null);

  // New Agent fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+255714000111');
  const [commissionRate, setCommissionRate] = useState(10);
  const [initialFloat, setInitialFloat] = useState(10000);

  // Float adjustment fields
  const [floatAmount, setFloatAmount] = useState(10000);
  const [floatType, setFloatType] = useState<'FLOAT_CREDIT' | 'FLOAT_DEBIT'>('FLOAT_CREDIT');
  const [floatRef, setFloatRef] = useState('');
  const [floatDesc, setFloatDesc] = useState('');

  // Ledger entries
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);

  const handleFetchLedger = async () => {
    try {
      const res = await ApiClient.get('/api/v1/agents/ledger');
      setLedgerEntries(res);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/api/v1/agents', {
        name,
        phone,
        commissionRatePercent: commissionRate,
        initialFloat,
      });
      setShowAddModal(false);
      setName('');
      onRefresh();
    } catch (err: any) {
      alert(`Error creating agent: ${err.message}`);
    }
  };

  const handleAdjustFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    try {
      await ApiClient.post(`/api/v1/agents/${selectedAgentId}/float`, {
        amount: floatAmount,
        type: floatType,
        reference: floatRef || `FLT-${Date.now()}`,
        description: floatDesc || 'Manual float balance adjustment',
      });
      setShowFloatModal(false);
      onRefresh();
      handleFetchLedger();
    } catch (err: any) {
      alert(`Error adjusting float: ${err.message}`);
    }
  };

  const handlePOSSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosSuccessVoucher(null);
    try {
      const res = await ApiClient.post('/api/v1/agents/pos-sell', {
        agentId: selectedAgentId || agents[0]?.id,
        packageId: selectedPackageId || packages[0]?.id,
        customerPhone,
      });
      setPosSuccessVoucher(res);
      onRefresh();
      handleFetchLedger();
    } catch (err: any) {
      alert(`POS sale failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" /> Agents &amp; Point of Sale (POS)
          </h2>
          <p className="text-xs text-slate-400">
            Kiosk reseller management, wallet float accounting, and auditable financial ledgers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFloatModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" /> Adjust Float
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Agent
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pos'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Live POS Terminal
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'agents'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Agent Directory ({agents.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('ledger');
            handleFetchLedger();
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" /> Financial Ledgers
        </button>
      </div>

      {/* TAB 1: POS TERMINAL */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-1">Instant Voucher POS Terminal</h3>
            <p className="text-xs text-slate-400 mb-4">
              Agent sells voucher to walk-in customer. Float is automatically deducted net of commission.
            </p>

            <form onSubmit={handlePOSSale} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Selling Agent Account
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — Float: TZS {a.walletBalance.toLocaleString()} ({a.commissionRatePercent}% Comm)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Hotspot Package
                </label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — TZS {p.price.toLocaleString()} ({p.durationMinutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Customer Phone (Optional for SMS / record)
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+255710000000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> Complete POS Sale &amp; Print Code
              </button>
            </form>
          </div>

          {/* POS Receipt / Success Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white mb-2">POS Customer Receipt</h3>
              {posSuccessVoucher ? (
                <div className="p-5 bg-slate-950 border-2 border-dashed border-emerald-500/50 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <CheckCircle className="w-4 h-4" /> Sale Completed Successfully
                  </div>

                  <div className="text-center py-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block">
                      Hotspot Voucher Code
                    </span>
                    <span className="text-2xl font-black font-mono tracking-widest text-amber-400">
                      {posSuccessVoucher.voucher.code}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Voucher Price:</span>
                      <span className="font-bold text-white">
                        TZS {posSuccessVoucher.voucher.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Agent Commission Earned:</span>
                      <span className="font-bold text-emerald-400">
                        +TZS {posSuccessVoucher.commissionEarned.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Remaining Agent Float:</span>
                      <span className="font-bold text-sky-400">
                        TZS {posSuccessVoucher.agent.walletBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800/80">
                  Select an agent and package, then submit the sale to display the customer receipt
                  and generated code.
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-4">
              All balance changes are recorded into immutable double-entry ledger entries.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: AGENTS DIRECTORY */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white">{agent.name}</h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {agent.commissionRatePercent}% Comm
                </span>
              </div>

              <div className="text-xs text-slate-400">{agent.phone}</div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Wallet Float:</span>
                  <span className="font-bold text-white">TZS {agent.walletBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Commissions:</span>
                  <span className="font-bold text-emerald-400">
                    TZS {agent.totalCommissionEarned.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: LEDGER ENTRIES */}
      {activeTab === 'ledger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Balance Before</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {ledgerEntries.map((ledg) => (
                  <tr key={ledg.id}>
                    <td className="py-3 px-4 font-mono font-bold text-white">{ledg.reference}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {ledg.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      TZS {ledg.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      TZS {ledg.balanceBefore.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-400">
                      TZS {ledg.balanceAfter.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                      {ledg.description}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(ledg.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {ledgerEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No ledger entries recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">Register Agent / Reseller</h3>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Agent Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mbagala Station Kiosk"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+255710000000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Initial Float (TZS)
                  </label>
                  <input
                    type="number"
                    value={initialFloat}
                    onChange={(e) => setInitialFloat(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Save Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Float Modal */}
      {showFloatModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">Adjust Agent Wallet Float</h3>
            <form onSubmit={handleAdjustFloat} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Select Agent
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — Current: TZS {a.walletBalance.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Action Type
                  </label>
                  <select
                    value={floatType}
                    onChange={(e) => setFloatType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="FLOAT_CREDIT">Credit (Top-Up)</option>
                    <option value="FLOAT_DEBIT">Debit (Withdrawal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Amount (TZS)
                  </label>
                  <input
                    type="number"
                    required
                    value={floatAmount}
                    onChange={(e) => setFloatAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Reference (Bank / Slip / SMS Code)
                </label>
                <input
                  type="text"
                  value={floatRef}
                  onChange={(e) => setFloatRef(e.target.value)}
                  placeholder="e.g. MPESA-DEP-9812"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFloatModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Record Ledger &amp; Adjust
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
