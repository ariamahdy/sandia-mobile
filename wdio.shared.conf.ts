import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildWdioConfig, loadEnv, type Platform, type WdioConfig } from '@config';
import { resetApp, saveFailureArtifacts } from '@hooks';

export function sharedConfig(platform: Platform): WdioConfig {
  const env = loadEnv(platform);
  return {
    ...buildWdioConfig(platform, env, existsSync(join(__dirname, 'private'))),
    beforeTest: () => resetApp(env.appId),
    afterTest: async (test: { title: string; parent?: string }, _context, { passed }) => {
      if (!passed) await saveFailureArtifacts([test.parent, test.title].filter(Boolean).join(' '));
    },
  };
}
