import { strict as assert } from 'node:assert';
import { selectorFor, type SelectorMap } from '@pages/selector-map';

describe('selectorFor', () => {
  const map: SelectorMap = { android: '~login-android', ios: '~login-ios' };

  it('returns the entry for the platform', () => {
    assert.equal(selectorFor(map, 'android'), '~login-android');
    assert.equal(selectorFor(map, 'ios'), '~login-ios');
  });

  it('rejects a map without an entry for every platform at compile time', () => {
    const missingIosIsRejected: { android: string } extends SelectorMap ? false : true = true;
    assert.equal(missingIosIsRejected, true);
  });
});
