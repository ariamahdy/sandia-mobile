import { driver } from '@wdio/globals';

const RUNNING_IN_FOREGROUND = 4;

export type AppDriver = {
  terminateApp(appId: string): Promise<unknown>;
  activateApp(appId: string): Promise<unknown>;
  queryAppState(appId: string): Promise<number>;
  execute(script: string, args: Record<string, unknown>): Promise<unknown>;
  waitUntil(condition: () => Promise<boolean>, options: { timeout: number; timeoutMsg: string }): Promise<unknown>;
};

export async function resetApp(appId: string, clearData: boolean, app: AppDriver = driver): Promise<void> {
  if (clearData) {
    await app.execute('mobile: clearApp', { appId });
    await app.execute('mobile: changePermissions', { permissions: 'all', appPackage: appId, action: 'grant' });
  } else {
    await app.terminateApp(appId);
  }
  await app.activateApp(appId);
  await app.waitUntil(async () => (await app.queryAppState(appId)) === RUNNING_IN_FOREGROUND, {
    timeout: 15_000,
    timeoutMsg: `${appId} did not reach the foreground after activateApp`,
  });
}
