import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    try {
      // Detect standalone display mode safely
      let isStandalone = false;
      if (typeof window !== 'undefined') {
        if (typeof window.matchMedia === 'function') {
          try {
            isStandalone = window.matchMedia('(display-mode: standalone)').matches;
          } catch {
            isStandalone = false;
          }
        }
        if (!isStandalone && window.navigator) {
          isStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
        }
      }
      setIsInstalled(isStandalone);

      // Detect iOS devices safely
      if (typeof window !== 'undefined' && window.navigator && window.navigator.userAgent) {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIOSDevice);
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        try {
          e.preventDefault();
          setDeferredPrompt(e as BeforeInstallPromptEvent);
        } catch {
          // Ignore
        }
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);
      }

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          window.removeEventListener('appinstalled', handleAppInstalled);
        }
      };
    } catch {
      // Never throw from install detection
    }
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch {
      // Ignore prompt failure
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}
