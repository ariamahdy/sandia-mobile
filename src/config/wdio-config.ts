import { buildCapabilities } from './capabilities';
import type { Aut, Env, Platform } from './env';

export const DEMO_SPECS = './tests/e2e/demo/**/*.spec.ts';
const UAT_SPECS = './private/tests/e2e/**/*.spec.ts';

export function specsFor(aut: Aut, privateExists: boolean): string[] {
  if (aut === 'demo') return [DEMO_SPECS];
  if (!privateExists) {
    throw new Error('AUT=uat needs the private/ repository. Clone it into private/, or set AUT=demo.');
  }
  return [UAT_SPECS];
}

export type WdioConfig = WebdriverIO.Config & { capabilities: WebdriverIO.Capabilities[] };

export function buildWdioConfig(platform: Platform, env: Env, privateExists: boolean): WdioConfig {
  return {
    runner: 'local',
    specs: specsFor(env.aut, privateExists),
    suites: { demo: [DEMO_SPECS] },
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
