import { $, driver } from '@wdio/globals';
import type { ChainablePromiseElement } from 'webdriverio';
import { selectorFor, type SelectorMap } from './selector-map';

export abstract class BasePage {
  protected el(map: SelectorMap): ChainablePromiseElement {
    return $(selectorFor(map, driver.isAndroid ? 'android' : 'ios'));
  }
}
