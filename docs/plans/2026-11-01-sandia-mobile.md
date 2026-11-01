# sandia-mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `sandia-mobile`, a WebdriverIO 10 + TypeScript strict + Appium 3 mobile test framework with the structure, conventions and engineering bar of `sandia-website`.

**Architecture:** Layered `src/` (config, utils, data, helpers/components, pages, hooks) plus `tests/`, wired through path aliases, enforced by ESLint and proven by `verify:lint`. Platform chosen by the WDIO config file, env validated by zod for that platform, capabilities from one typed builder, leak guard and hooks for a public repo next to a gitignored `private/` repo. Android runs; iOS is configured and unit-tested.

**Tech Stack:** Node 26 (`.nvmrc`), TypeScript 6.0.3 strict, WebdriverIO 10, Mocha, Appium 3 (`@wdio/appium-service`, UiAutomator2, XCUITest), zod, ESLint 10 + typescript-eslint + eslint-plugin-wdio + eslint-plugin-mocha, simple-git-hooks, lint-staged, allure, tsx.

**Spec:** `docs/plans/2026-11-01-sandia-mobile-design.md`

**Reference repo:** `../sandia-website`. When a task says "mirror", open the named file there and keep its structure; deviate only where the spec says so.

## Global Constraints

- Layering, no cycles: `config <- utils <- data <- helpers/components <- pages <- hooks <- tests`, through aliases (`@config`, `@utils`, `@data`, `@helpers`, `@components`, `@pages`, `@hooks`, `@uat/*`). No `../` imports. Core never imports `private/` or `@uat/*`.
- Exact version pins only. Re-check every version on the npm registry at install, state its release date, skip releases younger than 14 days. Registry unreachable: "version unverified". Never take versions or API names from memory.
- Vendor capabilities always use the `appium:` prefix. WDIO built-ins first: `driver.swipe` with `scrollableElement`, `acceptDialog`/`dismissDialog`, `--repeat` (D18). `$` stays strict (D19).
- No `browser.pause()`, no `any`, no `.only`/`.skip`, no code comments in source (except the SHA-pin version comment), no hard-coded credentials, device names or paths.
- Specs: no raw selectors, no `new` page objects, no conditionals; each action wrapped in a labelled allure step. E2E titles `E2E-<AREA>-NNN`, unique; unit test titles are plain sentences.
- Files: `kebab-case` with role suffix (`login.page.ts`, `navbar.component.ts`, `user.factory.ts`), barrel `index.ts` per layer.
- Selector priority: accessibility id > resource-id/name > iOS predicate/class chain > UiAutomator > XPath (reason in commit message).
- `noReset` always explicit. Tests independent; app reset per test.
- Git as in `../sandia-website/CLAUDE.md`: one branch per task from `main` (`feat/`, `build/`, `docs/`, `test/`), Conventional Commits, one short English line, merge commit, stage by explicit path, never `--no-verify`, owner pushes. Commit trailer as given by the harness.
- No company names, hosts, field names or data anywhere in this repo. The private AUT token is `uat`.
- Never claim an emulator or `AUT=uat` run passed without running it; give the command instead.
- Windows (company laptop) must work: scripts are Node, `.gitattributes` forces LF, no `VAR=value cmd` in npm scripts.
- A new dependency, lint/guard rule or contract adds a row to the Decisions table in `docs/ARCHITECTURE.md`.

## Review Focus

- iOS config with only Android variables set (or the reverse): the other platform's variables are ignored, the missing ones for the chosen platform are reported. Pinned in Task 3.
- Several env errors at once, including an empty env: all reported together, none swallowed. Pinned in Task 3.
- `APP_PATH` pointing to a missing file or a path with spaces (Windows `C:\Users\...`): clear error, not a stack trace. Pinned in Tasks 3 and 9.
- `AUT=uat` without `private/`: clear error before WDIO starts a session. Pinned in Task 4.
- Permission dialog or onboarding absent on a second run: the handler returns without failing. Pinned in Task 8.
- Swipe always passes a `scrollableElement`, never raw coordinates, so it stays inside the element on any screen size. Pinned in Task 8 (review).
- Guard and private-guard never print the matched line or the password. Pinned in Task 7.

---

### Task 0: Read migration notes (no commit)

- [x] **Step 1:** Read the WebdriverIO 10 and Appium 3 migration guides and the published 10.1.0 packages. Findings are in spec section 7.
- [x] **Step 2:** Contradictions (built-in swipe, dialogs, `--repeat`, mocha rule names) approved by the owner and applied as D18/D19.

### Task 1: Repository bootstrap and CLAUDE.md

**Files:**
- Create: `CLAUDE.md`, `.gitignore`, `.nvmrc`, `.npmrc`, `.gitattributes`, `LICENSE` (MIT, owner from `git config user.name`), `.env.example`
- Branch: `docs/bootstrap`

- [ ] **Step 1: `.gitignore`** mirroring `../sandia-website/.gitignore` plus mobile output: `node_modules/`, `private/`, `.env*`, `!.env.example`, `apps/*` with `!apps/README.md`, `test-results/`, `allure-results/`, `allure-report/`, `shared-errors/`, `.DS_Store`, `*.apk`, `*.ipa`, `*.aab`.
- [ ] **Step 2:** `.nvmrc` `26` (same as `sandia-website`), `.npmrc` `save-exact=true`, `.gitattributes` `* text=auto eol=lf`.
- [ ] **Step 3: `.env.example`** with the spec section 4 keys, demo values only (`AUT=demo`, `APPIUM_HOST=127.0.0.1`, `APPIUM_PORT=4723`, `NO_RESET=false`, the demo app package/activity once known in Task 8 as placeholders now), no `AUTH_*` values.
- [ ] **Step 4: `CLAUDE.md`** with the same sections and order as `../sandia-website/CLAUDE.md` (Role, Source of truth, Scope, Versions and uncertainty, Architecture mode, Rules, Conventions, Test design and stability, Definition of done, Environment, Bug fixes, Review mode, Hygiene and data safety, Plans and decisions, Git, Working style). Replace Playwright specifics with the Global Constraints above; Source of truth chain `CLAUDE.md` -> `docs/ARCHITECTURE.md` -> `README.md` -> `apps/README.md`. Environment: Mac personal laptop (Android emulator, later iOS), Windows company laptop (real device or emulator, `AUT=uat` only, VPN, `npm run test:uat`). Bug-fix questions adapted to mobile (Appium/driver version, device, OS version, failing step, selector, page source, screenshot, Appium log). Keep under 120 lines.
- [ ] **Step 5: Verify** `git status` lists only these files; `node -e` check that `CLAUDE.md` has every section heading of the website file.
- [ ] **Step 6: Commit** `docs: bootstrap repo rules and CLAUDE.md`, merge to `main`.

### Task 2: ARCHITECTURE.md skeleton

**Files:**
- Create: `docs/ARCHITECTURE.md`
- Branch: `docs/architecture`

- [ ] **Step 1:** Mirror `../sandia-website/docs/ARCHITECTURE.md`: intro with links, Layering (diagram + "contains / not allowed" table per layer, alias rule, what `tests/e2e` may import), Selector priority, Test isolation (per-test reset, `noReset`, no shared state), Private extension point (`@uat/*`, `npm run test:uat`, hooks, leak protection list), Decisions D1-D19 verbatim from spec section 8, Risks R1-R6.
- [ ] **Step 2: Verify** relative links: links to files created later (`README.md`, setup docs, `apps/README.md`) are listed in the commit body as forward references and checked in Task 12.
- [ ] **Step 3: Commit** `docs: add architecture skeleton and decisions`.

### Task 3: Package, TypeScript, aliases, validated env

**Files:**
- Create: `package.json`, `tsconfig.json`, `.mocharc.json`, `src/config/env.ts`, `src/config/index.ts`, `tests/unit/config/env.spec.ts`
- Branch: `feat/env`

**Interfaces:**
- Produces: `type Platform = 'android' | 'ios'`; `type Aut = 'demo' | 'uat'`; `type Env = { aut: Aut; appPath: string; deviceName: string; platformVersion: string; appiumHost: string; appiumPort: number; noReset: boolean; appId: string; appActivity?: string; auth?: { username: string; password: string } }` (`appId` is `APP_PACKAGE` or `BUNDLE_ID`); `class EnvError extends Error { readonly issues: string[] }`; `function loadEnv(platform: Platform, source?: NodeJS.ProcessEnv): Env`.

- [ ] **Step 1: `package.json`** mirroring `../sandia-website/package.json` (`private`, `license`, `engines.node` from `.nvmrc` with the verified current 26.x minimum, scripts `typecheck`, `test:unit`; more added per task). Install at verified exact pins: `typescript@6.0.3`, `@types/node`, `tsx`, `mocha`, `@types/mocha`, `zod`. Assertions use `node:assert/strict`.
- [ ] **Step 2: `tsconfig.json`** with the compiler options of `../sandia-website/tsconfig.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, NodeNext) plus explicit `types` (`node`, `mocha`; `@wdio/mocha-framework` and `@wdio/appium-service` added in Task 4, since TypeScript 6 defaults `types` to `[]`; `@wdio/globals/types` is not loaded, D20) and `paths` for every alias in Global Constraints plus `@uat/*` -> `./private/*`; `include` `src`, `tests`, `private`, `*.conf.ts`. `.mocharc.json`: `spec: tests/unit/**/*.spec.ts`, tsx loader (verify the current tsx + Mocha 12 loader syntax).
- [ ] **Step 3: Write failing tests** in `tests/unit/config/env.spec.ts`:
  - `accepts a complete android env` -> `loadEnv('android', valid).appId === valid.APP_PACKAGE`.
  - `reports every missing variable at once` -> `loadEnv('android', {})` throws `EnvError` whose `issues` name `AUT`, `APP_PATH`, `DEVICE_NAME`, `APP_PACKAGE`, `APP_ACTIVITY`, `NO_RESET`.
  - `android ignores BUNDLE_ID; ios requires BUNDLE_ID and ignores APP_PACKAGE`.
  - `AUT=uat requires AUTH_USERNAME and AUTH_PASSWORD; AUT=demo does not`.
  - `NO_RESET must be the string true or false`; `APPIUM_PORT must be an integer`.
  - `error text never contains the password value`.
  - `alias import resolves` (imports `loadEnv` through `@config`).
- [ ] **Step 4: Run** `npm run test:unit`. Expected: FAIL, `loadEnv` not found.
- [ ] **Step 5: Implement** `loadEnv` with one `z.object` (all fields optional at shape level) plus `superRefine` adding one issue per missing/invalid field for the platform and AUT; map issues to `EnvError`. No discriminated union (it stops at the discriminator).
- [ ] **Step 6: Run** `npm run test:unit`, `npm run typecheck`. Expected: PASS, 0 errors.
- [ ] **Step 7: Commit** `feat(config): validate env with zod`.

### Task 4: Capabilities, spec selection, WDIO configs, Appium setup

**Files:**
- Create: `src/config/capabilities.ts`, `src/config/specs.ts`, `wdio.shared.conf.ts`, `wdio.android.conf.ts`, `wdio.ios.conf.ts`, `tests/unit/config/capabilities.spec.ts`, `tests/unit/config/specs.spec.ts`
- Modify: `package.json` (WDIO 10 + Appium 3 deps at verified pins; scripts `test:android`, `test:ios`, `test:uat`, `test:uat:unit`, `appium:setup`, `report`)
- Branch: `feat/wdio-config`

**Interfaces:**
- Consumes: `Platform`, `Env`, `loadEnv` (Task 3).
- Produces: `function buildCapabilities(platform: Platform, env: Env): WebdriverIO.Capabilities`; `function specsFor(aut: Aut, privateExists: boolean): string[]` (throws a clear `Error` for `uat` without `private/`); `wdio.shared.conf.ts` exports `function sharedConfig(platform: Platform): WebdriverIO.Config`; `beforeTest`/`afterTest` filled in Task 6.

- [ ] **Step 1: Install** at verified pins: `webdriverio`, `@wdio/cli`, `@wdio/local-runner`, `@wdio/mocha-framework`, `@wdio/spec-reporter`, `@wdio/allure-reporter`, `@wdio/appium-service`, `@wdio/globals`, `appium`. Record versions and dates in the commit body.
- [ ] **Step 2: Write failing tests**: `android capabilities prefix every vendor key with appium:` (every key except `platformName` starts with `appium:`), `android sets UiAutomator2, appPackage and appActivity`, `ios sets XCUITest and bundleId`, `noReset mirrors NO_RESET`, `deviceName and app come from env`, `demo selects tests/e2e/demo`, `uat selects private/tests/e2e`, `uat without private/ fails with a clear error`.
- [ ] **Step 3: Run** `npm run test:unit`. Expected: FAIL.
- [ ] **Step 4: Implement** builder and `specsFor`; `sharedConfig`: `suites: { demo: ['./tests/e2e/demo/**/*.spec.ts'] }`, strict `$` left at its default, Mocha with timeout, reporters `spec` + `allure` (`outputDir: allure-results`), `@wdio/appium-service` using the local Appium on env host/port with its log in `test-results/appium.log`, `waitforTimeout` and `connectionRetryCount` explicit. `wdio.android.conf.ts`/`wdio.ios.conf.ts` call `loadEnv(platform)` then `sharedConfig(platform)`.
- [ ] **Step 5: Scripts**: `test:android` `wdio run wdio.android.conf.ts`; `test:ios` likewise; `test:uat` `node --env-file=private/.env node_modules/@wdio/cli/bin/wdio.js run wdio.android.conf.ts` (verify the CLI entry path of the installed version); `test:uat:unit` Mocha on `private/tests/unit`; `appium:setup` `appium driver install uiautomator2@<pin> && appium driver install xcuitest@<pin>` (pins verified; xcuitest install skipped on non-macOS by a Node script if the driver refuses); `report` `allure` CLI only if already a dependency of the reporter, otherwise drop the script (YAGNI).
- [ ] **Step 6: Verify** `npm run typecheck`, `npm run test:unit`; a unit test imports `wdio.android.conf.ts` with a valid env object and asserts `specs` and capabilities, proving the config loads through the aliases.
- [ ] **Step 7: Commit** `feat(config): add capabilities, spec selection and wdio configs`; add decision rows D3/D4 details (exact versions) to `docs/ARCHITECTURE.md`.

### Task 5: ESLint and verify-lint-rules

**Files:**
- Create: `eslint.config.ts`, `scripts/verify-lint-rules.mjs`
- Modify: `package.json` (`lint`, `verify:lint`; `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-wdio`, `eslint-plugin-mocha`, `jiti` at verified pins)
- Branch: `feat/lint`

**Interfaces:**
- Produces: `eslint.config.ts` shaped like `../sandia-website/eslint.config.ts` (`restrict(files, layers, paths, uatLayers)` helper, `strictTypeChecked`, globals for `.mjs`). Rules:
  - Layer map per directory via `@typescript-eslint/no-restricted-imports`, same map for `private/src/<layer>` and `private/tests` via `@uat/src/<layer>`; `../` imports banned; core bans `@uat`/`private/`.
  - `tests/e2e` and `private/tests/e2e`: may not import `@helpers`, `@components`, `@hooks`; may import only `expect` from `@wdio/globals` (no `$`, `$$`, `driver`, `browser`; D20); `no-restricted-syntax` bans `new <X>Page()`, `IfStatement`, `ConditionalExpression`.
  - `tests/**` and `private/tests/**`: `eslint-plugin-wdio` `flat/recommended` (`wdio/no-pause`, `wdio/no-debug`, `wdio/no-floating-promise`), `mocha/no-exclusive-tests`, `mocha/no-pending-tests` (default options: `.skip` and `this.skip()` rejected), `mocha/no-identical-title`.
  - `src/**` and `private/src/**`: `no-restricted-properties` for `pause` and `debug` on `browser`/`driver` (the wdio rules cover tests only).
  - Everywhere: `@typescript-eslint/no-explicit-any`. `touchAction` needs no rule: WDIO 10 removed it and the types reject it.
- Produces: `verify-lint-rules.mjs` mirroring `../sandia-website/scripts/verify-lint-rules.mjs` (case list `{ name, filePath, code, expect }`, temp files, ESLint Node API, `expect: null` for allowed cases).

- [ ] **Step 1: Write `verify-lint-rules.mjs`** with one case per rule above plus allowed cases (spec importing `@pages`, page importing `@components`, unit test importing anything) and three private cases (also run without `private/`, as in website D11). Run `npm run verify:lint`. Expected: FAIL (no config).
- [ ] **Step 2: Implement `eslint.config.ts`** until `npm run verify:lint` passes and `npm run lint` is clean.
- [ ] **Step 3: Verify** removing any one rule makes `verify:lint` fail (try one, restore).
- [ ] **Step 4: Commit** `feat(lint): enforce layering and mobile test rules`; decision row for the plugin rules.

### Task 6: Waits, base page, hooks

**Files:**
- Create: `src/helpers/waits.ts`, `src/helpers/index.ts`, `src/utils/file-name.ts`, `src/utils/index.ts`, `src/pages/base.page.ts`, `src/pages/selector-map.ts`, `src/pages/index.ts`, `src/hooks/app-state.ts`, `src/hooks/failure-artifacts.ts`, `src/hooks/index.ts`, `tests/unit/utils/file-name.spec.ts`, `tests/unit/pages/selector-map.spec.ts`
- Modify: `wdio.shared.conf.ts` (register hooks)
- Branch: `feat/base-page`

**Interfaces:**
- Produces:
  - `type SelectorMap = Record<Platform, string>`; `function selectorFor(map: SelectorMap, platform: Platform): string`.
  - `function waitUntilDisplayed(el: ChainablePromiseElement, message: string, timeoutMs?: number): Promise<void>` (unawaited chainable in; WDIO 10 types awaited values as `WebdriverIO.Element`).
  - `abstract class BasePage { protected el(map: SelectorMap): ChainablePromiseElement }` resolving the platform from `driver.isAndroid`.
  - `function safeFileName(title: string): string` (pure: keeps letters, digits, `-`, `_`; collapses the rest; caps length so Windows paths stay short).
  - `function resetApp(appId: string): Promise<void>` (`terminateApp` + `activateApp`; not `relaunchActiveApp`, which restarts whatever app is active); `function saveFailureArtifacts(title: string): Promise<{ screenshot: string; pageSource: string }>` writing `test-results/<safeFileName>.png` and `.xml`.
  - No gesture helper: pages call `driver.swipe({ direction, scrollableElement })` (D18).

- [ ] **Step 1: Write failing unit tests**: `selectorFor returns the platform entry`, `a map missing a platform is a type error` (`@ts-expect-error` in the test file only), `safeFileName replaces spaces, slashes and colons`, `safeFileName caps the length`.
- [ ] **Step 2: Run** `npm run test:unit`. Expected: FAIL.
- [ ] **Step 3: Implement** the signatures.
- [ ] **Step 4: Register hooks** in `sharedConfig`: `beforeTest` -> `resetApp(env.appId)`; `afterTest` -> `saveFailureArtifacts` when `passed === false`.
- [ ] **Step 5: Verify** `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run verify:lint`.
- [ ] **Step 6: Commit** `feat(pages): add base page, waits and hooks`.

### Task 7: Guard, private-guard and git hooks

**Files:**
- Create: `scripts/guard.mjs`, `scripts/lib/guard-core.mjs`, `scripts/guard.denylist.txt`, `scripts/private-guard.mjs`, `scripts/lib/private-guard-core.mjs`, `scripts/setup-private-hooks.mjs`, `scripts/private-hooks/pre-commit`, `scripts/private-hooks/pre-push`, `tests/unit/scripts/guard.spec.ts`, `tests/unit/scripts/private-guard.spec.ts`
- Modify: `package.json` (`guard`, `prepare`, `simple-git-hooks`, `lint-staged` `*.{ts,mjs}`; `simple-git-hooks`, `lint-staged` at verified pins)
- Branch: `feat/guard`

**Interfaces:**
- Produces: `function findViolations(input: { trackedFiles: string[]; readFile: (p: string) => string | null; addedLines: { commit: string; file: string; line: string }[]; denylist: RegExp[]; workflows: { file: string; text: string }[] }): { kind: string; where: string; pattern?: string }[]` (never returns line text); `function findPrivateViolations(input: { trackedFiles: string[]; addedLines: { commit: string; file: string; line: string }[]; password?: string }): { kind: string; where: string }[]` (never returns the password).

- [ ] **Step 1: Write failing tests** (guard): flags tracked `private/`; flags `.env` and `.env.local` but allows `.env.example`; flags `.apk`, `.ipa`, `.aab`; flags `test-results/`, `allure-results/`, `allure-report/`, `shared-errors/`; flags a denylist hit in an unpushed added line and omits the line; flags `uses:` not pinned to a 40-char SHA, allows local and `docker://`; clean input returns `[]`. (private-guard): flags tracked env files except `.env.example`, `*.zip`, binaries, run output folders; flags an added line containing the password and omits it; skips the password check below 6 characters.
- [ ] **Step 2: Run** `npm run test:unit`. Expected: FAIL.
- [ ] **Step 3: Implement** pure cores and thin CLIs. `guard.mjs` mirrors `../sandia-website/scripts/guard.mjs` inputs (`git ls-files -z`, `git rev-list HEAD --branches --not --remotes`, fixed diff prefixes, unquoted paths, `.github/workflows/*`), merging `scripts/guard.denylist.txt` (generic patterns only) with `private/guard.denylist.txt`. `private-guard.mjs` runs inside `private/` and reads `AUTH_PASSWORD` from `private/.env`.
- [ ] **Step 4: Hooks**: core pre-commit `npx lint-staged && npm run typecheck`, pre-push `npm run guard`; `setup-private-hooks.mjs` and `scripts/private-hooks/*` mirror the website: pre-commit runs typecheck, `npx eslint --max-warnings=0 private`, cspell pinned through `npx` on `private/src` and `private/tests`, `npm run test:uat:unit`; pre-push runs `node ../scripts/private-guard.mjs`. `prepare`: `simple-git-hooks && node scripts/setup-private-hooks.mjs`.
- [ ] **Step 5: Verify** `npm run guard` exits 0; a committed `x.apk` on a scratch branch makes it exit non-zero (then delete the branch).
- [ ] **Step 6: Commit** `feat(scripts): add leak guards and git hooks`.

### Task 8: Demo app, pages and specs

**Files:**
- Create: `scripts/fetch-demo-app.mjs`, `apps/README.md`, `src/helpers/permissions.ts` (only if needed, Step 3), `src/data/user.factory.ts`, `src/data/index.ts`, `src/pages/demo/{home,login,forms,swipe,webview}.page.ts`, `src/pages/demo/index.ts`, `src/components/*.component.ts` as needed, `tests/e2e/demo/<feature>/*.spec.ts`, `tests/unit/data/factories.spec.ts`, `tests/unit/pages/demo-selectors.spec.ts`
- Modify: `package.json` (`fetch:demo-app`), `.env.example` (demo package/activity), `docs/ARCHITECTURE.md` (decision for the pinned release)
- Branch: `feat/demo-suite`

**Interfaces:**
- Consumes: `BasePage`, `SelectorMap`, `waitUntilDisplayed`, WDIO built-ins `driver.swipe`, `driver.acceptDialog`/`dismissDialog`, `driver.switchContext`.
- Produces: instances `homePage`, `loginPage`, `formsPage`, `swipePage`, `webviewPage` from `@pages/demo`; `function uniqueEmail(prefix?: string): string`; only if `dismissDialog` throws on an absent dialog: `function dismissPermissionIfPresent(): Promise<boolean>` (`false` when no dialog).

- [ ] **Step 1: Fetch script**: choose the latest release of the WebdriverIO native demo app (releases page: tag, date, asset names), download the Android APK to `apps/`, verify a SHA-256 pinned in the script, skip when present. Record tag, date, checksum and screens in `apps/README.md` and a decision row.
- [ ] **Step 2: Write failing unit tests**: `uniqueEmail differs on consecutive calls`, `uniqueEmail is a valid email`, `every demo selector map has android and ios` (iterates the page exports).
- [ ] **Step 3: Implement** factories and pages. Swipes pass a `scrollableElement`. On the emulator, call `driver.dismissDialog()` with no dialog shown: if it returns, use it directly; if it throws, add the `dismissPermissionIfPresent` helper and record the finding in D18. Take selectors from the real app (Appium Inspector or `driver.getPageSource()` on the owner's machine); accessibility id first; any XPath carries its reason in the commit.
- [ ] **Step 4: Write specs**, each action in a labelled allure step, each ending in a `verify*` call: `E2E-LOGIN-001 valid login shows the success alert`, `E2E-LOGIN-002 invalid email shows the validation text`, `E2E-FORM-001 input and switch reflect the typed state`, `E2E-SWIPE-001 swipe reveals the last card`, `E2E-WEB-001 webview loads and returns to native`, `E2E-PERM-001 permission handler is a no-op when no dialog appears`.
- [ ] **Step 5: Verify** `npm run lint`, `npm run verify:lint`, `npm run test:unit`. On a machine with an emulator: `npm run test:android`. No emulator reachable: say so and give the command; do not claim a pass.
- [ ] **Step 6: Commit** per logical change: `build: fetch the pinned demo app`, `feat(pages): add demo page objects`, `test(e2e): add demo specs`.

### Task 9: doctor, error:share, test:stability

**Files:**
- Create: `scripts/doctor.mjs`, `scripts/lib/doctor-core.mjs`, `scripts/error-share.mjs`, `scripts/lib/mask-page-source.mjs`, `tests/unit/scripts/doctor.spec.ts`, `tests/unit/scripts/mask-page-source.spec.ts`, `tests/unit/scripts/error-share.spec.ts`
- Modify: `package.json` (`doctor`, `error:share`, `test:stability`)
- Branch: `feat/doctor`

**Interfaces:**
- Produces: `type Check = { name: string; ok: boolean; hint?: string }`; `type Probe = { nodeVersion: string; nvmrc: string; platform: NodeJS.Platform; env: Record<string, string | undefined>; fileExists: (p: string) => boolean; run: (cmd: string, args: string[]) => { status: number; stdout: string } }`; `function evaluateChecks(probe: Probe): Check[]`; `function maskPageSource(xml: string): string` masking `text`, `value`, `content-desc`, `label`, `name`, `hint` on input classes (`EditText`, `XCUIElementTypeTextField`, `XCUIElementTypeSecureTextField`, `XCUIElementTypeTextView`) and on every node inside list containers (`RecyclerView`, `ListView`, `XCUIElementTypeCell`, `XCUIElementTypeTable`, `XCUIElementTypeCollectionView`), keeping `class`, `type`, `resource-id`, `bounds` and all other nodes; `function collectShareable(files: string[]): string[]` returning only `*.xml` from `test-results/`.

- [ ] **Step 1: Write failing tests**: doctor reports Node mismatch with a hint, missing `ANDROID_HOME`, no `adb` device, a pinned driver missing or at another version, `APP_PATH` missing including a path with spaces, all green; masking hides an `EditText` text and a cell label and keeps `resource-id` and a button label; `collectShareable` never returns `.png`, `.log` or allure files.
- [ ] **Step 2: Run** `npm run test:unit`. Expected: FAIL.
- [ ] **Step 3: Implement** pure cores and thin CLIs. `doctor` uses `adb devices` and `npx appium driver list --installed --json`, `where`/`which` by `process.platform`, exits 1 on any failed check, one hint per failure. `error:share` mirrors `../sandia-website/scripts/error-share.mjs` (clears and fills `shared-errors/`). `test:stability` is `wdio run wdio.android.conf.ts --suite demo --repeat 3` (built-in, D18; all three rounds run, no early stop).
- [ ] **Step 4: Verify** `npm run test:unit`; `npm run doctor` prints its table on this machine (failures expected without an emulator; report them).
- [ ] **Step 5: Commit** `feat(scripts): add doctor, error:share and stability run`.

### Task 10: CI and Dependabot

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/stability.yml`, `.github/dependabot.yml`
- Branch: `build/ci`

- [ ] **Step 1: `ci.yml`** mirroring `../sandia-website/.github/workflows/ci.yml` (triggers push `main`, `pull_request`, `workflow_dispatch`; `permissions: contents: read`; `concurrency` per ref; `timeout-minutes` per job). Jobs: `quality` (checkout `fetch-depth: 0`, setup-node from `.nvmrc` with npm cache, `npm ci`, typecheck, lint, verify:lint, guard, gitleaks), `unit` (`npm run test:unit`), `android-e2e` (needs `quality`; KVM enabled; pinned emulator-runner action running `fetch:demo-app`, `test:android`; `allure-results/` and `test-results/` uploaded with `if: always()`, 14 days). Reuse the website's action SHAs where the action is the same and still current; resolve new ones from the action repos; never invent a SHA. Every `uses:` has `# <tag>`.
- [ ] **Step 2: `stability.yml`**: weekly cron and dispatch, same emulator setup, `npm run test:stability`.
- [ ] **Step 3: `dependabot.yml`** copied from the website: npm and github-actions weekly, `versioning-strategy: increase`, `ignore: typescript`.
- [ ] **Step 4: Verify** `npm run guard` (SHA rule), YAML parse with `node -e` and the `yaml` package only if already installed; otherwise state that YAML was checked by eye.
- [ ] **Step 5: Commit** `build: add CI, stability workflow and dependabot`. The workflows have not run until the owner pushes; say so.

### Task 11: README and setup docs

**Files:**
- Create: `README.md`, `docs/SETUP-ANDROID.md`, `docs/SETUP-WINDOWS.md`, `docs/SETUP-IOS.md` (short, "not run yet")
- Branch: `docs/readme`

- [ ] **Step 1: README** mirroring `../sandia-website/README.md` sections: badge, intro, requirements, quick start (`nvm use`, `npm ci`, `cp .env.example .env`, `npm run doctor`, `npm run fetch:demo-app`, `npm run test:android`), configuration table (spec section 4), layout tree, commands table, private extension (`test:uat`, `test:uat:unit`, `error:share`), troubleshooting links.
- [ ] **Step 2: Setup docs**: JDK, Android SDK cmdline-tools/platform-tools/emulator, system image per CPU (arm64 on Apple Silicon, x86_64 on Intel/AMD), env vars, a low-RAM AVD, Appium drivers come with `npm ci` (D4), USB debugging for a real device, Windows specifics (acceleration, proxy, no admin rights). Every version number verified at write time.
- [ ] **Step 3: Verify** every `npm run` in README exists in `package.json` (`node -e`); every relative link resolves.
- [ ] **Step 4: Commit** `docs: add README and setup guides`.

### Task 12: Final verification

- [ ] **Step 1: Run** `npm run typecheck`, `npm run lint`, `npm run verify:lint`, `npm run guard`, `npm run test:unit`. Expected: all exit 0, 0 warnings.
- [ ] **Step 2: Grep** `src/`, `tests/`, `scripts/` for `pause(`, `: any`, `.only(`, `.skip(`, `strict: false`, `strictSelectors`, swipes with `from:`/`to:` coordinates, hard-coded device names. Expected: none. Check all forward links from Task 2 now resolve.
- [ ] **Step 3: Owner runs** `npm run doctor`, then `npm run test:stability` on the emulator; results go into the merge description, or "not run".
- [ ] **Step 4: Clean up** after the owner confirms: durable decisions already in `docs/ARCHITECTURE.md`; delete this plan and spec in `docs: drop the executed sandia-mobile plan`.
