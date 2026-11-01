import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

const tag = 'v2.2.0';
const file = `android.wdio.native.app.${tag}.apk`;

export const demoApp = {
  tag,
  file,
  url: `https://github.com/webdriverio/native-demo-app/releases/download/${tag}/${file}`,
  sha256: 'fe1d605ce099c73d93f33e5cbcb0df0bea437ce57aaaaf156b3b0fa1ca54931d',
};

export async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
