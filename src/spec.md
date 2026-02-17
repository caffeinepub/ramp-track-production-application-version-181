# Specification

## Summary
**Goal:** Make production publishes easier to verify and recover from caching/service-worker issues, while ensuring authentication context mounts reliably so users can get past the login flow.

**Planned changes:**
- Add an in-app “deployment diagnostics” indicator accessible from the login flow that shows a single-source app build/version plus basic runtime status (online/offline, and whether a service worker is controlling the page).
- Add a login-screen troubleshooting action to force refresh by clearing cached app data (unregister service workers when supported, clear Cache Storage, clear local/session storage as appropriate) with a plain-English confirmation, then reload.
- Make service worker registration conditional in `frontend/index.html` via a query parameter (e.g., `?nosw=1`) to bypass SW caching, with a console log when skipped.
- Update `frontend/src/App.tsx` to mount authentication context by wrapping the existing `AppContent` subtree with `<AuthProvider>`, ensuring no `useAuth()` usage occurs outside the provider, without changing existing hash navigation routes or reconnecting/refresh overlay behavior.

**User-visible outcome:** From the login screen, users can see the current build/version and runtime status, clear cached app data and reload to recover from stale deployments, optionally launch with `?nosw=1` to bypass service worker caching, and the app’s authentication flow mounts reliably to avoid login-blocking context issues.
