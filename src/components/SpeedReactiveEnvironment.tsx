import React, { useMemo } from 'react';

interface SpeedReactiveEnvironmentProps {
  speedKmh: number | null;
  maxSpeedKmh?: number;
}

export const SpeedReactiveEnvironment: React.FC<SpeedReactiveEnvironmentProps> = ({
  speedKmh,
  maxSpeedKmh = 200,
}) => {
  const currentSpeed = speedKmh !== null && speedKmh > 0 ? speedKmh : 0;
  const ratio = Math.min(1, Math.max(0, currentSpeed / maxSpeedKmh));

  // Velocity-proportional duration: 2.2s at low speed down to 0.35s at 200 km/h
  const streakDuration = useMemo(() => {
    if (currentSpeed <= 0) return '0s';
    const durationSec = Math.max(0.35, 2.2 - ratio * 1.85);
    return `${durationSec.toFixed(2)}s`;
  }, [currentSpeed, ratio]);

  // Opacity of streaks: 0 at rest, up to 0.55 at full throttle
  const streakOpacity = currentSpeed <= 0 ? 0 : Math.min(0.55, 0.15 + ratio * 0.4);

  // Vignette opacities (hardware-accelerated opacity blending)
  // Cool dark: active mostly at low speeds
  const coolOpacity = Math.max(0, 1 - ratio * 1.5);
  // Ember orange: active mid speeds (40 - 150 km/h)
  const emberOpacity = Math.min(0.7, ratio > 0.15 ? (ratio - 0.15) * 1.4 : 0);
  // Intense track red: active high speeds (> 140 km/h)
  const redOpacity = Math.min(0.85, ratio > 0.65 ? (ratio - 0.65) * 2.5 : 0);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none" aria-hidden="true">
      {/* Cool Dark Edge Vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: coolOpacity,
          boxShadow: 'inset 0 0 100px rgba(5, 7, 12, 0.95)',
        }}
      />

      {/* Ember Orange Edge Vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: emberOpacity,
          boxShadow: 'inset 0 0 120px rgba(255, 107, 0, 0.45), inset 0 0 50px rgba(255, 80, 0, 0.3)',
        }}
      />

      {/* Track Red Adrenaline Edge Vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: redOpacity,
          boxShadow: 'inset 0 0 140px rgba(255, 23, 68, 0.65), inset 0 0 60px rgba(255, 0, 50, 0.45)',
        }}
      />

      {/* Diagonal Speed-Streak Lines drifting across the background */}
      {currentSpeed > 0 && (
        <div
          className="absolute inset-[-50%] transition-opacity duration-300"
          style={{
            opacity: streakOpacity,
            transform: 'rotate(-28deg)',
          }}
        >
          <div
            className="w-full h-full speed-streak-moving flex flex-col justify-around"
            style={{
              ['--streak-duration' as string]: streakDuration,
            }}
          >
            {/* 10 crisp diagonal speed streak lines */}
            <div className="h-[2px] w-48 ml-[10%] bg-gradient-to-r from-transparent via-[#ff6b00]/60 to-transparent" />
            <div className="h-[1.5px] w-72 ml-[60%] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="h-[2.5px] w-96 ml-[25%] bg-gradient-to-r from-transparent via-[#ff8800]/70 to-transparent" />
            <div className="h-[1px] w-56 ml-[80%] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="h-[2px] w-80 ml-[5%] bg-gradient-to-r from-transparent via-[#ff3b00]/60 to-transparent" />
            <div className="h-[1.5px] w-64 ml-[45%] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <div className="h-[2.5px] w-88 ml-[70%] bg-gradient-to-r from-transparent via-[#ff5500]/70 to-transparent" />
            <div className="h-[1px] w-40 ml-[35%] bg-gradient-to-r from-transparent via-white/45 to-transparent" />
          </div>
        </div>
      )}
    </div>
  );
};
