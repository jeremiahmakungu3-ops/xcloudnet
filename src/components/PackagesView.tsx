import React, { useState } from 'react';
import { ApiClient } from '../lib/api.ts';
import { HotspotPackage } from '../types/index.ts';
import { Layers, Plus, Clock, Gauge, Smartphone, Check } from 'lucide-react';

interface PackagesViewProps {
  packages: HotspotPackage[];
  onRefresh: () => void;
}

export const PackagesView: React.FC<PackagesViewProps> = ({ packages, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(1000);
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [uploadSpeedKbps, setUploadSpeedKbps] = useState(2048);
  const [downloadSpeedKbps, setDownloadSpeedKbps] = useState(4096);
  const [dataLimitMb, setDataLimitMb] = useState(0);
  const [simultaneousDevices, setSimultaneousDevices] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ApiClient.post('/api/v1/packages', {
        name,
        description,
        price,
        durationMinutes,
        uploadSpeedKbps,
        downloadSpeedKbps,
        dataLimitMb,
        simultaneousDevices,
      });
      setShowAddModal(false);
      setName('');
      onRefresh();
    } catch (err: any) {
      alert(`Error creating package: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" /> Hotspot Packages &amp; Pricing
          </h2>
          <p className="text-xs text-slate-400">
            Define time-based, data-based, and speed-limited plans for your customer captive portal
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" /> Add Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {pkg.durationMinutes >= 1440
                    ? `${Math.round(pkg.durationMinutes / 1440)} Days`
                    : `${Math.round(pkg.durationMinutes / 60)} Hours`}
                </span>
                <span className="text-lg font-black text-white">TZS {pkg.price.toLocaleString()}</span>
              </div>

              <h3 className="text-base font-bold text-white">{pkg.name}</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">{pkg.description || 'Unlimited hotspot access'}</p>

              <div className="space-y-2 text-xs border-t border-slate-800 pt-3 text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" /> Duration
                  </span>
                  <span className="font-semibold">{pkg.durationMinutes} minutes</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-slate-500" /> Max Speed
                  </span>
                  <span className="font-semibold text-emerald-400">
                    {Math.round(pkg.downloadSpeedKbps / 1024)} Mbps Down /{' '}
                    {Math.round(pkg.uploadSpeedKbps / 1024)} Mbps Up
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-slate-500" /> Devices
                  </span>
                  <span className="font-semibold">
                    {pkg.simultaneousDevices} {pkg.simultaneousDevices > 1 ? 'Devices' : 'Device'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Data Limit:</span>
                  <span className="font-semibold">
                    {pkg.dataLimitMb ? `${pkg.dataLimitMb} MB` : 'Unlimited'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> Ready for Voucher &amp; Selcom Billing
            </div>
          </div>
        ))}
      </div>

      {/* Add Package Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">Create Hotspot Package</h3>

            <form onSubmit={handleCreatePackage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Package Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 6 Hours Student Pass"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Price (TZS)
                  </label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Download Speed (Kbps)
                  </label>
                  <input
                    type="number"
                    value={downloadSpeedKbps}
                    onChange={(e) => setDownloadSpeedKbps(Number(e.target.value))}
                    placeholder="4096"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Upload Speed (Kbps)
                  </label>
                  <input
                    type="number"
                    value={uploadSpeedKbps}
                    onChange={(e) => setUploadSpeedKbps(Number(e.target.value))}
                    placeholder="2048"
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
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
