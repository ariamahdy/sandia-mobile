import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type DemoApp = { tag: string; file: string; url: string; sha256: string };
type DemoAppModule = { demoApp: DemoApp; sha256File: (path: string) => Promise<string> };

const load = async () => (await import(pathToFileURL(resolve('scripts/lib/demo-app.mjs')).href)) as DemoAppModule;

describe('demo app pin', () => {
  it('pins one release asset by tag, HTTPS URL and SHA-256', async () => {
    const { demoApp } = await load();
    assert.match(demoApp.tag, /^v\d+\.\d+\.\d+$/);
    assert.match(demoApp.file, /\.apk$/);
    assert.equal(
      demoApp.url,
      `https://github.com/webdriverio/native-demo-app/releases/download/${demoApp.tag}/${demoApp.file}`,
    );
    assert.match(demoApp.sha256, /^[0-9a-f]{64}$/);
  });

  it('sha256File hashes the file content', async () => {
    const { sha256File } = await load();
    const dir = mkdtempSync(join(tmpdir(), 'sandia-hash-'));
    try {
      const file = join(dir, 'a b.bin');
      writeFileSync(file, 'abc');
      assert.equal(await sha256File(file), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
