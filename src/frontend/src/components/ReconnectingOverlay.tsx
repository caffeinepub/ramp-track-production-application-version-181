import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

interface ReconnectingOverlayProps {
  isVisible: boolean;
  onDismiss?: () => void;
}

/**
 * ReconnectingOverlay Component
 * Displays a clean overlay with spinner during session refresh operations
 * Non-intrusive design with subdued backdrop and smooth animations
 * Can be dismissed by user after a short delay
 */
export default function ReconnectingOverlay({ isVisible, onDismiss }: ReconnectingOverlayProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setCanDismiss(false);
      
      // Allow dismissal after 3 seconds
      const dismissTimer = setTimeout(() => {
        setCanDismiss(true);
      }, 3000);
      
      return () => clearTimeout(dismissTimer);
    } else {
      setCanDismiss(false);
      // Delay unmount to allow fade-out animation
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  const handleDismiss = () => {
    if (canDismiss && onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(2px)',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      onClick={handleDismiss}
    >
      <div
        className="relative flex flex-col items-center justify-center gap-4 rounded-2xl px-8 py-6"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {canDismiss && onDismiss && (
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        
        <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
        <p className="text-lg font-medium text-white">Reconnecting…</p>
        <p className="text-sm text-gray-300">Please wait while we restore your session</p>
        
        {canDismiss && (
          <p className="mt-2 text-xs text-gray-400">
            Click anywhere to dismiss
          </p>
        )}
      </div>
    </div>
  );
}
