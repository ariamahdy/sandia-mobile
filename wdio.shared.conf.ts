import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildWdioConfig, loadEnv, uatSource, type Platform, type WdioConfig } from '@config';
import { appLifecycle } from '@hooks';

export function sharedConfig(platform: Platform): WdioConfig {
  const env = loadEnv(platform, uatSource(process.env, __dirname));
  const base = buildWdioConfig(platform, env, (path) => existsSync(join(__dirname, path)));
  return {
    ...base,
    mochaOpts: { ...base.mochaOpts, require: [join(__dirname, 'src/hooks/root-hooks.ts')] },
    ...appLifecycle(env.appId, platform === 'android' && !env.noReset),
  };
}
