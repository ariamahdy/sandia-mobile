import { uniqueId } from '@utils';

export type DemoUser = { email: string; password: string };

export const buildUser = (overrides: Partial<DemoUser> = {}): DemoUser => ({
  email: `${uniqueId('user')}@example.test`,
  password: uniqueId('pass'),
  ...overrides,
});
