import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { demoApp, sha256File } from './lib/demo-app.mjs';

const target = join('apps', demoApp.file);

if (existsSync(target) && (await sha256File(target)) === demoApp.sha256) {
  console.log(`fetch:demo-app: ${target} present, checksum ok`);
  process.exit(0);
}

mkdirSync('apps', { recursive: true });
const partial = `${target}.part`;
try {
  const response = await fetch(demoApp.url);
  if (!response.ok || response.body === null) throw new Error(`HTTP ${String(response.status)}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
} catch (error) {
  rmSync(partial, { force: true });
  const reason = error instanceof Error ? (error.cause instanceof Error ? `${error.message}: ${error.cause.message}` : error.message) : String(error);
  console.error(`fetch:demo-app: download of ${demoApp.url} failed (${reason}). Check the network or proxy and run it again.`);
  process.exit(1);
}

const actual = await sha256File(partial);
if (actual !== demoApp.sha256) {
  rmSync(partial, { force: true });
  console.error(`fetch:demo-app: checksum mismatch for ${demoApp.file}: expected ${demoApp.sha256}, got ${actual}`);
  process.exit(1);
}
renameSync(partial, target);
console.log(`fetch:demo-app: ${target} downloaded (${demoApp.tag}), checksum ok`);
