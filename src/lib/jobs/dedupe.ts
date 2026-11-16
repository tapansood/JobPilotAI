import { createHash } from 'node:crypto';
import type { NormalizedJob } from './types';
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
export const fingerprint = (
  job: Pick<NormalizedJob, 'company' | 'title' | 'location'>,
) =>
  createHash('sha256')
    .update([job.company, job.title, job.location].map(normalize).join('|'))
    .digest('hex');
export function dedupeJobs(jobs: NormalizedJob[]) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    if (!job.externalId || !job.title || !job.url) return false;
    const key = fingerprint(job);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
