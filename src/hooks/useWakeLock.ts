import { useEffect, useState, useCallback, useRef } from 'react';

export function useWakeLock() {
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const wakeLockSentinelRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
      setIsSupported(false);
      return;
    }

    try {
      if (wakeLockSentinelRef.current && !wakeLockSentinelRef.current.released) {
        setIsActive(true);
        return;
      }

      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinelRef.current = sentinel;
      setIsActive(true);

      sentinel.addEventListener('release', () => {
        setIsActive(false);
        wakeLockSentinelRef.current = null;
      });
    } catch {
      // Browser may reject wake lock if window is in background or low battery
      setIsActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch {
        // Ignore error
      }
      wakeLockSentinelRef.current = null;
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  return { isActive, isSupported, requestWakeLock };
}
