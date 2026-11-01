import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectShareable, maskPageSource } from './lib/mask-page-source.mjs';

const source = 'test-results';
const target = 'shared-errors';
const files = existsSync(source) ? collectShareable(readdirSync(source)) : [];

if (files.length === 0) {
  console.log(`error:share: no page sources in ${source}/; run the failing test first`);
  process.exit(0);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target);
for (const file of files) {
  writeFileSync(join(target, file), maskPageSource(readFileSync(join(source, file), 'utf8')));
}
console.log(`error:share: ${String(files.length)} masked page source(s) in ${target}/ (screenshots and logs are not copied):`);
for (const file of files) console.log(`  ${file}`);
