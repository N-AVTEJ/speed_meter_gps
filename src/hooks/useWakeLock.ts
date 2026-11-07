import { useEffect, useState, useCallback, useRef } from 'react';

export function useWakeLock() {
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const wakeLockSentinelRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if (
        typeof window === 'undefined' ||
        typeof navigator === 'undefined' ||
        !('wakeLock' in navigator) ||
        !navigator.wakeLock ||
        typeof navigator.wakeLock.request !== 'function'
      ) {
        setIsSupported(false);
        setIsActive(false);
        return;
      }

      setIsSupported(true);

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
      // Browser may reject wake lock if low battery or permission denied
      setIsActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockSentinelRef.current && typeof wakeLockSentinelRef.current.release === 'function') {
        await wakeLockSentinelRef.current.release();
      }
    } catch {
      // Ignore release error
    } finally {
      wakeLockSentinelRef.current = null;
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    try {
      // Initial request if visible
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        requestWakeLock();
      }

      // Re-request the Screen Wake Lock on visibilitychange when visible
      const handleVisibilityChange = () => {
        try {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            requestWakeLock();
          }
        } catch {
          // Never throw
        }
      };

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', handleVisibilityChange);
      }

      return () => {
        try {
          if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
          }
          if (typeof window !== 'undefined') {
            window.removeEventListener('focus', handleVisibilityChange);
          }
          releaseWakeLock();
        } catch {
          // Never throw
        }
      };
    } catch {
      // Never throw
    }
  }, [requestWakeLock, releaseWakeLock]);

  return { isActive, isSupported, requestWakeLock };
}
