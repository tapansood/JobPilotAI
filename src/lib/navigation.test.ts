import { expect, it } from 'vitest';
import { isWorkspaceLinkActive } from './navigation';
it('highlights only the current workspace section, including nested details', () => {
  expect(isWorkspaceLinkActive('/dashboard', '/dashboard')).toBe(true);
  expect(isWorkspaceLinkActive('/dashboard/jobs/123', '/dashboard/jobs')).toBe(
    true,
  );
  expect(isWorkspaceLinkActive('/dashboard/jobs', '/dashboard')).toBe(false);
  expect(
    isWorkspaceLinkActive('/dashboard/jobs-extra', '/dashboard/jobs'),
  ).toBe(false);
  expect(isWorkspaceLinkActive('', '/dashboard')).toBe(false);
});
