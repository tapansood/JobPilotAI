import { db } from '@/lib/db';
import { profileSchema } from '@/lib/profile/schema';
import { fingerprint } from './dedupe';
import { scoreJob } from './match';
import { searchSources } from './sources';
import type { SearchInput } from './types';
import { strongestStatus } from './status';
export async function searchForUser(
  userId: string,
  input: Partial<SearchInput>,
) {
  const stored = await db.profile.findUnique({ where: { userId } });
  if (!stored) return null;
  const profile = profileSchema.parse(stored);
  const search: SearchInput = {
    query: input.query ?? profile.titles[0] ?? '',
    location: input.location ?? profile.locations[0] ?? '',
    remote: input.remote,
    page: input.page ?? 1,
  };
  const { jobs, errors } = await searchSources(search);
  const existing = await db.jobMatch.findMany({
    where: { userId },
    include: { job: true },
  });
  const matches = [];
  for (const item of jobs) {
    const hash = fingerprint(item);
    const job = await db.job.upsert({
      where: {
        source_externalId: { source: item.source, externalId: item.externalId },
      },
      create: { ...item, fingerprint: hash },
      update: { ...item, fingerprint: hash, fetchedAt: new Date() },
    });
    const scoring = scoreJob(profile, item);
    const duplicates = existing.filter(
      (match) => match.jobId === job.id || fingerprint(match.job) === hash,
    );
    const status = strongestStatus(duplicates.map((match) => match.status));
    const match = await db.jobMatch.upsert({
      where: { userId_jobId: { userId, jobId: job.id } },
      create: { userId, jobId: job.id, ...scoring, status },
      update: { ...scoring, status },
      include: { job: true },
    });
    await db.jobMatch.updateMany({
      where: {
        userId,
        jobId: { in: [job.id, ...duplicates.map((match) => match.jobId)] },
      },
      data: { status },
    });
    matches.push(match);
  }
  return { matches: matches.sort((a, b) => b.score - a.score), errors, search };
}
