# Surveyor App Guard

This codebase is shipped two ways from the same source:

1. **Web portal** — all roles (admin, UNICEF, state, IEG, surveyor).
2. **SAM Surveyor Android app** — the production build bundled by the
   `sam_surveyor_app` Capacitor repo and published on Google Play.
   **Surveyor accounts only.**

The guard makes the Android app surveyor-only while remaining completely
invisible on the web. This doc explains how, so future changes don't break it.

## Detection — `src/utils/appPlatform.js`

`isSurveyorApp()` returns `true` only inside the Android app, via two
independent signals (either suffices):

| Signal | Set by |
|--------|--------|
| `window.Capacitor.isNativePlatform() === true` | Injected by the Capacitor runtime in the WebView |
| `navigator.userAgent` contains `"SAMSurveyorApp"` | `appendUserAgent` in `sam_surveyor_app/capacitor.config.json` |

In any normal browser both are absent → `false` → zero behavior change.

## Enforcement — two layers

### 1. Login (`src/pages/auth/Login.jsx`)
After a successful `/auth/signin`, if `isSurveyorApp()` and the returned
authorities do **not** include `ROLE_SURVEYOR`, the login is rejected with a
toast and — critically — **before `login(data.data)` runs**, so no token or
user data ever lands in localStorage.

### 2. Route guard (`src/App.js` → `ProtectedRoute`)
Every protected route checks `isSurveyorApp() && !isSurveyor()` and renders the
full-screen `AppAccessRestricted` component (sign-out button) instead of the
page. This catches sessions that bypass the login flow:
- a session persisted before the guard existed,
- a role changed on the backend after login,
- tampered localStorage.

## What the guard is NOT

It is a **UX gate, not a security boundary**. The User-Agent can be spoofed in
a desktop browser, which would show the surveyor-only behavior there — harmless.
Real authorization is enforced per-role by the Spring Boot backend on every API
call; the guard never replaces that.

## Rules for future changes

- Never call `login()` before the surveyor check in `Login.jsx` — the order is
  the point.
- `ProtectedRoute` must keep the guard check **before** the role-list check, so
  non-surveyors in the app get the dedicated screen instead of `/unauthorized`.
- Don't rename the `SAMSurveyorApp` UA token unilaterally: it must match
  `appendUserAgent` in `sam_surveyor_app/capacitor.config.json`. Change both or
  neither. (`window.Capacitor` detection keeps old APKs working during a
  rename, but keep them in sync anyway.)
- To test in a browser: DevTools → Network conditions → custom User-Agent
  containing `SAMSurveyorApp`. Full matrix in
  `sam_surveyor_app/docs/TESTING.md`.
