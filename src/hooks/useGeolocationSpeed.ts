import { useEffect, useState, useRef, useCallback } from 'react';
import {
  msToKmh,
  calculateFallbackSpeedKmh,
  isFixAccurate,
  applySpeedThreshold,
  getAccuracyStatus,
  shouldRejectSpeedJump,
  GeoFix,
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

  // Tracks timestamp of last ACCEPTED fix (accuracy <= 25m)
  const lastAcceptedFixTimeRef = useRef<number | null>(null);
  // Tracks speed & timestamp of last ACCEPTED fix for jump rejection
  const lastAcceptedSpeedFixRef = useRef<{ speedKmh: number; timestamp: number } | null>(null);

  // Check URL param ?demo=1 for testing
  const [isSimulating, setIsSimulating] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('demo') === '1' || params.get('autostart') === '1';
    }
    return false;
  });

  const watchIdRef = useRef<number | null>(null);
  const prevFixRef = useRef<GeoFix | null>(null);
  const kalmanFilterRef = useRef<SpeedKalmanFilter>(
    new SpeedKalmanFilter({ processNoise: 3.5, measurementNoise: 1.5 })
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

    // Drop fixes where coords.accuracy exceeds 25 m
    if (!isFixAccurate(acc, MAX_ACCEPTABLE_ACCURACY_METERS)) {
      setAccuracyStatus('red');
      setDroppedFixCount((c) => c + 1);
      return;
    }

    // Determine raw speed (m/s -> km/h)
    let computedRawKmh = 0;
    const hasHardwareSpeed =
      coords.speed !== null &&
      coords.speed !== undefined &&
      !isNaN(coords.speed) &&
      coords.speed >= 0;

    if (hasHardwareSpeed) {
      computedRawKmh = msToKmh(coords.speed!);
    } else if (prevFixRef.current) {
      // Fallback: Haversine distance / time between fixes
      const currentFix: GeoFix = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp,
      };
      computedRawKmh = calculateFallbackSpeedKmh(prevFixRef.current, currentFix);
    }

    // 2. Reject any accepted fix where speed jumps more than 25 km/h versus
    // the previous accepted fix within 1 second.
    if (lastAcceptedSpeedFixRef.current !== null) {
      const timeDeltaMs = timestamp - lastAcceptedSpeedFixRef.current.timestamp;
      if (shouldRejectSpeedJump(computedRawKmh, lastAcceptedSpeedFixRef.current.speedKmh, timeDeltaMs)) {
        setDroppedFixCount((c) => c + 1);
        return;
      }
    }

    // Accepted GPS Fix arrived! Update timestamp and mark signal active
    lastAcceptedFixTimeRef.current = timestamp;
    lastAcceptedSpeedFixRef.current = { speedKmh: computedRawKmh, timestamp };
    setIsGpsLost(false);
    setHasReceivedFirstFix(true);
    setAccuracyStatus(getAccuracyStatus(acc));

    // Save valid fix coordinates for next fallback computation
    prevFixRef.current = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp,
    };

    setRawSpeedKmh(computedRawKmh);

    // 1. After any Kalman reset or at app launch, seed the filter with the
    // first accepted fix's measured speed, not 0.
    const filtered = kalmanFilterRef.current.update(computedRawKmh, acc);
    setFilteredSpeedKmh(filtered);

    // Threshold rule: below 2 km/h, display 0; clamp to max 200 km/h
    const thresholded = applySpeedThreshold(filtered);
    const clampedDisplay = Math.min(GAUGE_MAX_KMH, thresholded);
    setDisplaySpeedKmh(clampedDisplay);
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

    // Query permissions API if available to preemptively check state
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
        .catch(() => {
          // Permissions query might throw on some mobile webviews
        });
    }

    // Required specs: enableHighAccuracy true, maximumAge 0
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
    prevFixRef.current = null;
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
    startWatching();
  }, [startWatching]);

  const toggleSimulation = useCallback(() => {
    setIsSimulating((prev) => !prev);
  }, []);

  // 3-second watchdog timer:
  // If no accepted GPS fix arrives for 3 seconds, display '--' and set the dot red.
  // Never hold the last speed.
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
        prevFixRef.current = null;
      }
    };

    const interval = window.setInterval(checkTimeout, 100);

    // Testing helper for headless browser automated verification
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

  // Simulation mode (for tests or desktop preview)
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
      // Motorcycle profile: idle -> hard acceleration to 60 -> cruise to 110 -> burst to 165 -> brake to 0
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

      // Add realistic vibration noise
      const vibration = (Math.random() - 0.5) * 3.5;
      const raw = Math.max(0, simTarget + vibration);
      setRawSpeedKmh(raw);

      // Pass through Kalman filter
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
  };
}
