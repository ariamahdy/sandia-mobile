import { step } from '@wdio/allure-reporter';
import { swipePage } from '@pages/demo';

describe('Swipe', () => {
  it('E2E-SWIPE-001 a horizontal swipe moves the carousel to the next card', async () => {
    await step('Open the swipe screen', () => swipePage.open());
    await step('Verify the first card', () => swipePage.verifyCardShown('FULLY OPEN SOURCE'));
    await step('Swipe the carousel left', () => swipePage.swipeCarouselLeft());
    await step('Verify the second card', () => swipePage.verifyCardShown('GREAT COMMUNITY'));
  });

  it('E2E-SWIPE-002 a vertical swipe reveals the hidden logo', async () => {
    await step('Open the swipe screen', () => swipePage.open());
    await step('Scroll down to the hidden logo', () => swipePage.scrollToHiddenLogo());
    await step('Verify the hidden logo', () => swipePage.verifyHiddenLogoShown());
  });
});
