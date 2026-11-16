import { expect, it } from 'vitest';
import { outreachDrafts } from './index';
import { profile, emptyProfile, job } from '@/lib/tailor/fixtures';
it('creates a contact referral note and factual email with no automatic sending', () => {
  const result = outreachDrafts(profile, job, {
    id: 'contact',
    firstName: 'Alex',
  });
  expect(result.map((draft) => draft.channel)).toEqual(['LINKEDIN', 'EMAIL']);
  expect(result.every((draft) => draft.contactId === 'contact')).toBe(true);
  expect(result[0].body.length).toBeLessThanOrEqual(300);
  expect(result[1].body).toContain('considering a referral');
  expect(result[1].body).toContain('TypeScript, Docker');
  expect(result[1].body).not.toContain('Python');
});
it('creates a cold recruiter email without contacts or profile facts', () => {
  const result = outreachDrafts(emptyProfile, job);
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ channel: 'EMAIL', contactId: null });
  expect(result[0].body).toContain('Hello Hiring Team');
  expect(result[0].body).not.toContain('profile includes');
});
it('caps long LinkedIn requests and strips email-subject line breaks', () => {
  const result = outreachDrafts(
    profile,
    { ...job, title: 'x\r\n'.repeat(200), company: 'Company'.repeat(100) },
    { id: 'contact', firstName: 'Alex'.repeat(100) },
  );
  expect(result[0].body.length).toBeLessThanOrEqual(300);
  expect(result[1].subject).not.toMatch(/[\r\n]/);
});
