/**
 * Apex Moto Speedo - GPS Speedometer PWA for Motorcycles
 * Open Source, MIT License
 * 
 * Display only. No backend, no accounts, no ads, no subscriptions.
 */

import React, { useState, useCallback } from 'react';
import { useGeolocationSpeed } from './hooks/useGeolocationSpeed';
import { useWakeLock } from './hooks/useWakeLock';
import { AnalogArcGauge, SpeedUnit } from './components/AnalogArcGauge';
import { GpsStatusBadge } from './components/GpsStatusBadge';
import { DashboardControls } from './components/DashboardControls';
import { PermissionDeniedModal } from './components/PermissionDeniedModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [unit, setUnit] = useState<SpeedUnit>('km/h');
  const [isHudMirrored, setIsHudMirrored] = useState<boolean>(false);

  // GPS Speed & Kalman Filter hook
  const {
    displaySpeedKmh,
    accuracy,
    accuracyStatus,
    droppedFixCount,
    permissionStatus,
    errorMessage,
    hasReceivedFirstFix,
    retry,
    isSimulating,
    toggleSimulation,
  } = useGeolocationSpeed();

  // Screen Wake Lock API active while running
  const { isActive: isWakeLockActive } = useWakeLock();

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
      className="relative min-h-screen w-full bg-[#07080a] text-white flex flex-col justify-between overflow-hidden"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Subtle ambient cockpit radial background */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1c2233]/40 via-[#0a0d14]/70 to-[#050608]"
        aria-hidden="true"
      />

      {/* Top Header Bar */}
      <header className="relative z-30 w-full max-w-5xl mx-auto px-4 pt-2 sm:pt-4 flex items-center justify-between gap-4">
        {/* GPS Accuracy Dot & Status */}
        <div className="flex items-center gap-3">
          <GpsStatusBadge
            status={accuracyStatus}
            accuracy={accuracy}
            droppedCount={droppedFixCount}
            hasReceivedFirstFix={hasReceivedFirstFix}
          />
        </div>

        {/* Brand & PWA Install Button */}
        <div className="flex items-center gap-3">
          <PWAInstallButton />
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs font-black tracking-widest text-[#ff6a00] uppercase">
              APEX MOTO
            </span>
            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
              GPS SPEEDO
            </span>
          </div>
        </div>
      </header>

      {/* Center Gauge Viewport - Flips horizontally in HUD Mirror mode */}
      <section
        className={`relative z-20 flex-1 flex flex-col items-center justify-center p-2 sm:p-4 transition-transform duration-300 ${
          isHudMirrored ? 'hud-mirrored' : ''
        }`}
        aria-label="Speedometer Display"
      >
        {isHudMirrored && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-[#ff5500]/20 border border-[#ff6a00]/50 text-xs font-black uppercase tracking-widest text-[#ff8800]">
            HUD Windshield Mirror
          </div>
        )}

        <AnalogArcGauge speedKmh={displaySpeedKmh} unit={unit} />
      </section>

      {/* Bottom Controls Bar: Two Toggles Only */}
      <div className="relative z-30 pb-4 sm:pb-6">
        <DashboardControls
          unit={unit}
          onToggleUnit={handleToggleUnit}
          isHudMirrored={isHudMirrored}
          onToggleHud={handleToggleHud}
          wakeLockActive={isWakeLockActive}
        />
      </div>

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
