import type { Platform } from '@config';

export type SelectorMap = Record<Platform, string>;

export function selectorFor(map: SelectorMap, platform: Platform): string {
  return map[platform];
}
