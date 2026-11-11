import React, { useState } from 'react';
import {
  Cpu,
  Database,
  CheckCircle2,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  Server,
  FileCode,
} from 'lucide-react';

interface ErpSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  partsCount: number;
  txCount: number;
}

export const ErpSyncModal: React.FC<ErpSyncModalProps> = ({
  isOpen,
  onClose,
  partsCount,
  txCount,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulateSync = () => {
    setSyncing(true);
    setSyncStatus('در حال برقراری ارتباط با درگاه داده‌های ساپکو (SAPCO EDI) و همگام‌سازی دفاتر...');
    setTimeout(() => {
      setSyncing(false);
      setSyncStatus(`همگام‌سازی موفق: تعداد ${txCount} سند تراکنش و ${partsCount} کاتالوگ قطعه با وب‌سرویس ERP به روز گردید.`);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              درگاه اتصال به SQL Server و ERP صنعتی ساپکو
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">وضعیت رابط ماژولار:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                آماده اتصال به پایگاه‌های رابطه‌ای (SQL Server / SAP)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">موتور بک‌اند:</span>
              <span className="font-mono text-white">Node.js Express Ledger Engine (/api/*)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">ذخیره‌سازی ابری:</span>
              <span className="font-mono text-amber-400">Google Cloud Firestore & Firebase Auth</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-white text-xs">پروتکل‌های تبادل داده استاندارد پشتیبانی شده:</h4>
            <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
              <li>تبادل بارنامه الکترونیک و رسید محموله کویل ساپکو (EDI ASN 856)</li>
              <li>انتقال سرفصل دفاتر انبار و بهای تمام‌شده قطعات به SQL Server همکاران سیستم / رایورز</li>
              <li>صدور خروجی مکانیزه حواله انبار برای سیستم جامع تولید ایران‌خودرو و سایپا</li>
            </ul>
          </div>

          {syncStatus && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="text-[11px] text-slate-500 font-mono">
              GET /api/health (200 OK)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
              >
                بستن
              </button>
              <button
                type="button"
                onClick={handleSimulateSync}
                disabled={syncing}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-md shadow-cyan-900/30 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'در حال ارسال به ERP...' : 'تست تبادل داده با ERP'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
