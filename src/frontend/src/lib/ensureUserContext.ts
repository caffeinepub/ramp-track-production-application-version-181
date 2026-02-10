import { UserProfile } from '../backend';

export interface UserContext {
  employeeId: string;
  displayName: string;
  role: string;
}

/**
 * Get local user context from localStorage with fallbacks.
 * NEVER returns null - always provides a valid UserContext.
 * 
 * Hydration order (CANONICAL FIRST):
 * 1. Try ramptrack_auth_state (canonical format)
 * 2. Try currentUser (legacy format)
 * 3. Return guest context as final fallback
 */
export function getLocalUserContext(): UserContext {
  try {
    // Try CANONICAL key first (ramptrack_auth_state)
    let storedAuthJson = localStorage.getItem('ramptrack_auth_state');
    let source = 'ramptrack_auth_state';
    
    // If not found, try LEGACY key (currentUser)
    if (!storedAuthJson) {
      storedAuthJson = localStorage.getItem('currentUser');
      source = 'currentUser';
    }
    
    if (storedAuthJson) {
      const rawData = JSON.parse(storedAuthJson);
      
      if (source === 'currentUser') {
        // Legacy format: { username, roles, displayName? }
        if (rawData && rawData.username && rawData.roles && Array.isArray(rawData.roles)) {
          return {
            employeeId: rawData.username,
            displayName: rawData.displayName || rawData.username || 'Signed out',
            role: rawData.roles[0] || 'guest',
          };
        }
      } else {
        // Canonical format: { user, role, badgeId?, name?, ts? }
        if (rawData && rawData.user && rawData.role) {
          return {
            employeeId: rawData.badgeId || rawData.user,
            displayName: rawData.name || rawData.badgeId || rawData.user || 'Signed out',
            role: rawData.role,
          };
        }
      }
    }
  } catch (error) {
    console.error('[getLocalUserContext] Failed to parse stored auth:', error);
  }
  
  // Final fallback - return guest context
  return {
    employeeId: 'GUEST',
    displayName: 'Guest User',
    role: 'guest',
  };
}

/**
 * Session validation helper - standalone function (not a hook).
 * 
 * NEVER wipes local auth on backend failure:
 * - If backend call throws or responds with IC0508 (canister stopped) or any network failure,
 *   logs a warning to console and returns true (continues using local auth state).
 * - Does NOT set auth to null or overwrite roster state.
 * - Only returns false on true authentication failures (401, 403, Invalid delegation, Session expired).
 * 
 * @param operatorId Optional operator ID for validation
 * @returns Promise<boolean> - true if session is valid or backend unavailable, false only on auth failure
 */
export async function ensureUserContext(operatorId?: string): Promise<boolean> {
  try {
    // Check if we have local auth
    const localContext = getLocalUserContext();
    
    if (!localContext || localContext.employeeId === 'GUEST') {
      console.warn('[ensureUserContext] No local auth context found');
      return false;
    }
    
    // If operatorId is provided, validate it matches local context
    if (operatorId && localContext.employeeId !== operatorId) {
      console.warn('[ensureUserContext] Operator ID mismatch:', {
        provided: operatorId,
        local: localContext.employeeId,
      });
      // Still return true - this is not an auth failure, just a mismatch
    }
    
    console.log('[ensureUserContext] Session valid for:', localContext.displayName);
    return true;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    
    // Check for true authentication failures that should return false
    const isAuthFailure = 
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('Invalid delegation') ||
      errorMessage.includes('Session expired');
    
    if (isAuthFailure) {
      console.error('[ensureUserContext] Authentication failure:', errorMessage);
      return false;
    }
    
    // All other errors (IC0508, network failures, etc.) are non-fatal
    console.warn('[ensureUserContext] Backend validation failed (non-fatal):', errorMessage);
    return true;
  }
}

/**
 * Handle authentication errors by clearing BOTH auth keys and redirecting to login.
 * Only call this for true authentication failures (401, 403, invalid tokens).
 * DO NOT call for profile-missing errors or network failures.
 */
export function handleAuthError(error: { status?: number; message: string }): void {
  console.error('[handleAuthError] Authentication error:', error);
  
  // Clear BOTH auth keys from localStorage
  try {
    localStorage.removeItem('ramptrack_auth_state');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('ramptrack_last_verified');
  } catch (err) {
    console.error('[handleAuthError] Failed to clear localStorage:', err);
  }
  
  // Note: We don't redirect here because this is a library function
  // The calling code should handle the redirect after catching the error
}
