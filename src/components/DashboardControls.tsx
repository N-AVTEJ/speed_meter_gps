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
    <div className="w-full flex items-center justify-between gap-3 px-4 py-2 select-none">
      {/* Left Corner: Small minimal Unit Toggle */}
      <button
        onClick={onToggleUnit}
        type="button"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d0f16]/90 hover:bg-[#161a26] active:scale-95 border border-white/10 transition shadow-sm"
        aria-label={`Toggle speed unit, current unit is ${unit.toUpperCase()}`}
      >
        <span className="font-unit text-[10px] uppercase font-bold text-gray-400">
          UNIT
        </span>
        <span className="font-unit text-xs font-black text-[#ff6d00] bg-[#ff6d00]/15 px-1.5 py-0.5 rounded border border-[#ff6d00]/30">
          {unit.toUpperCase()}
        </span>
      </button>

      {/* Center Subtle Wake Status */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0a0c12]/70 border border-white/5"
        title={wakeLockActive ? 'Screen Wake Lock active' : 'Screen Wake Lock inactive'}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            wakeLockActive ? 'bg-[#ff6d00] glow-orange' : 'bg-gray-600'
          }`}
        />
        <span className="font-unit text-[9px] font-bold uppercase tracking-wider text-gray-400">
          WAKE
        </span>
      </div>

      {/* Right Corner: Small minimal HUD Mirror Toggle */}
      <button
        onClick={onToggleHud}
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition shadow-sm active:scale-95 ${
          isHudMirrored
            ? 'bg-[#ff5500]/20 border-[#ff6d00] text-white'
            : 'bg-[#0d0f16]/90 hover:bg-[#161a26] border-white/10 text-gray-300'
        }`}
        aria-label="Toggle HUD windshield mirror mode"
        aria-pressed={isHudMirrored}
      >
        <svg
          className="w-3.5 h-3.5 text-[#ff6d00]"
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
        <span className="font-unit text-xs font-black tracking-wider uppercase">
          {isHudMirrored ? 'HUD ON' : 'HUD'}
        </span>
      </button>
    </div>
  );
};
