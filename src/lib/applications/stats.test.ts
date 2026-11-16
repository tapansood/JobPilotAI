import { expect, it } from 'vitest';
import { profileCompleteness, applicationStats } from './stats';
import { profile, emptyProfile } from '@/lib/tailor/fixtures';
it('measures filled profile fields without rewarding empty or missing profiles', () => {
  expect(profileCompleteness(null)).toBe(0);
  expect(profileCompleteness(emptyProfile)).toBe(0);
  expect(profileCompleteness({ ...profile, email: 'alex@example.com' })).toBe(
    100,
  );
  expect(profileCompleteness({ ...emptyProfile, yearsExperience: 0 })).toBe(10);
});
it('counts each status and due/overdue active applications on UTC days', () => {
  const result = applicationStats(
    [
      { status: 'APPLIED', nextFollowUpAt: new Date('2026-11-16T23:00Z') },
      { status: 'INTERVIEW', nextFollowUpAt: new Date('2026-11-15') },
      { status: 'REJECTED', nextFollowUpAt: new Date('2026-11-16') },
    ],
    new Date('2026-11-16T12:00Z'),
  );
  expect(result).toMatchObject({
    total: 3,
    dueToday: 1,
    overdue: 1,
    counts: { APPLIED: 1, INTERVIEW: 1, REJECTED: 1, OFFER: 0 },
  });
  expect(applicationStats([]).total).toBe(0);
});
