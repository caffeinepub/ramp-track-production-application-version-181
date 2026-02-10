# Specification

## Summary
**Goal:** Update `frontend/src/App.tsx` so the app’s rendered screen is derived directly from `useAuth().auth`, eliminating any stored view/screen state and removing splash/readiness gating.

**Planned changes:**
- Modify only `frontend/src/App.tsx` to remove any `useState` (or other stored state) used to track the current view/screen.
- Render `LoginScreen` when `useAuth().auth` is falsy.
- Render the existing signed-in app UI (current manager/agent routing structure) when `useAuth().auth` is truthy, changing routing only if required to compile.
- Remove any splash screen rendering and any readiness/timeouts/effects that gate or delay which screen is shown.

**User-visible outcome:** Users see the login screen when signed out and the existing signed-in app experience when signed in, without splash/readiness gating or stateful screen selection.
