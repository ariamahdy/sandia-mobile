import { step } from '@wdio/allure-reporter';
import { formsPage } from '@pages/demo';

describe('Forms', () => {
  it('E2E-FORM-001 typed text is echoed and the switch toggles', async () => {
    await step('Open the forms screen', () => formsPage.open());
    await step('Type into the input field', () => formsPage.typeText('hello mobile'));
    await step('Verify the echoed text', () => formsPage.verifyTypedText('hello mobile'));
    await step('Verify the switch is off', () => formsPage.verifySwitchHint('Click to turn the switch ON'));
    await step('Toggle the switch', () => formsPage.toggleSwitch());
    await step('Verify the switch is on', () => formsPage.verifySwitchHint('Click to turn the switch OFF'));
  });
});
