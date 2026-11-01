import { expect } from '@wdio/globals';
import { BasePage } from '@pages/base.page';
import type { SelectorMap } from '@pages/selector-map';

const selectors = {
  screen: { android: '~Forms-screen', ios: '~Forms-screen' },
  input: { android: '~text-input', ios: '~text-input' },
  typedResult: { android: '~input-text-result', ios: '~input-text-result' },
  switch: { android: '~switch', ios: '~switch' },
  switchText: { android: '~switch-text', ios: '~switch-text' },
} satisfies Record<string, SelectorMap>;

class FormsPage extends BasePage {
  async open(): Promise<void> {
    await this.openTab('Forms', selectors.screen);
  }

  async typeText(text: string): Promise<void> {
    await this.el(selectors.input).setValue(text);
  }

  async toggleSwitch(): Promise<void> {
    await this.el(selectors.switch).click();
  }

  async verifyTypedText(text: string): Promise<void> {
    await expect(this.el(selectors.typedResult)).toHaveText(text);
  }

  async verifySwitchHint(hint: string): Promise<void> {
    await expect(this.el(selectors.switchText)).toHaveText(hint);
  }
}

export const formsPage = new FormsPage();
