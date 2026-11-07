import React from 'react';

interface PermissionDeniedModalProps {
  onRetry: () => void;
  onSimulate?: () => void;
  errorMessage: string | null;
}

export const PermissionDeniedModal: React.FC<PermissionDeniedModalProps> = ({
  onRetry,
  onSimulate,
  errorMessage,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0f131d] border-2 border-[#ff5500]/60 p-6 sm:p-8 shadow-2xl text-center space-y-6">
        {/* Warning Icon with Neon Glow */}
        <div className="mx-auto w-16 h-16 rounded-full bg-[#ff5500]/15 border-2 border-[#ff5500] flex items-center justify-center shadow-lg shadow-[#ff5500]/30">
          <svg
            className="w-8 h-8 text-[#ff6a00]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>

        <div className="space-y-3">
          <h2
            id="permission-title"
            className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-white"
          >
            GPS Access Required
          </h2>
          <p className="text-base sm:text-lg font-medium text-gray-300 leading-relaxed">
            {errorMessage ||
              'Apex Speedo requires high-accuracy GPS to track real-time motorcycle speed.'}
          </p>
          <p className="text-sm text-gray-400">
            Please allow location permission in your device/browser settings.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={onRetry}
            type="button"
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#ff3b00] to-[#ff7700] hover:from-[#ff5500] hover:to-[#ffa200] text-white font-black text-lg uppercase tracking-wider shadow-lg shadow-[#ff5500]/40 transition active:scale-98"
          >
            Retry GPS Access
          </button>

          {onSimulate && (
            <button
              onClick={onSimulate}
              type="button"
              className="w-full py-3 px-6 rounded-xl bg-[#1a2030] hover:bg-[#252e44] text-gray-200 font-bold text-sm uppercase tracking-wider border border-white/15 transition"
            >
              Preview Gauge (Demo Run)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
