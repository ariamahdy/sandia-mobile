# Setup on Windows (company laptop)

The company laptop runs only the private app (`AUT=uat`) on a real Android device, behind the VPN. None of the steps below has been run on Windows yet; they follow the macOS run in [SETUP-ANDROID.md](SETUP-ANDROID.md) and the Windows rules of this repository. Correct this file after the first real setup.

## 1. Tools

- Node 26 (`.nvmrc`), Git for Windows (its `sh` runs the git hooks), and a JDK with `java -version` working.
- Android SDK command-line tools without Android Studio: unpack them so that `sdkmanager` sits in `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin`, then install `platform-tools` with `sdkmanager --sdk_root="%LOCALAPPDATA%\Android\Sdk" "platform-tools"`. The emulator and system images are not needed for a real device.
- User environment variables (no admin rights needed), then open a new terminal:

```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx PATH "$env:PATH;$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin"
```

`setx` truncates values longer than 1024 characters; if `PATH` is long, edit it in "Edit environment variables for your account" instead.

## 2. Device

1. Turn on USB debugging (Settings, About phone, tap the build number seven times; Developer options, USB debugging).
2. Connect it, unlock it, accept "Allow USB debugging". `adb devices` must show `device`.
3. If Windows does not list the phone in `adb devices`, it lacks a USB driver for that brand; install the manufacturer's driver.
4. On Xiaomi devices, if Appium fails with `INSTALL_FAILED_USER_RESTRICTED` or cannot type text, turn on "Install via USB" and "USB debugging (Security settings)" in Developer options. The Xiaomi 15T Pro used on macOS did not need them.

An emulator on Windows needs the Windows Hypervisor Platform feature, which usually requires admin rights; a real device does not.

## 3. Proxy

- npm behind a proxy: `npm config set proxy <url>` and `npm config set https-proxy <url>`.
- `npm run fetch:demo-app` uses Node's `fetch`, which honours `HTTPS_PROXY` only with `NODE_USE_ENV_PROXY=1` (verified on macOS). In PowerShell: `$env:NODE_USE_ENV_PROXY = '1'; $env:HTTPS_PROXY = '<url>'; npm run fetch:demo-app`.

## 4. Project

```powershell
npm ci
Set-Content .env 'AUT=uat'
```

The root `.env` holds only `AUT=uat`; with it, `npm run doctor` also reads `private/.env`, as `npm run test:uat` does. The private values (app path, package, activity, device name, Android version, `AUTH_USERNAME`, `AUTH_PASSWORD`) go in `private/.env`. Then:

```powershell
npm run doctor
npm run test:uat
```

- Always use the npm scripts: `AUT=uat npx ...` does not work in PowerShell or cmd, and `npm run test:uat` loads `private/.env` with `node --env-file` on every platform.
- `.gitattributes` keeps LF line endings in the repository whatever `core.autocrlf` says.
- Share a failure with `npm run error:share` and check `shared-errors/` before sending it: values in plain labels outside lists are not masked (D16 in [ARCHITECTURE.md](ARCHITECTURE.md)).
