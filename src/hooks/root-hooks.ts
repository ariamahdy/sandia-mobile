import { driver } from '@wdio/globals';
import { loadEnv, uatSource } from '@config';
import { rootHooks } from './lifecycle';

const currentAppId = () => loadEnv(driver.isAndroid ? 'android' : 'ios', uatSource(process.env, process.cwd())).appId;

export const mochaHooks = rootHooks(currentAppId);
