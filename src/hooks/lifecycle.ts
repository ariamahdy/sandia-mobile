import { driver } from '@wdio/globals';
import { resetApp, type AppDriver } from './app-state';
import { saveFailureArtifacts } from './failure-artifacts';

export type HookTest = { title: string; parent?: string };
type HookResult = { passed: boolean };
type SaveArtifacts = (title: string) => Promise<unknown>;

export type AppLifecycle = {
  before: () => Promise<void>;
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
    afterTest: saveOnFailure,
    afterHook: saveOnFailure,
  };
}

type HookContext = { currentTest?: { title: string; parent?: { title: string } } };

export function rootHooks(
  appId: () => string,
  app: AppDriver = driver,
  save: SaveArtifacts = saveFailureArtifacts,
): { beforeEach: (this: HookContext) => Promise<void> } {
  return {
    async beforeEach(this: HookContext): Promise<void> {
      try {
        await resetApp(appId(), false, app);
      } catch (error) {
        const title = [this.currentTest?.parent?.title, this.currentTest?.title, 'reset'].filter(Boolean).join(' ');
        const saveError = await save(title).then(
          () => undefined,
          (failure: unknown) => failure,
        );
        if (saveError === undefined) throw error;
        throw new AggregateError([error, saveError], 'The app reset failed and its failure artifacts could not be saved', {
          cause: error,
        });
      }
    },
  };
}
