import React, { useState } from 'react';
import { Download, WifiOff, CheckCircle2 } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <>
      {!isOnline && (
        <span
          title="حالت آفلاین کارگاه فعال است — داده‌ها از حافظه محلی و سرویس‌ورکر خوانده می‌شوند"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-600" />
          <span>آفلاین (کارگاه)</span>
        </span>
      )}

      {!isInstalled && isInstallable && (
        <button
          type="button"
          onClick={install}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          title="نصب اپلیکیشن کارگاه برای استفاده آفلاین"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">نصب نسخه آفلاین</span>
        </button>
      )}

      {!isInstalled && !isInstallable && isIOS && (
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">نصب در iOS</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl border border-slate-200 text-right space-y-3">
            <h3 className="text-sm font-bold text-slate-900">نصب نسخه آفلاین کارگاه روی آیفون / آیپد</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ۱. دکمه <strong>Share</strong> در نوار پایین مرورگر Safari را لمس کنید.
              <br />
              ۲. گزینه <strong>Add to Home Screen</strong> را انتخاب نمایید تا برنامه در حالت آفلاین کارگاه نصب شود.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ pendingSyncCount?: number }> = ({
  pendingSyncCount = 0,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingSyncCount === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-xl bg-slate-900/95 border border-slate-700 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
      {!isOnline ? (
        <>
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>حالت آفلاین کارگاه فعال است — ثبت اسناد و تولید بدون اینترنت ادامه دارد</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>آنلاین — همگام‌سازی خودکار داده‌های کارگاه انجام شد</span>
        </>
      )}
    </div>
  );
};
