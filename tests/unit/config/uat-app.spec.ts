import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { uatSource } from '@config';

describe('uatSource', () => {
  let root: string;
  const uat = { AUT: 'uat', UAT_APP: 'app-a', AUTH_USERNAME: 'tester', AUTH_PASSWORD: 'secret-1' };

  const writeApp = (app: string, content: string) => {
    writeFileSync(join(root, 'private', `.env.${app}`), content);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'uat app '));
    mkdirSync(join(root, 'private'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('demo returns the source unchanged and reads nothing', () => {
    const source = { AUT: 'demo', UAT_APP: 'app-b' };
    assert.equal(uatSource(source, root), source);
  });

  it('uat merges the app values into the shared source', () => {
    writeApp('app-a', 'APP_PATH=apps/a.apk\nAPP_PACKAGE=com.example.a\nAPP_ACTIVITY=.Main\n');
    assert.deepEqual(uatSource(uat, root), {
      ...uat,
      APP_PATH: 'apps/a.apk',
      APP_PACKAGE: 'com.example.a',
      APP_ACTIVITY: '.Main',
    });
  });

  it('rejects a UAT_APP that is not a plain name', () => {
    for (const app of ['../x', 'a/b', 'A', 'app-']) {
      assert.throws(() => uatSource({ ...uat, UAT_APP: app }, root), /UAT_APP must be a lowercase name like app-a/);
    }
  });

  it('names a missing UAT_APP', () => {
    for (const app of [undefined, '', '  ']) {
      assert.throws(() => uatSource({ ...uat, UAT_APP: app }, root), /UAT_APP is missing in private\/\.env/);
    }
  });

  it('rejects an app value left in the private/.env file, without printing it', () => {
    writeApp('app-a', 'APP_PACKAGE=com.example.a\n');
    writeFileSync(join(root, 'private', '.env'), 'UAT_APP=app-a\nAPP_ACTIVITY=.OldActivity\n');
    assert.throws(
      () => uatSource(uat, root),
      (error: unknown) =>
        error instanceof Error &&
        error.message === 'APP_ACTIVITY is set in private/.env; move it to private/.env.app-a' &&
        !error.message.includes('.OldActivity'),
    );
  });

  it('an empty app key in the private/.env file is not a leftover', () => {
    writeApp('app-a', 'APP_PACKAGE=com.example.a\n');
    writeFileSync(join(root, 'private', '.env'), 'UAT_APP=app-a\nAPP_PATH=\n');
    assert.equal(uatSource(uat, root).APP_PACKAGE, 'com.example.a');
  });

  it('names the missing app file', () => {
    assert.throws(() => uatSource({ ...uat, UAT_APP: 'app-b' }, root), /UAT_APP=app-b needs private\/\.env\.app-b/);
  });

  it('rejects a key that is not an app value, without printing it', () => {
    writeApp('app-a', 'APP_PATH=apps/a.apk\nAUTH_PASSWORD=leaked-value\n');
    assert.throws(
      () => uatSource(uat, root),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes('remove AUTH_PASSWORD') &&
        !error.message.includes('leaked-value'),
    );
  });

  it('takes app values only from the app file, never from private/.env or the root .env', () => {
    writeApp('app-a', 'APP_PATH=apps/a.apk\nAPP_PACKAGE=com.example.a\n');
    const source = { ...uat, APP_PACKAGE: 'com.example.demo', APP_ACTIVITY: '.DemoActivity', BUNDLE_ID: 'com.example.ios' };
    const result = uatSource(source, root);
    assert.equal(result.APP_PACKAGE, 'com.example.a');
    assert.equal('APP_ACTIVITY' in result, false);
    assert.equal('BUNDLE_ID' in result, false);
  });
});
