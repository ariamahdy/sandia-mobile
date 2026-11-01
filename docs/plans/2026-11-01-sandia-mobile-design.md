# sandia-mobile: design spec

Date: 2026-11-01. Status: revision 3 (WebdriverIO 10 findings applied), approved by owner.

## 1. Intent

A mobile test automation framework, sibling of `sandia-website`, built with WebdriverIO 10, TypeScript (strict) and Appium 3. Same structure, conventions and engineering bar as `sandia-website`: layering enforced by lint through path aliases, validated config, leak guard, hooks, SHA-pinned CI, a gitignored `private/` extension point, and a decisions table. Where mobile forces a difference, the difference is a decision row, never a silent deviation.

Success criteria:
- A new engineer can go from clone to a green Android run using only `README.md` and `docs/SETUP-ANDROID.md`.
- Layering violations, raw selectors in specs, `.only`/`.skip`, `browser.pause()` and `any` fail lint, and `npm run verify:lint` proves each rule still fires.
- Nothing from the private app (hosts, selectors, field names, credentials, APKs, data) can reach the public repo; `npm run guard` enforces it.
- Every failure is diagnosable from the spec log, allure steps, screenshot, page source and Appium log without a rerun.

Stated by owner: repo next to `sandia-website`; hybrid AUT (public demo app in core, private app in `private/`); Android runs first, iOS defined in config; full parity with `sandia-website` plus mobile extras; built step by step, from `CLAUDE.md` onwards; WebdriverIO 10.

Assumptions (correct if wrong):
- Mocha, `spec` + `allure` reporters, `expect` from `@wdio/globals`, Page Object Model, no cloud device farm.
- Docs and code follow `sandia-website`: English, no code comments in source (one exception: the version comment after a SHA-pinned action).
- Private app tests are never run by Claude; Claude only gives the command.

## 2. Scope

In scope: native and hybrid (webview) tests on Android (UiAutomator2, run) and iOS (XCUITest, configured and unit-tested, not run yet), real devices and emulators/simulators, local runs.

Out of scope (YAGNI): mobile web in Chrome/Safari, desktop web, Selenium/Java, Playwright, Katalon mapping, cloud device farms, Cucumber, visual regression, custom reporters, retry/wait utilities beyond WDIO built-ins, logging wrappers, a self-hosted runner for the private app. An `src/api` layer for setup/teardown is added only when a test needs it, with a decision row.

## 3. Architecture

Mirrors `sandia-website` names: `tests/` (plural), `*.page.ts`, `*.component.ts`, `*.factory.ts`, barrel `index.ts` per layer, plans in `docs/plans/`.

```
sandia-mobile/
  CLAUDE.md  README.md  LICENSE  .env.example  .nvmrc  .npmrc  .gitattributes  .gitignore
  eslint.config.ts  tsconfig.json  package.json  .mocharc.json
  wdio.shared.conf.ts  wdio.android.conf.ts  wdio.ios.conf.ts
  docs/ARCHITECTURE.md  docs/SETUP-ANDROID.md  docs/SETUP-WINDOWS.md  docs/SETUP-IOS.md  docs/plans/
  apps/README.md    demo app facts: pinned release, checksum, screens (binaries gitignored)
  src/
    config/       zod env, capabilities builder, spec selection per AUT
    utils/        small pure helpers
    data/         factories for unique test data
    helpers/      waits, permission and keyboard handling; gestures only where a WDIO built-in is insufficient
    components/   reusable elements scoped by a root selector
    pages/        base.page.ts, one page object per screen, selector map per platform
    hooks/        per-test app reset, failure screenshot and page source
  tests/
    e2e/demo/<feature>/*.spec.ts   public suite
    unit/<layer>/*.spec.ts         mocha + tsx, no device
  scripts/        guard, private-guard, verify-lint-rules, doctor, error-share, fetch-demo-app, setup-private-hooks
  private/        gitignored, own git repo, mirrors src/ and tests/ (e2e, unit) for the private app
  .github/        workflows/ci.yml, workflows/stability.yml, dependabot.yml
```

Layering, no cycles:

```
config  <-  utils  <-  data  <-  helpers / components  <-  pages  <-  hooks  <-  tests
```

- Each layer imports only from layers to its left, through aliases `@config`, `@utils`, `@data`, `@helpers`, `@components`, `@pages`, `@hooks`; deep relative imports (`../`) are a lint error. ESLint enforces the map per directory.
- `tests/e2e` may import only `@pages`, `@data` and `@wdio/globals`; never `@helpers`, `@components` or `@hooks`. Hooks are registered in the WDIO configs, not imported by tests. `tests/unit` may import anything.
- Root `wdio.*.conf.ts` may import `@config` and `@hooks` only.
- Core never imports `private/` or `@uat/*`. `private/` imports core one way (`private -> core`) through `@uat/*`, and `private/src/<layer>` and `private/tests` are linted with the same map through `@uat/src/<layer>`.

Rules:
- Specs contain no raw selectors (`$`, `$$`, `driver.$`) and no `new` page objects; pages are exported instances from `@pages/<aut>`.
- Specs call page actions one by one, each wrapped in a labelled allure step (WebdriverIO's counterpart of `test.step`); no conditionals in specs.
- Page objects: lazy element getters through `BasePage`, a selector map keyed by platform, atomic actions and `verify*` methods only; no business flows.
- Selector priority: accessibility id > resource-id / name > iOS predicate / class chain > UiAutomator selector > XPath (last resort, reason in the commit message).
- Waits: `waitForDisplayed`, `waitForEnabled`, `waitUntil` with timeout and message. `browser.pause()` is a lint error.
- Gestures use WDIO built-ins from page objects: `driver.swipe` with a `scrollableElement` (never raw coordinates), `tap`, `scrollIntoView`. W3C Actions or `mobile:` commands in `src/helpers` only when a built-in is proven insufficient, reason stated. `touchAction` is removed in WDIO 10 (the types reject it) and JSON Wire Protocol is unsupported.
- `$` stays strict (WDIO 10 default): a selector matching more than one element throws.
- Permission dialogs use the built-ins `driver.acceptDialog()`/`driver.dismissDialog()`; onboarding and keyboard are handled explicitly in page objects. A handler is a no-op when nothing appears; a thin helper wraps the built-in only if it throws on an absent dialog.
- Typed everything; `any` is a lint error.
- Naming: files `kebab-case` with role suffix (`login.page.ts`), classes `PascalCase`, methods `camelCase`. E2E titles start with `E2E-<AREA>-NNN`, unique in the repo; unit test titles are plain sentences (as in `sandia-website`).

## 4. Configuration

The platform is chosen by the command (`wdio.android.conf.ts` or `wdio.ios.conf.ts`), not by an env variable, so a run can never mix platforms. Env is validated by zod for that platform before WDIO starts; every missing or invalid variable is reported at once (one object schema plus `superRefine`, not a discriminated union, which stops at the first failing discriminator).

| Variable | Meaning |
|---|---|
| `AUT` | `demo` or `uat` |
| `APP_PATH` | path to the APK/IPA |
| `DEVICE_NAME`, `PLATFORM_VERSION` | target device |
| `APPIUM_HOST`, `APPIUM_PORT` | Appium server |
| `APP_PACKAGE`, `APP_ACTIVITY` | required on Android, ignored on iOS |
| `BUNDLE_ID` | required on iOS, ignored on Android |
| `NO_RESET` | `true` or `false`, always explicit |
| `AUTH_USERNAME`, `AUTH_PASSWORD` | required when `AUT=uat` |

Capabilities come from one typed builder; every vendor capability uses the `appium:` prefix. Runner: WebdriverIO 10, Mocha, `spec` + `allure` reporters, `@wdio/appium-service` starting the Appium 3 server installed as a local devDependency. Drivers (`uiautomator2`, `xcuitest`) are installed at pinned versions by `npm run appium:setup`; `doctor` checks them.

Spec selection: `AUT=demo` runs `tests/e2e/demo/**` (also defined as suite `demo`); `AUT=uat` runs `private/tests/e2e/**` and fails with a clear message when `private/` is absent.

State: `noReset` mirrors `NO_RESET`; a `beforeTest` hook terminates and activates the app (`APP_PACKAGE` or `BUNDLE_ID`), so tests are independent. `fullReset` only for a suite that needs it, reason stated in the suite. On failure the `afterTest` hook saves a screenshot and the page source into gitignored `test-results/`.

Scripts: `typecheck`, `lint`, `verify:lint`, `test:unit`, `test:android`, `test:ios`, `test:stability` (`wdio run wdio.android.conf.ts --suite demo --repeat 3`, the built-in repeat, which needs `--suite` or `--spec`), `test:uat` and `test:uat:unit` (`node --env-file=private/.env`, cross-platform; never `AUT=uat npx ...`), `appium:setup`, `doctor`, `guard`, `error:share`, `fetch:demo-app`, `report`, `prepare`.

`doctor` checks Node against `.nvmrc`, Java, `ANDROID_HOME`, `adb`, the Appium driver from `package.json` being installed, a connected emulator/device, and that `APP_PATH` exists (paths with spaces included); exits non-zero with one fix hint per failure. Windows uses `where`, macOS `which`.

## 5. Safety, hooks, CI

- `npm run guard` fails when tracked: `private/`, env files other than `.env.example`, `*.apk`/`*.ipa`/`*.aab`, `test-results/`, `allure-results/`, `allure-report/`, `shared-errors/`; or when tracked text or the added lines of commits not on a remote (`git rev-list HEAD --branches --not --remotes`) match `scripts/guard.denylist.txt` merged with `private/guard.denylist.txt`; or when a workflow `uses:` is not pinned to a full SHA (local and `docker://` exempt). It prints commit, file and pattern, never the line.
- Core hooks (simple-git-hooks): pre-commit `npx lint-staged && npm run typecheck`; pre-push `npm run guard`.
- `private/` hooks via `core.hooksPath`, set by `prepare`, skipped without `private/.git`: pre-commit runs typecheck, ESLint on `private/`, cspell (pinned through `npx`, `private/cspell.json`) and `npm run test:uat:unit`; pre-push runs `scripts/private-guard.mjs` (tracked env files, `*.zip`, `*.apk`/`*.ipa`/`*.aab`, run output folders, and an unpushed commit adding the `AUTH_PASSWORD` value of `private/.env`, never printed, skipped below 6 characters).
- CI (`ci.yml`, SHA-pinned, `permissions: contents: read`, `concurrency` per ref, on push to `main`, pull request and dispatch): `quality` (checkout with `fetch-depth: 0`, typecheck, lint, verify:lint, guard, gitleaks), `unit`, `android-e2e` (pinned emulator-runner action, `fetch:demo-app`, `appium:setup`, `test:android`, report uploaded on failure). `stability.yml`: weekly and on dispatch, runs `test:stability` on the emulator. No `private/` in CI; private app tests cannot run there (VPN), documented as a known limit.
- Dependabot: one PR per npm dependency or action, weekly, `versioning-strategy: increase`, `typescript` ignored while held back.
- `error:share` writes a masked copy of the page-source files of the last run to gitignored `shared-errors/`; screenshots, allure results and Appium logs are not copied.

## 6. Demo AUT and tests

AUT: the official WebdriverIO native demo app. The APK/IPA is not committed; `fetch:demo-app` downloads a pinned release into `apps/` with a SHA-256 check. The release is chosen at implementation time from the project's releases page and recorded in `apps/README.md` and a decision row.

E2E specs: login valid and invalid, form input, swipe, permission handler no-op, webview context. Unit tests (mocha + tsx): env schema, capabilities builder for both platforms, spec selection, selector maps complete for both platforms, factories, guard, private-guard, doctor, page-source masking.

## 7. Versions and uncertainty

Checked on the npm registry on 2026-11-01 (re-check at install; pin exactly, `save-exact=true`; a release younger than 14 days is not the default):

| Package | Latest | Note |
|---|---|---|
| `webdriverio`, `@wdio/*` | 10.1.0 (2026-10-18) | 10.0.0 released 2026-10-05; engines `node >=22.19.0` |
| `appium` | 3.9.0 (2026-10-27) | 3.0.0 released 2025-08-18; 4.0 in beta, not used |
| `appium-uiautomator2-driver` | 9.0.0 | date to verify at install |
| `appium-xcuitest-driver` | 13.0.1 | date to verify at install |
| `eslint-plugin-wdio` | 10.1.0 | peer `eslint ^10`, `typescript-eslint ^8.56` |
| `eslint-plugin-mocha` | 12.0.2 | peer `eslint >=10.2` |
| `typescript` | 7.0.2 latest | held at 6.0.3: `typescript-eslint` 8.72.1 peer `<6.1.0` (same as `sandia-website`) |
| `mocha` 12.0.3, `tsx` 4.23.15 | | |

Verified on 2026-11-01 against the published 10.1.0 packages and the official migration guides (WebdriverIO v10, Appium 2 to 3):
- Node `>=26.12.1` on the 26 line; WDIO packages declare `typeScriptVersion` 6.0.3. TypeScript 6 defaults `types` to `[]`, so `tsconfig.json` lists `node`, `mocha`, `@wdio/globals/types` and `@wdio/mocha-framework` explicitly.
- `wdio` loads TypeScript configs through `tsx` with the `tsconfig.json` next to the config (aliases resolve); `tsx` does not type-check, so `typecheck` stays a separate gate.
- Present: `driver.action`, `driver.swipe`, `acceptDialog`/`dismissDialog`, `terminateApp`/`activateApp`, `getPageSource`, `saveScreenshot`, `getContext`/`switchContext`, CLI `--repeat` (with `--suite`/`--spec`), allure `step(name, body)`. Removed: `touchAction`, `touchPerform`, `executeAsync`, JSON Wire. `$` is strict by default.
- Lint: `eslint-plugin-wdio` exports only `flat/recommended` (`no-pause`, `no-debug`, `await-expect`, replaced by `no-floating-promise` when typescript-eslint is installed). `eslint-plugin-mocha` has `no-exclusive-tests`, `no-pending-tests` (rejects `.skip` and `this.skip()`, no comment escape by default) and `no-identical-title`; there is no `no-skipped-tests`.
- Appium 3: unprefixed capabilities no longer select Appium; `--allow-insecure` needs a driver or `*` scope prefix.
- Still to verify on a device (Task 8): whether `dismissDialog` throws when no dialog is shown.

## 8. Decisions recorded at creation (go into `docs/ARCHITECTURE.md`)

| # | Decision | Context | Enforcer |
|---|---|---|---|
| D1 | WDIO built-ins first; no custom reporters, retry or wait utilities, logging wrappers | YAGNI | Review |
| D2 | Exact version pins; TypeScript held at 6.0.3 | Ranges age silently; typescript-eslint peer range | `.npmrc`, `package.json` |
| D3 | WebdriverIO 10, not 9.32 | 10.0.0 is a month old but current; starting on 9 means a major migration soon after creation | `package.json`; R6 |
| D4 | Appium 3 as a local devDependency; drivers pinned and installed by `appium:setup` | Global Appium drifts per machine; `doctor` can check pins | `package.json`, `doctor` |
| D5 | No fixtures; pages are exported instances, cross-cutting setup lives in `src/hooks` registered in the WDIO config | WDIO has no fixture system; `hooks` takes the place of `fixtures` in the layer map | Lint (no `new` page, no `@hooks` in tests) |
| D6 | Layering `config <- utils <- data <- helpers/components <- pages <- hooks <- tests` through aliases | Same isolation as `sandia-website` | ESLint, `verify:lint` |
| D7 | Platform chosen by the WDIO config file, not by env | Mixed platform values cannot leak into a run; validation needs only that platform's variables | `tests/unit/config/env.spec.ts` |
| D8 | Each spec action wrapped in a labelled allure step | Counterpart of `test.step`; failures diagnosable without rerun | Review |
| D9 | Unit tests run on Mocha + tsx, not through WDIO | WDIO has no device-free project; Mocha is already the framework | `.mocharc.json` |
| D10 | Hybrid AUT: demo app in core, private app in gitignored `private/` reached through `@uat/*`, linted with the core rules | Public showcase plus company use | ESLint, `guard`, gitleaks |
| D11 | Android runs first; iOS configured and unit-tested, not run | Laptop constraints; YAGNI | `test:unit` |
| D12 | `noReset` explicit; per-test terminate/activate | Test independence | Hooks, review |
| D13 | UAT runs through `node --env-file=private/.env` | `AUT=uat npx ...` fails in PowerShell and cmd | `package.json` |
| D14 | Guard scans tracked files, unpushed added lines and workflow pins; never prints the line | Same leak model as `sandia-website` D15/D16 | `tests/unit/scripts/guard.spec.ts` |
| D15 | `private/` pre-commit and pre-push hooks with private-guard | `simple-git-hooks` covers only the core repo | `scripts/private-hooks/*`, `tests/unit/scripts/private-guard.spec.ts` |
| D16 | `error:share` shares only masked page source | Page source of a private app shows customer data | `tests/unit/scripts/error-share.spec.ts` |
| D17 | Dependabot weekly, one PR per dependency, TypeScript ignored | Exact pins need an update signal | `.github/dependabot.yml` |
| D18 | WDIO built-ins for swipe (`driver.swipe` with `scrollableElement`), permission dialogs (`acceptDialog`/`dismissDialog`) and repeated runs (`--repeat`); no custom swipe path builder or stability script | WDIO 10 ships these (D1); a custom builder duplicated `driver.swipe` | Review |
| D19 | `$` stays strict (WDIO 10 default); no `strictSelectors: false`, no `{ strict: false }` | A selector matching several elements is a locator bug, as in `sandia-website` | `wdio.shared.conf.ts`, review |

## 9. Build order (one branch and commit per step)

1. `CLAUDE.md`, `.gitignore`, `.nvmrc`, `.npmrc`, `.gitattributes`, `LICENSE`, `.env.example`.
2. `docs/ARCHITECTURE.md` skeleton with layering, decisions and risks.
3. `package.json`, `tsconfig.json` with aliases, Mocha + tsx, zod env.
4. Capabilities builder, spec selection, WDIO configs, Appium setup.
5. ESLint (layering, wdio, mocha, spec rules) and `verify:lint`.
6. Waits, base page, hooks.
7. Guard, private-guard and git hooks.
8. Demo app, pages and specs.
9. `doctor`, `error:share`, `test:stability`.
10. CI and Dependabot.
11. `README.md` and setup docs.
12. Final verification.

## 10. Definition of done

- `npm run typecheck` 0 errors; `npm run lint` 0 errors/warnings; `npm run verify:lint`, `npm run guard`, `npm run test:unit` pass.
- `npm run doctor` green on the owner's machine; `npm run test:stability` green on an emulator.
- No `browser.pause()`, no `any`, no `.only`/`.skip`, no hard-coded secrets, device names or paths, no layering violation, no private detail in core.
- Claude never claims an emulator or private app run passed without running it; for the private app it gives the command only.

## 11. Risks and limits

- R1: the sandbox has no Android emulator; emulator runs happen on the owner's machine.
- R2: iOS is untested on a real simulator until Xcode setup exists.
- R3: demo app updates can break example specs; the release is pinned.
- R4: private app tests cannot run in CI (VPN).
- R5: rules not tool-enforced (allure step per action, `verify*` in every spec, unique E2E IDs, core changes found on the private app going to core first) rely on review.
- R6: WebdriverIO 10 is young; plugin and service compatibility is checked at install, and a blocking bug is a reason to fall back to 9.32 with a decision row.
