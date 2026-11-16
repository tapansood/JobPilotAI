import { describe, it, expect } from 'vitest';
import { profileContacts } from './heuristic';
describe('resume phone detection', () => {
  it('does not mistake experience dates or identifiers for phone numbers', () => {
    for (const value of [
      '2020 - 2025',
      '2020–2025',
      '2020.2025',
      '12345678',
      '1234567890123456',
      '',
    ])
      expect(profileContacts(value).phone).toBe('');
  });
  it('extracts a real phone after a date range and supports common international formatting', () => {
    expect(profileContacts('2020 - 2025\nPhone: +1 (415) 555-2671').phone).toBe(
      '+1 (415) 555-2671',
    );
    expect(profileContacts('Contact: 415-555-2671').phone).toBe('415-555-2671');
    expect(profileContacts('+44 20 7946 0958').phone).toBe('+44 20 7946 0958');
  });
});
