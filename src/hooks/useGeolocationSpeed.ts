import { useEffect, useState, useRef, useCallback } from 'react';
import {
  msToKmh,
  estimateFallbackSpeed,
  applyStationaryHysteresis,
  applySpeedThreshold,
  isFixAccurate,
  getAccuracyStatus,
  shouldRejectSpeedJump,
  FallbackAnchor,
  AccuracyLevel,
  GAUGE_MAX_KMH,
  MAX_ACCEPTABLE_ACCURACY_METERS,
} from '../utils/speedMath';
import { SpeedKalmanFilter } from '../utils/kalmanFilter';

export type PermissionStatusType =
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported';

export interface GpsDebugInfo {
  hardwareSpeedKmh: number | null;
  speedSource: 'doppler' | 'fallback' | 'none';
  accepted: number;
  rejectedAccuracy: number;
  rejectedJump: number;
  rejectedUnknown: number;
}

export interface GeolocationSpeedState {
  rawSpeedKmh: number;
  filteredSpeedKmh: number;
  displaySpeedKmh: number | null;
  accuracy: number | null;
  accuracyStatus: AccuracyLevel;
  droppedFixCount: number;
  permissionStatus: PermissionStatusType;
  errorMessage: string | null;
  lastFixTime: number | null;
  isGpsLost: boolean;
  hasReceivedFirstFix: boolean;
  retry: () => void;
  isSimulating: boolean;
  toggleSimulation: () => void;
  debug: GpsDebugInfo;
}

export function useGeolocationSpeed(): GeolocationSpeedState {
  const [rawSpeedKmh, setRawSpeedKmh] = useState<number>(0);
  const [filteredSpeedKmh, setFilteredSpeedKmh] = useState<number>(0);
  const [displaySpeedKmh, setDisplaySpeedKmh] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [accuracyStatus, setAccuracyStatus] = useState<AccuracyLevel>('red');
  const [droppedFixCount, setDroppedFixCount] = useState<number>(0);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatusType>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFixTime, setLastFixTime] = useState<number | null>(null);
  const [isGpsLost, setIsGpsLost] = useState<boolean>(true);
  const [hasReceivedFirstFix, setHasReceivedFirstFix] = useState<boolean>(false);

  const [debug, setDebug] = useState<GpsDebugInfo>({
    hardwareSpeedKmh: null,
    speedSource: 'none',
    accepted: 0,
    rejectedAccuracy: 0,
    rejectedJump: 0,
    rejectedUnknown: 0,
  });

  // Tracks timestamp of last ACCEPTED fix (accuracy <= 25m)
  const lastAcceptedFixTimeRef = useRef<number | null>(null);
  // Tracks speed & timestamp of last ACCEPTED fix for jump rejection
  const lastAcceptedSpeedFixRef = useRef<{ speedKmh: number; timestamp: number } | null>(null);

  // Fallback anchor to prevent jitter accumulation while stationary
  const anchorRef = useRef<FallbackAnchor | null>(null);
  const isStoppedRef = useRef<boolean>(true);
  const jumpRejectStreakRef = useRef<number>(0);

  // Check URL param ?demo=1 for testing
  const [isSimulating, setIsSimulating] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('demo') === '1' || params.get('autostart') === '1';
    }
    return false;
  });

  const watchIdRef = useRef<number | null>(null);
  const kalmanFilterRef = useRef<SpeedKalmanFilter>(
    new SpeedKalmanFilter({ processNoise: 2.5, measurementNoise: 4 })
  );
  const simTimerRef = useRef<number | null>(null);

  // Clear existing watch
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const handlePositionSuccess = useCallback((position: GeolocationPosition) => {
    const coords = position.coords;
    const acc = coords.accuracy;
    const timestamp = position.timestamp || Date.now();

    setPermissionStatus('granted');
    setErrorMessage(null);
    setAccuracy(acc);
    setLastFixTime(timestamp);

    const hasHardwareSpeed =
      coords.speed !== null &&
      coords.speed !== undefined &&
      !isNaN(coords.speed) &&
      coords.speed >= 0;

    const hwSpeedKmh = hasHardwareSpeed ? msToKmh(coords.speed!) : null;

    // 1. Accuracy gate (reject if accuracy > 25 m), as now.
    if (!isFixAccurate(acc, MAX_ACCEPTABLE_ACCURACY_METERS)) {
      setAccuracyStatus('red');
      setDroppedFixCount((c) => c + 1);
      setDebug((prev) => ({
        ...prev,
        hardwareSpeedKmh: hwSpeedKmh,
        rejectedAccuracy: prev.rejectedAccuracy + 1,
      }));
      return;
    }

    // 2. Hardware speed:
    // If coords.speed is a valid number >= 0, use msToKmh(coords.speed), source "doppler".
    // Otherwise call estimateFallbackSpeed(anchorRef.current, {lat, lon, timestamp, accuracy}),
    // store the returned anchor, source "fallback" (or "none" when speedKmh is null).
    let speedKmh: number | null = null;
    let source: 'doppler' | 'fallback' | 'none' = 'none';

    if (hasHardwareSpeed && hwSpeedKmh !== null) {
      speedKmh = hwSpeedKmh;
      source = 'doppler';
    } else {
      const currentAnchorFix: FallbackAnchor = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp,
        accuracy: acc,
      };
      const result = estimateFallbackSpeed(anchorRef.current, currentAnchorFix);
      anchorRef.current = result.anchor;
      speedKmh = result.speedKmh;
      source = speedKmh !== null ? 'fallback' : 'none';
    }

    // 3. If speedKmh is null: do NOT feed the filter and do NOT refresh the accepted-fix watchdog timestamp. Return.
    if (speedKmh === null) {
      setDebug((prev) => ({
        ...prev,
        hardwareSpeedKmh: hwSpeedKmh,
        speedSource: source,
        rejectedUnknown: prev.rejectedUnknown + 1,
      }));
      return;
    }

    // 4. Jump rejection:
    // If shouldRejectSpeedJump is true, increment jumpRejectStreakRef.
    // If streak < 2, count as dropped and return.
    // If streak >= 2, call kalmanFilter.reset() and accept this fix.
    // After any non-rejected or reseeded fix set the streak to 0.
    if (lastAcceptedSpeedFixRef.current !== null) {
      const timeDeltaMs = timestamp - lastAcceptedSpeedFixRef.current.timestamp;
      if (shouldRejectSpeedJump(speedKmh, lastAcceptedSpeedFixRef.current.speedKmh, timeDeltaMs)) {
        jumpRejectStreakRef.current += 1;
        if (jumpRejectStreakRef.current < 2) {
          setDroppedFixCount((c) => c + 1);
          setDebug((prev) => ({
            ...prev,
            hardwareSpeedKmh: hwSpeedKmh,
            speedSource: source,
            rejectedJump: prev.rejectedJump + 1,
          }));
          return;
        } else {
          // Streak >= 2: baseline reset to overcome jump rejection stalls
          kalmanFilterRef.current.reset();
        }
      }
    }

    jumpRejectStreakRef.current = 0;

    // 5. On accept:
    // Update lastAcceptedFixTimeRef and lastAcceptedSpeedFixRef,
    // feed the Kalman filter with (rawKmh, accuracy),
    // then { displayKmh, stopped } = applyStationaryHysteresis(filtered, isStoppedRef.current);
    // isStoppedRef.current = stopped; display min(200, displayKmh).
    lastAcceptedFixTimeRef.current = timestamp;
    lastAcceptedSpeedFixRef.current = { speedKmh, timestamp };
    setIsGpsLost(false);
    setHasReceivedFirstFix(true);
    setAccuracyStatus(getAccuracyStatus(acc));

    setRawSpeedKmh(speedKmh);

    const filtered = kalmanFilterRef.current.update(speedKmh, acc);
    setFilteredSpeedKmh(filtered);

    const { displayKmh, stopped } = applyStationaryHysteresis(
      filtered,
      isStoppedRef.current
    );
    isStoppedRef.current = stopped;

    const clampedDisplay = Math.min(GAUGE_MAX_KMH, displayKmh);
    setDisplaySpeedKmh(clampedDisplay);

    setDebug((prev) => ({
      ...prev,
      hardwareSpeedKmh: hwSpeedKmh,
      speedSource: source,
      accepted: prev.accepted + 1,
    }));
  }, []);

  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    setAccuracyStatus('red');
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setPermissionStatus('denied');
        setErrorMessage(
          'Location access is denied. Please enable GPS permissions in your browser or device settings.'
        );
        break;
      case error.POSITION_UNAVAILABLE:
        setPermissionStatus('unavailable');
        setErrorMessage(
          'GPS signal is currently unavailable. Ensure device location is switched on and you have a clear sky view.'
        );
        break;
      case error.TIMEOUT:
        setPermissionStatus('timeout');
        setErrorMessage('GPS acquisition timed out. Searching for satellites...');
        break;
      default:
        setPermissionStatus('denied');
        setErrorMessage(error.message || 'Unable to retrieve GPS coordinates.');
    }
  }, []);

  const startWatching = useCallback(() => {
    stopWatching();

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setPermissionStatus('unsupported');
      setErrorMessage('Geolocation API is not supported by your browser or environment.');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permission) => {
          if (permission.state === 'denied') {
            setPermissionStatus('denied');
            setErrorMessage(
              'Location permission was denied. Please allow location access in browser site settings.'
            );
          } else if (permission.state === 'granted') {
            setPermissionStatus('granted');
          }
        })
        .catch(() => {});
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    };

    try {
      const id = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        handlePositionError,
        options
      );
      watchIdRef.current = id;
    } catch (err: unknown) {
      setPermissionStatus('denied');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to initialize geolocation watcher.');
    }
  }, [handlePositionSuccess, handlePositionError, stopWatching]);

  const retry = useCallback(() => {
    kalmanFilterRef.current.reset();
    anchorRef.current = null;
    isStoppedRef.current = true;
    jumpRejectStreakRef.current = 0;
    lastAcceptedFixTimeRef.current = null;
    lastAcceptedSpeedFixRef.current = null;
    setRawSpeedKmh(0);
    setFilteredSpeedKmh(0);
    setDisplaySpeedKmh(null);
    setIsGpsLost(true);
    setHasReceivedFirstFix(false);
    setAccuracy(null);
    setAccuracyStatus('red');
    setErrorMessage(null);
    setDebug({
      hardwareSpeedKmh: null,
      speedSource: 'none',
      accepted: 0,
      rejectedAccuracy: 0,
      rejectedJump: 0,
      rejectedUnknown: 0,
    });
    startWatching();
  }, [startWatching]);

  const toggleSimulation = useCallback(() => {
    setIsSimulating((prev) => !prev);
  }, []);

  // 3-second watchdog timer:
  // If no accepted GPS fix arrives for 3 seconds, display '--' and set the dot red.
  // Never hold the last speed.
  // Watchdog removes the line that clears fallback position (keeps anchorRef).
  // Also resets isStoppedRef to true and jumpRejectStreakRef to 0.
  useEffect(() => {
    const checkTimeout = () => {
      const now = Date.now();
      const lastFix = lastAcceptedFixTimeRef.current;
      if (lastFix === null || now - lastFix >= 3000) {
        setIsGpsLost(true);
        setDisplaySpeedKmh(null);
        setAccuracyStatus('red');
        setAccuracy(null);
        kalmanFilterRef.current.reset();
        lastAcceptedSpeedFixRef.current = null;
        isStoppedRef.current = true;
        jumpRejectStreakRef.current = 0;
      }
    };

    const interval = window.setInterval(checkTimeout, 100);

    if (typeof window !== 'undefined') {
      (window as unknown as { __simulateGpsDropout?: () => void }).__simulateGpsDropout = () => {
        if (simTimerRef.current !== null) {
          window.clearInterval(simTimerRef.current);
          simTimerRef.current = null;
        }
        lastAcceptedFixTimeRef.current = Date.now() - 3500;
        lastAcceptedSpeedFixRef.current = null;
      };
    }

    return () => window.clearInterval(interval);
  }, []);

  // Main lifecycle
  useEffect(() => {
    if (!isSimulating) {
      startWatching();
    }

    return () => {
      stopWatching();
    };
  }, [startWatching, stopWatching, isSimulating]);

  // Simulation mode (unchanged)
  useEffect(() => {
    if (!isSimulating) {
      if (simTimerRef.current !== null) {
        window.clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
      return;
    }

    setPermissionStatus('granted');
    setErrorMessage(null);
    setAccuracy(4.2);
    setAccuracyStatus('green');
    lastAcceptedFixTimeRef.current = Date.now();
    setIsGpsLost(false);

    let simTarget = 0;
    let t = 0;

    const interval = window.setInterval(() => {
      t += 0.2;
      const cycle = t % 32;
      if (cycle < 4) {
        simTarget = 0;
      } else if (cycle < 10) {
        simTarget = 55 + Math.sin(t * 3) * 3;
      } else if (cycle < 18) {
        simTarget = 115 + Math.cos(t * 2) * 5;
      } else if (cycle < 25) {
        simTarget = 172 + Math.sin(t * 4) * 6;
      } else {
        simTarget = Math.max(0, 172 - (cycle - 25) * 25);
      }

      const vibration = (Math.random() - 0.5) * 3.5;
      const raw = Math.max(0, simTarget + vibration);
      setRawSpeedKmh(raw);

      const filtered = kalmanFilterRef.current.update(raw, 4.2);
      setFilteredSpeedKmh(filtered);

      const thresholded = applySpeedThreshold(filtered);
      setDisplaySpeedKmh(Math.min(GAUGE_MAX_KMH, thresholded));
      setLastFixTime(Date.now());
      lastAcceptedFixTimeRef.current = Date.now();
      setIsGpsLost(false);
      setAccuracy(4.2);
      setAccuracyStatus('green');
    }, 200);

    simTimerRef.current = interval;

    return () => {
      window.clearInterval(interval);
      simTimerRef.current = null;
    };
  }, [isSimulating]);

  return {
    rawSpeedKmh,
    filteredSpeedKmh,
    displaySpeedKmh,
    accuracy,
    accuracyStatus,
    droppedFixCount,
    permissionStatus,
    errorMessage,
    lastFixTime,
    isGpsLost,
    hasReceivedFirstFix,
    retry,
    isSimulating,
    toggleSimulation,
    debug,
  };
}
