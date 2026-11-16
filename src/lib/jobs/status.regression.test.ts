import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  profile: vi.fn(),
  job: vi.fn(),
  previous: vi.fn(),
  match: vi.fn(),
  update: vi.fn(),
  search: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: {
    profile: { findUnique: m.profile },
    job: { upsert: m.job },
    jobMatch: { findMany: m.previous, upsert: m.match, updateMany: m.update },
    $transaction: (work: (tx: unknown) => unknown) =>
      work({
        job: { upsert: m.job },
        jobMatch: {
          findMany: m.previous,
          upsert: m.match,
          updateMany: m.update,
        },
      }),
  },
}));
vi.mock('./sources', () => ({ searchSources: m.search }));
import { searchForUser } from './service';
const job = {
  source: 'other',
  externalId: 'duplicate',
  title: 'Engineer',
  company: 'Acme',
  location: 'Remote',
  remote: true,
  url: 'https://example.org',
  description: 'Java',
  salaryMin: null,
  salaryMax: null,
  currency: null,
  postedAt: null,
  employmentType: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  m.profile.mockResolvedValue({
    headline: 'Engineer',
    summary: '',
    skills: ['Java'],
    titles: ['Engineer'],
    yearsExperience: 3,
    locations: [],
    seniority: '',
    experience: [],
    education: [],
  });
  m.search.mockResolvedValue({ jobs: [job], errors: [] });
  m.job.mockResolvedValue({ ...job, id: 'new-job' });
  m.match.mockImplementation(async (args) => ({
    ...args.create,
    id: 'new-match',
    job: { ...job, id: 'new-job' },
  }));
});
it.each(['HIDDEN', 'SAVED'] as const)(
  'carries %s status to another source for the same fingerprint',
  async (status) => {
    m.previous.mockResolvedValue([
      { status, jobId: 'old-job', job: { ...job, source: 'original' } },
    ]);
    const result = await searchForUser('owner', {});
    expect(result?.matches[0].status).toBe(status);
    expect(m.match.mock.calls[0][0].create.status).toBe(status);
    expect(m.previous.mock.calls[0][0].where.userId).toBe('owner');
    expect(m.match.mock.calls[0][0].update).not.toHaveProperty('status');
    expect(m.update).not.toHaveBeenCalled();
  },
);
it('retains a saved same-source posting when its title or location is refreshed', async () => {
  m.previous.mockResolvedValue([
    {
      status: 'SAVED',
      jobId: 'new-job',
      job: { ...job, title: 'Old title', location: 'Seattle' },
    },
  ]);
  expect((await searchForUser('owner', {}))?.matches[0].status).toBe('SAVED');
});
it('never overwrites a status changed after search read its snapshot', async () => {
  m.previous.mockResolvedValue([{ status: null, jobId: 'new-job', job }]);
  m.match.mockImplementation(async (args) => ({
    id: 'existing',
    job: { ...job, id: 'new-job' },
    status: 'HIDDEN',
    ...args.update,
  }));
  expect((await searchForUser('owner', {}))?.matches[0].status).toBe('HIDDEN');
});
