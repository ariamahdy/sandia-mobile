import { $, driver } from '@wdio/globals';
import type { ChainablePromiseElement } from 'webdriverio';
import { selectorFor, type SelectorMap } from './selector-map';

export type Tab = 'Home' | 'Webview' | 'Login' | 'Forms' | 'Swipe' | 'Drag';

export abstract class BasePage {
  protected el(map: SelectorMap): ChainablePromiseElement {
    return $(selectorFor(map, driver.isAndroid ? 'android' : 'ios'));
  }

  protected async openTab(tab: Tab, screen: SelectorMap): Promise<void> {
    await this.el({ android: `~${tab}`, ios: `~${tab}` }).click();
    await this.el(screen).waitForDisplayed({ timeoutMsg: `${tab} screen did not open` });
  }
}
