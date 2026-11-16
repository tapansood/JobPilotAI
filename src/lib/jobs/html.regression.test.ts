import { expect, it } from 'vitest';
import { plain } from './sources/shared';
it('decodes entity-encoded Greenhouse markup before extracting plain text', () => {
  expect(plain('&lt;p&gt;Build React &amp;amp; TypeScript&lt;/p&gt;')).toBe(
    'Build React & TypeScript',
  );
  expect(plain('&#60;p&#62;Java&#60;/p&#62;')).toBe('Java');
  expect(
    plain('&lt;script&gt;alert(1)&lt;/script&gt;&lt;p&gt;Role&lt;/p&gt;'),
  ).not.toContain('<');
});
