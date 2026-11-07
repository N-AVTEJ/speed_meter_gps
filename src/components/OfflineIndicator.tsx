import React, { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-[#1b2130]/95 border border-amber-500/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-300 shadow-xl backdrop-blur-md"
      role="status"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
      Offline Mode (GPS Works Standalone)
    </div>
  );
};
