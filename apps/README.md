# Demo app

Facts about the public AUT. Binaries in this folder are gitignored; only this file is tracked.

| Field | Value |
|---|---|
| App | WebdriverIO native demo app, <https://github.com/webdriverio/native-demo-app> |
| Release | `v2.2.0`, published 2026-03-23 |
| Android asset | `android.wdio.native.app.v2.2.0.apk`, 123,595,826 bytes |
| SHA-256 | `fe1d605ce099c73d93f33e5cbcb0df0bea437ce57aaaaf156b3b0fa1ca54931d` (GitHub release digest, matched by a local download on 2026-11-01) |
| iOS asset | `ios.simulator.wdio.native.app.v2.2.0.zip`, not fetched (iOS is not run yet) |
| Package and launch activity | `com.wdiodemoapp`, `com.wdiodemoapp.MainActivity` (`aapt2 dump badging`, build-tools 37.0.0) |
| Target SDK | 36 (Android 16); runtime permissions include camera, location, microphone and media |
| Emulator used | AVD `sandia_api36`: `system-images;android-36;google_apis;arm64-v8a` rev 7, `pixel_6` profile, 2 GB RAM, emulator 37.2.13 |

## Screens used by the suite

Selectors were read from the page source on the emulator (2026-11-01). The app is React Native, so `accessibilityLabel` appears as `content-desc` on Android; the iOS entries assume the same label and are not verified yet (R2).

| Screen | Tab | Elements | Behaviour asserted |
|---|---|---|---|
| Login | `~Login` | `~Login-screen`, `~input-email`, `~input-password`, `~button-LOGIN` | Valid input shows the native alert "Success / You are logged in!"; an invalid email shows "Please enter a valid email address"; a password under 8 characters shows "Please enter at least 8 characters" (located by text, no label) |
| Forms | `~Forms` | `~Forms-screen`, `~text-input`, `~input-text-result`, `~switch`, `~switch-text` | Typed text is echoed; the switch hint changes from "Click to turn the switch ON" to "…OFF" |
| Swipe | `~Swipe` | `~Swipe-screen`, carousel resource-id `Carousel`, cards by title text, `~WebdriverIO logo` | One left swipe shows "GREAT COMMUNITY" after "FULLY OPEN SOURCE"; scrolling down reveals the logo and "You found me!!!" |
| Webview | `~Webview` | context `WEBVIEW_com.wdiodemoapp` appears after about 1.5 s | Not covered: the emulator WebView is Chrome 133 and Appium has no matching Chromedriver |

`npm run fetch:demo-app` downloads the pinned APK into `apps/`, checks its SHA-256, and skips the download when the file is already there with the right checksum. A failed download or a checksum mismatch leaves no partial file and exits non-zero.

To move to a newer release: pick it on the releases page, update `tag` and `sha256` in `scripts/lib/demo-app.mjs` and this table in one `build/` commit, then run the demo suite on an emulator before merging.
