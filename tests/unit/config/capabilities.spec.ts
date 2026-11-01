import { strict as assert } from 'node:assert';
import { buildCapabilities, type Env } from '@config';

const env: Env = {
  aut: 'demo',
  appPath: '/apps/demo app.apk',
  deviceName: 'test-device',
  platformVersion: '16',
  appiumHost: '127.0.0.1',
  appiumPort: 4723,
  noReset: false,
  appId: 'com.example.demo',
  appActivity: '.MainActivity',
};

describe('buildCapabilities', () => {
  it('prefixes every vendor key with appium:', () => {
    for (const platform of ['android', 'ios'] as const) {
      const keys = Object.keys(buildCapabilities(platform, env)).filter((key) => key !== 'platformName');
      assert.ok(keys.length > 0);
      for (const key of keys) {
        assert.ok(key.startsWith('appium:'), `${platform}: ${key} lacks the appium: prefix`);
      }
    }
  });

  it('android sets UiAutomator2, appPackage and appActivity', () => {
    const caps = buildCapabilities('android', env);
    assert.equal(caps.platformName, 'Android');
    assert.equal(caps['appium:automationName'], 'UiAutomator2');
    assert.equal(caps['appium:appPackage'], 'com.example.demo');
    assert.equal(caps['appium:appActivity'], '.MainActivity');
    assert.equal(caps['appium:bundleId'], undefined);
  });

  it('ios sets XCUITest and bundleId', () => {
    const iosEnv: Env = { ...env };
    delete iosEnv.appActivity;
    const caps = buildCapabilities('ios', iosEnv);
    assert.equal(caps.platformName, 'iOS');
    assert.equal(caps['appium:automationName'], 'XCUITest');
    assert.equal(caps['appium:bundleId'], 'com.example.demo');
    assert.equal(caps['appium:appPackage'], undefined);
    assert.equal(caps['appium:appActivity'], undefined);
  });

  it('android grants runtime permissions at install, ios does not set it', () => {
    assert.equal(buildCapabilities('android', env)['appium:autoGrantPermissions'], true);
    assert.equal('appium:autoGrantPermissions' in buildCapabilities('ios', env), false);
  });

  it('noReset mirrors NO_RESET', () => {
    assert.equal(buildCapabilities('android', env)['appium:noReset'], false);
    assert.equal(buildCapabilities('android', { ...env, noReset: true })['appium:noReset'], true);
  });

  it('sets appium:udid only when UDID is given', () => {
    assert.equal('appium:udid' in buildCapabilities('android', env), false);
    assert.equal(buildCapabilities('android', { ...env, udid: 'R58N12345' })['appium:udid'], 'R58N12345');
  });

  it('device and app values come from env', () => {
    const caps = buildCapabilities('android', env);
    assert.equal(caps['appium:deviceName'], 'test-device');
    assert.equal(caps['appium:platformVersion'], '16');
    assert.equal(caps['appium:app'], '/apps/demo app.apk');
  });
});
