import { describe, it, expect } from 'vitest';
import { changedDates } from './dates';
describe('application date edits', () => {
  const previous = {
    appliedAt: '2026-11-16T15:24:33.123Z',
    nextFollowUpAt: '2026-11-23T15:24:33.123Z',
  };
  it('omits untouched calendar fields to preserve timestamps and follow-up events', () => {
    expect(
      changedDates(
        { appliedAt: '2026-11-16', nextFollowUpAt: '2026-11-23' },
        previous,
      ),
    ).toEqual({});
  });
  it('omits empty dates on new applications so server defaults apply', () => {
    expect(changedDates({ appliedAt: '', nextFollowUpAt: '' })).toEqual({});
  });
  it('sends changed dates and explicit clearing only', () => {
    expect(
      changedDates({ appliedAt: '2026-11-17', nextFollowUpAt: '' }, previous),
    ).toEqual({ appliedAt: '2026-11-17T00:00:00Z', nextFollowUpAt: null });
    expect(
      changedDates({ appliedAt: '', nextFollowUpAt: '2026-11-24' }, previous),
    ).toEqual({ appliedAt: null, nextFollowUpAt: '2026-11-24T00:00:00Z' });
  });
});
