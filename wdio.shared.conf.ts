import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildWdioConfig, loadEnv, type Platform, type WdioConfig } from '@config';

export function sharedConfig(platform: Platform): WdioConfig {
  return buildWdioConfig(platform, loadEnv(platform), existsSync(join(__dirname, 'private')));
}
