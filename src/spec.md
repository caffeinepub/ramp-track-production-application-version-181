# Specification

## Summary
**Goal:** Fix `frontend/src/App.tsx` routing/render logic so the app reliably transitions from `LoginScreen` to the signed-in UI immediately after successful authentication, without requiring a reload.

**Planned changes:**
- Update `App.tsx` to derive the rendered UI directly from `useAuth().auth` during render, with no readiness/splash gating controlling whether `LoginScreen` vs signed-in UI is shown.
- Refactor `App.tsx` to remove stored screen-selection state (`subView` + `switch(subView)`), replacing it with a non-stale navigation approach that preserves the existing screens and back/continue behaviors (RoleSelectionScreen, SignOnScreen, OperatorHomeScreen, AdminDashboard, CheckOutScreen, CheckInScreen, ReportIssueScreen, ManageEquipmentScreen).
- Preserve and keep functional the existing reconnecting/refresh overlay behavior in `App.tsx` (refresh subscriptions, auto-dismiss timeout, and manual dismiss) across both logged-out and signed-in views.

**User-visible outcome:** After logging in, users are taken into the appropriate signed-in flow (role selection / agent / admin) immediately, and refresh/reconnecting status overlay continues to work throughout the app.
