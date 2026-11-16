import { expect, it } from 'vitest';
import { extractContact, profileContacts } from './heuristic';
import { extractResume } from './extract';
import { deterministicTailor } from '@/lib/tailor/content';
import { exportPdf } from '@/lib/tailor/export';
import { profile, job } from '@/lib/tailor/fixtures';
it('keeps standalone phone numbers after LinkedIn and website URLs separate', () => {
  for (const phone of [
    '5551234567',
    '+15551234567',
    '555-123-4567',
    '555.123.4567',
    '+1 (555) 123-4567',
  ]) {
    expect(
      profileContacts(`https://www.linkedin.com/in/alex-morgan\n${phone}`),
    ).toMatchObject({
      linkedinUrl: 'https://www.linkedin.com/in/alex-morgan',
      phone,
    });
    expect(
      profileContacts(`https://alex.example.com/portfolio\n${phone}`),
    ).toMatchObject({ website: 'https://alex.example.com/portfolio', phone });
  }
  expect(profileContacts('555.123.4567\nalex@example.com')).toMatchObject({
    phone: '555.123.4567',
    email: 'alex@example.com',
  });
});
it('does not join contact fragments into invalid URLs or emails', () => {
  expect(profileContacts('https://alex.example:\nabc.com').website).toBe(
    'https://alex.example:',
  );
  expect(extractContact('alex@exam\nple..com').email).toBeNull();
});
it('repairs PDF-wrapped website and email domains before extracting contacts', () => {
  expect(
    profileContacts('https://alex.exam\nple.com\nalex@exam\nple.com'),
  ).toMatchObject({
    website: 'https://alex.example.com',
    email: 'alex@example.com',
  });
  expect(extractContact('alex@exam\r\n  ple.com').email).toBe(
    'alex@example.com',
  );
  expect(profileContacts('www.alex.\nexample.com')).toMatchObject({
    website: 'https://www.alex.example.com',
  });
  expect(extractContact('Email: alex\n@example.com').email).toBe(
    'alex@example.com',
  );
  expect(extractContact('Email: alex.ex\nample@example.com').email).toBe(
    'alex.example@example.com',
  );
});
it('preserves adjacent contact fields and headings instead of joining them', () => {
  const result = profileContacts(
    'Alex Morgan\nalex@example.com\nhttps://alex.example.com\nSUMMARY\nSoftware engineer\nSKILLS\nReact',
  );
  expect(result).toMatchObject({
    email: 'alex@example.com',
    website: 'https://alex.example.com',
  });
  expect(
    profileContacts('https://alex.example.com\nalex@example.com'),
  ).toMatchObject({
    website: 'https://alex.example.com',
    email: 'alex@example.com',
  });
  expect(profileContacts('')).toMatchObject({ website: '', email: '' });
  expect(profileContacts('not an email\njavascript:alert(1)')).toMatchObject({
    website: '',
    email: '',
  });
});
it('recovers a website that wraps in an actual exported PDF contact header', async () => {
  const content = deterministicTailor(
    {
      ...profile,
      email: 'alex.morgan@example.com',
      phone: '+1 (415) 555-2671',
      linkedinUrl: 'https://www.linkedin.com/in/alex-morgan',
      website: 'https://alex.example.com',
      location: 'Seattle, WA',
    },
    job,
  );
  const { rawText } = await extractResume(
    await exportPdf(content),
    'resume.pdf',
  );
  expect(rawText).not.toContain('https://alex.example.com');
  expect(profileContacts(rawText).website).toBe('https://alex.example.com');
});
