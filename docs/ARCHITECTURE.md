# Architecture

Source of truth for the layering, isolation model, private extension point, decisions and known limits of this framework. Setup, configuration and commands are in [`README.md`](../README.md); working rules for Claude Code are in [`CLAUDE.md`](../CLAUDE.md); demo app facts are in [`apps/README.md`](../apps/README.md). A rule is written in one place only.

## Layering

```
config  <-  utils  <-  data  <-  helpers / components  <-  pages  <-  hooks  <-  tests
```

Each layer may import only from layers to its left, through the aliases `@config`, `@utils`, `@data`, `@helpers`, `@components`, `@pages` and `@hooks`; deep relative imports (`../`) are not allowed. `eslint.config.ts` enforces this per directory, and `npm run verify:lint` checks that the rules keep firing. The same map applies to `private/src/<layer>` and `private/tests`, through the `@uat/src/<layer>` aliases.

| Layer | Contains | Not allowed |
|---|---|---|
| `src/config` | env loading and validation (zod), capabilities builder, spec selection per AUT | anything above it |
| `src/utils` | small pure helpers | anything above it, WebdriverIO globals |
| `src/data` | factories that build unique test data | anything above it |
| `src/helpers` | waits, keyboard handling, gestures only where a WebdriverIO built-in is insufficient | page knowledge |
| `src/components` | elements scoped by a root selector: selector map, `verify*`, atomic actions | page knowledge |
| `src/pages` | `base.page.ts`, one page object per screen, exported as an instance: selector map per platform, `verify*`, atomic actions | business flows (e.g. `login(user, pass)`) |
| `src/hooks` | per-test app reset, failure screenshot and page source; registered in the WebdriverIO configs | business assertions |
| `tests/e2e` | specs calling page actions one by one, each inside an allure `step` | `new` page objects, raw selectors (`$`, `$$`), conditionals, importing `@helpers`, `@components` or `@hooks` |
| `tests/unit` | device-free tests on Mocha + tsx | nothing restricted |

Root configs (`wdio.shared.conf.ts`, `wdio.android.conf.ts`, `wdio.ios.conf.ts`) import only `@config` and `@hooks`. The platform is chosen by the config file, never by an env variable.

Selector priority: accessibility id > resource-id / name > iOS predicate / class chain > UiAutomator selector > XPath. XPath is a last resort and carries its reason in the commit message. `$` is strict: a selector matching several elements throws.

Gestures and dialogs use WebdriverIO built-ins from page objects: `driver.swipe` with a `scrollableElement` (never raw coordinates), `tap`, `scrollIntoView`, `acceptDialog`/`dismissDialog`, `switchContext` for webviews.


## Test isolation

- `NO_RESET` is always explicit and maps to `appium:noReset`. A `beforeTest` hook terminates and activates the app under test (`APP_PACKAGE` or `BUNDLE_ID`), so no test depends on the screen another test left behind.
- `fullReset` is used only by a suite that needs it, with the reason stated in the suite.
- Every test builds its own data with unique values. No order dependence, no shared mutable state, no `pause`. Flakiness is fixed at the root, never with timeouts or retries.
- On failure the `afterTest` hook saves a screenshot and the page source to gitignored `test-results/`; the Appium log goes to `test-results/appium.log`.


## Private extension point

`private/` is gitignored and is its own git repository, cloned into place for testing a private app. It mirrors the `src/` and `tests/` layout (`tests/e2e`, `tests/unit`), imports the core one way only (`private -> core`), and is reached through the `@uat/*` alias. `AUT=uat` selects `private/tests/e2e`; without `private/` the run fails with a clear message before a session starts. Its settings belong in `private/.env`; `npm run test:uat` and `npm run test:uat:unit` load it with `node --env-file`, which works the same on Windows and macOS.

Leak protection:

- ESLint forbids core code from importing `@uat/*` or `private/`.
- `npm run guard` (pre-push and CI) fails if `private/`, an env file other than `.env.example`, an app binary (`*.apk`, `*.ipa`, `*.aab`) or run output (`test-results/`, `allure-results/`, `allure-report/`, `shared-errors/`) is tracked, if tracked text matches `scripts/guard.denylist.txt` merged with `private/guard.denylist.txt`, or if a workflow action is not pinned to a full SHA. It also scans the added lines of every commit not on a remote yet. It prints commit, file and pattern, never the line.
- CI runs on a clean clone without `private/`, plus gitleaks.
- `npm install` (`prepare`) points the `private` repo's `core.hooksPath` at `scripts/private-hooks`: pre-commit runs typecheck, ESLint on `private/`, cspell and `npm run test:uat:unit`; pre-push runs `scripts/private-guard.mjs`. Without `private/`, or outside a git checkout, it is skipped.
- Failures leave the company only through `npm run error:share`, which writes masked page sources to gitignored `shared-errors/`; screenshots, allure results and Appium logs are never shared.


## Decisions

A change to layering, a new dependency, a shared hook or contract, or a lint/guard rule adds a row here with context, decision and enforcer. "Review" means no tool enforces it.

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

## Risks and limits

- R1: the sandbox has no Android emulator; emulator runs happen on the owner's machine.
- R2: iOS is untested on a real simulator until Xcode setup exists.
- R3: demo app updates can break example specs; the release is pinned.
- R4: private app tests cannot run in CI (VPN).
- R5: rules not tool-enforced (allure step per action, `verify*` in every spec, unique E2E IDs, core changes found on the private app going to core first) rely on review.
- R6: WebdriverIO 10 is young; plugin and service compatibility is checked at install, and a blocking bug is a reason to fall back to 9.32 with a decision row.
