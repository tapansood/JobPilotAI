import { z } from 'zod';
import type { JobSource, NormalizedJob } from '../types';
import { date, fetchJson, filterLocal, plain, safeUrl, text } from './shared';
const greenhouseJob = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  absolute_url: z.string(),
  location: z.object({ name: z.string() }).optional(),
  content: z.string().optional(),
  updated_at: z.string().optional(),
});
const leverJob = z.object({
  id: z.string(),
  text: z.string(),
  hostedUrl: z.string(),
  categories: z
    .object({
      location: z.string().optional(),
      commitment: z.string().optional(),
    })
    .optional(),
  descriptionPlain: z.string().optional(),
  description: z.string().optional(),
  lists: z
    .array(z.object({ text: z.string(), content: z.string() }))
    .optional(),
  workplaceType: z.string().optional(),
  createdAt: z.number().optional(),
  salaryRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().optional(),
    })
    .optional(),
});
export function greenhouse(token: string): JobSource {
  return {
    name: `greenhouse:${token}`,
    async search(input) {
      const data = z
        .object({ jobs: z.array(greenhouseJob) })
        .parse(
          await fetchJson(
            `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`,
          ),
        );
      const jobs: NormalizedJob[] = data.jobs.map((job) => ({
        source: 'greenhouse',
        externalId: `${token}:${job.id}`,
        title: job.title,
        company: token,
        location: job.location?.name || '',
        remote: /remote/i.test(job.location?.name || ''),
        url: safeUrl(job.absolute_url),
        description: plain(job.content),
        salaryMin: null,
        salaryMax: null,
        currency: null,
        postedAt: null,
        employmentType: null,
      }));
      return filterLocal(jobs, input);
    },
  };
}
export function lever(company: string): JobSource {
  return {
    name: `lever:${company}`,
    async search(input) {
      const data = z
        .array(leverJob)
        .parse(
          await fetchJson(
            `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`,
          ),
        );
      const jobs: NormalizedJob[] = data.map((job) => ({
        source: 'lever',
        externalId: `${company}:${job.id}`,
        title: job.text,
        company,
        location: job.categories?.location || '',
        remote:
          job.workplaceType === 'remote' ||
          /remote/i.test(job.categories?.location || ''),
        url: safeUrl(job.hostedUrl),
        description: [
          plain(job.descriptionPlain || job.description),
          ...(job.lists || []).map(
            (list) => `${text(list.text)}\n${plain(list.content)}`,
          ),
        ].join('\n'),
        salaryMin: job.salaryRange?.min ?? null,
        salaryMax: job.salaryRange?.max ?? null,
        currency: job.salaryRange?.currency ?? null,
        postedAt: job.createdAt
          ? date(new Date(job.createdAt).toISOString())
          : null,
        employmentType: job.categories?.commitment || null,
      }));
      return filterLocal(jobs, input);
    },
  };
}
