import { buildCapabilities } from './capabilities';
import type { Aut, Env, Platform } from './env';

export const DEMO_SPECS = './tests/e2e/demo/**/*.spec.ts';

export type Exists = (path: string) => boolean;

export function specsFor(aut: Aut, exists: Exists, uatApp?: string): string[] {
  if (aut === 'demo') return [DEMO_SPECS];
  if (!exists('private')) {
    throw new Error('AUT=uat needs the private/ repository. Clone it into private/, or set AUT=demo.');
  }
  if (uatApp === undefined) throw new Error('UAT_APP is missing in private/.env');
  const folder = `private/tests/e2e/${uatApp}`;
  if (!exists(folder)) throw new Error(`UAT_APP=${uatApp} has no specs: create ${folder}/`);
  return [`./${folder}/**/*.spec.ts`];
}

export type WdioConfig = WebdriverIO.Config & { capabilities: WebdriverIO.Capabilities[] };

export function buildWdioConfig(platform: Platform, env: Env, exists: Exists): WdioConfig {
  const specs = specsFor(env.aut, exists, env.uatApp);
  return {
    runner: 'local',
    specs,
    suites: env.aut === 'uat' ? { demo: [DEMO_SPECS], uat: specs } : { demo: [DEMO_SPECS] },
    maxInstances: 1,
    capabilities: [buildCapabilities(platform, env)],
    hostname: env.appiumHost,
    port: env.appiumPort,
    path: '/',
    logLevel: 'info',
    injectGlobals: false,
    framework: 'mocha',
    mochaOpts: { ui: 'bdd', timeout: 120_000 },
    reporters: ['spec', ['allure', { outputDir: 'allure-results' }]],
    services: [['appium', { args: { address: env.appiumHost, port: env.appiumPort }, logPath: 'test-results' }]],
    waitforTimeout: 15_000,
    connectionRetryTimeout: 120_000,
    connectionRetryCount: 1,
  };
}
