# iOS setup (not run yet)

iOS is configured and unit-tested but has never run (D11, R2 in [ARCHITECTURE.md](ARCHITECTURE.md)). This file lists what is known to be missing; it is not a tested guide.

- **Xcode** with a simulator runtime is required; it is not installed on the machine used so far.
- **Driver:** `appium-xcuitest-driver` is not a dependency yet (D4). Add it on a `build/` branch with `npx appium driver install xcuitest@<version>`, which writes it to `package.json`; check the version on the npm registry first, as for every pin.
- **App:** the demo app release also ships `ios.simulator.wdio.native.app.v2.2.0.zip`, which `npm run fetch:demo-app` does not download yet.
- **Env:** `BUNDLE_ID`, `DEVICE_NAME` (simulator name) and `PLATFORM_VERSION` in `.env`; `APP_PACKAGE` and `APP_ACTIVITY` are ignored on iOS.
- **Selectors:** the iOS entries in the demo selector maps assume the same accessibility labels as Android and are unverified until the first run.
- **Run:** `npm run test:ios`.
