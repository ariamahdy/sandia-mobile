import { step } from '@wdio/allure-reporter';
import { buildUser } from '@data/demo';
import { loginPage } from '@pages/demo';

describe('Login', () => {
  it('E2E-LOGIN-001 valid credentials show the success alert', async () => {
    const user = buildUser();
    await step('Open the login screen', () => loginPage.open());
    await step('Enter a valid email', () => loginPage.enterEmail(user.email));
    await step('Enter a valid password', () => loginPage.enterPassword(user.password));
    await step('Submit the form', () => loginPage.submit());
    await step('Verify the success alert', () => loginPage.verifySuccessAlert());
    await step('Dismiss the alert', () => loginPage.dismissAlert());
  });

  it('E2E-LOGIN-002 an invalid email and a short password show validation messages', async () => {
    await step('Open the login screen', () => loginPage.open());
    await step('Enter an invalid email', () => loginPage.enterEmail('not-an-email'));
    await step('Enter a short password', () => loginPage.enterPassword('short'));
    await step('Submit the form', () => loginPage.submit());
    await step('Verify the email message', () => loginPage.verifyEmailError());
    await step('Verify the password message', () => loginPage.verifyPasswordError());
  });
});
