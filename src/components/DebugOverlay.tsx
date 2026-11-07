import React from 'react';
import { GpsDebugInfo } from '../hooks/useGeolocationSpeed';

export interface DebugOverlayProps {
  debug: GpsDebugInfo;
  accuracy: number | null;
  rawSpeedKmh: number;
  filteredSpeedKmh: number;
  lastFixTime: number | null;
}

export function DebugOverlay({
  debug,
  accuracy,
  rawSpeedKmh,
  filteredSpeedKmh,
  lastFixTime,
}: DebugOverlayProps) {
  const secondsSinceFix =
    lastFixTime !== null
      ? `${((Date.now() - lastFixTime) / 1000).toFixed(1)}s`
      : 'null';

  const coordsSpeedStr =
    debug.hardwareSpeedKmh !== null
      ? `${debug.hardwareSpeedKmh.toFixed(1)} km/h`
      : 'null';

  const accuracyStr = accuracy !== null ? `${accuracy.toFixed(1)} m` : 'null';

  return (
    <div
      className="absolute top-14 left-3 z-40 pointer-events-none bg-black/85 border border-emerald-500/40 rounded p-2 text-emerald-400 font-mono text-[10px] leading-tight shadow-lg shadow-black/80 tracking-wide select-none max-w-[240px]"
      aria-hidden="true"
    >
      <div className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest border-b border-emerald-500/30 pb-0.5 mb-1">
        GPS Diagnostics
      </div>
      <div className="grid grid-cols-[105px_1fr] gap-x-1.5 gap-y-0.5 tabular-nums">
        <span className="text-emerald-500/80">coords.speed:</span>
        <span className="text-right text-emerald-300 font-bold">{coordsSpeedStr}</span>

        <span className="text-emerald-500/80">source:</span>
        <span className="text-right text-emerald-300">{debug.speedSource}</span>

        <span className="text-emerald-500/80">accuracy:</span>
        <span className="text-right text-emerald-300">{accuracyStr}</span>

        <span className="text-emerald-500/80">raw km/h:</span>
        <span className="text-right text-emerald-300">{rawSpeedKmh.toFixed(1)}</span>

        <span className="text-emerald-500/80">filtered km/h:</span>
        <span className="text-right text-emerald-300">{filteredSpeedKmh.toFixed(1)}</span>

        <span className="text-emerald-500/80">sec since fix:</span>
        <span className="text-right text-emerald-300">{secondsSinceFix}</span>

        <span className="text-emerald-500/80">accepted:</span>
        <span className="text-right text-emerald-300">{debug.accepted}</span>

        <span className="text-emerald-500/80">rej accuracy:</span>
        <span className="text-right text-emerald-300">{debug.rejectedAccuracy}</span>

        <span className="text-emerald-500/80">rej jump:</span>
        <span className="text-right text-emerald-300">{debug.rejectedJump}</span>

        <span className="text-emerald-500/80">rej unknown:</span>
        <span className="text-right text-emerald-300">{debug.rejectedUnknown}</span>
      </div>
    </div>
  );
}
