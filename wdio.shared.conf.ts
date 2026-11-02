import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildWdioConfig, loadEnv, uatSource, type Platform, type WdioConfig } from '@config';
import { resetApp, saveFailureArtifacts } from '@hooks';

export function sharedConfig(platform: Platform): WdioConfig {
  const env = loadEnv(platform, uatSource(process.env, __dirname));
  return {
    ...buildWdioConfig(platform, env, (path) => existsSync(join(__dirname, path))),
    beforeTest: () => resetApp(env.appId, platform === 'android' && !env.noReset),
    afterTest: async (test: { title: string; parent?: string }, _context, { passed }) => {
      if (!passed) await saveFailureArtifacts([test.parent, test.title].filter(Boolean).join(' '));
    },
  };
}
