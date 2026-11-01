import { strict as assert } from 'node:assert';
import { buildUser } from '@data/demo';

describe('buildUser', () => {
  it('builds a different email and password on every call', () => {
    const [a, b] = [buildUser(), buildUser()];
    assert.notEqual(a.email, b.email);
    assert.notEqual(a.password, b.password);
  });

  it('builds a syntactically valid email on a reserved test domain', () => {
    assert.match(buildUser().email, /^[a-z0-9-]+@example\.test$/);
  });

  it('builds a password of at least 12 characters', () => {
    assert.ok(buildUser().password.length >= 12);
  });

  it('lets overrides win', () => {
    assert.deepEqual(buildUser({ email: 'fixed@example.test', password: 'override-password' }), {
      email: 'fixed@example.test',
      password: 'override-password',
    });
  });
});
