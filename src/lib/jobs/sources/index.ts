import type { JobSource, SearchInput } from '../types';
import { greenhouse, lever } from './boards';
import { adzuna, jsearch } from './paid';
import { mock } from './mock';
import { dedupeJobs } from '../dedupe';
const list = (value: string | undefined, fallback: string) =>
  (value === undefined ? fallback : value)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
export function configuredSources(): JobSource[] {
  const sources: JobSource[] = [];
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY)
    sources.push(adzuna);
  if (process.env.RAPIDAPI_KEY) sources.push(jsearch);
  sources.push(
    ...list(process.env.GREENHOUSE_BOARDS, 'stripe,cloudflare').map(greenhouse),
    ...list(process.env.LEVER_COMPANIES, 'netflix').map(lever),
  );
  if (!sources.length || process.env.JOBS_MOCK === 'true') sources.push(mock);
  return sources;
}
export async function searchSources(
  input: SearchInput,
  sources = configuredSources(),
) {
  const errors: { source: string; message: string }[] = [];
  const responses = await Promise.all(
    sources.map(async (source) => {
      try {
        return await source.search(input);
      } catch {
        errors.push({
          source: source.name,
          message:
            'This source is unavailable or returned invalid data. Try again later.',
        });
        return [];
      }
    }),
  );
  let jobs = dedupeJobs(responses.flat());
  if (
    !jobs.length &&
    errors.length === sources.length &&
    !sources.some((source) => source.name === 'mock')
  ) {
    jobs = await mock.search(input);
    errors.push({
      source: 'mock',
      message: 'Live sources failed; showing labeled offline demo postings.',
    });
  }
  return { jobs, errors };
}
