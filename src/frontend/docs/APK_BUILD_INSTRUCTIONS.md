# Ramp Track - Android APK Build Instructions

## Overview
This guide provides complete instructions for packaging the Ramp Track PWA as a standalone Android APK using Trusted Web Activity (TWA) technology. The APK will include all PWA features: splash screen, background image, demo login, QR scanning, GPS capture, photo input, and offline support with automatic updates (v1.1.0).

## Prerequisites

### 1. Production Deployment
Your PWA **must** be deployed to a live Internet Computer canister with a stable `.icp0.io` URL:

- ✅ Application deployed to production IC canister
- ✅ Stable public `.icp0.io` URL (e.g., `https://your-canister-id.icp0.io`)
- ✅ HTTPS enabled (automatic with IC hosting)
- ✅ All assets accessible (HomescreenBackground.jpg, icons)
- ✅ Service worker registered and functioning
- ✅ PWA manifest.json properly configured

### 2. Verify PWA Quality
Before building the APK, verify your PWA meets quality standards:

1. Open your deployed app in Chrome
2. Open DevTools (F12) → Lighthouse tab
3. Run PWA audit
4. Ensure all PWA checks pass (manifest, service worker, HTTPS, installability)

## Method 1: PWABuilder (Recommended - Easiest)

PWABuilder is a free Microsoft tool that automates Android APK generation from PWAs.

### Step 1: Access PWABuilder
1. Go to https://www.pwabuilder.com/
2. Enter your production URL: `https://your-canister-id.icp0.io`
3. Click "Start"

### Step 2: Review PWA Score
PWABuilder will analyze your PWA and show a score. Ensure:
- ✅ Manifest detected
- ✅ Service worker detected
- ✅ HTTPS enabled
- ✅ Icons present

### Step 3: Generate Android Package
1. Click the "Android" tab/button
2. Select "Trusted Web Activity" (TWA) as the package type
3. Configure settings:
   - **App name**: Ramp Track
   - **Package ID**: `com.ramptrack.app` (or your preferred reverse domain)
   - **Host**: Your `.icp0.io` URL
   - **Start URL**: `/`
   - **Theme color**: `#1e3a8a`
   - **Background color**: `#0f172a`
   - **Display mode**: `standalone`
   - **Orientation**: `portrait`

4. Advanced settings (optional):
   - **Min SDK version**: 26 (Android 8.0)
   - **Target SDK version**: 34 (latest)
   - **Enable notifications**: Yes
   - **Enable location**: Yes
   - **Fallback behavior**: Custom tabs

### Step 4: Download APK
1. Click "Generate" or "Build"
2. PWABuilder will create your APK (takes 1-2 minutes)
3. Download the generated `.apk` file
4. You'll also get a signing key (`.keystore`) - **save this securely** for future updates

### Step 5: Test the APK
1. Transfer the APK to your Android device via:
   - USB cable and file transfer
   - Email attachment
   - Cloud storage (Google Drive, Dropbox)
   - Direct download from a web server

2. On your Android device:
   - Open Settings → Security
   - Enable "Install unknown apps" for your file manager/browser
   - Navigate to the APK file and tap to install
   - Follow installation prompts

3. Test all features:
   - ✅ App launches with splash screen
   - ✅ Background image displays correctly
   - ✅ Demo login works (operator@demo.com / demo123)
   - ✅ QR scanner functions
   - ✅ GPS location capture works
   - ✅ Photo capture works
   - ✅ Offline mode functions
   - ✅ Service worker updates automatically

## Method 2: Bubblewrap CLI (Advanced)

Bubblewrap is Google's official CLI tool for generating TWA APKs.

### Prerequisites
- Node.js 14+ installed
- Java JDK 8+ installed
- Android SDK installed (or let Bubblewrap install it)

### Installation
