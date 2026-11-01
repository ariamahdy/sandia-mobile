import { driver } from '@wdio/globals';

export async function resetApp(appId: string): Promise<void> {
  await driver.terminateApp(appId);
  await driver.activateApp(appId);
}
