import { handleAuthError } from './ensureUserContext';

/**
 * Centralized API client utility for making authenticated requests.
 * Automatically appends authentication token headers.
 * Handles 401/403 responses with proper error handling.
 * Returns structured result for profile-missing errors instead of throwing.
 */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string | number | boolean>;
}

// Structured error result for profile-missing errors
export interface ApiErrorResult {
  ok: false;
  code: 'PROFILE_MISSING' | 'AUTH_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN';
  message: string;
}

// Global refresh state management for UI feedback
let isRefreshing = false;
const refreshStateListeners: Set<(refreshing: boolean) => void> = new Set();

/**
 * Subscribe to refresh state changes
 * Returns unsubscribe function
 */
export function subscribeToRefreshState(listener: (refreshing: boolean) => void): () => void {
  refreshStateListeners.add(listener);
  // Immediately notify of current state
  listener(isRefreshing);
  
  return () => {
    refreshStateListeners.delete(listener);
  };
}

/**
 * Update refresh state and notify all listeners
 */
function setRefreshState(refreshing: boolean): void {
  isRefreshing = refreshing;
  refreshStateListeners.forEach(listener => {
    try {
      listener(refreshing);
    } catch (error) {
      console.error('[apiClient] Error in refresh state listener:', error);
    }
  });
}

/**
 * Check if an error message indicates a missing profile (non-fatal)
 */
function isProfileMissingError(errorMessage: string): boolean {
  const lowerMessage = errorMessage.toLowerCase();
  return (
    lowerMessage.includes('user profile not found') ||
    lowerMessage.includes('profile not found') ||
    lowerMessage.includes('unauthorized: only users can view profiles') ||
    lowerMessage.includes('profiles') ||
    lowerMessage.includes('getcalleruserprofile')
  );
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T | ApiErrorResult> {
  const { method = 'GET', headers = {}, body, queryParams } = options;

  // Build URL with query parameters
  let url = endpoint;
  if (queryParams) {
    const queryString = buildQueryString(queryParams);
    url = `${endpoint}?${queryString}`;
  }

  // Get auth token from localStorage
  const authToken = localStorage.getItem('ramptrack_auth_token');

  // Build request headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth token if available
  if (authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  // Build request options
  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, requestOptions);

    // Handle authentication errors (401/403)
    if (response.status === 401 || response.status === 403) {
      const errorText = await response.text();
      let errorMessage = 'Authentication failed';
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      // Check if this is a profile-missing error (non-fatal)
      if (isProfileMissingError(errorMessage)) {
        console.log('[apiClient] Profile missing error detected - returning structured result');
        
        // Return structured result instead of throwing
        return {
          ok: false,
          code: 'PROFILE_MISSING',
          message: 'User profile missing; using local context.',
        } as ApiErrorResult;
      }

      // For true authentication failures, call handleAuthError and throw
      handleAuthError({
        status: response.status,
        message: errorMessage,
      });
      
      throw new Error(errorMessage);
    }

    // Handle other error responses
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Request failed with status ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    // Parse and return response
    const data = await response.json();
    return data as T;
  } catch (error) {
    // Check if this is a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        ok: false,
        code: 'NETWORK_ERROR',
        message: 'Network request failed. Please check your connection.',
      } as ApiErrorResult;
    }
    
    // Convert error to user-friendly message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network request failed. Please check your connection.');
  }
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, string | number | boolean>): string {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

/**
 * Convert API errors to user-friendly messages
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred. Please try again.';
}
