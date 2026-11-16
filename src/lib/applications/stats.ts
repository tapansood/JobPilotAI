import type { ProfileData } from '@/lib/profile/schema';
import { statuses, followUpState, type Status } from './logic';
export function profileCompleteness(profile: ProfileData | null) {
  if (!profile) return 0;
  const fields = [
    !!profile.headline.trim(),
    !!profile.summary.trim(),
    !!profile.skills.length,
    !!profile.titles.length,
    profile.yearsExperience !== null,
    !!(profile.locations.length || profile.location),
    !!profile.seniority.trim(),
    !!profile.experience.length,
    !!profile.education.length,
    !!(profile.email || profile.phone),
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
export function applicationStats(
  applications: { status: Status; nextFollowUpAt: Date | null }[],
  now = new Date(),
) {
  const counts = Object.fromEntries(
    statuses.map((status) => [status, 0]),
  ) as Record<Status, number>;
  let dueToday = 0,
    overdue = 0;
  for (const application of applications) {
    counts[application.status]++;
    const state = followUpState(
      application.nextFollowUpAt,
      application.status,
      now,
    );
    if (state === 'today') dueToday++;
    if (state === 'overdue') overdue++;
  }
  return { counts, dueToday, overdue, total: applications.length };
}
