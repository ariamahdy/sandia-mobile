export const DENYLIST_FILES = ['scripts/guard.denylist.txt', 'private/guard.denylist.txt'];

const ENV_FILE = /(^|\/)\.env($|\.)/;
const BINARY = /\.(apk|ipa|aab)$/i;
const OUTPUT = /(^|\/)(test-results|allure-results|allure-report|shared-errors)\//;
const USES = /(?:^\s*-?\s*|[{,]\s*)uses:\s*["']?([^"'\s,}#]+)/;

const MESSAGES = {
  private: () => 'private/ must never be tracked',
  env: () => 'env files other than .env.example must never be tracked',
  binary: () => 'app binaries must never be tracked',
  output: () => 'run output must never be tracked',
  denylist: (detail) => `matches denylist pattern /${detail}/`,
  unpushed: (detail) => `matches denylist pattern /${detail}/`,
  unpinned: (detail) => `action ${detail} is not pinned to a commit SHA`,
};

export const formatViolation = ({ kind, where, detail }) => `${where}: ${MESSAGES[kind](detail)}`;

const firstHit = (denylist, text) => denylist.find((pattern) => pattern.test(text));

export function findViolations({ trackedFiles, readFile, addedLines, denylist, workflows }) {
  const found = [];

  for (const file of trackedFiles) {
    if (file.startsWith('private/')) found.push({ kind: 'private', where: file });
    if (ENV_FILE.test(file) && !file.endsWith('.env.example')) found.push({ kind: 'env', where: file });
    if (BINARY.test(file)) found.push({ kind: 'binary', where: file });
    if (OUTPUT.test(file)) found.push({ kind: 'output', where: file });
  }

  for (const file of trackedFiles) {
    if (DENYLIST_FILES.includes(file)) continue;
    const text = readFile(file);
    if (text === null) continue;
    text.split('\n').forEach((line, index) => {
      const hit = firstHit(denylist, line);
      if (hit) found.push({ kind: 'denylist', where: `${file}:${String(index + 1)}`, detail: hit.source });
    });
  }

  const unpushed = new Map();
  for (const { commit, file, line } of addedLines) {
    const where = `${commit.slice(0, 7)} ${file}`;
    if (DENYLIST_FILES.includes(file) || unpushed.has(where)) continue;
    const hit = firstHit(denylist, line);
    if (hit) unpushed.set(where, { kind: 'unpushed', where, detail: hit.source });
  }
  found.push(...unpushed.values());

  for (const { file, text } of workflows) {
    text.split('\n').forEach((line, index) => {
      const ref = USES.exec(line)?.[1];
      if (ref === undefined || ref.startsWith('./') || ref.startsWith('docker://') || /@[0-9a-f]{40}$/.test(ref)) return;
      found.push({ kind: 'unpinned', where: `${file}:${String(index + 1)}`, detail: ref });
    });
  }

  return found;
}
