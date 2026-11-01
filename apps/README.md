# Demo app

Facts about the public AUT. Binaries in this folder are gitignored; only this file is tracked.

| Field | Value |
|---|---|
| App | WebdriverIO native demo app, <https://github.com/webdriverio/native-demo-app> |
| Release | `v2.2.0`, published 2026-03-23 |
| Android asset | `android.wdio.native.app.v2.2.0.apk`, 123,595,826 bytes |
| SHA-256 | `fe1d605ce099c73d93f33e5cbcb0df0bea437ce57aaaaf156b3b0fa1ca54931d` (GitHub release digest, matched by a local download on 2026-11-01) |
| iOS asset | `ios.simulator.wdio.native.app.v2.2.0.zip`, not fetched (iOS is not run yet) |
| Package and launch activity | not recorded yet; read from the APK with `aapt2 dump badging` once the Android SDK is installed |

`npm run fetch:demo-app` downloads the pinned APK into `apps/`, checks its SHA-256, and skips the download when the file is already there with the right checksum. A failed download or a checksum mismatch leaves no partial file and exits non-zero.

To move to a newer release: pick it on the releases page, update `tag` and `sha256` in `scripts/lib/demo-app.mjs` and this table in one `build/` commit, then run the demo suite on an emulator before merging.
