import React, { useMemo } from 'react';
import { kmhToMph } from '../utils/speedMath';

export type SpeedUnit = 'km/h' | 'mph';

interface AnalogArcGaugeProps {
  speedKmh: number | null;
  unit: SpeedUnit;
}

export const AnalogArcGauge: React.FC<AnalogArcGaugeProps> = ({ speedKmh, unit }) => {
  const isMph = unit === 'mph';
  const hasSpeed = speedKmh !== null && !isNaN(speedKmh);
  const currentSpeed = hasSpeed ? (isMph ? kmhToMph(speedKmh) : speedKmh) : 0;
  const maxSpeed = isMph ? 125 : 200;

  // Center (250, 250), Thick Segmented Arc Gauge: Outer R=205, Inner R=172
  const cx = 250;
  const cy = 250;
  const outerR = 205;
  const innerR = 172;
  const startAngle = 140;
  const totalSweep = 260;

  // Clamped speed & fraction
  const clampedSpeed = hasSpeed ? Math.max(0, Math.min(maxSpeed, currentSpeed)) : 0;
  const fraction = hasSpeed ? clampedSpeed / maxSpeed : 0;
  const needleAngle = startAngle + fraction * totalSweep;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const polarToCartesian = (angleDeg: number, r: number) => ({
    x: cx + r * Math.cos(toRad(angleDeg)),
    y: cy + r * Math.sin(toRad(angleDeg)),
  });

  // Generate 36 thick angular segments along the arc
  const totalSegments = 36;
  const segments = useMemo(() => {
    const segList = [];
    const segSpan = totalSweep / totalSegments;
    const gap = 1.6; // angular gap in degrees

    for (let i = 0; i < totalSegments; i++) {
      const segStart = startAngle + i * segSpan + gap / 2;
      const segEnd = startAngle + (i + 1) * segSpan - gap / 2;
      const segFrac = (i + 1) / totalSegments;

      // 4 corners of the thick angular trapezoid segment
      const p1 = polarToCartesian(segStart, outerR);
      const p2 = polarToCartesian(segEnd, outerR);
      const p3 = polarToCartesian(segEnd, innerR);
      const p4 = polarToCartesian(segStart, innerR);

      // SVG path for the segment
      const d = `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 0 0 ${p4.x} ${p4.y} Z`;

      // High-speed powerband redline (top 30% of gauge)
      const isRedline = segFrac >= 0.72;

      segList.push({
        index: i,
        d,
        segFrac,
        isRedline,
      });
    }
    return segList;
  }, [totalSweep, startAngle, outerR, innerR]);

  // Major tick marks with numbers
  const ticks = useMemo(() => {
    const list = [];
    const step = isMph ? 20 : 20;
    const count = Math.floor(maxSpeed / step);

    for (let i = 0; i <= count; i++) {
      const val = i * step;
      const frac = val / maxSpeed;
      const angle = startAngle + frac * totalSweep;
      const pOuter = polarToCartesian(angle, outerR + 6);
      const pInner = polarToCartesian(angle, outerR + 14);
      const pText = polarToCartesian(angle, outerR + 26);

      const isDanger = isMph ? val >= 90 : val >= 150;

      list.push({
        val,
        x1: pOuter.x,
        y1: pOuter.y,
        x2: pInner.x,
        y2: pInner.y,
        tx: pText.x,
        ty: pText.y,
        isDanger,
      });
    }
    return list;
  }, [isMph, maxSpeed, startAngle, totalSweep, outerR]);

  const activeSegmentIndex = Math.floor(fraction * totalSegments);
  const roundedSpeed = Math.round(currentSpeed);

  // Subtle 1px vibration shake above 120 km/h (or ~75 mph)
  const isHighSpeed = hasSpeed && (speedKmh || 0) > 120;

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[500px] aspect-square mx-auto select-none p-2">
      {/* Outer cockpit carbon bezel ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#181a24] via-[#090b10] to-[#050608] p-[3px] shadow-2xl border border-white/10">
        <div className="w-full h-full rounded-full bg-[#08090d] relative overflow-hidden border border-[#1e2332]/80">
          {/* Subtle top reflection line */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>

      {/* SVG Thick Segmented Arc Gauge */}
      <svg
        viewBox="0 0 500 500"
        className="relative z-10 w-full h-full overflow-visible pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="needleTrailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff3b00" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ff7700" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="sharpNeedleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff1744" />
            <stop offset="50%" stopColor="#ff6d00" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* Thick Segmented Arc Segments */}
        {segments.map((seg) => {
          const isLit = hasSpeed && seg.index <= activeSegmentIndex;
          // Short glowing trail behind the needle (last 3 lit segments)
          const isTrail = isLit && seg.index >= activeSegmentIndex - 3;

          let fillColor = '#131620';
          let strokeColor = '#1f2434';
          let opacity = '0.55';

          if (isLit) {
            opacity = '1.0';
            if (seg.isRedline) {
              fillColor = '#ff1744';
              strokeColor = '#ff5252';
            } else if (isTrail) {
              fillColor = '#ff6d00';
              strokeColor = '#ffa000';
            } else {
              fillColor = '#ff5500';
              strokeColor = '#ff7700';
            }
          }

          return (
            <path
              key={seg.index}
              d={seg.d}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1"
              opacity={opacity}
              style={{
                transition: 'fill 0.08s ease-out, opacity 0.08s ease-out',
                filter: isTrail ? 'drop-shadow(0 0 6px rgba(255,109,0,0.8))' : 'none',
              }}
            />
          );
        })}

        {/* Dial Numerical Labels & Tick Lines */}
        {ticks.map((t) => (
          <g key={t.val}>
            <line
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.isDanger ? '#ff1744' : '#4a5568'}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <text
              x={t.tx}
              y={t.ty + 4}
              textAnchor="middle"
              fill={t.isDanger ? '#ff8a80' : '#e2e8f0'}
              fontSize="14"
              fontWeight="800"
              fontFamily="'Barlow Condensed', sans-serif"
              fontStyle="italic"
              className="select-none"
            >
              {t.val}
            </text>
          </g>
        ))}

        {/* Sharp Angular Superbike Needle with Short Glowing Trail */}
        {/* Rotated around (cx, cy) */}
        <g
          transform={`rotate(${needleAngle}, ${cx}, ${cy})`}
          style={{
            transition: 'transform 0.14s cubic-bezier(0.15, 0.9, 0.25, 1)',
          }}
        >
          {/* Glowing Trail Blade behind needle */}
          <polygon
            points={`${cx - 10},${cy - 2} ${cx + innerR + 15},${cy - 6} ${cx + innerR + 25},${cy} ${cx - 4},${cy + 2}`}
            fill="url(#needleTrailGrad)"
            opacity="0.8"
          />

          {/* Precision Sharp Angular Needle Blade */}
          <polygon
            points={`${cx - 12},${cy - 5} ${cx + innerR + 28},${cy} ${cx - 12},${cy + 5}`}
            fill="url(#sharpNeedleGrad)"
          />

          {/* White-Hot Razor Center Spine */}
          <line
            x1={cx - 5}
            y1={cy}
            x2={cx + innerR + 26}
            y2={cy}
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Angular Counterweight Tail */}
          <polygon
            points={`${cx - 26},${cy - 4} ${cx - 6},${cy - 5} ${cx - 6},${cy + 5} ${cx - 26},${cy + 4}`}
            fill="#ff1744"
          />
        </g>

        {/* Center Hub Disc */}
        <circle cx={cx} cy={cy} r="65" fill="#0b0e14" stroke="#ff5500" strokeWidth="2.5" />
        <circle cx={cx} cy={cy} r="60" fill="#07080b" stroke="#1c2130" strokeWidth="1.5" />
      </svg>

      {/* Center Digital Speed Number & JetBrains Mono Unit */}
      <div
        className="absolute z-20 flex flex-col items-center justify-center pointer-events-none"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      >
        <span
          className={`font-superbike leading-none select-none tabular-nums text-8xl sm:text-9xl md:text-[112px] ${
            !hasSpeed ? 'speed-dim-pulse text-gray-400' : 'speed-white-hot'
          } ${isHighSpeed ? 'speed-shake' : ''}`}
        >
          {hasSpeed ? roundedSpeed : '--'}
        </span>
        <span className="font-unit mt-1 text-sm sm:text-base font-bold tracking-widest text-[#ff6d00] uppercase">
          {unit}
        </span>
      </div>
    </div>
  );
};
