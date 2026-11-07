import React from 'react';

interface ShiftLightStripProps {
  speedKmh: number | null;
  maxSpeedKmh?: number;
}

export const ShiftLightStrip: React.FC<ShiftLightStripProps> = ({
  speedKmh,
  maxSpeedKmh = 200,
}) => {
  const currentSpeed = speedKmh !== null && speedKmh > 0 ? speedKmh : 0;
  const ratio = Math.min(1, Math.max(0, currentSpeed / maxSpeedKmh));
  const activeCount = Math.round(ratio * 20);
  const isShiftAlert = ratio >= 0.95;

  return (
    <div
      className="w-full max-w-4xl mx-auto px-4 py-2 select-none"
      role="progressbar"
      aria-label="Shift Light Strip"
      aria-valuenow={Math.round(currentSpeed)}
      aria-valuemin={0}
      aria-valuemax={maxSpeedKmh}
    >
      <div className="flex items-center justify-between gap-1 sm:gap-1.5 p-1 rounded-lg bg-[#0a0c12]/80 border border-white/10 backdrop-blur-sm">
        {Array.from({ length: 20 }, (_, index) => {
          const isLit = index < activeCount;
          // Colors:
          // 0-5 (1-6): Green
          // 6-11 (7-12): Yellow
          // 12-15 (13-16): Orange
          // 16-19 (17-20): Red
          let litColorClass = 'bg-[#00e676] glow-green text-[#00e676]';
          if (index >= 16) {
            litColorClass = 'bg-[#ff1744] glow-red text-[#ff1744]';
          } else if (index >= 12) {
            litColorClass = 'bg-[#ff6d00] glow-orange text-[#ff6d00]';
          } else if (index >= 6) {
            litColorClass = 'bg-[#ffea00] glow-yellow text-[#ffea00]';
          }

          const unlitClass = 'bg-[#141720] border border-[#202534] opacity-50';

          return (
            <div
              key={index}
              className={`h-2.5 sm:h-3.5 flex-1 rounded-[2px] transition-all duration-75 transform -skew-x-12 ${
                isLit ? `${litColorClass} ${isShiftAlert ? 'animate-pulse' : ''}` : unlitClass
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
