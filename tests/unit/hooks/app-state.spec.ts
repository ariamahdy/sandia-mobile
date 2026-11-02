import { strict as assert } from 'node:assert';
import { resetApp, type AppDriver } from '@hooks';

const fakeDriver = (states: number[] = [4]) => {
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
    queryAppState: () => Promise.resolve(states.shift() ?? 4),
    execute: (script: string, args: Record<string, unknown>) => {
      calls.push(`${script} ${JSON.stringify(args)}`);
      return Promise.resolve(undefined);
    },
    waitUntil: async (condition: () => Promise<boolean>) => {
      while (!(await condition())) calls.push('poll');
      return true;
    },
  };
  return { driver, calls };
};

describe('resetApp', () => {
  it('terminates and activates the app when data is kept', async () => {
    const { driver, calls } = fakeDriver();
    await resetApp('com.example.app', false, driver);
    assert.deepEqual(calls, ['terminate com.example.app', 'activate com.example.app']);
  });

  it('clears the app data and grants every permission back before activating', async () => {
    const { driver, calls } = fakeDriver();
    await resetApp('com.example.app', true, driver);
    assert.deepEqual(calls, [
      'mobile: clearApp {"appId":"com.example.app"}',
      'mobile: changePermissions {"permissions":"all","appPackage":"com.example.app","action":"grant"}',
      'activate com.example.app',
    ]);
  });

  it('waits until the app is in the foreground', async () => {
    const { driver, calls } = fakeDriver([2, 3, 4]);
    await resetApp('com.example.app', false, driver);
    assert.equal(calls.filter((call) => call === 'poll').length, 2);
  });
});
