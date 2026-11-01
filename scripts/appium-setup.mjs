import { execFileSync } from 'node:child_process';
import { driverPins, planDriverActions } from './lib/appium-drivers.mjs';

const appium = (...args) =>
  execFileSync(process.execPath, ['node_modules/appium/index.js', 'driver', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

const installed = JSON.parse(appium('list', '--installed', '--json'));

for (const { kind, name, version } of planDriverActions(installed, driverPins, process.platform)) {
  if (kind === 'reinstall') appium('uninstall', name);
  if (kind === 'install' || kind === 'reinstall') appium('install', `${name}@${version}`);
  console.log(`appium driver ${name}@${version}: ${kind}`);
}
