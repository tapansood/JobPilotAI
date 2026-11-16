type Dates = { appliedAt?: string | null; nextFollowUpAt?: string | null };
export function changedDates(
  form: { appliedAt: string; nextFollowUpAt: string },
  previous?: Dates,
) {
  const changed: Dates = {};
  for (const key of ['appliedAt', 'nextFollowUpAt'] as const) {
    if (form[key] !== (previous?.[key]?.slice(0, 10) ?? ''))
      changed[key] = form[key] ? `${form[key]}T00:00:00Z` : null;
  }
  return changed;
}
