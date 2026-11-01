import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { driver } from '@wdio/globals';
import { safeFileName } from '@utils';

const RESULTS_DIR = 'test-results';

export async function saveFailureArtifacts(title: string): Promise<{ screenshot: string; pageSource: string }> {
  await mkdir(RESULTS_DIR, { recursive: true });
  const base = join(RESULTS_DIR, safeFileName(title));
  const screenshot = `${base}.png`;
  const pageSource = `${base}.xml`;
  await driver.saveScreenshot(screenshot);
  await writeFile(pageSource, await driver.getPageSource());
  return { screenshot, pageSource };
}
