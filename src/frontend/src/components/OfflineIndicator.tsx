import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineIndicator] Network online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[OfflineIndicator] Network offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-900/95 text-white px-4 py-2 rounded-lg shadow-lg">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">No Internet Connection</span>
    </div>
  );
}
