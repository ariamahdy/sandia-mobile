import { strict as assert } from 'node:assert';
import { buildWdioConfig, DEMO_SPECS, specsFor, type Env } from '@config';

const env: Env = {
  aut: 'demo',
  appPath: '/apps/demo.apk',
  deviceName: 'test-device',
  platformVersion: '16',
  appiumHost: '127.0.0.1',
  appiumPort: 4799,
  noReset: false,
  appId: 'com.example.demo',
  appActivity: '.MainActivity',
};

describe('specsFor', () => {
  it('demo selects tests/e2e/demo', () => {
    assert.deepEqual(specsFor('demo', () => false), [DEMO_SPECS]);
    assert.equal(DEMO_SPECS, './tests/e2e/demo/**/*.spec.ts');
  });

  it('uat selects the spec folder of UAT_APP', () => {
    assert.deepEqual(specsFor('uat', () => true, 'app-a'), ['./private/tests/e2e/app-a/**/*.spec.ts']);
  });

  it('uat without private/ fails with a clear error', () => {
    assert.throws(() => specsFor('uat', () => false, 'app-a'), /AUT=uat needs the private\/ repository/);
  });

  it('uat without a spec folder for UAT_APP fails with a clear error', () => {
    const exists = (path: string) => path === 'private';
    assert.throws(() => specsFor('uat', exists, 'app-a'), /UAT_APP=app-a has no specs: create private\/tests\/e2e\/app-a\//);
  });
});

describe('buildWdioConfig', () => {
  const config = buildWdioConfig('android', env, () => false);

  it('runs the selected specs and exposes the demo suite for --repeat', () => {
    assert.deepEqual(config.specs, [DEMO_SPECS]);
    assert.deepEqual(config.suites, { demo: [DEMO_SPECS] });
  });

  it('uses one capability built for the platform', () => {
    assert.equal(config.capabilities.length, 1);
    assert.equal(config.capabilities[0]?.platformName, 'Android');
  });

  it('connects to and starts Appium on the env host and port', () => {
    assert.equal(config.hostname, '127.0.0.1');
    assert.equal(config.port, 4799);
    assert.deepEqual(config.services, [
      ['appium', { args: { address: '127.0.0.1', port: 4799 }, logPath: 'test-results' }],
    ]);
  });

  it('uses Mocha with spec and allure reporters', () => {
    assert.equal(config.framework, 'mocha');
    assert.deepEqual(config.reporters, ['spec', ['allure', { outputDir: 'allure-results' }]]);
  });

  it('requires explicit imports from @wdio/globals and keeps $ strict', () => {
    assert.equal(config.injectGlobals, false);
    assert.equal('strictSelectors' in config, false);
  });
});
