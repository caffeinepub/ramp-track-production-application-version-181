# Specification

## Summary
**Goal:** Fix post-login navigation so the app reliably transitions beyond the Login screen after successful authentication.

**Planned changes:**
- Update `frontend/src/main.tsx` to wrap the entire app with `AuthProvider` (from `./contexts/AuthContext`) while preserving the existing `QueryClientProvider` and `InternetIdentityProvider` wrappers.
- Update `frontend/src/App.tsx` so that when `auth` becomes truthy it automatically navigates to a valid signed-in hash route (defaulting to `#roleSelection`) if the current hash is empty or invalid, without overriding already-valid signed-in routes.
- Preserve current reconnecting/refresh overlay behavior across both logged-out and signed-in screens.

**User-visible outcome:** After logging in (manual, camera badge scan, or keyboard-wedge scan), the app reliably leaves `LoginScreen` and lands on the signed-in experience (defaulting to role selection when no valid route is present).
