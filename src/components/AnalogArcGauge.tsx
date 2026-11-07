import React, { useMemo } from 'react';
import { kmhToMph } from '../utils/speedMath';

export type SpeedUnit = 'km/h' | 'mph';

interface AnalogArcGaugeProps {
  speedKmh: number;
  unit: SpeedUnit;
}

export const AnalogArcGauge: React.FC<AnalogArcGaugeProps> = ({ speedKmh, unit }) => {
  const isMph = unit === 'mph';
  const currentSpeed = isMph ? kmhToMph(speedKmh) : speedKmh;
  const maxSpeed = isMph ? 125 : 200;

  // Gauge Geometry: Center at (250, 250), radius 185
  // Sweep from 140° (bottom-left) to 400° (bottom-right) -> 260° sweep
  const cx = 250;
  const cy = 250;
  const radius = 185;
  const startAngle = 140;
  const totalSweep = 260;

  // Clamp speed for needle position
  const clampedSpeed = Math.max(0, Math.min(maxSpeed, currentSpeed));
  const fraction = clampedSpeed / maxSpeed;
  const needleAngle = startAngle + fraction * totalSweep;

  // Arc paths
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const polarToCartesian = (angleDeg: number, r: number) => ({
    x: cx + r * Math.cos(toRad(angleDeg)),
    y: cy + r * Math.sin(toRad(angleDeg)),
  });

  // Background track arc
  const startPt = polarToCartesian(startAngle, radius);
  const endPt = polarToCartesian(startAngle + totalSweep, radius);
  const bgArcPath = `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 1 1 ${endPt.x} ${endPt.y}`;

  // Active glowing orange speed arc
  const activePt = polarToCartesian(needleAngle, radius);
  const activeSweepDeg = fraction * totalSweep;
  const activeLargeArc = activeSweepDeg > 180 ? 1 : 0;
  const activeArcPath =
    fraction > 0.005
      ? `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${activeLargeArc} 1 ${activePt.x} ${activePt.y}`
      : '';

  // Tick marks generator
  const ticks = useMemo(() => {
    const list = [];
    const step = isMph ? 10 : 20;
    const minorStep = isMph ? 5 : 10;
    const totalTicks = Math.round(maxSpeed / minorStep);

    for (let i = 0; i <= totalTicks; i++) {
      const val = i * minorStep;
      if (val > maxSpeed) break;
      const frac = val / maxSpeed;
      const angle = startAngle + frac * totalSweep;
      const isMajor = val % step === 0;

      const outerR = radius - 8;
      const innerR = isMajor ? radius - 30 : radius - 20;

      const pOuter = polarToCartesian(angle, outerR);
      const pInner = polarToCartesian(angle, innerR);

      // Text position for major ticks
      const textR = radius - 48;
      const pText = polarToCartesian(angle, textR);

      // High-speed warning zone (> 140 km/h or > 90 mph)
      const isDangerZone = isMph ? val >= 90 : val >= 150;

      list.push({
        val,
        isMajor,
        isDangerZone,
        x1: pOuter.x,
        y1: pOuter.y,
        x2: pInner.x,
        y2: pInner.y,
        tx: pText.x,
        ty: pText.y,
      });
    }
    return list;
  }, [isMph, maxSpeed]);

  const roundedSpeed = Math.round(currentSpeed);

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[540px] aspect-square mx-auto select-none p-2 sm:p-4">
      {/* Outer dark glass bezel */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#1c212d]/80 via-[#0d1017]/90 to-[#07080a] p-[6px] shadow-2xl shadow-black/80 border border-white/10 backdrop-blur-2xl">
        <div className="w-full h-full rounded-full bg-[#080a0f] relative overflow-hidden border border-[#212634]">
          {/* Glass reflection highlight */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/8 via-white/2 to-transparent pointer-events-none rounded-t-full" />
        </div>
      </div>

      {/* SVG Arc Dial */}
      <svg
        viewBox="0 0 500 500"
        className="relative z-10 w-full h-full overflow-visible pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="neonOrangeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff3b00" />
            <stop offset="60%" stopColor="#ff6b00" />
            <stop offset="100%" stopColor="#ffa600" />
          </linearGradient>

          <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer subtle concentric guide rings */}
        <circle cx={cx} cy={cy} r={radius + 14} fill="none" stroke="#181d27" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={radius - 38} fill="none" stroke="#121620" strokeWidth="1.5" strokeDasharray="3 4" />

        {/* Inactive Arc Track */}
        <path
          d={bgArcPath}
          fill="none"
          stroke="#1b212d"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Danger zone accent track (end of arc) */}
        <path
          d={`M ${polarToCartesian(startAngle + totalSweep * 0.75, radius).x} ${polarToCartesian(startAngle + totalSweep * 0.75, radius).y} A ${radius} ${radius} 0 0 1 ${endPt.x} ${endPt.y}`}
          fill="none"
          stroke="#ef4444"
          strokeWidth="4"
          strokeDasharray="4 6"
          opacity="0.6"
        />

        {/* Active Neon Orange Arc */}
        {activeArcPath && (
          <path
            d={activeArcPath}
            fill="none"
            stroke="url(#neonOrangeGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            filter="url(#neonGlow)"
            style={{
              transition: 'all 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)',
            }}
          />
        )}

        {/* Dial Ticks & Numerical Labels */}
        {ticks.map((t) => (
          <g key={t.val}>
            <line
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={
                t.isDangerZone
                  ? '#ef4444'
                  : t.isMajor
                  ? '#f3f4f6'
                  : '#4b5563'
              }
              strokeWidth={t.isMajor ? 4.5 : 2}
              strokeLinecap="round"
            />
            {t.isMajor && (
              <text
                x={t.tx}
                y={t.ty + 6}
                textAnchor="middle"
                fill={t.isDangerZone ? '#fca5a5' : '#ffffff'}
                fontSize={isMph ? '17' : '18'}
                fontWeight="800"
                fontFamily="system-ui, -apple-system, sans-serif"
                className="select-none"
              >
                {t.val}
              </text>
            )}
          </g>
        ))}

        {/* Animated Analog Needle */}
        {/* Needle is rotated around (cx, cy) */}
        <g
          transform={`rotate(${needleAngle}, ${cx}, ${cy})`}
          style={{
            transition: 'transform 0.14s cubic-bezier(0.15, 0.9, 0.25, 1)',
          }}
        >
          {/* Glowing Orange Needle Blade */}
          <polygon
            points={`${cx - 5},${cy - 5} ${cx + radius - 10},${cy} ${cx - 5},${cy + 5}`}
            fill="url(#neonOrangeGrad)"
            filter="url(#needleGlow)"
          />
          {/* High-contrast crisp white needle core spine */}
          <line
            x1={cx}
            y1={cy}
            x2={cx + radius - 12}
            y2={cy}
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Subtle counterbalance tail */}
          <polygon
            points={`${cx - 28},${cy - 3} ${cx},${cy - 4} ${cx},${cy + 4} ${cx - 28},${cy + 3}`}
            fill="#ff5500"
            opacity="0.8"
          />
        </g>

        {/* Center Hub Glass Disc */}
        <circle
          cx={cx}
          cy={cy}
          r="105"
          fill="#0a0d14"
          stroke="#ff6b00"
          strokeWidth="3"
          filter="url(#neonGlow)"
        />
        <circle
          cx={cx}
          cy={cy}
          r="103"
          fill="#090b10"
          stroke="#252b3b"
          strokeWidth="2"
        />
      </svg>

      {/* Massive Center Digital Speedometer Display */}
      <div
        className="absolute z-20 flex flex-col items-center justify-center pointer-events-none"
        style={{ top: '48%', transform: 'translateY(-50%)' }}
      >
        <span
          className="font-black tracking-tight text-white tabular-nums leading-none select-none drop-shadow-2xl text-7xl sm:text-8xl md:text-[104px]"
          style={{
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 0 40px rgba(255, 107, 0, 0.35), 0 4px 12px rgba(0,0,0,0.9)',
          }}
        >
          {roundedSpeed}
        </span>
        <span className="mt-1 sm:mt-2 text-xl sm:text-2xl font-black tracking-widest text-[#ff6b00] uppercase glow-neon-text">
          {unit}
        </span>
      </div>
    </div>
  );
};
