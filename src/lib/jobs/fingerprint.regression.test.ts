import { expect, it } from 'vitest';
import { fingerprint } from './dedupe';
it('preserves language punctuation when fingerprinting jobs', () => {
  const key = (title: string) =>
    fingerprint({ title, company: 'Acme', location: 'Remote' });
  expect(key('C++ Developer')).not.toBe(key('C# Developer'));
  expect(key('C++ Developer')).not.toBe(key('C Developer'));
  expect(key('F# Developer')).not.toBe(key('F Developer'));
  expect(key('.NET Developer')).not.toBe(key('NET Developer'));
  expect(key(' C++ Developer ')).toBe(key('c++ developer'));
});
