import { driver, expect } from '@wdio/globals';
import { BasePage } from '@pages/base.page';
import type { SelectorMap } from '@pages/selector-map';

const CAROUSEL_SWIPE_PERCENT = 0.6;
const SCREEN_SWIPE_PERCENT = 0.9;
const MAX_SCROLLS = 5;

const selectors = {
  screen: { android: '~Swipe-screen', ios: '~Swipe-screen' },
  carousel: { android: 'android=new UiSelector().resourceId("Carousel")', ios: '~Carousel' },
  hiddenLogo: { android: '~WebdriverIO logo', ios: '~WebdriverIO logo' },
} satisfies Record<string, SelectorMap>;

const cardTitle = (title: string): SelectorMap => ({
  android: `android=new UiSelector().text("${title}")`,
  ios: `-ios predicate string:label == "${title}"`,
});

class SwipePage extends BasePage {
  async open(): Promise<void> {
    await this.openTab('Swipe', selectors.screen);
  }

  async swipeCarouselLeft(): Promise<void> {
    await driver.swipe({ direction: 'left', scrollableElement: this.el(selectors.carousel), percent: CAROUSEL_SWIPE_PERCENT });
  }

  async scrollToHiddenLogo(): Promise<void> {
    await this.el(selectors.hiddenLogo).scrollIntoView({
      direction: 'up',
      scrollableElement: this.el(selectors.screen),
      percent: SCREEN_SWIPE_PERCENT,
      maxScrolls: MAX_SCROLLS,
    });
  }

  async verifyCardShown(title: string): Promise<void> {
    await expect(this.el(cardTitle(title))).toBeDisplayed();
  }

  async verifyHiddenLogoShown(): Promise<void> {
    await expect(this.el(selectors.hiddenLogo)).toBeDisplayed();
  }
}

export const swipePage = new SwipePage();
