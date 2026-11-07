import React from 'react';
import { SpeedUnit } from './AnalogArcGauge';

interface DashboardControlsProps {
  unit: SpeedUnit;
  onToggleUnit: () => void;
  isHudMirrored: boolean;
  onToggleHud: () => void;
  wakeLockActive: boolean;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
  unit,
  onToggleUnit,
  isHudMirrored,
  onToggleHud,
  wakeLockActive,
}) => {
  return (
    <footer className="w-full max-w-lg mx-auto flex items-center justify-between gap-4 px-4 py-3 select-none">
      {/* Unit Toggle Button: Large chunky touch target */}
      <button
        onClick={onToggleUnit}
        type="button"
        className="flex-1 py-3 px-4 rounded-xl bg-[#141824]/90 hover:bg-[#1c2233] active:scale-95 border-2 border-white/20 transition-all shadow-lg flex items-center justify-center gap-2"
        aria-label={`Toggle speed unit, current unit is ${unit.toUpperCase()}`}
      >
        <span className="text-xs uppercase font-extrabold tracking-wider text-gray-400">
          Unit
        </span>
        <span className="text-lg font-black tracking-wide text-white uppercase bg-[#ff5500]/20 text-[#ff7700] px-2.5 py-0.5 rounded-lg border border-[#ff6a00]/40">
          {unit.toUpperCase()}
        </span>
      </button>

      {/* HUD Mirror Toggle Button: Horizontally flips display */}
      <button
        onClick={onToggleHud}
        type="button"
        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 ${
          isHudMirrored
            ? 'bg-[#ff5500]/25 border-[#ff6a00] text-white shadow-[#ff5500]/20'
            : 'bg-[#141824]/90 hover:bg-[#1c2233] border-white/20 text-gray-300'
        }`}
        aria-label="Toggle HUD windshield mirror mode"
        aria-pressed={isHudMirrored}
      >
        {/* Flip horizontal SVG icon */}
        <svg
          className="w-5 h-5 text-[#ff6a00]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
        <span className="text-sm font-black tracking-wider uppercase">
          {isHudMirrored ? 'HUD ON' : 'HUD OFF'}
        </span>
      </button>

      {/* Screen Wake Lock Status Pill */}
      <div
        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#10141f]/80 border border-white/10"
        title={wakeLockActive ? 'Screen Wake Lock active (prevents screen timeout)' : 'Screen Wake Lock inactive'}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            wakeLockActive ? 'bg-[#ff6a00] glow-neon-orange' : 'bg-gray-600'
          }`}
        />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          WAKE
        </span>
      </div>
    </footer>
  );
};
