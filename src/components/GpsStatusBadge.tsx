import React from 'react';
import { AccuracyLevel } from '../utils/speedMath';

interface GpsStatusBadgeProps {
  status: AccuracyLevel;
  accuracy: number | null;
  droppedCount: number;
  hasReceivedFirstFix?: boolean;
}

export const GpsStatusBadge: React.FC<GpsStatusBadgeProps> = ({
  status,
  accuracy,
  droppedCount,
  hasReceivedFirstFix = false,
}) => {
  // Dot styling
  const dotColorClass =
    status === 'green'
      ? 'bg-emerald-400 glow-green'
      : status === 'yellow'
      ? 'bg-amber-400 glow-yellow'
      : 'bg-rose-500 glow-red animate-pulse';

  const labelText = !hasReceivedFirstFix
    ? 'ACQUIRING GPS'
    : status === 'green' && accuracy !== null
    ? `GPS ±${Math.round(accuracy)}m`
    : status === 'yellow' && accuracy !== null
    ? `GPS ±${Math.round(accuracy)}m`
    : accuracy && accuracy > 25
    ? `DROPPED (>25m)`
    : 'NO GPS FIX';

  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#121622]/90 border border-white/15 backdrop-blur-md shadow-lg"
      role="status"
      aria-label={`GPS Status: ${labelText}`}
    >
      <span
        className={`w-3.5 h-3.5 rounded-full transition-colors duration-300 ${dotColorClass}`}
      />
      <span className="text-sm font-bold tracking-wider uppercase text-white/95">
        {labelText}
      </span>
      {droppedCount > 0 && status === 'red' && (
        <span
          className="text-xs font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30"
          title="Dropped inaccurate fixes (>25m)"
        >
          {droppedCount} dropped
        </span>
      )}
    </div>
  );
};
