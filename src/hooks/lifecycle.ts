import { driver } from '@wdio/globals';
import { resetApp, type AppDriver } from './app-state';
import { saveFailureArtifacts } from './failure-artifacts';

export type HookTest = { title: string; parent?: string };
type HookResult = { passed: boolean };
type SaveArtifacts = (title: string) => Promise<unknown>;

export type AppLifecycle = {
  before: () => Promise<void>;
  beforeTest: () => Promise<void>;
  afterTest: (test: HookTest, context: unknown, result: HookResult) => Promise<void>;
  afterHook: (test: HookTest, context: unknown, result: HookResult) => Promise<void>;
};

export function appLifecycle(
  appId: string,
  clearData: boolean,
  app: AppDriver = driver,
  save: SaveArtifacts = saveFailureArtifacts,
): AppLifecycle {
  const saveOnFailure = async (test: HookTest, _context: unknown, { passed }: HookResult) => {
    if (!passed) await save([test.parent, test.title].filter(Boolean).join(' '));
  };
  return {
    before: () => resetApp(appId, clearData, app),
    beforeTest: () => resetApp(appId, false, app),
    afterTest: saveOnFailure,
    afterHook: saveOnFailure,
  };
}
