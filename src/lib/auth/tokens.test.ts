import { describe, expect, it } from 'vitest';
import {
  hashToken,
  loginInput,
  randomOtp,
  randomToken,
  tokenMatches,
} from './tokens';
describe('tokens and identifiers', () => {
  it('hashes and compares tokens without storing plaintext', () => {
    const token = randomToken();
    expect(token).toHaveLength(64);
    expect(hashToken(token)).not.toBe(token);
    expect(tokenMatches(token, hashToken(token))).toBe(true);
    expect(tokenMatches('bad', hashToken(token))).toBe(false);
    expect(tokenMatches(token, '')).toBe(false);
  });
  it('generates six digit OTPs', () => {
    expect(randomOtp()).toMatch(/^\d{6}$/);
  });
  it('normalizes email and validates phones', () => {
    expect(
      loginInput.parse({ type: 'EMAIL', identifier: ' YOU@Example.com ' })
        .identifier,
    ).toBe('you@example.com');
    expect(
      loginInput.safeParse({ type: 'SMS', identifier: '+14155552671' }).success,
    ).toBe(true);
  });
  it('rejects empty and malformed input', () => {
    for (const identifier of ['', 'invalid'])
      expect(loginInput.safeParse({ type: 'EMAIL', identifier }).success).toBe(
        false,
      );
    expect(
      loginInput.safeParse({ type: 'SMS', identifier: '123' }).success,
    ).toBe(false);
  });
});
