const major = (version) => version.replace(/^v/, '').trim().split('.')[0];
const pass = (name) => ({ name, ok: true });
const fail = (name, hint) => ({ name, ok: false, hint });

const installedDriverVersion = (probe) => {
  const result = probe.run('node', ['node_modules/appium/index.js', 'driver', 'list', '--installed', '--json']);
  if (result.status !== 0) return undefined;
  try {
    return JSON.parse(result.stdout).uiautomator2?.version;
  } catch {
    return undefined;
  }
};

export function evaluateChecks(probe) {
  const checks = [];
  const wanted = major(probe.nvmrc);

  checks.push(
    major(probe.nodeVersion) === wanted
      ? pass('node')
      : fail('node', `Node ${probe.nodeVersion} does not match .nvmrc (${wanted}); run "nvm use".`),
  );

  checks.push(
    probe.run('java', ['-version']).status === 0
      ? pass('java')
      : fail('java', 'Java not found; install a JDK and set JAVA_HOME (see docs/SETUP-ANDROID.md).'),
  );

  const androidHome = probe.env.ANDROID_HOME;
  checks.push(
    androidHome !== undefined && androidHome !== '' && probe.fileExists(androidHome)
      ? pass('android-home')
      : fail('android-home', 'ANDROID_HOME is not set or does not exist; point it at the Android SDK (see docs/SETUP-ANDROID.md).'),
  );

  const adbFound = probe.run('adb', ['version']).status === 0;
  checks.push(adbFound ? pass('adb') : fail('adb', 'adb not found; add $ANDROID_HOME/platform-tools to PATH.'));

  const devices = adbFound ? probe.run('adb', ['devices']).stdout.split('\n').slice(1) : [];
  if (devices.some((line) => /\tdevice\s*$/.test(line))) {
    checks.push(pass('device'));
  } else if (devices.some((line) => /\tunauthorized\s*$/.test(line))) {
    checks.push(fail('device', 'The device is unauthorized; unlock it and allow USB debugging for this computer.'));
  } else {
    checks.push(
      fail('device', 'No device in "adb devices"; start the emulator (emulator -avd <name>) or connect a device with USB debugging on.'),
    );
  }

  const driver = installedDriverVersion(probe);
  checks.push(
    driver === probe.driverPin
      ? pass('appium-driver')
      : fail('appium-driver', `uiautomator2 driver is ${driver ?? 'not installed'}; package.json pins ${probe.driverPin}; run "npm ci".`),
  );

  const appPath = probe.env.APP_PATH;
  if (appPath === undefined || appPath === '') {
    checks.push(fail('app-path', 'APP_PATH is not set in .env; copy .env.example to .env.'));
  } else {
    checks.push(
      probe.fileExists(appPath)
        ? pass('app-path')
        : fail('app-path', `APP_PATH ${appPath} not found; run "npm run fetch:demo-app" or fix the path in .env.`),
    );
  }

  return checks;
}
