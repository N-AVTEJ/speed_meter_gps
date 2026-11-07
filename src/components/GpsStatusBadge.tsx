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
  const dotColorClass =
    status === 'green'
      ? 'bg-[#00e676] glow-green'
      : status === 'yellow'
      ? 'bg-[#ffea00] glow-yellow'
      : 'bg-[#ff1744] glow-red animate-pulse';

  const labelText = !hasReceivedFirstFix
    ? 'ACQUIRING GPS'
    : status === 'green' && accuracy !== null
    ? `GPS ±${Math.round(accuracy)}M`
    : status === 'yellow' && accuracy !== null
    ? `GPS ±${Math.round(accuracy)}M`
    : accuracy && accuracy > 25
    ? `DROPPED (>25M)`
    : 'NO GPS FIX';

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0d0f16]/90 border border-white/10 shadow-md select-none"
      role="status"
      aria-label={`GPS Status: ${labelText}`}
    >
      <span
        className={`w-2 h-2 rounded-full transition-colors duration-300 ${dotColorClass}`}
      />
      <span className="font-unit text-[11px] font-bold tracking-wider uppercase text-gray-200">
        {labelText}
      </span>
      {droppedCount > 0 && status === 'red' && (
        <span
          className="font-unit text-[10px] font-bold px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30"
          title="Dropped inaccurate fixes (>25m)"
        >
          {droppedCount}
        </span>
      )}
    </div>
  );
};
