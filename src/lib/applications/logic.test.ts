import { expect, it } from 'vitest';
import {
  transition,
  applicationInput,
  daysSinceApplied,
  followUpState,
  statuses,
} from './logic';
const now = new Date('2026-11-16T12:00:00Z');
it('defaults applied timestamps and a seven-day follow-up and records events', () => {
  const result = transition(
    null,
    { status: 'APPLIED', notes: 'Sent referral' },
    now,
  );
  expect(result.appliedAt).toEqual(now);
  expect(result.nextFollowUpAt?.toISOString()).toBe('2026-11-23T12:00:00.000Z');
  expect(result.events).toEqual([
    { type: 'STATUS_CHANGE', from: null, to: 'APPLIED' },
    { type: 'NOTE', note: 'Sent referral' },
    { type: 'FOLLOW_UP', from: null, to: '2026-11-23T12:00:00.000Z' },
  ]);
});
it('supports every user-selected transition without rewriting history on idempotent updates', () => {
  const initial = transition(null, { status: 'APPLIED' }, now);
  expect(
    transition(initial, { status: 'APPLIED' }, new Date('2026-11-17')).events,
  ).toEqual([]);
  expect(transition(initial, {}, now).appliedAt).toEqual(now);
  for (const status of statuses)
    expect(transition(initial, { status }, now).status).toBe(status);
  expect(transition(initial, { status: 'SAVED' }, now).appliedAt).toEqual(now);
});
it('respects explicit follow-up dates and clears and logs notes and follow-ups', () => {
  const previous = transition(
    null,
    { status: 'APPLIED', notes: 'Call team' },
    now,
  );
  expect(
    transition(null, { status: 'APPLIED', nextFollowUpAt: null }, now)
      .nextFollowUpAt,
  ).toBeNull();
  const result = transition(previous, { notes: '', nextFollowUpAt: null }, now);
  expect(result.events).toEqual([
    { type: 'NOTE', note: 'Notes cleared.' },
    { type: 'FOLLOW_UP', from: '2026-11-23T12:00:00.000Z', to: null },
  ]);
  expect(
    transition(
      null,
      { status: 'APPLIED', nextFollowUpAt: '2026-12-01T00:00:00Z' },
      now,
    ).nextFollowUpAt?.toISOString(),
  ).toBe('2026-12-01T00:00:00.000Z');
});
it('handles empty saved applications and rejects invalid status, dates, URLs and injected owners', () => {
  expect(transition(null, {}, now)).toMatchObject({
    status: 'SAVED',
    appliedAt: null,
    nextFollowUpAt: null,
    notes: '',
  });
  expect(applicationInput.safeParse({ url: '' }).success).toBe(true);
  for (const value of [
    { status: 'HIRED' },
    { nextFollowUpAt: 'tomorrow' },
    { url: 'javascript:alert(1)' },
    { url: 'not a URL' },
    { userId: 'other' },
    { company: '' },
  ])
    expect(applicationInput.safeParse(value).success).toBe(false);
});
it('calculates elapsed days and UTC due badges while excluding closed applications', () => {
  expect(daysSinceApplied('2026-11-14T12:00:00Z', now)).toBe(2);
  expect(daysSinceApplied(null, now)).toBeNull();
  expect(daysSinceApplied('2026-12-01', now)).toBe(0);
  expect(followUpState('2026-11-15', 'APPLIED', now)).toBe('overdue');
  expect(followUpState('2026-11-16T23:59:00Z', 'INTERVIEW', now)).toBe('today');
  expect(followUpState('2026-11-17', 'OFFER', now)).toBe('scheduled');
  expect(followUpState('2026-11-15', 'REJECTED', now)).toBeNull();
  expect(followUpState(null, 'SAVED', now)).toBeNull();
});
