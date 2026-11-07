import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-full bg-[#ff5500] hover:bg-[#ff6a00] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#ff5500]/30 transition active:scale-95 border border-[#ff9900]"
        aria-label="Install Apex Speedo app"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Install PWA
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-full border border-white/20 bg-[#121622] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-200 hover:bg-[#1a2030] transition"
          aria-label="Install guide for iOS"
        >
          <svg className="w-3.5 h-3.5 text-[#ff6a00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Install App
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#0e121b] border border-white/20 p-6 shadow-2xl text-white">
              <h3 className="text-lg font-black uppercase tracking-wider text-[#ff6a00]">
                Install on iPhone / iPad
              </h3>
              <p className="mt-3 text-sm text-gray-300 leading-relaxed">
                1. Tap the <strong>Share</strong> button in Safari toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#1c2233] hover:bg-[#252e44] py-2.5 text-sm font-bold uppercase text-white border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
