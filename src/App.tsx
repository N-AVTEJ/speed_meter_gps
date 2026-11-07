/**
 * Apex Moto Speedo - GPS Speedometer PWA for Motorcycles
 * Superbike TFT Dashboard Edition (Open Source, MIT)
 * 
 * Display only. No backend, no accounts, no ads, no subscriptions.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGeolocationSpeed } from './hooks/useGeolocationSpeed';
import { useWakeLock } from './hooks/useWakeLock';
import { AnalogArcGauge, SpeedUnit } from './components/AnalogArcGauge';
import { GpsStatusBadge } from './components/GpsStatusBadge';
import { ShiftLightStrip } from './components/ShiftLightStrip';
import { SpeedReactiveEnvironment } from './components/SpeedReactiveEnvironment';
import { DashboardControls } from './components/DashboardControls';
import { PermissionDeniedModal } from './components/PermissionDeniedModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DebugOverlay } from './components/DebugOverlay';

export default function App() {
  const [unit, setUnit] = useState<SpeedUnit>('km/h');
  const [isHudMirrored, setIsHudMirrored] = useState<boolean>(false);

  // Debug overlay state: enabled via ?debug=1 or triple-tap on gauge section
  const [showDebug, setShowDebug] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('debug') === '1';
    }
    return false;
  });

  // GPS Speed & Kalman Filter hook
  const {
    rawSpeedKmh,
    filteredSpeedKmh,
    displaySpeedKmh,
    accuracy,
    accuracyStatus,
    droppedFixCount,
    permissionStatus,
    errorMessage,
    lastFixTime,
    hasReceivedFirstFix,
    retry,
    isSimulating,
    toggleSimulation,
    debug,
  } = useGeolocationSpeed();

  // Screen Wake Lock API active while running
  const { isActive: isWakeLockActive } = useWakeLock();

  // When debug overlay is shown, refresh every 250 ms to keep telemetry live
  const [, setDebugTick] = useState<number>(0);
  useEffect(() => {
    if (!showDebug) return;
    const interval = window.setInterval(() => {
      setDebugTick((t) => t + 1);
    }, 250);
    return () => window.clearInterval(interval);
  }, [showDebug]);

  // Triple-tap on gauge section (3 taps within 700 ms) toggles debug overlay
  const tapTimesRef = useRef<number[]>([]);
  const handleGaugeSectionClick = useCallback(() => {
    const now = Date.now();
    const recent = [...tapTimesRef.current.filter((t) => now - t <= 700), now];
    tapTimesRef.current = recent;
    if (recent.length >= 3) {
      setShowDebug((prev) => !prev);
      tapTimesRef.current = [];
    }
  }, []);

  const handleToggleUnit = useCallback(() => {
    setUnit((prev) => (prev === 'km/h' ? 'mph' : 'km/h'));
  }, []);

  const handleToggleHud = useCallback(() => {
    setIsHudMirrored((prev) => !prev);
  }, []);

  const showPermissionModal =
    permissionStatus === 'denied' ||
    (permissionStatus === 'unavailable' && !isSimulating);

  return (
    <main
      className="relative min-h-screen w-full bg-carbon text-white flex flex-col justify-between overflow-hidden select-none"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Speed-Reactive Environment: Diagonal streaks & dynamic edge vignette */}
      <SpeedReactiveEnvironment speedKmh={displaySpeedKmh} maxSpeedKmh={200} />

      {/* Top Shift-Light Strip: 20 segmented LEDs across the screen */}
      <header className="relative z-30 w-full flex flex-col items-center pt-1">
        <ShiftLightStrip speedKmh={displaySpeedKmh} maxSpeedKmh={200} />

        {/* Minimal Corner Indicators */}
        <div className="w-full max-w-5xl px-4 pt-1 flex items-center justify-between gap-2">
          {/* Top-Left: Minimal GPS Dot Status */}
          <GpsStatusBadge
            status={accuracyStatus}
            accuracy={accuracy}
            droppedCount={droppedFixCount}
            hasReceivedFirstFix={hasReceivedFirstFix}
          />

          {/* Top-Right: Minimal Brand & PWA Install */}
          <div className="flex items-center gap-2">
            <PWAInstallButton />
            <div className="flex items-center gap-1.5 opacity-60">
              <span className="font-unit text-[10px] font-black tracking-widest text-[#ff6d00] uppercase">
                APEX
              </span>
              <span className="font-unit text-[9px] font-bold tracking-widest text-gray-400 uppercase">
                TFT
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Real-time GPS Diagnostics Overlay (toggled via ?debug=1 or 3 taps on gauge) */}
      {showDebug && (
        <DebugOverlay
          debug={debug}
          accuracy={accuracy}
          rawSpeedKmh={rawSpeedKmh}
          filteredSpeedKmh={filteredSpeedKmh}
          lastFixTime={lastFixTime}
        />
      )}

      {/* Center Gauge Viewport - Horizontally flipped in HUD Mirror mode */}
      <section
        className={`relative z-20 flex-1 flex flex-col items-center justify-center p-2 transition-transform duration-300 cursor-pointer ${
          isHudMirrored ? 'hud-mirrored' : ''
        }`}
        aria-label="Speedometer Display"
        onClick={handleGaugeSectionClick}
      >
        {isHudMirrored && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-[#ff5500]/25 border border-[#ff6d00]/60 text-[11px] font-unit font-black uppercase tracking-widest text-[#ff8800]">
            HUD MIRROR
          </div>
        )}

        <AnalogArcGauge speedKmh={displaySpeedKmh} unit={unit} />
      </section>

      {/* Bottom Controls Bar: Minimal Corner-Tucked Toggles */}
      <footer className="relative z-30 pb-2">
        <DashboardControls
          unit={unit}
          onToggleUnit={handleToggleUnit}
          isHudMirrored={isHudMirrored}
          onToggleHud={handleToggleHud}
          wakeLockActive={isWakeLockActive}
        />
      </footer>

      {/* Offline Status Toast */}
      <OfflineIndicator />

      {/* Location Permission Denied / Error Modal */}
      {showPermissionModal && (
        <PermissionDeniedModal
          onRetry={retry}
          onSimulate={toggleSimulation}
          errorMessage={errorMessage}
        />
      )}
    </main>
  );
}
