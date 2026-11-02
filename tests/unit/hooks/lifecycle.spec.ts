import { strict as assert } from 'node:assert';
import { appLifecycle, type AppDriver } from '@hooks';

const fakeDriver = () => {
  const calls: string[] = [];
  const driver: AppDriver = {
    terminateApp: (appId: string) => {
      calls.push(`terminate ${appId}`);
      return Promise.resolve(true);
    },
    activateApp: (appId: string) => {
      calls.push(`activate ${appId}`);
      return Promise.resolve();
    },
    queryAppState: () => Promise.resolve(4),
    execute: (script: string) => {
      calls.push(script);
      return Promise.resolve(undefined);
    },
    waitUntil: () => Promise.resolve(true),
  };
  return { driver, calls };
};

const recorder = () => {
  const saved: string[] = [];
  const save = (title: string) => {
    saved.push(title);
    return Promise.resolve();
  };
  return { saved, save };
};

describe('appLifecycle', () => {
  it('clears the app data once per spec file when asked', async () => {
    const { driver, calls } = fakeDriver();
    await appLifecycle('app', true, driver).before();
    assert.deepEqual(calls, ['mobile: clearApp', 'mobile: changePermissions', 'activate app']);
  });

  it('only terminates the app per spec file when data is kept', async () => {
    const { driver, calls } = fakeDriver();
    await appLifecycle('app', false, driver).before();
    assert.deepEqual(calls, ['terminate app', 'activate app']);
  });

  it('never clears the app data before a test', async () => {
    const { driver, calls } = fakeDriver();
    await appLifecycle('app', true, driver).beforeTest();
    assert.deepEqual(calls, ['terminate app', 'activate app']);
  });

  it('saves the artifacts of a failed test named by suite and title', async () => {
    const { driver } = fakeDriver();
    const { saved, save } = recorder();
    const hooks = appLifecycle('app', true, driver, save);
    await hooks.afterTest({ title: 'E2E-X-001 works', parent: 'Suite' }, {}, { passed: false });
    await hooks.afterTest({ title: 'E2E-X-002 works', parent: 'Suite' }, {}, { passed: true });
    assert.deepEqual(saved, ['Suite E2E-X-001 works']);
  });

  it('saves the artifacts of a failed hook such as a login in before', async () => {
    const { driver } = fakeDriver();
    const { saved, save } = recorder();
    const hooks = appLifecycle('app', true, driver, save);
    await hooks.afterHook({ title: '"before all" hook', parent: 'Suite' }, {}, { passed: false });
    await hooks.afterHook({ title: '"before each" hook', parent: 'Suite' }, {}, { passed: true });
    assert.deepEqual(saved, ['Suite "before all" hook']);
  });
});
