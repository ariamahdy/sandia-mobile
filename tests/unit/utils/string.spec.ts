import { strict as assert } from 'node:assert';
import { uniqueId } from '@utils';

describe('uniqueId', () => {
  it('is prefixed and lower-case', () => {
    assert.match(uniqueId('User'), /^user-[0-9a-f-]{36}$/);
  });

  it('differs on consecutive calls', () => {
    assert.notEqual(uniqueId('x'), uniqueId('x'));
  });
});
