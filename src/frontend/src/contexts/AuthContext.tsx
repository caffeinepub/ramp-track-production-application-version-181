import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { validateCredentials, validateBadgeScan } from '../data/userRoster';

// Export unique instance ID for debugging
export const AUTH_CONTEXT_INSTANCE_ID = "AuthContext@" + Math.random().toString(36).slice(2);

// Auth state structure: { user: string; role: string; badgeId: string | null; name: string }
interface AuthState {
  user: string;
  role: string;
  badgeId: string | null;
  name: string;
}

interface AuthContextType {
  auth: AuthState | null;
  isAuthReady: boolean;
  hydrationCompleted: boolean;
  isRefreshing: boolean;
  loginError: string | null;
  login: (credentials: { username: string; password: string; badge?: string }) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  clearAuth: () => void;
  setAuth: (authData: AuthState) => void;
  clearLoginError: () => void;
}

// Create context with a default value to prevent undefined errors
const defaultAuthContext: AuthContextType = {
  auth: null,
  isAuthReady: false,
  hydrationCompleted: false,
  isRefreshing: false,
  loginError: null,
  login: async () => { console.error('[AuthContext] login called before provider mounted'); },
  logout: () => {},
  refreshSession: async () => false,
  clearAuth: () => {},
  setAuth: () => {},
  clearLoginError: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Single storage key - ramptrack_v2_session is the ONLY key
const STORAGE_KEY = 'ramptrack_v2_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log("[AuthContext] Provider mounting, instance:", AUTH_CONTEXT_INSTANCE_ID);
  
  const [auth, setAuthState] = useState<AuthState | null>(null);
  const [isAuthReady, setAuthReady] = useState(false);
  const [hydrationCompleted, setHydrationCompleted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Main hydration logic - sets hydrationCompleted = true at the end
  useEffect(() => {
    console.log('[AUTH] AUTH_BOOT_START');
    
    try {
      // Read from ramptrack_v2_session key
      const storedAuthJson = localStorage.getItem(STORAGE_KEY);
      
      // Sanitize: check for null, "undefined", or empty string BEFORE parsing
      if (storedAuthJson === null || storedAuthJson === "undefined" || storedAuthJson === "") {
        console.log('[AUTH] No valid stored session found (null, "undefined", or empty)');
        // Skip parsing entirely - no valid data
      } else {
        // Wrap JSON parsing in try-catch for error handling
        try {
          const storedData = JSON.parse(storedAuthJson);
          
          if (storedData && storedData.username) {
            console.log('[AUTH] Successfully parsed from ramptrack_v2_session:', storedData);
            
            // Construct authData from ramptrack_v2_session
            const authData: AuthState = {
              user: storedData.username,
              role: (storedData.roles && Array.isArray(storedData.roles)) ? storedData.roles[0] : 'guest',
              badgeId: storedData.badgeId || storedData.username,
              name: storedData.displayName || storedData.username || 'Signed out',
            };
            
            console.log('[AUTH] Constructed authData from ramptrack_v2_session:', authData);
            console.log('[AUTH] AUTH_SET');
            
            // Set auth state synchronously
            setAuthState(authData);
          } else {
            // ramptrack_v2_session exists but is invalid - remove it
            console.warn('[AUTH] ramptrack_v2_session exists but invalid structure, removing');
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch (e) {
              console.warn('[AUTH] Failed to remove invalid key:', e);
            }
          }
        } catch (parseError) {
          // JSON.parse threw an error - corrupted data
          console.error('[AUTH] Failed to parse localStorage data:', parseError);
          // Remove corrupted data
          try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('[AUTH] Removed corrupted ramptrack_v2_session key');
          } catch (e) {
            console.warn('[AUTH] Failed to remove corrupted key:', e);
          }
        }
      }
    } catch (error) {
      console.error('[AUTH] Unexpected error during hydration:', error);
    } finally {
      // ALWAYS set hydrationCompleted = true in finally block
      // This ensures it runs regardless of success or failure
      console.log('[AUTH] Hydration completed - hydrationCompleted set to true');
      setHydrationCompleted(true);
    }
  }, []);

  // Dedicated useEffect that watches hydrationCompleted and sets isAuthReady
  useEffect(() => {
    if (hydrationCompleted) {
      console.log('[AUTH] IsAuthReady triggered by hydrationCompleted:', hydrationCompleted);
      console.log('[AUTH] Setting isAuthReady to true');
      console.log('[AUTH] AUTH_READY_TRUE');
      setAuthReady(true);
    }
  }, [hydrationCompleted]);

  // Clear authentication state
  const clearAuthState = useCallback(() => {
    setAuthState(null);
    
    console.log('[AUTH] Clearing storage key');
    
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Set auth function - explicitly sets auth state with proper structure
  const setAuth = useCallback((authData: AuthState) => {
    console.log('[AUTH] AUTH_SET called with:', authData);
    
    // Validate structure
    if (!authData || !authData.user || !authData.role) {
      console.error('[AUTH] setAuth - invalid data structure:', authData);
      throw new Error('Invalid auth data: must include user, role, and name');
    }

    // Ensure name is never null/undefined
    const validatedAuth: AuthState = {
      ...authData,
      name: authData.name || authData.badgeId || authData.user || 'Signed out',
    };

    // Update in-memory state FIRST
    setAuthState(validatedAuth);

    // Write to ramptrack_v2_session key
    const storageData = {
      username: validatedAuth.badgeId || validatedAuth.user,
      roles: [validatedAuth.role],
      displayName: validatedAuth.name,
      badgeId: validatedAuth.badgeId,
    };
    
    const storageJson = JSON.stringify(storageData);
    localStorage.setItem(STORAGE_KEY, storageJson);
    
    console.log('[AUTH] Wrote session to ramptrack_v2_session');
    console.log('[AUTH WRITE] origin=', window.location.origin);
    console.log('[AUTH WRITE] ramptrack_v2_session readback=', localStorage.getItem(STORAGE_KEY));
    console.log('[AUTH WRITE] localStorage keys=', Object.keys(localStorage));

    console.log('[AUTH] Session write complete:', {
      user: validatedAuth.user,
      name: validatedAuth.name,
      badgeId: validatedAuth.badgeId,
      role: validatedAuth.role,
    });
    
    console.log('[AUTH] AUTH_READY_TRUE (after setAuth)');
    setAuthReady(true);
  }, []);

  // Login with immediate auth state setting and fire-and-forget API call
  const login = useCallback(async (credentials: { username: string; password: string; badge?: string }) => {
    console.log('[AUTH] AUTH_LOGIN_START');
    
    // Clear any previous login error
    setLoginError(null);
    
    try {
      const { username, password, badge } = credentials;
      
      // 1. LOCAL VALIDATION - Validate credentials immediately
      let user;
      if (badge) {
        console.log('[AUTH] Validating badge:', badge);
        user = validateBadgeScan(badge);
        if (!user) {
          const errorMsg = `Badge ${badge} not found in system`;
          console.error('[AUTH] AUTH_LOGIN_FAIL:', errorMsg);
          setLoginError(errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        console.log('[AUTH] Validating credentials for:', username);
        user = validateCredentials(username, password);
        if (!user) {
          const errorMsg = 'Invalid username or password';
          console.error('[AUTH] AUTH_LOGIN_FAIL:', errorMsg);
          setLoginError(errorMsg);
          throw new Error(errorMsg);
        }
      }

      // 2. IMMEDIATE AUTH STATE CONSTRUCTION - Create auth object after successful validation
      const authData: AuthState = {
        user: user.email || user.badgeId,
        role: user.role,
        badgeId: badge || user.badgeId,
        name: user.displayName || user.badgeId || user.email || 'Signed out',
      };

      console.log('[AUTH] Local validation successful, setting auth immediately');

      // 3. SET AUTH STATE IMMEDIATELY - Before any network calls
      setAuthState(authData);
      console.log('[AUTH] AUTH_SET (immediate after validation)');

      // 4. PERSISTENCE - Write to ramptrack_v2_session key
      console.log('[AUTH] WRITE_AUTH_STATE_START');
      
      const storageData = {
        username: authData.badgeId || authData.user,
        roles: [authData.role],
        displayName: authData.name,
        badgeId: authData.badgeId,
      };
      const storageJson = JSON.stringify(storageData);
      
      localStorage.setItem(STORAGE_KEY, storageJson);
      
      console.log('[AUTH] WRITE_AUTH_STATE_OK - length:', storageJson.length);
      console.log('[AUTH WRITE] origin=', window.location.origin);
      console.log('[AUTH WRITE] ramptrack_v2_session readback=', localStorage.getItem(STORAGE_KEY));
      console.log('[AUTH WRITE] localStorage keys=', Object.keys(localStorage));

      // 5. FIRE-AND-FORGET API CALL - Non-blocking with 10s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('[AUTH] /api/login timeout after 10 seconds, aborting');
        controller.abort();
      }, 10000);

      // Fire-and-forget: don't await, catch all errors
      fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: authData.user,
          role: authData.role,
        }),
        credentials: 'include',
        signal: controller.signal,
      })
        .then(response => {
          clearTimeout(timeoutId);
          if (!response.ok) {
            console.log('[AUTH] API call failed:', response.status);
          } else {
            return response.json();
          }
        })
        .then(result => {
          if (result) {
            console.log('[AUTH] /api/login response:', result);
          }
        })
        .catch((fetchError: any) => {
          clearTimeout(timeoutId);
          console.log('[AUTH] API call failed:', fetchError.message);
          // Never clear auth state on API failures
        });

      // 6. SUCCESS - Log completion
      console.log('[AUTH] AUTH_LOGIN_OK - success for:', user.displayName, 'role:', user.role);

    } catch (error) {
      // Only validation errors reach here
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AUTH] AUTH_LOGIN_FAIL:', errorMessage);
      
      // Set error for UI display
      if (!loginError) {
        setLoginError(errorMessage);
      }
      
      // Mark auth as ready even on failure
      console.log('[AUTH] AUTH_READY_TRUE (after validation failure)');
      setAuthReady(true);
      
      throw error;
    } finally {
      // 7. GUARANTEE: Always set auth ready after successful validation
      console.log('[AUTH] AUTH_READY_TRUE (login finally)');
      setAuthReady(true);
    }
  }, [loginError]);

  // Logout function
  const logout = useCallback(() => {
    console.log('[AUTH] Logout starting...');
    clearAuthState();
    setLoginError(null);
    console.log('[AUTH] Logout complete - storage key cleared');
  }, [clearAuthState]);

  // Refresh session function
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) {
      console.log('[AUTH] Refresh already in progress');
      return false;
    }

    console.log('[AUTH] Refresh session starting...');
    setIsRefreshing(true);

    try {
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          console.log('[AUTH] Refresh timeout after 5s');
          resolve(false);
        }, 5000);
      });

      const refreshPromise = (async (): Promise<boolean> => {
        try {
          const storedAuthJson = localStorage.getItem(STORAGE_KEY);

          if (!storedAuthJson || storedAuthJson === "undefined" || storedAuthJson === "") {
            console.log('[AUTH] Refresh - no stored session');
            return false;
          }

          const storedData = JSON.parse(storedAuthJson);
          
          if (!storedData || !storedData.username) {
            console.log('[AUTH] Refresh - invalid stored data');
            return false;
          }

          const authData: AuthState = {
            user: storedData.username,
            role: (storedData.roles && Array.isArray(storedData.roles)) ? storedData.roles[0] : 'guest',
            badgeId: storedData.badgeId || storedData.username,
            name: storedData.displayName || storedData.username || 'Signed out',
          };

          await new Promise(resolve => setTimeout(resolve, 800));

          setAuthState(authData);

          console.log('[AUTH] Refresh complete - success');
          return true;
        } catch (error) {
          console.warn('[AUTH] Refresh error (non-fatal):', error);
          return false;
        }
      })();

      const result = await Promise.race([refreshPromise, timeoutPromise]);
      return result;
    } catch (error) {
      console.warn('[AUTH] Refresh failed (non-fatal):', error);
      return false;
    } finally {
      setIsRefreshing(false);
      console.log('[AUTH] Refresh finally block executed');
    }
  }, [isRefreshing]);

  // Clear auth without redirect
  const clearAuth = useCallback(() => {
    console.log('[AUTH] clearAuth called');
    clearAuthState();
    setLoginError(null);
  }, [clearAuthState]);

  // Clear login error
  const clearLoginError = useCallback(() => {
    setLoginError(null);
  }, []);

  const value: AuthContextType = {
    auth,
    isAuthReady,
    hydrationCompleted,
    isRefreshing,
    loginError,
    login,
    logout,
    refreshSession,
    clearAuth,
    setAuth,
    clearLoginError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    console.error('[AuthContext] useAuth called outside of AuthProvider');
    return defaultAuthContext;
  }
  return context;
}
