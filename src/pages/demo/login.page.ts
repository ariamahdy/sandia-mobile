import { driver, expect } from '@wdio/globals';
import { BasePage } from '@pages/base.page';
import type { SelectorMap } from '@pages/selector-map';

const SUCCESS_ALERT = 'Success\nYou are logged in!';

const byText = (text: string): SelectorMap => ({
  android: `android=new UiSelector().text("${text}")`,
  ios: `-ios predicate string:label == "${text}"`,
});

const selectors = {
  screen: { android: '~Login-screen', ios: '~Login-screen' },
  email: { android: '~input-email', ios: '~input-email' },
  password: { android: '~input-password', ios: '~input-password' },
  submit: { android: '~button-LOGIN', ios: '~button-LOGIN' },
  emailError: byText('Please enter a valid email address'),
  passwordError: byText('Please enter at least 8 characters'),
} satisfies Record<string, SelectorMap>;

class LoginPage extends BasePage {
  async open(): Promise<void> {
    await this.openTab('Login', selectors.screen);
  }

  async enterEmail(email: string): Promise<void> {
    await this.el(selectors.email).setValue(email);
  }

  async enterPassword(password: string): Promise<void> {
    await this.el(selectors.password).setValue(password);
  }

  async submit(): Promise<void> {
    await this.el(selectors.submit).click();
  }

  async dismissAlert(): Promise<void> {
    await driver.dismissDialog();
  }

  async verifySuccessAlert(): Promise<void> {
    await driver.waitUntil(async () => (await driver.getAlertText().catch(() => '')) === SUCCESS_ALERT, {
      timeoutMsg: `alert "${SUCCESS_ALERT}" was not shown`,
    });
  }

  async verifyEmailError(): Promise<void> {
    await expect(this.el(selectors.emailError)).toBeDisplayed();
  }

  async verifyPasswordError(): Promise<void> {
    await expect(this.el(selectors.passwordError)).toBeDisplayed();
  }
}

export const loginPage = new LoginPage();
