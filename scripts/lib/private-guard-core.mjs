export const MIN_PASSWORD_LENGTH = 6;

const FORBIDDEN = [
  [/(^|\/)\.env(\..+)?$/, 'env', 'env files must not be tracked'],
  [/\.zip$/i, 'archive', 'archives must not be tracked'],
  [/\.(apk|ipa|aab)$/i, 'binary', 'app binaries must not be tracked'],
  [/(^|\/)(test-results|allure-results|allure-report|shared-errors)\//, 'output', 'run output must not be tracked'],
];

const MESSAGES = Object.fromEntries([
  ...FORBIDDEN.map(([, kind, message]) => [kind, message]),
  ['password', 'adds the AUTH_PASSWORD value'],
]);

export const formatPrivateViolation = ({ kind, where }) => `${where}: ${MESSAGES[kind]}`;

export function passwordFromEnv(text) {
  const raw = /^AUTH_PASSWORD=(.*)$/m.exec(text)?.[1] ?? '';
  return raw.trim().replace(/^(['"])(.*)\1$/, '$2');
}

export function findPrivateViolations({ trackedFiles, addedLines, password }) {
  const found = [];
  for (const file of trackedFiles) {
    if (/(^|\/)\.env\.example$/.test(file)) continue;
    const hit = FORBIDDEN.find(([pattern]) => pattern.test(file));
    if (hit) found.push({ kind: hit[1], where: file });
  }
  if (password.length >= MIN_PASSWORD_LENGTH) {
    const seen = new Set();
    for (const { commit, file, line } of addedLines) {
      const where = `${commit.slice(0, 7)} ${file}`;
      if (!seen.has(where) && line.includes(password)) {
        seen.add(where);
        found.push({ kind: 'password', where });
      }
    }
  }
  return found;
}
