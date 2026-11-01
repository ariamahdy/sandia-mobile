import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { evaluateChecks } from './lib/doctor-core.mjs';

const readEnv = (path) => (existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {});
const rootEnv = readEnv('.env');
const isUat = (process.env.AUT ?? rootEnv.AUT) === 'uat';
const fileEnv = isUat ? { ...rootEnv, ...readEnv('private/.env') } : rootEnv;
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

const checks = evaluateChecks({
  nodeVersion: process.version,
  nvmrc: readFileSync('.nvmrc', 'utf8'),
  driverPin: packageJson.devDependencies['appium-uiautomator2-driver'],
  env: { ...fileEnv, ...process.env },
  fileExists: (path) => existsSync(path),
  run: (cmd, args) => {
    const result = spawnSync(cmd, args, { encoding: 'utf8' });
    return { status: result.error ? -2 : (result.status ?? -1), stdout: result.stdout ?? '' };
  },
});

const width = Math.max(...checks.map((c) => c.name.length));
for (const check of checks) {
  const line = `${check.ok ? 'ok  ' : 'FAIL'}  ${check.name.padEnd(width)}`;
  console.log(check.hint === undefined ? line.trimEnd() : `${line}  ${check.hint}`);
}

const failed = checks.filter((c) => !c.ok).length;
if (failed > 0) {
  console.error(`doctor: ${String(failed)} of ${String(checks.length)} checks failed`);
  process.exit(1);
}
console.log(`doctor: all ${String(checks.length)} checks passed`);
