import { fingerprint } from './dedupe';
type Status = 'SAVED' | 'HIDDEN' | null;
export function strongestStatus(statuses: Status[]): Status {
  return statuses.includes('HIDDEN')
    ? 'HIDDEN'
    : statuses.includes('SAVED')
      ? 'SAVED'
      : null;
}
export function canonicalStatuses<
  T extends {
    status: Status;
    job: { company: string; title: string; location: string };
  },
>(matches: T[]): T[] {
  const groups = new Map<string, Status[]>();
  for (const match of matches) {
    const key = fingerprint(match.job);
    groups.set(key, [...(groups.get(key) || []), match.status]);
  }
  return matches.map((match) => ({
    ...match,
    status: strongestStatus(groups.get(fingerprint(match.job)) || []),
  }));
}
