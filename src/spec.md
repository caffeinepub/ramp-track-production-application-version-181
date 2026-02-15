# Specification

## Summary
**Goal:** Fix the authentication/login flow so that after a successful sign-in the app reliably leaves `LoginScreen` and renders the appropriate signed-in screen.

**Planned changes:**
- Update `frontend/src/main.tsx` to mount the React app with `AuthProvider` enabled at the application root (wrapping `<App />`), while preserving the existing `QueryClientProvider` and `InternetIdentityProvider` wrappers.
- Adjust `frontend/src/App.tsx` to reliably transition away from `LoginScreen` as soon as `useAuth().auth` becomes truthy by enforcing existing hash-based navigation (default to `#roleSelection` when the hash is empty/invalid, and honor valid signed-in routes when present).
- Preserve the existing reconnecting/refresh overlay behavior (subscribe, timeout auto-dismiss, manual dismiss) for both logged-out and signed-in states.

**User-visible outcome:** After a successful login (manual credentials or badge scan), the app navigates to a valid signed-in route (defaulting to Role Selection) and no longer gets stuck on the login screen.
