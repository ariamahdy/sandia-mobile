import { strict as assert } from 'node:assert';
import { safeFileName } from '@utils';

describe('safeFileName', () => {
  it('replaces spaces, slashes, colons and other unsafe characters', () => {
    assert.equal(safeFileName('E2E-LOGIN-001 valid login: shows/alert?'), 'E2E-LOGIN-001-valid-login-shows-alert');
  });

  it('keeps letters, digits, dashes and underscores', () => {
    assert.equal(safeFileName('E2E_FORM-002'), 'E2E_FORM-002');
  });

  it('caps the length so Windows paths stay short', () => {
    assert.equal(safeFileName('a'.repeat(300)).length, 100);
  });

  it('falls back to a fixed name when nothing safe is left', () => {
    assert.equal(safeFileName(' :/ '), 'test');
  });
});
