# WebdriverIO + Appium mobile test framework

[![CI](https://github.com/ariamahdy/sandia-mobile/actions/workflows/ci.yml/badge.svg)](https://github.com/ariamahdy/sandia-mobile/actions/workflows/ci.yml)

Native and hybrid Android app tests with WebdriverIO 10, TypeScript (strict) and Appium 3. Sibling of `sandia-website`, built to the same rules.

- Typed, layered architecture with import rules enforced by ESLint and proven by `npm run verify:lint`.
- Page objects with selector maps per platform and atomic actions; specs read as a list of allure `step`s.
- Env validated before a session starts; every missing variable is reported at once.
- Per-test app reset; screenshot and page source saved for every failure.
- Leak guard and git hooks for a public repo that sits next to private test code.

## Requirements

- Node 26 (`.nvmrc`)
- A JDK (`java -version` must work)
- Android SDK with `platform-tools`, and either the emulator with an API 36 image or a real Android device with USB debugging
- macOS or Windows. Setup: [Android on macOS](docs/SETUP-ANDROID.md), [Windows](docs/SETUP-WINDOWS.md), [iOS](docs/SETUP-IOS.md) (not run yet)

## Quick start

```bash
nvm use
npm ci
cp .env.example .env
npm run doctor
npm run fetch:demo-app
npm run test:android
```

Fill `DEVICE_NAME` and `PLATFORM_VERSION` in `.env` first (for the emulator in the setup guide: `sandia_api36` and `16`). `npm ci` also installs the Appium UiAutomator2 driver, which is a pinned devDependency. `npm run doctor` checks Node, Java, the SDK, `adb`, a connected device, the driver and `APP_PATH`, with one fix hint per failure.

After a run, failures leave a screenshot and the page source in `test-results/`; the Appium log is `test-results/wdio-appium.log`. `allure-results/` can be opened with the Allure command line, which is not a dependency of this repository.

## Configuration

The platform is chosen by the command (`test:android` or `test:ios`), not by a variable.

| Variable | Meaning |
|---|---|
| `AUT` | `demo` (public demo app) or `uat` (private app in `private/`) |
| `APP_PATH` | APK path; `apps/android.wdio.native.app.v2.2.0.apk` after `npm run fetch:demo-app` |
| `DEVICE_NAME`, `PLATFORM_VERSION` | target device name and Android version |
| `APPIUM_HOST`, `APPIUM_PORT` | Appium server started by the run (`127.0.0.1`, `4723`) |
| `APP_PACKAGE`, `APP_ACTIVITY` | Android only (`com.wdiodemoapp`, `com.wdiodemoapp.MainActivity`) |
| `BUNDLE_ID` | iOS only |
| `NO_RESET` | `true` or `false`, always explicit |
| `UDID` | optional; the serial from `adb devices` when more than one device is connected |
| `AUTH_USERNAME`, `AUTH_PASSWORD` | required when `AUT=uat`; they belong in `private/.env` |

## Project layout

```
src/
  config/        env validation, capabilities builder, WebdriverIO config builder
  utils/         small pure helpers
  data/          unique test data factories
  pages/         base page, selector maps, demo page objects
  hooks/         per-test app reset, failure screenshot and page source
tests/
  unit/          core logic and scripts, no device
  e2e/demo/      demo app suite
scripts/         guard, private-guard, doctor, error-share, fetch-demo-app, lint-rule check
apps/            demo app facts (README.md); downloaded binaries are gitignored
docs/            ARCHITECTURE.md, setup guides
wdio.*.conf.ts   shared, Android and iOS configs
```

`src/helpers/` and `src/components/` are layers in the import rules but have no files yet; they are created when a WebdriverIO built-in or a page proves insufficient.

Test titles start with an ID, `E2E-<AREA>-NNN`, for example `E2E-LOGIN-001 valid credentials show the success alert`.

## Commands

| Command | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run verify:lint` | Proves the layering and test rules still fire |
| `npm run test:unit` | Core logic and scripts, no device |
| `npm run test:uat:unit` | Unit tests of `private/` (only when it exists) |
| `npm run fetch:demo-app` | Downloads the pinned demo APK into `apps/` and checks its SHA-256 |
| `npm run doctor` | Checks the local setup and prints a fix hint per failure |
| `npm run test:android` | Demo suite (or the private suite with `AUT=uat`) on Android |
| `npm run test:ios` | Same on iOS (configured, not run yet) |
| `npm run test:stability` | Demo suite three times in a row (`--suite demo --repeat 3`) |
| `npm run test:uat` | Private suite on Android; loads `private/.env` (works in PowerShell and cmd) |
| `npm run guard` | Leak guard (also runs on `git push`) |
| `npm run error:share` | Masked copies of the page sources of the last run in `shared-errors/`, ready to hand over |

## Private extension

`private/` is gitignored and is its own git repository for a private app. Its values go in `private/.env`; run it with `npm run test:uat` and `npm run test:uat:unit`, never `AUT=uat npx ...`. `npm install` sets its git hooks. Share a failure with `npm run error:share`: only masked page sources are copied, never screenshots or logs. Details: [Private extension point](docs/ARCHITECTURE.md#private-extension-point).

## Architecture

Layering, test isolation, the private extension point and the decision log live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). In short: `config <- utils <- data <- helpers / components <- pages <- hooks <- tests`, enforced by ESLint and `npm run verify:lint`; pages are exported instances; the app is reset before every test; `private/` is guarded by `npm run guard`. Demo app facts and the verified devices are in [`apps/README.md`](apps/README.md).

## Definition of done

- `npm run typecheck`: 0 errors. `npm run lint`: 0 errors and 0 warnings.
- `npm run verify:lint`, `npm run guard` and `npm run test:unit` pass.
- With a device or emulator, `npm run doctor` is green and `npm run test:stability` passes with no flaky tests.
- No `pause`, no `any`, no hard-coded secrets or device names, no layering violation.

## CI

- `ci.yml`: `quality` (typecheck, lint, lint-rule check, guard, gitleaks), `unit`, then `android-e2e` (API 36 emulator, demo suite; results uploaded as artifacts) on push to `main`, pull requests and on demand.
- `stability.yml`: weekly and on demand, runs `npm run test:stability` on the emulator.

## License

[MIT](LICENSE)
