import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

type LoginMode = 'operator' | 'admin';

export default function SignInScreen() {
  const { login, auth } = useAuth();
  const [loginMode, setLoginMode] = useState<LoginMode>('operator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email/ID and password');
      return;
    }

    setIsLoggingIn(true);
    setError('');
    try {
      // CRITICAL: Call AuthContext.login() which sets auth state and persists to localStorage
      // This MUST complete before any navigation occurs
      await login({ username: email, password, badge: email });
      
      console.log('[SignInScreen] Login successful, auth state persisted');
      
      // Verify localStorage was written
      const authState = localStorage.getItem('ramptrack_auth_state');
      console.log('[SignInScreen] Verification - ramptrack_auth_state:', authState ? 'present' : 'missing');
      
      // Navigation will happen automatically via App.tsx useEffect watching auth state
      // No manual navigation needed - auth state change triggers routing
    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.');
      setIsLoggingIn(false);
    }
  };

  const handleOperatorMode = () => {
    setLoginMode('operator');
    setEmail('operator@demo.com');
    setPassword('test123');
    setError('');
  };

  const handleAdminMode = () => {
    setLoginMode('admin');
    setEmail('970251');
    setPassword('test123');
    setError('');
  };

  // If auth is present, don't show login screen (let App.tsx handle routing)
  if (auth) {
    console.log('[SignInScreen] Auth present, allowing App.tsx to handle routing');
    return null;
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 relative"
      style={{
        backgroundImage: 'url(/assets/HomescreenBackground.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/60 to-black/50 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-card/95 backdrop-blur-xl shadow-2xl border-2">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-primary/40 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-primary" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Ramp Track</CardTitle>
            <CardDescription className="text-base">Airport Ground Equipment Tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={loginMode === 'operator' ? 'default' : 'outline'}
                onClick={handleOperatorMode}
                disabled={isLoggingIn}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <span className="text-2xl">👤</span>
                <span className="text-sm font-semibold">Operator</span>
              </Button>
              <Button
                variant={loginMode === 'admin' ? 'default' : 'outline'}
                onClick={handleAdminMode}
                disabled={isLoggingIn}
                className="h-auto py-4 flex flex-col gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white border-orange-400/50"
              >
                <span className="text-2xl">🛡️</span>
                <span className="text-sm font-semibold">Management</span>
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  {loginMode === 'operator' ? 'Email' : 'Employee ID'}
                </Label>
                <Input
                  id="email"
                  type="text"
                  placeholder={loginMode === 'operator' ? 'operator@demo.com' : '970251'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoggingIn}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="test123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
                  }}
                />
              </div>
              
              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg">
                  {error}
                </div>
              )}
              
              <Button
                className="w-full"
                size="lg"
                onClick={handleLogin}
                disabled={isLoggingIn || !email || !password}
              >
                {isLoggingIn ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Logging in...
                  </>
                ) : (
                  <>
                    {loginMode === 'operator' ? '👤 Operator Login' : '🛡️ Management Login'}
                  </>
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mt-4">
              <p className="font-medium mb-1">Demo Credentials:</p>
              <p className="font-mono text-xs">Operator: operator@demo.com / test123</p>
              <p className="font-mono text-xs mt-1">Management: 970251 / test123</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-white/90 drop-shadow-lg">
          © 2025. Built with ❤️ using{' '}
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            caffeine.ai
          </a>
        </div>
      </div>
    </div>
  );
}
