import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type MaskModule = {
  maskPageSource: (xml: string) => string;
  collectShareable: (files: string[]) => string[];
};

const load = async () => (await import(pathToFileURL(resolve('scripts/lib/mask-page-source.mjs')).href)) as MaskModule;
const cli = resolve('scripts/error-share.mjs');

const android = [
  '<?xml version="1.0" encoding="UTF-8"?><hierarchy rotation="0">',
  '<android.widget.ScrollView class="android.widget.ScrollView" content-desc="Login-screen" bounds="[0,128][1080,2153]">',
  '<android.widget.TextView class="android.widget.TextView" text="Login / Sign up Form" bounds="[1,1][2,2]"/>',
  '<android.widget.EditText class="android.widget.EditText" text="jane.doe@example.test" content-desc="input-email" resource-id="RNE__Input__text-input" hint="Email" bounds="[180,779][1000,899]"/>',
  '<androidx.recyclerview.widget.RecyclerView class="androidx.recyclerview.widget.RecyclerView" resource-id="contracts">',
  '<android.view.ViewGroup class="android.view.ViewGroup" content-desc="Contract 1234-5678">',
  '<android.widget.TextView class="android.widget.TextView" text="Jane Doe" resource-id="customer-name"/>',
  '</android.view.ViewGroup>',
  '</androidx.recyclerview.widget.RecyclerView>',
  '<android.widget.Button class="android.widget.Button" text="LOGIN" content-desc="button-LOGIN"/>',
  '</android.widget.ScrollView></hierarchy>',
].join('\n');

const ios = [
  '<XCUIElementTypeApplication type="XCUIElementTypeApplication" name="demo">',
  '<XCUIElementTypeTextField type="XCUIElementTypeTextField" name="input-email" value="jane.doe@example.test" label="" x="1" y="2"/>',
  '<XCUIElementTypeTable type="XCUIElementTypeTable" name="contracts">',
  '<XCUIElementTypeCell type="XCUIElementTypeCell" name="Jane Doe" label="Jane Doe" value="1234-5678"/>',
  '</XCUIElementTypeTable>',
  '<XCUIElementTypeStaticText type="XCUIElementTypeStaticText" name="Title" label="Login" value="Login"/>',
  '</XCUIElementTypeApplication>',
].join('\n');

describe('maskPageSource', () => {
  it('masks the typed value of an Android input and keeps its label, id, hint and bounds', async () => {
    const { maskPageSource } = await load();
    const out = maskPageSource(android);
    assert.ok(!out.includes('jane.doe@example.test'));
    assert.ok(out.includes('text="[masked]" content-desc="input-email" resource-id="RNE__Input__text-input" hint="Email" bounds="[180,779][1000,899]"'));
  });

  it('masks every text and description inside an Android list and keeps resource ids', async () => {
    const { maskPageSource } = await load();
    const out = maskPageSource(android);
    assert.ok(!out.includes('Jane Doe') && !out.includes('1234-5678'));
    assert.ok(out.includes('resource-id="customer-name"') && out.includes('resource-id="contracts"'));
  });

  it('keeps text outside inputs and lists, such as headings and buttons', async () => {
    const { maskPageSource } = await load();
    const out = maskPageSource(android);
    assert.ok(out.includes('text="Login / Sign up Form"'));
    assert.ok(out.includes('text="LOGIN" content-desc="button-LOGIN"'));
  });

  it('masks iOS input values and cell labels and keeps static text', async () => {
    const { maskPageSource } = await load();
    const out = maskPageSource(ios);
    assert.ok(!out.includes('jane.doe@example.test') && !out.includes('Jane Doe') && !out.includes('1234-5678'));
    assert.ok(out.includes('name="input-email"'));
    assert.ok(out.includes('label="Login" value="Login"'));
  });

  it('keeps the document well formed: the mask has no angle brackets', async () => {
    const { maskPageSource } = await load();
    assert.ok(!maskPageSource(android).includes('<masked>'));
  });
});

describe('collectShareable', () => {
  it('returns only page source files, never screenshots, logs or allure results', async () => {
    const { collectShareable } = await load();
    assert.deepEqual(collectShareable(['a test.xml', 'a test.png', 'wdio-appium.log', 'results.json', 'b.XML']), ['a test.xml', 'b.XML']);
  });
});

describe('error:share CLI', () => {
  it('writes masked copies of the page sources of the last run to shared-errors/', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sandia-share-'));
    try {
      mkdirSync(join(dir, 'test-results'));
      mkdirSync(join(dir, 'shared-errors'));
      writeFileSync(join(dir, 'shared-errors', 'stale.xml'), 'old');
      writeFileSync(join(dir, 'test-results', 'Login E2E-LOGIN-001.xml'), android);
      writeFileSync(join(dir, 'test-results', 'Login E2E-LOGIN-001.png'), 'png');
      writeFileSync(join(dir, 'test-results', 'wdio-appium.log'), 'log with jane.doe@example.test');
      const result = spawnSync(process.execPath, [cli], { cwd: dir, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(readdirSync(join(dir, 'shared-errors')), ['Login E2E-LOGIN-001.xml']);
      assert.ok(!readFileSync(join(dir, 'shared-errors', 'Login E2E-LOGIN-001.xml'), 'utf8').includes('jane.doe@example.test'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exits cleanly with a message when there is no test-results folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sandia-share-'));
    try {
      const result = spawnSync(process.execPath, [cli], { cwd: dir, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /no page sources/);
      assert.equal(existsSync(join(dir, 'shared-errors')), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
