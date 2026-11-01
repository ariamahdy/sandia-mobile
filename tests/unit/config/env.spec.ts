import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EnvError, loadAuth, loadEnv } from '@config';

const issuesOf = (run: () => unknown): string[] => {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof EnvError, `expected EnvError, got ${String(error)}`);
    return error.issues;
  }
  assert.fail('expected loadEnv to throw');
};

describe('loadEnv', () => {
  let dir: string;
  let appPath: string;
  let android: NodeJS.ProcessEnv;
  let ios: NodeJS.ProcessEnv;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'sandia mobile '));
    appPath = join(dir, 'demo app.apk');
    writeFileSync(appPath, '');
    const common = {
      AUT: 'demo',
      APP_PATH: appPath,
      DEVICE_NAME: 'test-device',
      PLATFORM_VERSION: '16',
      APPIUM_HOST: '127.0.0.1',
      APPIUM_PORT: '4723',
      NO_RESET: 'false',
    };
    android = { ...common, APP_PACKAGE: 'com.example.demo', APP_ACTIVITY: '.MainActivity' };
    ios = { ...common, BUNDLE_ID: 'com.example.demo' };
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('accepts a complete android env, including an app path with spaces', () => {
    const env = loadEnv('android', android);
    assert.equal(env.aut, 'demo');
    assert.equal(env.appPath, appPath);
    assert.equal(env.appId, 'com.example.demo');
    assert.equal(env.appActivity, '.MainActivity');
    assert.equal(env.appiumPort, 4723);
    assert.equal(env.noReset, false);
    assert.equal(env.auth, undefined);
  });

  it('reports every missing variable at once', () => {
    const issues = issuesOf(() => loadEnv('android', {}));
    for (const key of [
      'AUT',
      'APP_PATH',
      'DEVICE_NAME',
      'PLATFORM_VERSION',
      'APPIUM_HOST',
      'APPIUM_PORT',
      'NO_RESET',
      'APP_PACKAGE',
      'APP_ACTIVITY',
    ]) {
      assert.ok(issues.includes(`${key}: missing`), `${key} not reported in ${JSON.stringify(issues)}`);
    }
  });

  it('treats an empty value as missing', () => {
    const issues = issuesOf(() => loadEnv('android', { ...android, APP_PACKAGE: '  ' }));
    assert.deepEqual(issues, ['APP_PACKAGE: missing']);
  });

  it('android ignores BUNDLE_ID', () => {
    const env = loadEnv('android', { ...android, BUNDLE_ID: 'com.example.other' });
    assert.equal(env.appId, 'com.example.demo');
  });

  it('ios requires BUNDLE_ID and ignores APP_PACKAGE and APP_ACTIVITY', () => {
    const issues = issuesOf(() => loadEnv('ios', { ...android }));
    assert.deepEqual(issues, ['BUNDLE_ID: missing']);
    const env = loadEnv('ios', { ...ios, APP_PACKAGE: 'com.example.other' });
    assert.equal(env.appId, 'com.example.demo');
    assert.equal(env.appActivity, undefined);
  });

  it('AUT=uat requires AUTH_USERNAME and AUTH_PASSWORD', () => {
    const issues = issuesOf(() => loadEnv('android', { ...android, AUT: 'uat' }));
    assert.deepEqual(issues, ['AUTH_USERNAME: missing', 'AUTH_PASSWORD: missing']);
    const env = loadEnv('android', { ...android, AUT: 'uat', AUTH_USERNAME: 'tester', AUTH_PASSWORD: 'secret-1' });
    assert.deepEqual(env.auth, { username: 'tester', password: 'secret-1' });
  });

  it('AUT=demo does not require credentials', () => {
    assert.equal(loadEnv('android', android).auth, undefined);
  });

  it('AUT must be demo or uat', () => {
    assert.deepEqual(issuesOf(() => loadEnv('android', { ...android, AUT: 'prod' })), ['AUT: must be demo or uat']);
  });

  it('NO_RESET must be the string true or false', () => {
    assert.deepEqual(issuesOf(() => loadEnv('android', { ...android, NO_RESET: 'yes' })), [
      'NO_RESET: must be true or false',
    ]);
    assert.equal(loadEnv('android', { ...android, NO_RESET: 'true' }).noReset, true);
  });

  it('APPIUM_PORT must be a port number', () => {
    for (const port of ['abc', '0', '70000', '47.23']) {
      assert.deepEqual(issuesOf(() => loadEnv('android', { ...android, APPIUM_PORT: port })), [
        'APPIUM_PORT: must be a port number from 1 to 65535',
      ]);
    }
  });

  it('APP_PATH must point to an existing file', () => {
    const missingPath = join(dir, 'no such app.apk');
    assert.deepEqual(issuesOf(() => loadEnv('android', { ...android, APP_PATH: missingPath })), [
      `APP_PATH: file not found: ${missingPath}`,
    ]);
  });

  it('UDID is optional and passed through when set', () => {
    assert.equal(loadEnv('android', android).udid, undefined);
    assert.equal(loadEnv('android', { ...android, UDID: '  ' }).udid, undefined);
    assert.equal(loadEnv('android', { ...android, UDID: 'R58N12345' }).udid, 'R58N12345');
  });

  it('error text never contains the password value', () => {
    const password = 'do-not-print-me';
    try {
      loadEnv('android', { AUT: 'uat', AUTH_PASSWORD: password, NO_RESET: password, APPIUM_PORT: password });
      assert.fail('expected loadEnv to throw');
    } catch (error) {
      assert.ok(error instanceof EnvError);
      assert.ok(!error.message.includes(password));
      assert.ok(!error.issues.join('\n').includes(password));
    }
  });
});

describe('loadAuth', () => {
  it('returns the credentials from AUTH_USERNAME and AUTH_PASSWORD', () => {
    assert.deepEqual(loadAuth({ AUTH_USERNAME: 'tester', AUTH_PASSWORD: 'secret-1' }), {
      username: 'tester',
      password: 'secret-1',
    });
  });

  it('lists every missing key', () => {
    assert.throws(() => loadAuth({}), /AUTH_USERNAME: missing[\s\S]*AUTH_PASSWORD: missing/);
  });

  it('treats a blank value as missing', () => {
    assert.throws(() => loadAuth({ AUTH_USERNAME: ' ', AUTH_PASSWORD: 'secret-1' }), /AUTH_USERNAME: missing/);
  });

  it('never prints the password', () => {
    assert.throws(
      () => loadAuth({ AUTH_PASSWORD: 'secret-1' }),
      (error: unknown) =>
        error instanceof Error && error.message.includes('AUTH_USERNAME: missing') && !error.message.includes('secret-1'),
    );
  });
});
