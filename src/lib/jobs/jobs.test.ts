import { afterEach, describe, expect, it, vi } from 'vitest';
import { greenhouse, lever } from './sources/boards';
import { adzuna, jsearch } from './sources/paid';
import { configuredSources, searchSources } from './sources';
import { mock } from './sources/mock';
import { dedupeJobs, fingerprint } from './dedupe';
import { scoreJob } from './match';
import { heuristicProfile } from '@/lib/profile/heuristic';
import { plain, safeUrl } from './sources/shared';
const input = { query: '', location: '', page: 1 };
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function respond(value: unknown) {
  const fetcher = vi
    .fn()
    .mockImplementation(async () => new Response(JSON.stringify(value)));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
describe('job sources', () => {
  it('normalizes and filters Greenhouse content locally', async () => {
    const fetcher = respond({
      jobs: [
        {
          id: 1,
          title: 'Software Engineer',
          absolute_url: 'https://example.org/1',
          location: { name: 'Remote - US' },
          content: '<p>React &amp; TypeScript</p>',
        },
        { id: 2, title: 'Designer', absolute_url: 'https://example.org/2' },
      ],
    });
    const jobs = await greenhouse('stripe').search({
      ...input,
      query: 'engineer',
      location: 'US',
      remote: true,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      source: 'greenhouse',
      externalId: 'stripe:1',
      description: 'React & TypeScript',
      remote: true,
      postedAt: null,
    });
    expect(fetcher.mock.calls[0][0]).toContain('/stripe/jobs?content=true');
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(await greenhouse('stripe').search({ ...input, page: 2 })).toEqual(
      [],
    );
  });
  it('normalizes Lever descriptions, lists, salary and dates', async () => {
    respond([
      {
        id: 'a',
        text: 'Data Engineer',
        hostedUrl: 'https://example.org/a',
        categories: { location: 'London', commitment: 'Full-time' },
        description: '<b>Python</b>',
        lists: [{ text: 'Requirements', content: '<li>SQL</li>' }],
        workplaceType: 'remote',
        createdAt: 1700000000000,
        salaryRange: { min: 100, max: 200, currency: 'GBP' },
      },
    ]);
    const jobs = await lever('example').search({
      ...input,
      query: 'SQL',
      remote: true,
    });
    expect(jobs[0]).toMatchObject({
      company: 'example',
      salaryMin: 100,
      currency: 'GBP',
      remote: true,
    });
    expect(jobs[0].description).toContain('Requirements\nSQL');
    expect(jobs[0].postedAt).toBeInstanceOf(Date);
  });
  it('maps Adzuna request and response', async () => {
    vi.stubEnv('ADZUNA_APP_ID', 'test-id');
    vi.stubEnv('ADZUNA_APP_KEY', 'test-key');
    vi.stubEnv('ADZUNA_COUNTRY', 'us');
    const fetcher = respond({
      results: [
        {
          id: '1',
          title: 'Engineer',
          company: { display_name: 'Acme' },
          location: { display_name: 'Remote' },
          description: 'Remote Java',
          redirect_url: 'https://example.org',
          salary_min: 100,
          created: '2026-01-01',
        },
      ],
    });
    expect(
      (
        await adzuna.search({ ...input, query: 'Java', page: 2, remote: true })
      )[0],
    ).toMatchObject({ salaryMin: 100, currency: 'USD', company: 'Acme' });
    expect(fetcher.mock.calls[0][0]).toContain('/us/search/2?');
    expect(fetcher.mock.calls[0][0]).toContain('app_id=test-id');
  });
  it('maps JSearch request and response', async () => {
    vi.stubEnv('RAPIDAPI_KEY', 'test');
    const fetcher = respond({
      data: [
        {
          job_id: 'j1',
          job_title: 'Engineer',
          employer_name: 'Acme',
          job_city: 'Seattle',
          job_is_remote: true,
          job_apply_link: 'https://example.org',
          job_description: 'React',
          job_min_salary: 120,
        },
      ],
    });
    expect((await jsearch.search({ ...input, remote: true }))[0]).toMatchObject(
      { externalId: 'j1', remote: true, location: 'Seattle', salaryMin: 120 },
    );
    expect(fetcher.mock.calls[0][1].headers['x-rapidapi-key']).toBe('test');
    expect(fetcher.mock.calls[0][0]).toContain('remote_jobs_only=true');
  });
  it('handles empty feeds, malformed data, HTTP and network failures', async () => {
    respond({ jobs: [] });
    expect(await greenhouse('test').search(input)).toEqual([]);
    respond([]);
    expect(await lever('test').search(input)).toEqual([]);
    respond({ results: [] });
    expect(await adzuna.search(input)).toEqual([]);
    respond({ data: [] });
    expect(await jsearch.search(input)).toEqual([]);
    respond({ unexpected: true });
    await expect(greenhouse('test').search(input)).rejects.toThrow();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 503 })),
    );
    await expect(lever('test').search(input)).rejects.toThrow('503');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(jsearch.search(input)).rejects.toThrow('offline');
  });
  it('isolates failing sources and falls back to labeled mock jobs offline', async () => {
    const broken = {
      name: 'broken',
      search: vi.fn().mockRejectedValue(new Error('secret credential')),
    };
    const result = await searchSources(input, [broken, mock]);
    expect(result.jobs.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(1);
    expect(JSON.stringify(result.errors)).not.toContain('secret');
    const fallback = await searchSources(input, [broken]);
    expect(fallback.jobs[0].source).toBe('mock');
    expect(fallback.errors).toHaveLength(2);
  });
  it('uses keys only when configured and supports explicit offline configuration', () => {
    vi.stubEnv('ADZUNA_APP_ID', '');
    vi.stubEnv('ADZUNA_APP_KEY', '');
    vi.stubEnv('RAPIDAPI_KEY', '');
    vi.stubEnv('GREENHOUSE_BOARDS', '');
    vi.stubEnv('LEVER_COMPANIES', '');
    expect(configuredSources().map((s) => s.name)).toEqual(['mock']);
    vi.stubEnv('GREENHOUSE_BOARDS', 'stripe');
    vi.stubEnv('JOBS_MOCK', 'true');
    expect(configuredSources().map((s) => s.name)).toEqual([
      'greenhouse:stripe',
      'mock',
    ]);
  });
});
describe('deduplication and scoring', () => {
  it('deduplicates normalized company/title/location across sources', async () => {
    const job = (await mock.search(input))[0];
    const other = {
      ...job,
      source: 'other',
      company: ' NORTHSTAR-CLOUD ',
      title: 'senior software engineer',
    };
    expect(fingerprint(job)).toBe(fingerprint(other));
    expect(dedupeJobs([job, other])).toHaveLength(1);
    expect(dedupeJobs([])).toEqual([]);
    expect(dedupeJobs([{ ...job, url: '' }])).toEqual([]);
    expect(dedupeJobs([job, { ...other, location: 'London' }])).toHaveLength(2);
  });
  it('explains high fit and scores missing skills/title/years/location lower', async () => {
    const job = (await mock.search(input))[0];
    const profile = heuristicProfile(
      'Senior Software Engineer\nSummary\n8 years experience\nSkills\nTypeScript React Node.js PostgreSQL AWS Docker\nLocation: Seattle, WA',
    );
    const perfect = scoreJob(profile, job);
    expect(perfect.score).toBe(100);
    expect(perfect.matchedSkills).toContain('React');
    expect(perfect.missingSkills).toEqual([]);
    expect(perfect).toEqual(scoreJob(profile, job));
    const mismatch = scoreJob(
      {
        ...profile,
        skills: [],
        titles: ['Junior Data Analyst'],
        seniority: 'Junior',
        yearsExperience: 0,
        locations: ['London'],
      },
      { ...job, remote: false },
    );
    expect(mismatch.score).toBeLessThan(perfect.score);
    expect(mismatch.missingSkills).toContain('React');
    expect(mismatch.reasons.skills.weight).toBe(50);
  });
  it('handles unknown and empty data with bounded deterministic scores', async () => {
    const job = (await mock.search(input))[0];
    const empty = heuristicProfile('');
    const score = scoreJob(empty, {
      ...job,
      title: '',
      description: '',
      remote: false,
      location: '',
    });
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.matchedSkills).toEqual([]);
    expect(score.missingSkills).toEqual([]);
  });
  it('renders descriptions as text and rejects unsafe URLs', () => {
    expect(plain('<p>Hello &amp; world</p>')).toBe('Hello & world');
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('https://example.org')).toBe('https://example.org/');
  });
});
