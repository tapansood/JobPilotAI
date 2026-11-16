import { expect, it } from 'vitest';
import {
  parseConnections,
  normalizeCompany,
  contactData,
  contactSchema,
  MAX_CSV_BYTES,
  linkedinUrl,
} from './index';
const header =
  'First Name,Last Name,URL,Email Address,Company,Position,Connected On';
it('parses the official LinkedIn export with Notes preamble, quoted commas, BOM and blank email', () => {
  const csv = `\uFEFFNotes:\r\nWhen exporting your connection data, you may notice that some email addresses are missing.\r\n\r\n${header}\r\nAlex,Morgan,https://www.linkedin.com/in/alex-morgan,,"Northstar Cloud, Inc.","Engineer, Platform",06 Nov 2025\r\n`;
  const [contact] = parseConnections(csv);
  expect(contact).toMatchObject({
    firstName: 'Alex',
    lastName: 'Morgan',
    company: 'Northstar Cloud, Inc.',
    email: null,
    position: 'Engineer, Platform',
    linkedinUrl: 'https://www.linkedin.com/in/alex-morgan',
  });
  expect(contact.connectedOn?.toISOString()).toBe('2025-11-06T00:00:00.000Z');
  expect(contact.identityKey).toBe(
    contactData(
      contactSchema.parse({
        firstName: 'alex',
        lastName: 'MORGAN',
        company: 'northstar cloud LLC',
        position: '',
      }),
    ).identityKey,
  );
});
it('handles an empty export and blank optional fields', () => {
  expect(parseConnections(header)).toEqual([]);
  expect(parseConnections(`${header}\nAlex,,,,,,`)[0]).toMatchObject({
    lastName: '',
    company: '',
    email: null,
    connectedOn: null,
    linkedinUrl: null,
  });
});
it('rejects malformed, oversized, invalid-date and unsafe-URL exports', () => {
  for (const csv of [
    '',
    'First Name,Last Name\nAlex,Morgan',
    'x'.repeat(MAX_CSV_BYTES + 1),
    `${header}\nAlex,Morgan,,,,,not-a-date`,
    `${header}\nAlex,Morgan,javascript:alert(1),,,,`,
    `${header}\nAlex,Morgan,,invalid-email,,,`,
    `${header}\n"unterminated`,
  ])
    expect(() => parseConnections(csv)).toThrow();
  expect(() =>
    parseConnections(`${header}\n${'Alex,,,,,,\n'.repeat(5001)}`),
  ).toThrow('5,000');
});
it('normalizes case, punctuation and company suffixes without matching unrelated names', () => {
  for (const name of [
    'NORTHSTAR CLOUD Inc.',
    'Northstar Cloud, LLC',
    'Northstar Cloud Corp.',
    'Northstar Cloud Corporation',
    'Northstar Cloud L.L.C.',
    'Northstar Cloud Inc LLC',
  ])
    expect(normalizeCompany(name)).toBe('northstar cloud');
  expect(normalizeCompany('Northstar Cloud Services')).not.toBe(
    normalizeCompany('Northstar Cloud'),
  );
  expect(normalizeCompany('')).toBe('');
});
it('accepts only LinkedIn HTTPS profile links and removes tracking', () => {
  expect(linkedinUrl('https://www.linkedin.com/in/alex/?trk=export#x')).toBe(
    'https://www.linkedin.com/in/alex',
  );
  for (const url of [
    'http://linkedin.com/in/alex',
    'https://linkedin.com.evil.test/in/alex',
    'https://linkedin.com/jobs/alex',
    'javascript:alert(1)',
  ])
    expect(() => linkedinUrl(url)).toThrow();
});
