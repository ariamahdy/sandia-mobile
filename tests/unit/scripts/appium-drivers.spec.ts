import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type Pin = { name: string; version: string; platforms: string[] };
type Action = { kind: 'install' | 'reinstall' | 'keep' | 'skip'; name: string; version: string };
type DriversModule = {
  driverPins: Pin[];
  planDriverActions: (installed: Record<string, { version: string }>, pins: Pin[], platform: string) => Action[];
};

const load = async () =>
  (await import(pathToFileURL(resolve('scripts/lib/appium-drivers.mjs')).href)) as DriversModule;

const pins: Pin[] = [
  { name: 'uiautomator2', version: '1.0.0', platforms: ['darwin', 'linux', 'win32'] },
  { name: 'xcuitest', version: '2.0.0', platforms: ['darwin'] },
];

describe('planDriverActions', () => {
  it('installs pinned drivers that are absent', async () => {
    const { planDriverActions } = await load();
    assert.deepEqual(planDriverActions({}, pins, 'darwin'), [
      { kind: 'install', name: 'uiautomator2', version: '1.0.0' },
      { kind: 'install', name: 'xcuitest', version: '2.0.0' },
    ]);
  });

  it('keeps a driver at the pinned version and reinstalls one at another version', async () => {
    const { planDriverActions } = await load();
    const installed = { uiautomator2: { version: '1.0.0' }, xcuitest: { version: '1.9.0' } };
    assert.deepEqual(planDriverActions(installed, pins, 'darwin'), [
      { kind: 'keep', name: 'uiautomator2', version: '1.0.0' },
      { kind: 'reinstall', name: 'xcuitest', version: '2.0.0' },
    ]);
  });

  it('skips drivers not supported on the host platform', async () => {
    const { planDriverActions } = await load();
    assert.deepEqual(planDriverActions({}, pins, 'win32'), [
      { kind: 'install', name: 'uiautomator2', version: '1.0.0' },
      { kind: 'skip', name: 'xcuitest', version: '2.0.0' },
    ]);
  });

  it('pins exact versions only', async () => {
    const { driverPins } = await load();
    assert.ok(driverPins.length > 0);
    for (const pin of driverPins) {
      assert.match(pin.version, /^\d+\.\d+\.\d+$/, `${pin.name} is not an exact version`);
    }
  });
});
