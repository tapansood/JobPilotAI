import { z } from 'zod';
import type { JobSource, NormalizedJob } from '../types';
import { fetchJson, date, number, plain, safeUrl, text } from './shared';
const record = z.record(z.string(), z.unknown());
export const adzuna: JobSource = {
  name: 'adzuna',
  async search(input) {
    const country = process.env.ADZUNA_COUNTRY || 'us';
    const params = new URLSearchParams({
      app_id: process.env.ADZUNA_APP_ID!,
      app_key: process.env.ADZUNA_APP_KEY!,
      what: input.query,
      where: input.location,
      results_per_page: '50',
    });
    if (input.remote) params.set('what', `${input.query} remote`);
    const data = z
      .object({ results: z.array(record) })
      .parse(
        await fetchJson(
          `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/${input.page}?${params}`,
        ),
      );
    return data.results
      .map((job) => {
        const location = record.safeParse(job.location);
        const company = record.safeParse(job.company);
        return {
          source: 'adzuna',
          externalId: String(job.id || ''),
          title: plain(job.title),
          company: company.success ? text(company.data.display_name) : '',
          location: location.success ? text(location.data.display_name) : '',
          remote: /remote/i.test(`${text(job.title)} ${text(job.description)}`),
          url: safeUrl(job.redirect_url),
          description: plain(job.description),
          salaryMin: number(job.salary_min),
          salaryMax: number(job.salary_max),
          currency: country === 'us' ? 'USD' : country === 'gb' ? 'GBP' : null,
          postedAt: date(job.created),
          employmentType: text(job.contract_time) || null,
        } satisfies NormalizedJob;
      })
      .filter(
        (job) => input.remote === undefined || job.remote === input.remote,
      );
  },
};
export const jsearch: JobSource = {
  name: 'jsearch',
  async search(input) {
    const params = new URLSearchParams({
      query: [input.query, input.location].filter(Boolean).join(' in '),
      page: String(input.page),
      num_pages: '1',
    });
    if (input.remote) params.set('remote_jobs_only', 'true');
    const data = z.object({ data: z.array(record) }).parse(
      await fetchJson(`https://jsearch.p.rapidapi.com/search?${params}`, {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
      }),
    );
    return data.data
      .map((job) => ({
        source: 'jsearch',
        externalId: text(job.job_id),
        title: text(job.job_title),
        company: text(job.employer_name),
        location: [job.job_city, job.job_state, job.job_country]
          .map(text)
          .filter(Boolean)
          .join(', '),
        remote: job.job_is_remote === true,
        url: safeUrl(job.job_apply_link),
        description: plain(job.job_description),
        salaryMin: number(job.job_min_salary),
        salaryMax: number(job.job_max_salary),
        currency: text(job.job_salary_currency) || null,
        postedAt: date(job.job_posted_at_datetime_utc),
        employmentType: text(job.job_employment_type) || null,
      }))
      .filter(
        (job) => input.remote === undefined || job.remote === input.remote,
      );
  },
};
