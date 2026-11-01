import { driver } from '@wdio/globals';

const RUNNING_IN_FOREGROUND = 4;

export async function resetApp(appId: string): Promise<void> {
  await driver.terminateApp(appId);
  await driver.activateApp(appId);
  await driver.waitUntil(async () => (await driver.queryAppState(appId)) === RUNNING_IN_FOREGROUND, {
    timeout: 15_000,
    timeoutMsg: `${appId} did not reach the foreground after activateApp`,
  });
}
