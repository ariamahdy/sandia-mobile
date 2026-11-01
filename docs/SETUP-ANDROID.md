# Android setup on macOS

From a clean clone to a green `npm run test:android` on an emulator or a real device. The steps and versions below were carried out on 2026-11-01 on an Apple Silicon Mac with 8 GB RAM. Two differences from that run: the SDK packages were installed in two `sdkmanager` calls (combined into one below), and the phone already had USB debugging on, so the phone steps in section 5 are the standard Android ones, not replayed. Windows: [SETUP-WINDOWS.md](SETUP-WINDOWS.md).

## 1. Java and Node

- A JDK must be on the path: `java -version` prints a version (verified with Temurin 25 and `JAVA_HOME=$(/usr/libexec/java_home -v 25)`).
- Node 26 from `.nvmrc`: `nvm use`.

## 2. Android SDK packages

The SDK lives in `~/Library/Android/sdk`. Install the packages with `sdkmanager` into that root:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "emulator" "platforms;android-36" \
  "system-images;android-36;google_apis;arm64-v8a" "cmdline-tools;latest"
```

| Package | Version verified |
|---|---|
| `platform-tools` | 37.0.1 |
| `emulator` | 37.2.13 (stable channel) |
| `platforms;android-36` | 2 |
| `system-images;android-36;google_apis;arm64-v8a` | rev 7, about 1.5 GB with the emulator |
| `cmdline-tools;latest` | 23.0 |

Pick the image for your CPU: `arm64-v8a` on Apple Silicon, `x86_64` on Intel or AMD (CI uses `x86_64`). API 36 (Android 16) is used because the demo app targets SDK 36; the newer API 37 images were mostly `ps16k` variants at the time and not tried with the pinned UiAutomator2 driver.

`sdkmanager` asks to accept licenses the first time; the files land in `$ANDROID_HOME/licenses`. It now prints a deprecation warning pointing to a new `android sdk` command; that command was not tried here, `sdkmanager` still works.

## 3. Shell profile

Add to `~/.zshrc`, then open a new terminal:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
export PATH="$ANDROID_HOME/emulator:$PATH"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

The last line matters when Homebrew's `android-commandlinetools` is also installed: Homebrew's `avdmanager` uses its own SDK root and does not see the packages in `$ANDROID_HOME` (see Troubleshooting). Check with `which avdmanager`: it must print a path under `$ANDROID_HOME`.

## 4. Emulator

Create a phone-sized AVD; the defaults (2 GB RAM, GPU auto, no hardware keyboard) suit an 8 GB machine, and without a hardware keyboard the on-screen keyboard appears as on a phone:

```bash
avdmanager create avd --name sandia_api36 \
  --package "system-images;android-36;google_apis;arm64-v8a" --device pixel_6
```

Start it and wait for the boot (about 45 s the first time, about 25 s later):

```bash
emulator -avd sandia_api36 -no-snapshot-save -no-boot-anim &
adb shell getprop sys.boot_completed   # repeat until it prints 1; "offline" means still booting
adb devices                            # emulator-5554  device
```

Stop it with `adb emu kill`. On 8 GB RAM, close other heavy apps while it runs.

## 5. Real device

1. On the phone: Settings, About phone, tap the build number seven times; then Developer options, turn on USB debugging.
2. Connect it over USB, unlock it, and accept the "Allow USB debugging" prompt for this computer.
3. `adb devices` lists its serial with `device`. `unauthorized` means the prompt was not accepted; `npm run doctor` says so.

When the emulator and a phone are both connected, set `UDID` in `.env` to the serial from `adb devices`; with one device leave it empty.

Verified on a Xiaomi 15T Pro (Android 16, HyperOS 3.0): the demo suite passed with USB debugging alone. Some Xiaomi devices also need Developer options, "Install via USB" and "USB debugging (Security settings)", for Appium to install its helper apps and type text; an `INSTALL_FAILED_USER_RESTRICTED` error points there. That was not needed on the 15T Pro.

## 6. Project

```bash
npm ci
cp .env.example .env
```

In `.env` set `DEVICE_NAME` and `PLATFORM_VERSION`: `sandia_api36` and `16` for the emulator above, or the phone's name and Android version. Then:

```bash
npm run doctor           # all checks ok
npm run fetch:demo-app   # about 118 MB into apps/, SHA-256 checked
npm run test:android     # 5 tests
npm run test:stability   # the suite three times; the definition of done
```

Measured on 2026-11-01: `test:stability` took 225 s on the emulator above and 156 s on the Xiaomi 15T Pro, 15/15 on both.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `avdmanager create avd` prints only `null` | Homebrew's `avdmanager` with its own SDK root; `avdmanager list target` is empty. Install `cmdline-tools;latest` into `$ANDROID_HOME` and put its `bin` first on `PATH` (step 3). |
| `sdkmanager --list` runs for minutes without output | Seen here for more than 12 minutes while the repository answered in under a second. Install the packages by name (step 2) instead of listing them. |
| `npm run fetch:demo-app` fails with a network error | The download was cut once after five minutes here; run it again, it leaves no partial file. Behind a proxy, Node's `fetch` uses `HTTPS_PROXY` only with `NODE_USE_ENV_PROXY=1`. |
| `adb devices` shows `offline` right after starting the emulator | It is still booting; wait for `sys.boot_completed` to print `1`. |
| The first test sees the launcher instead of the app | Fixed in the before-test hook, which waits for the app to be in the foreground (D12 in [ARCHITECTURE.md](ARCHITECTURE.md)). |
| `doctor` fails on `appium-driver` | The UiAutomator2 driver comes with `npm ci`; run it again after pulling a dependency change. |
