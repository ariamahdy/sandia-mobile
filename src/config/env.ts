import { existsSync, statSync } from 'node:fs';
import { z } from 'zod';

export type Platform = 'android' | 'ios';
export type Aut = 'demo' | 'uat';
export type Credentials = { username: string; password: string };

export type Env = {
  aut: Aut;
  appPath: string;
  deviceName: string;
  platformVersion: string;
  appiumHost: string;
  appiumPort: number;
  noReset: boolean;
  appId: string;
  appActivity?: string;
  udid?: string;
  auth?: Credentials;
};

export class EnvError extends Error {
  readonly issues: string[];

  constructor(platform: Platform, issues: string[]) {
    super(`Invalid environment for ${platform}:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
    this.name = 'EnvError';
    this.issues = issues;
  }
}

const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const missingOr =
  (message: string) =>
  (issue: { input?: unknown }): string =>
    issue.input === undefined ? 'missing' : message;

const text = () => z.preprocess(blankToUndefined, z.string({ error: missingOr('must be text') }));

const oneOf = <const T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.preprocess(blankToUndefined, z.enum(values, { error: missingOr(message) }));

const isFile = (path: string) => existsSync(path) && statSync(path).isFile();

const commonSchema = z.object({
  AUT: oneOf(['demo', 'uat'], 'must be demo or uat'),
  APP_PATH: text().refine(isFile, { error: (issue) => `file not found: ${String(issue.input)}` }),
  DEVICE_NAME: text(),
  PLATFORM_VERSION: text(),
  APPIUM_HOST: text(),
  APPIUM_PORT: text()
    .refine((value) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535, {
      error: 'must be a port number from 1 to 65535',
    })
    .transform(Number),
  UDID: z.preprocess(blankToUndefined, z.string().optional()),
  NO_RESET: oneOf(['true', 'false'], 'must be true or false').transform((value) => value === 'true'),
});

const androidSchema = z.object({ APP_PACKAGE: text(), APP_ACTIVITY: text() });
const iosSchema = z.object({ BUNDLE_ID: text() });
const authSchema = z.object({ AUTH_USERNAME: text(), AUTH_PASSWORD: text() });

const issuesOf = (result: { success: boolean; error?: z.ZodError }): string[] =>
  result.error?.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) ?? [];

export function loadAuth(source: NodeJS.ProcessEnv = process.env): Credentials {
  const auth = authSchema.safeParse(source);
  if (!auth.success) {
    throw new Error(`Invalid auth environment:\n${issuesOf(auth).map((issue) => `- ${issue}`).join('\n')}`);
  }
  return { username: auth.data.AUTH_USERNAME, password: auth.data.AUTH_PASSWORD };
}

export function loadEnv(platform: Platform, source: NodeJS.ProcessEnv = process.env): Env {
  const common = commonSchema.safeParse(source);
  const android = androidSchema.safeParse(source);
  const ios = iosSchema.safeParse(source);
  const auth = source.AUT?.trim() === 'uat' ? authSchema.safeParse(source) : undefined;
  const device = platform === 'android' ? android : ios;

  const issues = [...issuesOf(common), ...issuesOf(device), ...(auth ? issuesOf(auth) : [])];
  if (!common.success || !device.success || (auth && !auth.success)) {
    throw new EnvError(platform, issues);
  }

  const base = {
    aut: common.data.AUT,
    appPath: common.data.APP_PATH,
    deviceName: common.data.DEVICE_NAME,
    platformVersion: common.data.PLATFORM_VERSION,
    appiumHost: common.data.APPIUM_HOST,
    appiumPort: common.data.APPIUM_PORT,
    noReset: common.data.NO_RESET,
    ...(common.data.UDID === undefined ? {} : { udid: common.data.UDID }),
    ...(auth?.success ? { auth: { username: auth.data.AUTH_USERNAME, password: auth.data.AUTH_PASSWORD } } : {}),
  };

  if (platform === 'android' && android.success) {
    return { ...base, appId: android.data.APP_PACKAGE, appActivity: android.data.APP_ACTIVITY };
  }
  if (platform === 'ios' && ios.success) {
    return { ...base, appId: ios.data.BUNDLE_ID };
  }
  throw new EnvError(platform, issues);
}
