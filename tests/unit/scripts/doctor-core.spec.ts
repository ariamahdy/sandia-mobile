import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type RunResult = { status: number; stdout: string };
type Probe = {
  nodeVersion: string;
  nvmrc: string;
  driverPin: string;
  env: Record<string, string | undefined>;
  fileExists: (path: string) => boolean;
  run: (cmd: string, args: string[]) => RunResult;
};
type Check = { name: string; ok: boolean; hint?: string };
type DoctorModule = { evaluateChecks: (probe: Probe) => Check[] };

const load = async () => (await import(pathToFileURL(resolve('scripts/lib/doctor-core.mjs')).href)) as DoctorModule;

const ok = (stdout = ''): RunResult => ({ status: 0, stdout });
const missing: RunResult = { status: -2, stdout: '' };

const healthy = (overrides: Partial<Probe> = {}): Probe => ({
  nodeVersion: 'v26.12.1',
  nvmrc: '26\n',
  driverPin: '8.7.0',
  env: { ANDROID_HOME: '/sdk', APP_PATH: 'apps/demo.apk' },
  fileExists: () => true,
  run: (cmd, args) => {
    if (cmd === 'adb' && args[0] === 'devices') return ok('List of devices attached\nemulator-5554\tdevice\n\n');
    if (cmd === 'node') return ok('{"uiautomator2":{"version":"8.7.0"}}');
    return ok('version');
  },
  ...overrides,
});

const byName = (checks: Check[], name: string): Check => {
  const found = checks.find((c) => c.name === name);
  assert.ok(found, `no check named ${name}`);
  return found;
};

describe('evaluateChecks', () => {
  it('reports every check as ok on a healthy machine', async () => {
    const { evaluateChecks } = await load();
    const checks = evaluateChecks(healthy());
    assert.deepEqual(
      checks.map((c) => c.name),
      ['node', 'java', 'android-home', 'adb', 'device', 'appium-driver', 'app-path'],
    );
    assert.ok(checks.every((c) => c.ok && c.hint === undefined), JSON.stringify(checks));
  });

  it('reports a Node major that differs from .nvmrc, with a fix hint', async () => {
    const { evaluateChecks } = await load();
    const check = byName(evaluateChecks(healthy({ nodeVersion: 'v24.3.0' })), 'node');
    assert.equal(check.ok, false);
    assert.match(check.hint ?? '', /v24\.3\.0.*26.*nvm use/);
  });

  it('reports a missing Java', async () => {
    const { evaluateChecks } = await load();
    const run: Probe['run'] = (cmd, args) => (cmd === 'java' ? missing : healthy().run(cmd, args));
    assert.equal(byName(evaluateChecks(healthy({ run })), 'java').ok, false);
  });

  it('reports ANDROID_HOME unset or pointing nowhere', async () => {
    const { evaluateChecks } = await load();
    assert.equal(byName(evaluateChecks(healthy({ env: { APP_PATH: 'a.apk' } })), 'android-home').ok, false);
    const fileExists = (path: string) => path !== '/sdk';
    assert.equal(byName(evaluateChecks(healthy({ fileExists })), 'android-home').ok, false);
  });

  it('reports adb missing, and then no device check result as ok', async () => {
    const { evaluateChecks } = await load();
    const run: Probe['run'] = (cmd, args) => (cmd === 'adb' ? missing : healthy().run(cmd, args));
    const checks = evaluateChecks(healthy({ run }));
    assert.equal(byName(checks, 'adb').ok, false);
    assert.equal(byName(checks, 'device').ok, false);
  });

  it('reports no device, and an unauthorized device with its own hint', async () => {
    const { evaluateChecks } = await load();
    const devices = (out: string): Probe['run'] => (cmd, args) =>
      cmd === 'adb' && args[0] === 'devices' ? ok(out) : healthy().run(cmd, args);
    const none = byName(evaluateChecks(healthy({ run: devices('List of devices attached\n\n') })), 'device');
    assert.equal(none.ok, false);
    assert.match(none.hint ?? '', /emulator -avd/);
    const unauthorized = byName(
      evaluateChecks(healthy({ run: devices('List of devices attached\nR58N\tunauthorized\n') })),
      'device',
    );
    assert.equal(unauthorized.ok, false);
    assert.match(unauthorized.hint ?? '', /allow USB debugging/i);
  });

  it('reports the uiautomator2 driver absent or at another version than package.json', async () => {
    const { evaluateChecks } = await load();
    const drivers = (out: string): Probe['run'] => (cmd, args) => (cmd === 'node' ? ok(out) : healthy().run(cmd, args));
    const absent = byName(evaluateChecks(healthy({ run: drivers('{}') })), 'appium-driver');
    assert.equal(absent.ok, false);
    assert.match(absent.hint ?? '', /npm ci/);
    const other = byName(evaluateChecks(healthy({ run: drivers('{"uiautomator2":{"version":"8.6.0"}}') })), 'appium-driver');
    assert.equal(other.ok, false);
    assert.match(other.hint ?? '', /8\.6\.0.*8\.7\.0/);
  });

  it('reports APP_PATH unset or missing, including a path with spaces', async () => {
    const { evaluateChecks } = await load();
    assert.equal(byName(evaluateChecks(healthy({ env: { ANDROID_HOME: '/sdk' } })), 'app-path').ok, false);
    const path = 'C:\\Users\\Test User\\apps\\demo app.apk';
    const check = byName(
      evaluateChecks(healthy({ env: { ANDROID_HOME: '/sdk', APP_PATH: path }, fileExists: (p) => p !== path })),
      'app-path',
    );
    assert.equal(check.ok, false);
    assert.ok(check.hint?.includes(path));
    assert.match(check.hint ?? '', /fetch:demo-app/);
  });
});
