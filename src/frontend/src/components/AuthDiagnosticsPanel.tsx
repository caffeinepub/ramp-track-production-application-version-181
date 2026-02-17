import { useState, useEffect } from 'react';
import { APP_BUILD_VERSION, BUILD_DATE } from '../config/appBuild';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, CheckCircle, XCircle, Info } from 'lucide-react';

export default function AuthDiagnosticsPanel() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swController, setSwController] = useState<ServiceWorker | null>(null);
  const [swState, setSwState] = useState<string>('unknown');
  const [noSwMode, setNoSwMode] = useState(false);

  useEffect(() => {
    // Check for nosw parameter
    const params = new URLSearchParams(window.location.search);
    setNoSwMode(params.get('nosw') === '1');

    // Monitor online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check service worker status
    if ('serviceWorker' in navigator) {
      const controller = navigator.serviceWorker.controller;
      setSwController(controller);
      setSwState(controller?.state || 'none');

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        const newController = navigator.serviceWorker.controller;
        setSwController(newController);
        setSwState(newController?.state || 'none');
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const buildDate = new Date(BUILD_DATE).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card className="bg-slate-900/95 border-slate-700 text-white">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-5 w-5" />
          App Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Build Version */}
        <div className="space-y-1">
          <div className="text-sm text-slate-400">Build Version</div>
          <div className="font-mono text-lg">{APP_BUILD_VERSION}</div>
          <div className="text-xs text-slate-500">{buildDate}</div>
        </div>

        {/* Network Status */}
        <div className="space-y-1">
          <div className="text-sm text-slate-400">Network Status</div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-400" />
                <Badge variant="outline" className="bg-green-900/30 text-green-300 border-green-700">
                  Online
                </Badge>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-400" />
                <Badge variant="outline" className="bg-red-900/30 text-red-300 border-red-700">
                  Offline
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Service Worker Status */}
        <div className="space-y-1">
          <div className="text-sm text-slate-400">Service Worker</div>
          {noSwMode ? (
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-yellow-400" />
              <Badge variant="outline" className="bg-yellow-900/30 text-yellow-300 border-yellow-700">
                Disabled (nosw=1)
              </Badge>
            </div>
          ) : swController ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <Badge variant="outline" className="bg-green-900/30 text-green-300 border-green-700">
                  Active ({swState})
                </Badge>
              </div>
              {swController.scriptURL && (
                <div className="text-xs text-slate-500 font-mono break-all">
                  {swController.scriptURL}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-slate-400" />
              <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700">
                Not Active
              </Badge>
            </div>
          )}
        </div>

        {/* Helpful Info */}
        <div className="pt-4 border-t border-slate-700 space-y-2">
          <div className="text-xs text-slate-400">
            <strong>Tip:</strong> Add <code className="bg-slate-800 px-1 py-0.5 rounded">?nosw=1</code> to the URL to disable service worker for testing.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
