import type { Env, Platform } from './env';

export function buildCapabilities(platform: Platform, env: Env): WebdriverIO.Capabilities {
  const common = {
    'appium:deviceName': env.deviceName,
    'appium:platformVersion': env.platformVersion,
    'appium:app': env.appPath,
    'appium:noReset': env.noReset,
    ...(env.udid === undefined ? {} : { 'appium:udid': env.udid }),
  };

  if (platform === 'android') {
    return {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      ...common,
      'appium:appPackage': env.appId,
      ...(env.appActivity === undefined ? {} : { 'appium:appActivity': env.appActivity }),
    };
  }

  return {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    ...common,
    'appium:bundleId': env.appId,
  };
}
