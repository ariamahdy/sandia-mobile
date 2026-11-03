import { strict as assert } from 'node:assert';
import { appLifecycle, rootHooks, type AppDriver } from '@hooks';

const fakeDriver = (terminateError?: Error) => {
  const calls: string[] = [];
  const driver: AppDriver = {
    terminateApp: (appId: string) => {
      calls.push(`terminate ${appId}`);
      return terminateError === undefined ? Promise.resolve(true) : Promise.reject(terminateError);
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

  it('leaves the per-test reset to the Mocha root hook', () => {
    assert.equal('beforeTest' in appLifecycle('app', true, fakeDriver().driver), false);
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

const context = { currentTest: { title: 'E2E-X-001 works', parent: { title: 'Suite' } } };

describe('rootHooks', () => {
  it('never clears the app data before a test', async () => {
    const { driver, calls } = fakeDriver();
    await rootHooks(() => 'app', driver).beforeEach.call(context);
    assert.deepEqual(calls, ['terminate app', 'activate app']);
  });

  it('fails the test and saves the artifacts when the app cannot be reset', async () => {
    const { driver } = fakeDriver(new Error("'app' is still running after 500ms timeout"));
    const { saved, save } = recorder();
    await assert.rejects(
      rootHooks(() => 'app', driver, save).beforeEach.call(context),
      /still running after 500ms timeout/,
    );
    assert.deepEqual(saved, ['Suite E2E-X-001 works reset']);
  });

  it('reports both errors when the artifacts cannot be saved either', async () => {
    const { driver } = fakeDriver(new Error('reset broke'));
    const save = () => Promise.reject(new Error('no session'));
    await assert.rejects(rootHooks(() => 'app', driver, save).beforeEach.call(context), (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(
        error.errors.map((inner: Error) => inner.message),
        ['reset broke', 'no session'],
      );
      return true;
    });
  });
});
