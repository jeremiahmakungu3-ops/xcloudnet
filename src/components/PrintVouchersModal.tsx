import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Voucher, HotspotPackage } from '../types/index.ts';
import { Printer, X, Wifi } from 'lucide-react';

interface PrintVouchersModalProps {
  vouchers: (Voucher & { package?: HotspotPackage })[];
  isOpen: boolean;
  onClose: () => void;
}

export const PrintVouchersModal: React.FC<PrintVouchersModalProps> = ({
  vouchers,
  isOpen,
  onClose,
}) => {
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || vouchers.length === 0) return;

    const generateQRs = async () => {
      const qrs: Record<string, string> = {};
      for (const v of vouchers) {
        try {
          // Standard MikroTik / Captive Portal login URL format
          const loginPayload = `http://hotspot.local/login?username=${v.code}&password=`;
          const dataUrl = await QRCode.toDataURL(loginPayload, {
            width: 120,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
          qrs[v.id] = dataUrl;
        } catch (e) {
          console.error('Failed to generate QR for voucher:', v.code, e);
        }
      }
      setQrCodes(qrs);
    };

    generateQRs();
  }, [isOpen, vouchers]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">
              Printable Voucher Sheet ({vouchers.length} Vouchers)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 print:bg-white print:p-0 print:overflow-visible">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
            {vouchers.map((voucher) => (
              <div
                key={voucher.id}
                className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl p-4 flex flex-col justify-between text-slate-100 print:bg-white print:text-black print:border-black print:border-2"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-2 mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider uppercase text-indigo-400 print:text-black">
                      <Wifi className="w-3.5 h-3.5" />
                      <span>XCLOUD HOTSPOT</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-950 text-indigo-300 print:bg-slate-100 print:text-black rounded">
                      TZS {voucher.price.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-white print:text-black truncate">
                    {voucher.package?.name || 'Hotspot Access'}
                  </p>
                  <p className="text-xs text-slate-400 print:text-slate-600 mb-2">
                    {voucher.package?.durationMinutes
                      ? `${Math.round(voucher.package.durationMinutes / 60)} Hours Duration`
                      : 'Unlimited Speed'}
                  </p>
                </div>

                <div className="my-2 flex items-center justify-between gap-2 bg-slate-950 print:bg-slate-50 p-2 rounded-lg border border-slate-800 print:border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 print:text-slate-600 block">
                      Voucher Code:
                    </span>
                    <span className="font-mono text-base font-extrabold tracking-wider text-amber-400 print:text-black">
                      {voucher.code}
                    </span>
                  </div>
                  {qrCodes[voucher.id] && (
                    <img
                      src={qrCodes[voucher.id]}
                      alt="Scan to Login"
                      className="w-14 h-14 rounded-sm bg-white p-0.5"
                    />
                  )}
                </div>

                <div className="text-[9px] text-slate-400 print:text-slate-500 text-center pt-1 border-t border-slate-800/80 print:border-slate-200">
                  Connect to Wi-Fi &bull; Open Browser &bull; Enter Code or Scan QR
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
