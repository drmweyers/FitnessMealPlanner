import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';

/**
 * OfflineBanner Component
 *
 * Displays a banner when the user's network connection is lost.
 * Automatically detects online/offline status and shows appropriate UI.
 * Provides graceful degradation messaging.
 */
const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // Hide reconnected message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show banner if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null;
  }

  // Show reconnected banner
  if (isOnline && showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <WifiOff className="h-5 w-5" />
          <span className="font-medium">
            Connection restored! You're back online.
          </span>
        </div>
      </div>
    );
  }

  // Show offline banner
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">You're offline</p>
            <p className="text-sm text-red-100 mt-1">
              Your network connection was lost. Some features may not work correctly.
              We'll automatically reconnect when your connection is restored.
            </p>
            <p className="text-xs text-red-100 mt-2">
              Error: Network connection unavailable
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
