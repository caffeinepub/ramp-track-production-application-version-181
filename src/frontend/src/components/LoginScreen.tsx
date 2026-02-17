import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X, Settings, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import EquipmentQRScanner from './EquipmentQRScanner';
import AuthDiagnosticsPanel from './AuthDiagnosticsPanel';
import { validateCredentials, validateBadgeScan, getDemoCredentials } from '../data/userRoster';
import { parseBadgeId } from '../lib/parseBadge';
import { clearCachedApp } from '../lib/clearCachedApp';
import { APP_BUILD_VERSION } from '../config/appBuild';

export default function LoginScreen({ onLogin }: { onLogin?: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const { login, loginError, clearLoginError } = useAuth();

  const demoCredentials = getDemoCredentials();

  const scannerMountedRef = useRef(false);

  const lastInputTimeRef = useRef<number>(0);
  const inputBufferRef = useRef<string>('');

  // Show login error from AuthContext as visible banner
  useEffect(() => {
    if (loginError) {
      setError(loginError);
    }
  }, [loginError]);

  // Simplified submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearLoginError();

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    const user = validateCredentials(username, password);
    if (!user) {
      setError('Invalid username or password');
      return;
    }

    setIsLoading(true);
    try {
      await login({
        username: user.email || user.badgeId,
        password,
        badge: user.badgeId,
      });

      console.log('[LoginScreen] Manual login successful for user:', user.displayName, 'role:', user.role);
      // Navigation happens automatically in App.tsx via auth state change
      // Do NOT call onLogin() - let App.tsx handle navigation
    } catch (err: any) {
      setError(err.message || 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBadgeScan = useCallback(
    async (scannedId: string) => {
      scannerMountedRef.current = false;

      console.log('[LoginScreen] Badge scanned:', scannedId);

      setIsLoading(true);
      try {
        const user = validateBadgeScan(scannedId);
        if (!user) {
          setShowScanner(false);
          setError(`Badge ${scannedId} not found in system. Please contact administrator.`);
          setIsLoading(false);
          return;
        }

        await login({
          username: user.email || user.badgeId,
          password: user.password || 'badge-scan',
          badge: scannedId,
        });

        console.log('[LoginScreen] Badge login successful for user:', user.displayName, 'role:', user.role, 'badgeId:', scannedId);

        setShowScanner(false);
        // Navigation happens automatically in App.tsx via auth state change
        // Do NOT call onLogin() - let App.tsx handle navigation
      } catch (err) {
        console.error('[LoginScreen] Badge login failed:', err);
        setShowScanner(false);
        setError('Network error. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [login]
  );

  const handleCloseScan = useCallback(() => {
    scannerMountedRef.current = false;
    setShowScanner(false);
  }, []);

  const handleOpenScanner = useCallback(() => {
    if (!scannerMountedRef.current) {
      scannerMountedRef.current = true;
      setShowScanner(true);
    }
  }, []);

  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setUsername(value);

      const now = Date.now();
      const timeSinceLastInput = now - lastInputTimeRef.current;
      lastInputTimeRef.current = now;

      const isRapidInput = timeSinceLastInput < 100 && value.length > inputBufferRef.current.length;
      const hasNewline = value.includes('\n') || value.includes('\r');

      if (isRapidInput || hasNewline) {
        inputBufferRef.current = value;

        if (value.length >= 6 || hasNewline) {
          const cleanValue = value.replace(/[\r\n]/g, '');

          console.log('[SCAN] raw=' + cleanValue);

          const badgeId = parseBadgeId(cleanValue);

          console.log('[SCAN] parsed=' + badgeId);

          if (badgeId) {
            const user = validateBadgeScan(badgeId);

            if (user) {
              console.log('[SCAN] triggering login for badgeId=' + badgeId);

              const autoPassword = password || 'test123';

              setUsername('');
              inputBufferRef.current = '';

              setIsLoading(true);
              
              login({
                username: user.email || user.badgeId,
                password: autoPassword,
                badge: badgeId,
              })
                .then(() => {
                  console.log('[LoginScreen] Keyboard wedge login successful for user:', user.displayName, 'role:', user.role);
                  // Navigation happens automatically in App.tsx via auth state change
                  // Do NOT call onLogin() - let App.tsx handle navigation
                })
                .catch((err) => {
                  console.error('[LoginScreen] Keyboard wedge login failed:', err);
                  setError('Network error. Please check your connection and try again.');
                })
                .finally(() => {
                  setIsLoading(false);
                });
            } else {
              console.log('[SCAN] Badge not found in roster:', badgeId);
              setError(`Badge ${badgeId} not found in system.`);
            }
          } else {
            console.log('[SCAN] Badge not recognized from input:', cleanValue);
          }
        }
      } else {
        inputBufferRef.current = value;
      }
    },
    [password, login]
  );

  const handleClearCache = async () => {
    await clearCachedApp();
  };

  if (showScanner && scannerMountedRef.current) {
    return <EquipmentQRScanner mode="login" onScan={handleBadgeScan} onClose={handleCloseScan} />;
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{
        backgroundImage: 'url(/assets/SignInBackgroundLower.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert variant="destructive" className="bg-red-900/95 border-red-500 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-200 mt-0.5" />
                <AlertDescription className="text-red-100 font-medium">
                  {error}
                </AlertDescription>
              </div>
              <button
                onClick={() => {
                  setError('');
                  clearLoginError();
                }}
                className="text-red-200 hover:text-white transition-colors ml-2"
              >
                <X size={18} />
              </button>
            </div>
          </Alert>
        </div>
      )}

      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
        }}
      >
        <h1 className="text-3xl font-bold text-white mb-2 text-center">Ramp Track</h1>
        <p className="text-[#cbd5f5] text-center mb-8">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">
              Username / Badge ID
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Enter username or badge ID"
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-blue-400"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-3">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            <Button
              type="button"
              onClick={handleOpenScanner}
              variant="outline"
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30 font-semibold py-6 text-lg"
              disabled={isLoading}
            >
              Scan Badge to Sign In
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-white/20">
          <p className="text-[#cbd5f5] text-xs text-center">
            Demo credentials: {demoCredentials.email} / {demoCredentials.password}
          </p>
        </div>

        {/* Troubleshooting Section */}
        <div className="mt-6 pt-6 border-t border-white/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Troubleshooting</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="text-slate-400 hover:text-white hover:bg-white/10"
            >
              <Settings className="h-4 w-4 mr-2" />
              {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
            </Button>
          </div>

          {showDiagnostics && (
            <div className="mt-3">
              <AuthDiagnosticsPanel />
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-300 border-red-700 hover:border-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cached App & Reload
          </Button>
        </div>

        {/* Build Version Footer */}
        <div className="mt-4 text-center">
          <p className="text-slate-500 text-xs">{APP_BUILD_VERSION}</p>
        </div>
      </div>

      <footer className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-white/60 text-xs">© Jayson James & Ramp Track Systems</p>
      </footer>
    </div>
  );
}
