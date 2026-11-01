const MAX_LENGTH = 100;

export function safeFileName(title: string): string {
  const safe = title
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH);
  return safe === '' ? 'test' : safe;
}
