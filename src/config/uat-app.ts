import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { UAT_APP_PATTERN } from './env';

const APP_KEYS = ['APP_PATH', 'APP_PACKAGE', 'APP_ACTIVITY', 'BUNDLE_ID'];

export function uatSource(source: NodeJS.ProcessEnv, root: string): NodeJS.ProcessEnv {
  if (source.AUT?.trim() !== 'uat') return source;

  const app = source.UAT_APP?.trim() ?? '';
  if (app === '') throw new Error('UAT_APP is missing in private/.env');
  if (!UAT_APP_PATTERN.test(app)) {
    throw new Error('UAT_APP must be a lowercase name like app-a, got an invalid value');
  }

  const file = join(root, 'private', `.env.${app}`);
  if (!existsSync(file)) throw new Error(`UAT_APP=${app} needs private/.env.${app}`);

  const sharedFile = join(root, 'private', '.env');
  const leftover = existsSync(sharedFile)
    ? Object.entries(parseEnv(readFileSync(sharedFile, 'utf8'))).find(
        ([key, value]) => APP_KEYS.includes(key) && (value ?? '').trim() !== '',
      )?.[0]
    : undefined;
  if (leftover !== undefined) throw new Error(`${leftover} is set in private/.env; move it to private/.env.${app}`);

  const appValues = parseEnv(readFileSync(file, 'utf8'));
  for (const key of Object.keys(appValues)) {
    if (!APP_KEYS.includes(key)) {
      throw new Error(`private/.env.${app} may only set ${APP_KEYS.join(', ')}; remove ${key}`);
    }
  }
  const shared = Object.fromEntries(Object.entries(source).filter(([key]) => !APP_KEYS.includes(key)));
  return { ...shared, ...appValues };
}
